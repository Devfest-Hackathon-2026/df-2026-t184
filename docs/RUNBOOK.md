# RUNBOOK（起動・テスト・デプロイの手順）

F01 の worker が書いた（2026-11-10、基準コミット `6abec10`）。以後の worker と評価役はここに従う。
コマンドはすべて worktree のルート（`package.json` がある場所）で実行する。

## 技術スタック（`package.json` から観測）

- Next.js 16.4.5（App Router）/ React 19.3.0 / TypeScript 5 / Tailwind CSS 4
- テスト: Vitest 5（jsdom + @testing-library/react、設定は `vitest.config.mts`）
- Lint: ESLint 9 + eslint-config-next 16.4.5（`eslint.config.mjs`）
- UI カタログ: Storybook 10（`npm run storybook`）
- AI: Vertex AI の Gemini（`src/lib/vertex*.ts`、認証は ADC。API キーは使わない）
- 地図: Maps JavaScript API・Routes API（キーがなければ手描きの地図に切り替わる）
- ホスティング: Firebase App Hosting（`yorimichi-stg` / `yorimichi-prod`、詳細は `docs/environments.md`）
- 確認した実行環境: Node v26.12.1 / npm 11.20.0

Next.js 16 は学習データと違う。コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む。

## worktree での準備

新しい worktree には `node_modules` も `.env.local` もない。

```sh
npm ci
cp .env.example .env.local   # キーなしのまま使う。値は入れない
```

- `.env.local` はキーなし（`.env.example` のコピー）でよい。`NEXT_PUBLIC_APP_ENV=local` になり、
  Gemini は ADC がなければ失敗して見本に切り替わり、地図はキーがないので手描きの地図になる
- `.env.local` は `.gitignore` 済み。秘密情報を書いたらコミットしない
- npm 11 は依存の install script（esbuild・fsevents・protobufjs）を実行せず警告を出すが、
  lint / test / tsc / build はそのまま通る（2026-11-10 に確認）
- `.env.local` がなくても `npm run build` は通る（2026-11-10 に確認）

本物の Gemini を呼びたいときだけ、一度 `gcloud auth application-default login` を実行する
（`VERTEX_PROJECT_ID=df-2026-t184-prod` は `.env.example` に入っている。呼び出しは有料なので回数に注意）。
本物の地図を出したいときだけ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` に stg のキー（Secret Manager の
`STG_GOOGLE_MAPS_API_KEY`）を入れる。値はコミットしない。

## 起動

```sh
npm run dev                  # http://localhost:3000 （/walk が体験の画面）
# 本番ビルドで確かめるとき
npm run build && npx next start -p 3184
```

- 並列の worktree で同時に起動するときはポートを分ける（`npm run dev -- -p 3101` など）
- Firebase（Firestore・Auth）を使う画面を試すときだけエミュレータを起動する:
  `firebase emulators:start --config firebase.emulator.json --project demo-yorimichi`
  （現在の `/walk` はエミュレータなしで動く）

## テスト・チェック（失格条件の4つ。すべて通すこと）

```sh
npm run lint
npm test                     # vitest run
npx next typegen && npx tsc --noEmit
npm run build
```

- `npm run build` と `next start` はローカルのポートを開く（Turbopack が `globals.css` の PostCSS 処理で
  子プロセスを起動するため）。ポートを開けないサンドボックスでは `binding to a port: Operation not permitted`
  で失敗する。これはコードの不具合ではないので、ポートを開ける環境で実行する
  （2026-11-10、macOS の `sandbox-exec` で `network-bind` を禁止して再現を確認）
- 一度この失敗が起きると、Turbopack のキャッシュ（`.next/`）に失敗が残り、ポートを開ける環境に戻しても
  同じエラーが出続ける。そのときは `rm -rf .next` してから `npm run build` をやり直す
  （2026-11-10 に確認。再現手順: ① `sandbox-exec` で `network-bind` を禁止して `npm run build` → 失敗、
  ② 制約なしで `npm run build` → 同じエラーで失敗、③ `rm -rf .next` の後に `npm run build` → 成功）
- 1ファイルだけ: `npx vitest run src/path/to/file.test.tsx`
- 証拠は `evidence/<機能ID>/` に出力をそのまま保存する（例: `npm test > evidence/F01/test.txt 2>&1`）

## デプロイ

人間（PM）の承認範囲で行う。stg と prod は同じ GCP プロジェクト `df-2026-t184-prod` に同居している。

- 通常は GitHub Actions が行う: main 向けの PR で CI が成功すると共用 stg（`yorimichi-stg`）へ、
  main への merge で CI 成功後に prod（`yorimichi-prod`）へデプロイされる（`docs/environments.md` の CI/CD 節）
- 手動で入れるときは1環境ずつ対象を明示する:
  - `firebase deploy --only apphosting:yorimichi-stg`
  - `firebase deploy --only firestore:yorimichi-stg`
- `--only` なしの `firebase deploy` と `--only firestore:rules` は両環境に入るので使わない
- 有料の操作の前に費用の見込みと残予算を確かめる（`docs/RULES.md`）
