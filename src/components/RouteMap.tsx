"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

type LatLng = google.maps.LatLngLiteral;

// 位置情報が使えない・目的地が見つからない場合の既定値（サンプル）
const DEFAULT_START: LatLng = { lat: 35.6812, lng: 139.7671 }; // 東京駅
const DEFAULT_DEST = "上野公園";

const COLORS = { teal: "#1F6F78", amber: "#E8A33D", gray: "#8A93A3", ink: "#1B2433" };

function getStart(): Promise<LatLng> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(DEFAULT_START);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(DEFAULT_START),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}

// strict: 一部だけ一致した結果（partial_match）は捨てる。Gemini が作った存在しない場所名を検索すると、
// 後ろに付けた目的地名だけに一致して、目的地と同じ位置が返ってくるため
async function geocode(text: string, strict = false): Promise<LatLng | null> {
  const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
  try {
    const res = await new Geocoder().geocode({ address: text || DEFAULT_DEST, region: "JP" });
    if (strict && res.results[0]?.partial_match) return null;
    const loc = res.results[0]?.geometry.location;
    return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
  } catch {
    return null;
  }
}

function distKm(a: LatLng, b: LatLng): number {
  const dy = (a.lat - b.lat) * 111;
  const dx = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

// 出発地→目的地の間に、横にずらしたチェックポイントを3つ置く（仮置き。ルート生成APIにつなぐまでのサンプル）
function sampleCheckpoints(a: LatLng, b: LatLng): LatLng[] {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const offsets = [0.22, -0.2, 0.18];
  return [0.25, 0.55, 0.8].map((t, i) => ({
    lat: a.lat + dLat * t - dLng * offsets[i],
    lng: a.lng + dLng * t + dLat * offsets[i],
  }));
}

type Props = {
  dest: string;
  places?: string[]; // チェックポイント名（Gemini の提案）。地名検索で座標にする
  step: number; // 0..3（達成済みチェックポイント数）
  onOrder?: (order: number[]) => void; // 出発地→目的地の順に並べ替えたとき、元の places の何番目かを知らせる
  onError: () => void;
};

// Routes API（徒歩）で、道に沿った経路の点列を取る。失敗したら null
async function walkingRoute(origin: LatLng, destination: LatLng, via: LatLng[] = []): Promise<LatLng[] | null> {
  try {
    const { Route } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
    const { routes } = await Route.computeRoutes({ origin, destination, intermediates: via.map((location) => ({ location })), travelMode: "WALKING", fields: ["path"] });
    const pts = routes?.[0]?.path;
    return pts && pts.length > 1 ? pts.map((p) => ({ lat: p.lat, lng: p.lng })) : null;
  } catch (e) {
    console.warn("[route] 徒歩ルートを取れなかったため直線を表示します", e);
    return null;
  }
}

// 同じ区間を何度も取り直さないためのキャッシュ（画面の行き来や開発時の2重実行で、呼び出し回数＝費用が増えるのを防ぐ）。
// Promise ごと保存するので、同時に2回呼ばれてもリクエストは1回になる
const routeCache = new Map<string, Promise<LatLng[] | null>>();

function walkingRouteCached(origin: LatLng, destination: LatLng, via: LatLng[] = []): Promise<LatLng[] | null> {
  const key = JSON.stringify([origin, destination, via]);
  let hit = routeCache.get(key);
  if (!hit) {
    hit = walkingRoute(origin, destination, via);
    routeCache.set(key, hit);
    // 失敗（null）は残さない。次に開いたときに再試行できるようにする
    hit.then((r) => {
      if (r === null) routeCache.delete(key);
    });
  }
  return hit;
}

// 出発地→目的地の線の上で、どれくらい進んだ位置か（0=出発地、1=目的地）
function progress(a: LatLng, b: LatLng, p: LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len2 = dx * dx + dy * dy;
  return len2 === 0 ? 0 : ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2;
}

export default function RouteMap({ dest, places, step, onOrder, onError }: Props) {
  const onOrderRef = useRef(onOrder);
  onOrderRef.current = onOrder;
  const placesKey = places?.join("|") ?? "";
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<{ cps: google.maps.marker.PinElement[]; me?: google.maps.marker.AdvancedMarkerElement; path: LatLng[] }>({ cps: [], path: [] });
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      try {
        await loadGoogleMaps();
        const [{ Map, Polyline }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        const [start, end] = await Promise.all([getStart(), geocode(dest)]);
        if (cancelled || !el.current) return;
        const goal = end ?? { lat: 35.7148, lng: 139.7745 }; // 上野公園付近
        // 提案された場所を目的地の周辺で検索。見つからない・遠すぎるものは仮の位置にする
        const fallback = sampleCheckpoints(start, goal);
        const found = placesKey
          ? await Promise.all(placesKey.split("|").map((p) => geocode(`${p} ${dest || DEFAULT_DEST}`, true)))
          : [];
        if (cancelled || !el.current) return;
        const found3 = fallback.map((f, i) => {
          const g = found[i];
          // 目的地と同じ位置（50m未満）は、場所が見つからず目的地に一致しただけとみなして捨てる
          return g && distKm(g, goal) < 5 && distKm(g, goal) > 0.05 ? g : f;
        });
        // 行ったり来たりしないよう、出発地から目的地へ向かう順に並べる（クエストの順番も呼び出し側で揃える）
        const order = found3.map((_, i) => i).sort((x, y) => progress(start, goal, found3[x]) - progress(start, goal, found3[y]));
        const cps = order.map((i) => found3[i]);
        onOrderRef.current?.(order);
        const path = [start, ...cps, goal];
        markers.current.path = path;
        // 調整用：ピンが重なって見えないときの手がかり（座標は公開情報。キーは含まない）
        const r4 = (p: LatLng) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        console.info(`[map] 出発 ${r4(start)} / ピン ${cps.map(r4).join(" ・ ")} / 目的地 ${r4(goal)}（${dest || "未入力"}）`);

        // 下のカードの高さに合わせて、地図の枠の下端を決める（カードの高さが変わっても追従）
        const mapEl = el.current;
        const card = mapEl.parentElement?.querySelector<HTMLElement>("[data-route-card]");
        const fitToCard = () => {
          mapEl.style.bottom = `${card?.offsetHeight ?? 360}px`;
        };
        fitToCard();
        if (card) {
          ro = new ResizeObserver(fitToCard);
          ro.observe(card);
        }

        const map = new Map(el.current, {
          mapId: "DEMO_MAP_ID",
          center: start,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });

        // 最短ルート（実線）と寄り道ルート（点線）。まず直線で描き、徒歩ルートが取れたら線だけ差し替える
        // （Routes API の応答を待たずに地図を出す。遅い・失敗のときも直線のまま動く）
        const directLine = new Polyline({ map, path: [start, goal], strokeColor: COLORS.gray, strokeWeight: 5, strokeOpacity: 0.9 });
        const detourLine = new Polyline({
          map,
          path,
          strokeOpacity: 0,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: COLORS.teal, strokeWeight: 4, scale: 2 }, offset: "0", repeat: "10px" }],
        });

        new AdvancedMarkerElement({ map, position: goal, content: new PinElement({ background: COLORS.amber, borderColor: "#fff", glyphColor: "#fff" }).element, title: "目的地" });

        markers.current.cps = cps.map((pos, i) => {
          const pin = new PinElement({ glyph: String(i + 1), glyphColor: "#fff", borderColor: "#fff" });
          new AdvancedMarkerElement({ map, position: pos, content: pin.element, title: `チェックポイント${i + 1}` });
          return pin;
        });

        const dotEl = document.createElement("div");
        dotEl.style.cssText = `width:16px;height:16px;border-radius:50%;background:${COLORS.ink};border:3px solid #fff;box-shadow:0 0 0 8px rgba(27,36,51,.15)`;
        markers.current.me = new AdvancedMarkerElement({ map, position: start, content: dotEl, title: "現在地", zIndex: 10 });

        const bounds = new google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        // 地図の枠そのものを「下のカードより上」だけにする。余白の計算に頼らず、見える範囲にぴったり収まる
        map.fitBounds(bounds, { top: 100, right: 40, bottom: 40, left: 40 });
        // 2点が近いと寄りすぎるので、拡大しすぎないようにする
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
        });
        paint(stepRef.current);

        // 道に沿った徒歩ルート。取れたら線だけ差し替える。取れなければ（API未有効・キー制限・通信失敗）直線のまま
        const [direct, detour] = await Promise.all([walkingRouteCached(start, goal), walkingRouteCached(start, goal, cps)]);
        if (cancelled) return;
        if (direct) directLine.setPath(direct);
        if (detour) detourLine.setPath(detour);
      } catch (e) {
        console.error(e);
        if (!cancelled) onError();
      }
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, placesKey]);

  function paint(s: number) {
    const { cps, me, path } = markers.current;
    cps.forEach((pin, i) => {
      pin.background = s > i ? COLORS.teal : s === i ? COLORS.amber : COLORS.gray;
    });
    if (me) me.position = path[Math.min(s, 3)];
  }

  useEffect(() => paint(step), [step]);

  return <div ref={el} role="application" aria-label="寄り道ルートの地図" style={{ position: "absolute", left: 0, top: 0, right: 0 }} />;
}
