# F08: `/terrain` の取り込み（#19）

- 日付: 2026-11-10。セッション参照: superloop の F08 worker（無人・会話ログのリンクは未取得）
- 状態: **AI判断・PM確認待ち**（無人ループのため人に質問していない。`docs/RULES.md` に従い自分で決めて記録）
- 質問手段・深さ: 質問なし（無人実行）

## やったこと（コードから観測した事実）

- `origin/feat/terrain-compare`（`c95ca5d`）を `loop-F08` に `--no-ff` で merge した。コンフリクトなし。main 側との差分は `tsconfig.json` の `allowImportingTsExtensions: true` 追加と、`/terrain`・`src/lib/terrain`・`scripts/terrain`・`public/terrain` の新規ファイル
- `npm run build` で `/terrain` が静的生成（`○ /terrain`）される
- 地図キーなしの `next start` で `/terrain` を開くと、Routes API の代わりに直線で評価した旨の注意が出て、比較表は表示される

## AI が決めたこと

1. `scripts/**/*.test.ts` を Vitest の `include` に追加した（理由と候補は `docs/DECISIONS.md` D-008）
2. データの出典・ライセンスを `docs/ASSETS.md` に転記した（`scripts/terrain/README.md` の記載を元にし、リンク先は README の記載をそのまま使用）
3. `/terrain` の画面・文言・計算は変えていない（`/walk` との接続は F09 の担当）

## 未確認・残り

- 地図キーなしでは `/terrain` の地図枠が空の灰色のまま出る（手描き地図への切り替えはない）。F09 で `/walk` とつなぐ際の検討事項
- 「推定値・現地未検証」「通行可否は保証しない」の文言は折りたたみ（`計算方法・出典・注意点`）の中にあり、初期表示では見えない。F09 の完了条件（推定値で現地未検証であることを画面に出す）で扱う
- NOAA の文書のライセンス表記は未確認（未記入: 要調査）

## 差し戻し対応（2026-11-10）: 国土地理院の利用規約リンク

- 観測した事実: 旧リンクはトップページへ転送されていた。現行の[国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)は、特段の記載が無い限り[公共データ利用規約 第1.0版（PDL1.0）](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)を適用し、加工して使う場合は加工したことも記載するよう求めている（2026-11-10 に開いて確認）
- AI が決めたこと（PM確認待ち）: `docs/ASSETS.md` と `scripts/terrain/README.md` のリンクを現行 URL に差し替えた。標高グリッドは標高タイルを間引き・補間した加工物なので、`/terrain` の出典表記を同ページの記載例どおり「地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成」にし、国土地理院の[タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)へのリンクを付けた。表記は `src/components/TerrainCompare.test.tsx` で確かめる

## 差し戻し対応（2026-11-10）: 緯度1度の長さと座標・画素仕様の出典

- 観測した事実: `METERS_PER_DEG_LAT = 111132.954` は JGD2011 の値ではなく、WGS84 楕円体での緯度1度の長さの近似式の定数項 m1（[Wikipedia「Latitude」](https://en.wikipedia.org/wiki/Latitude#Meridian_distance_on_the_ellipsoid)）。同じ式で北緯35.721度の値は約110,954m で、定数は約0.16%大きい（`src/lib/terrain/geo.test.ts` で計算を固定）
- 観測した事実: 標高 PNG の画素値の換算式は「地理院タイルの仕様」ではなく[標高タイルの詳細仕様](https://maps.gsi.go.jp/development/demtile.html)に載っている。EPSG:6697 は [epsg.io](https://epsg.io/6697) で JGD2011 の緯度経度＋標高の複合座標系（現在の名称は JGD2024 + JGD2011 (vertical) height）
- AI が決めたこと（PM確認待ち）: 定数の値は変えず、注記を直して出典と誤差を書いた。コミット済みのグリッドはこの値で生成されており、値を変えると表示とグリッドの位置がずれる。日陰グリッドの再生成には PLATEAU の元データ（893,791,397 bytes、`scripts/terrain/README.md` に配布 URL）の取得が必要で、F08 の範囲を超える
