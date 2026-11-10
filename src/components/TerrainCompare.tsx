"use client";

// 坂・日陰ルート比較ページ（/terrain）。
// 固定した出発地・寄り道先・到着地について、表示のたびに Routes API（徒歩）で
// 最短ルートと寄り道ルートを取り（経路の形は保存しない）、
// 事前計算した標高・日陰グリッドから坂と日陰の推定値を集計して比較する。

import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { samplePolyline, type LatLng } from "@/lib/terrain/geo";
import { sampleElevation, slopeMetrics } from "@/lib/terrain/elevation";
import { nearestTimeIndex, shadeStats } from "@/lib/terrain/shade";
import { decodeElevationGrid, decodeShadeGrid, type ElevationGrid, type ShadeGrid } from "@/lib/terrain/grid-codec";

// 対象地区: 台東区 上野公園〜谷中（地点のみ固定。経路の形は保存しない）
const START: LatLng = { lat: 35.7148, lng: 139.7745 }; // 上野公園 噴水広場前
const CHECKPOINT: LatLng = { lat: 35.7278, lng: 139.7649 }; // 谷中銀座「夕やけだんだん」
const GOAL: LatLng = { lat: 35.7205, lng: 139.779 }; // 鶯谷駅

// 集計条件（再現性のため固定）
// 国土地理院コンテンツ利用規約（PDL1.0）の出典記載例に合わせ、加工元のページを示す
const GSI_TILES_URL = "https://maps.gsi.go.jp/development/ichiran.html";
const SAMPLE_INTERVAL_M = 10;
const SMOOTHING_WINDOW_SAMPLES = 3; // 移動平均30m
const GRADIENT_BASELINE_M = 10; // 勾配を評価する水平距離の下限

// Routes API が応答しないときに待つ上限。過ぎたら直線で評価する
const ROUTE_TIMEOUT_MS = 10_000;

const COLORS = { teal: "#1F6F78", amber: "#E8A33D", gray: "#8A93A3", ink: "#1B2433" };

type RouteStats = {
  label: string;
  path: LatLng[];
  lengthM: number;
  isFallback: boolean;
  slope: ReturnType<typeof slopeMetrics>;
  shade: { label: string; stats: ReturnType<typeof shadeStats> }[];
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; routes: RouteStats[]; shadeGrid: ShadeGrid; elevGrid: ElevationGrid };

// 期限までに決まらなければ null にする（Promise.all が永久に待たないように）
function withTimeout<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[route] ${ms}ms 以内に徒歩ルートが返らなかったため直線を表示します`);
      resolve(null);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

// 地形グリッドを取る。404 の HTML などを JSON として読ませない
async function fetchGrid(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`地形データを読み込めませんでした（HTTP ${r.status}）`);
  return r.text();
}

// Routes API（徒歩）で道に沿った経路を取る。失敗したら null（RouteMap と同じ方式）
async function walkingRoute(origin: LatLng, destination: LatLng, via: LatLng[] = []): Promise<LatLng[] | null> {
  try {
    const { Route } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      intermediates: via.map((location) => ({ location })),
      travelMode: "WALKING",
      fields: ["path"],
    });
    const pts = routes?.[0]?.path;
    return pts && pts.length > 1 ? pts.map((p) => ({ lat: p.lat, lng: p.lng })) : null;
  } catch (e) {
    console.warn("[route] 徒歩ルートを取れなかったため直線を表示します", e);
    return null;
  }
}

function analyze(label: string, rawPath: LatLng[], isFallback: boolean, elev: ElevationGrid, shade: ShadeGrid): RouteStats {
  const { points, distM } = samplePolyline(rawPath, SAMPLE_INTERVAL_M);
  const elevationM = points.map((p) => sampleElevation(elev, p));
  const slope = slopeMetrics(
    { distM, elevationM },
    { smoothingWindowSamples: SMOOTHING_WINDOW_SAMPLES, gradientBaselineM: GRADIENT_BASELINE_M },
  );
  return {
    label,
    path: points,
    lengthM: distM.reduce((a, b) => a + b, 0),
    isFallback,
    slope,
    shade: shade.times.map((t, i) => ({ label: t.label, stats: shadeStats(shade, points, { distM }, i) })),
  };
}

export default function TerrainCompare() {
  const mapEl = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [elevJson, shadeJson] = await Promise.all([
          fetchGrid("/terrain/ueno-yanaka.elevation.json"),
          fetchGrid("/terrain/ueno-yanaka.shade.json"),
        ]);
        const elev = decodeElevationGrid(elevJson);
        const shade = decodeShadeGrid(shadeJson);

        let direct: LatLng[] | null = null;
        let detour: LatLng[] | null = null;
        try {
          await loadGoogleMaps();
          [direct, detour] = await Promise.all([
            withTimeout(walkingRoute(START, GOAL), ROUTE_TIMEOUT_MS),
            withTimeout(walkingRoute(START, GOAL, [CHECKPOINT]), ROUTE_TIMEOUT_MS),
          ]);
        } catch (e) {
          console.warn("[route] 地図の読み込みに失敗したため直線を表示します", e);
        }
        if (cancelled) return;

        const routes = [
          analyze("最短ルート", direct ?? [START, GOAL], direct === null, elev, shade),
          analyze("寄り道ルート", detour ?? [START, CHECKPOINT, GOAL], detour === null, elev, shade),
        ];
        if (cancelled) return;
        setState({ kind: "ready", routes, shadeGrid: shade, elevGrid: elev });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const detail = e instanceof Error ? e.message : String(e);
          setState({ kind: "error", message: detail.startsWith("地形データ") ? detail : `データの読み込みに失敗しました: ${detail}` });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 経路が取れたあとに地図へ描画
  useEffect(() => {
    if (state.kind !== "ready" || !mapEl.current) return;
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        const { Map, Polyline } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
        if (cancelled || !mapEl.current) return;
        const map = new Map(mapEl.current, {
          mapId: "DEMO_MAP_ID",
          center: START,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        const [a, b] = state.routes;
        new Polyline({ map, path: a.path, strokeColor: COLORS.gray, strokeWeight: 5, strokeOpacity: 0.9 });
        new Polyline({
          map,
          path: b.path,
          strokeOpacity: 0,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: COLORS.teal, strokeWeight: 4, scale: 2 }, offset: "0", repeat: "10px" }],
        });
        const pin = (pos: LatLng, color: string, title: string, glyph?: string) => {
          const p = new PinElement({ background: color, borderColor: "#fff", glyphColor: "#fff", glyph });
          new AdvancedMarkerElement({ map, position: pos, content: p.element, title });
        };
        pin(START, COLORS.ink, "出発地（上野公園）");
        pin(CHECKPOINT, COLORS.teal, "寄り道先（谷中銀座）", "1");
        pin(GOAL, COLORS.amber, "到着地（鶯谷駅）");

        const bounds = new google.maps.LatLngBounds();
        [...a.path, ...b.path, START, CHECKPOINT, GOAL].forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      } catch (e) {
        console.warn("[map] 地図を描画できません（キー未設定や制限でも数値は見られます）", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.kind === "error") {
    return <main className="p-6 text-sm">{state.message}</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4" style={{ color: COLORS.ink }}>
      <header>
        <a href="/walk" className="text-sm underline opacity-70">
          ← 寄り道コンパスの画面に戻る
        </a>
        <h1 className="mt-1 text-xl font-bold">坂・日陰ルート比較（上野公園〜谷中〜鶯谷）</h1>
        <p className="mt-1 text-sm opacity-80">
          最短ルートと、谷中銀座に寄り道するルートを比較します。出発地・寄り道先・到着地は固定です。
        </p>
        <p className="mt-1 text-sm opacity-80">
          値はすべて公開データに基づく推定値で、現地では確かめていません。評価できなかった区間は「不明区間」として出します。
        </p>
      </header>

      <div ref={mapEl} className="h-[45vh] w-full rounded-xl bg-neutral-100" />
      <p className="-mt-2 text-xs opacity-60">実線=最短ルート / 点線=寄り道ルート（地図: Google Maps）</p>

      {state.kind === "loading" && <p className="text-sm">経路と地形データを読み込み中…</p>}

      {state.kind === "ready" && (
        <>
          {state.routes.some((r) => r.isFallback) && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
              Routes API で経路を取れなかったため直線で評価しています（キー未設定・API 未有効・通信失敗など）。
            </p>
          )}
          <ComparisonTable routes={state.routes} shadeTimes={state.shadeGrid.times} />
          <Methodology shadeTimes={state.shadeGrid.times} />
        </>
      )}
    </main>
  );
}

function fmt(v: number | null, unit: string, digits = 0): string {
  return v === null ? "不明" : `${v.toFixed(digits)}${unit}`;
}

function pct(v: number | null): string {
  return v === null ? "不明" : `${(v * 100).toFixed(0)}%`;
}

function ComparisonTable({ routes, shadeTimes }: { routes: RouteStats[]; shadeTimes: ShadeGrid["times"] }) {
  // 日陰率の時刻。既定は現在時刻（JST）に最も近いもの
  const [timeIndex, setTimeIndex] = useState(() => nearestTimeIndex(shadeTimes, new Date()));
  const rows: { key: string; label: ReactNode; get: (r: RouteStats) => string }[] = [
    { key: "距離", label: "距離", get: (r) => fmt(r.lengthM, "m") },
    { key: "累積上昇量", label: "累積上昇量", get: (r) => fmt(r.slope.ascentM, "m", 1) },
    { key: "累積下降量", label: "累積下降量", get: (r) => fmt(r.slope.descentM, "m", 1) },
    { key: "推定最大勾配", label: "推定最大勾配", get: (r) => fmt(r.slope.maxGradientPct, "%", 1) },
    {
      key: "推定日陰率",
      label: (
        <label className="flex items-center gap-1">
          推定日陰率
          <select
            aria-label="日陰を評価する時刻"
            className="rounded border border-neutral-300 bg-white px-1 py-0.5 text-sm"
            value={timeIndex}
            onChange={(e) => setTimeIndex(Number(e.target.value))}
          >
            {shadeTimes.map((t, i) => (
              <option key={t.at} value={i}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ),
      get: (r) => pct(r.shade[timeIndex]?.stats.shadeRatio ?? null),
    },
    { key: "評価済み区間率（標高）", label: "評価済み区間率（標高）", get: (r) => pct(r.slope.coverage) },
    { key: "評価済み区間率（日陰）", label: "評価済み区間率（日陰）", get: (r) => pct(r.shade[timeIndex]?.stats.coverage ?? null) },
    { key: "不明区間（標高）", label: "不明区間（標高）", get: (r) => pct(1 - r.slope.coverage) },
    {
      key: "不明区間（日陰）",
      label: "不明区間（日陰）",
      get: (r) => pct(r.shade[timeIndex] ? 1 - r.shade[timeIndex].stats.coverage : null),
    },
  ];

  return (
    <>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2 font-medium"></th>
            {routes.map((r) => (
              <th key={r.label} className="py-2 pr-2 font-medium">
                {r.label}
                {r.isFallback && <span className="ml-1 text-xs font-normal opacity-60">（直線）</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-neutral-200">
              <td className="py-2 pr-2 opacity-70">{row.label}</td>
              {routes.map((r) => (
                <td key={r.label} className="py-2 pr-2 font-semibold">
                  {row.get(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs opacity-70">
        「不明」・「不明区間」は、データの欠損や対象範囲外で評価できなかった区間です（0 としては扱っていません）。
      </p>
    </>
  );
}

function Methodology({ shadeTimes }: { shadeTimes: ShadeGrid["times"] }) {
  const shadeDate = shadeTimes[0]?.at.slice(0, 10) ?? "不明";
  const shadeRange = shadeTimes.length > 0 ? `${shadeTimes[0].label}〜${shadeTimes[shadeTimes.length - 1].label}` : "不明";
  return (
    <details className="rounded-xl border border-neutral-200 p-3 text-xs leading-relaxed">
      <summary className="cursor-pointer font-semibold">計算方法・出典・注意点</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          この画面の値はすべて<strong>公開データに基づく推定値・現地未検証</strong>です。段差・幅員・橋・地下道などの
          通行可否は表示も保証もしません。
        </li>
        <li>
          経路: Google Maps Routes API（徒歩）で表示のたびに取得。経路の形は保存していません。取れないときは出発地・
          寄り道先・到着地を結ぶ直線で評価します。
        </li>
        <li>
          坂: 国土地理院 標高タイル（数値標高モデル5mメッシュ・基盤地図情報）を10m間隔に間引いた地区グリッドから、
          経路を{SAMPLE_INTERVAL_M}m間隔でサンプリングし双線形補間。推定勾配(%)=標高差/水平距離×100、
          移動平均{SMOOTHING_WINDOW_SAMPLES * SAMPLE_INTERVAL_M}mで平滑化。最大勾配は水平距離{GRADIENT_BASELINE_M}m以上の区間ごとの
          最大値のため、擁壁・段差では実際の歩道より大きく出ることがあります。水域・線路敷など標高の無い区間は
          補完せず「評価済み区間率」として別に出します。
        </li>
        <li>
          日陰: PLATEAU 台東区 CityGML（2024年度、LOD1 の建物形状と棟頂）と、NOAA の太陽位置近似式から、
          {shadeDate} の {shadeRange}（JST、{shadeTimes.length}時刻）の日陰グリッドを事前計算。
          日陰率=日陰と判定した評価済み長/評価済み長。樹木・庇・高架下は含みません。夜間は評価しません。
        </li>
        <li>
          出典: 地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成（
          <a className="underline" href={GSI_TILES_URL} target="_blank" rel="noreferrer">
            国土地理院
          </a>
          ）/ Project PLATEAU（国土交通省、CC BY 4.0）/ Google Maps Platform（経路・地図）
        </li>
      </ul>
    </details>
  );
}
