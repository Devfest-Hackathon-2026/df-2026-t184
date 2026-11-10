# scripts/terrain — 地区グリッドの事前計算

`/terrain` ページで使う「標高グリッド」と「日陰グリッド」を作るスクリプト。
重い処理（DEM・建物データの参照、日陰の光線追跡）は画面表示のたびに行わず、
ここで事前計算した結果を `public/terrain/` に置く。

**元データはコミットしない**（サイズが大きい・再配布の確認が必要なため）。
生成物のグリッド JSON（地区限定・間引き済み）はコミットする。

## 対象地区

台東区 上野公園〜谷中〜鶯谷（`BBOX`: 南緯 35.706〜35.736, 東経 139.756〜139.786）。

選定理由: 台地（上野台・谷中霊園）と谷底（谷中銀座）の間に標高差があり坂が出やすい。
標高タイル（dem5a）と PLATEAU 台東区の両方が揃う。

標高の確認値（2026-11-10、dem5a_png z15 のタイルを `gsi.ts` の `makeDemSampler` で双線形補間して読んだ値。
画素値の換算は[標高タイルの詳細仕様](https://maps.gsi.go.jp/development/demtile.html)）:

| 地点（座標は `/terrain` の `src/components/TerrainCompare.tsx` と同じ） | 緯度, 経度 | 標高 | 出典タイル |
| --- | --- | --- | --- |
| 上野公園 噴水広場前（出発） | 35.7148, 139.7745 | 18.4m | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29106/12899.png |
| 谷中銀座 夕やけだんだん（寄り道先） | 35.7278, 139.7649 | 6.7m | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29105/12898.png |
| 鶯谷駅（到着） | 35.7205, 139.7790 | 9.0m | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29106/12898.png |
| 谷中霊園 | 35.7220, 139.7714 | 15.6m | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29106/12898.png |
| 不忍池（水面） | 35.7118, 139.7707 | 欠損（無効値） | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29106/12899.png |

## 使い方

```sh
# 1. 標高グリッド（国土地理院 標高タイルを直接取得 → 生成）
node scripts/terrain/build-elevation-grid.ts

# 2. 日陰グリッド（先に PLATEAU の CityGML を取得・展開しておく）
#    --date は JST の日付、--hours は両端を含む毎正時の範囲（最大 15 時刻）
#    コミット済みのグリッドはこの引数で作った
node scripts/terrain/build-shade-grid.ts --gml-dir <bldg GML を置いたdir> --date 2026-11-14 --hours 7-16
```

Node の TypeScript 直接実行（type stripping）で動かす。`--experimental-strip-types` 警告を
避けたい場合はフラグを付けてもよい。

日陰スクリプトは、太陽高度が 0 以下になる時刻（夜間）が `--hours` に含まれるとエラーで止まる。
夜間の日陰グリッドは作らない方針のため、範囲を狭めて再実行する。
スクリプトは終わりに、時刻ごとの地区全体の日陰率（評価済みセル中の日陰セル）と評価不能セルの割合を出す。
再生成したときは前の版の数字と見比べる。

## 元データの取得方法

### 1. 標高: 国土地理院 標高タイル（スクリプトが自動取得）

- レイヤ: `dem5a_png`（数値標高モデル 5m メッシュ）z15
- URL 形式: `https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/{x}/{y}.png`
- 仕様: 投影・タイル座標は[地理院タイルの仕様](https://maps.gsi.go.jp/development/siyou.html)、画素値の換算は[標高タイルの詳細仕様](https://maps.gsi.go.jp/development/demtile.html)
  （PNG 画素 → `R*2^16+G*2^8+B`、値 `x`: `x==2^23` は無効、`x<2^23` は `x*0.01` m、
  `x>2^23` は `(x-2^24)*0.01` m）
- データ版: 取得時点（2026-11-09）の配信タイル。タイル自体に版番号は無く、
  DEM の整備状況は[コンテンツ一覧](https://maps.gsi.go.jp/development/ichiran.html)の dem5a を参照
- ライセンス: [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)。同ページによると、特段の記載が無い限り
  [公共データ利用規約（第1.0版）（PDL1.0）](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)が適用される。利用時は出典を記載し、編集・加工した場合は
  そのことも別に記載する（同ページの記載例:「地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成」）。
  2026-11-10 に両ページを開いて確認
- 本リポジトリの表記: 標高グリッドは標高タイルを間引き・補間した加工物なので、`/terrain` の注意点に
  「地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成」と出典 URL を出す

### 2. 建物: PLATEAU 台東区 CityGML（手動取得 → 必要メッシュだけ展開）

- データセット: [3D都市モデル（Project PLATEAU）台東区（2024年度）](https://www.geospatial.jp/ckan/dataset/plateau-13106-taito-ku-2024)
- ファイル: `13106_taito-ku_city_2024_citygml_1_op.zip`（893,791,397 bytes。CKAN の「CityGML（v4）」リソース）
- 展開: zip の `udx/bldg/` から対象メッシュの `533946{41,42,43,51,52,53,54,61,62,63,64,70,71,72,73,74}_bldg_6697_op.gml`
  を `--gml-dir` に集める（例: `unzip -j <zip> 'udx/bldg/5339464*_bldg_6697_op.gml' ... -d <dir>/`）
- 使う要素: `bldg:lod1Solid` の `gml:posList`（EPSG:6697 = 緯度,経度,標高）と `bldg:measuredHeight`
  （`-9999` は欠損として扱う）
- データ版: 2026-11-10 取得の zip（893,791,397 bytes。[配布 URL](https://assets.cms.plateau.reearth.io/assets/27/f90235-aa3e-4b2e-937e-6c41499135d6/13106_taito-ku_city_2024_citygml_1_op.zip) の HEAD 応答 `content-length` で 2026-11-10 に確認、`last-modified: Tue, 24 Jun 2025`）。CKAN のリソースに版番号は無いので取得日とサイズで識別する
- ライセンス: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)（出典: 国土交通省 Project PLATEAU）

## 計算方式

- 座標: 等距円筒近似でメートル座標に変換。緯度1度=111,132.954m は WGS84 楕円体での近似式
  m1 + m2·cos2φ + m3·cos4φ の定数項 m1（出典: [Wikipedia「Latitude」Meridian distance on the ellipsoid](https://en.wikipedia.org/wiki/Latitude#Meridian_distance_on_the_ellipsoid)）。
  緯度によらない定数として使うため、北緯35.7度付近の値（同じ式で約110,954m）より約0.16%大きく、
  地区の南北 約3.3km（0.030度）で約5m の差になる（`src/lib/terrain/geo.ts` の注記と同じ計算）。
  グリッドはこの値で生成したので、表示側も同じ値を使って位置を揃えている
- 標高グリッド: 10m 間隔、セル中心の標高をタイル画素から双線形補間。単位 dm（Int16、-32768=欠損）
- 日陰グリッド: 同じ10mグリッド。各セル中心から太陽方向へ光線を伸ばし（10m刻み・最大380m）、
  建物の棟頂標高が光線高（地面標高 + 距離×tan(太陽高度)）を超えれば日陰。
  グリッド+400m余白の建物まで評価。セル値は Uint16 で、bit i が `times[i]` の日陰、
  bit15 が「評価不能」（地面標高の無いセル）。形式名は `yorimichi-shade-v2`
- 太陽位置: NOAA の近似式（`src/lib/terrain/sun.ts`）
- コミット済みグリッドの日時: 2026-11-14（JST）の 07:00〜16:00 の毎正時、10 時刻。
  日付はデモ日（Regional Day）に合わせた。日付の根拠は `docs/HACKATHON.md` で、二次資料の転記のため公式原本とは未照合。
  17:00 は太陽高度が 0 以下（`sun.ts` の計算で日没後）のため含めていない
- 表示側の集計: 経路を10m間隔で再サンプリング → 標高は双線形補間・30m移動平均で平滑化、
  `推定勾配(%) = 標高差 / 水平距離 × 100`。最大勾配は水平距離 10m 以上になるまで区間を束ねて評価し、
  再サンプリングで残る 10m 未満の終端区間は直前の区間に併合する（短い端数を単独で割ると勾配が跳ねるため）。
  日陰率 = 日陰と判定した評価済み長 / 評価済み長
- 欠損・範囲外・計算不能は補完せず「不明/評価不能」として、評価済み区間率を別に出す

## 既知の限界

- LOD1 は平屋根の箱モデル。棟部・壁面の凹凸・バルコニー・庇は影に反映されない
- 樹木・電柱・高架・トンネルは日陰評価に含まれない
- 標高は 5m メッシュ DEM を 10m に間引いたもの。急な段差（崖・階段）は平滑化される
- 建物は lod1Solid がある棟のみ。measuredHeight が欠損の棟はソリッド頂点の最大 z を棟頂とする
- グリッド範囲外の建物が落とす影（400m 余白を超える超高層など）は考慮しない
- 水面・線路敷など標高タイルに値の無い場所は欠損のまま（例: 不忍池）
