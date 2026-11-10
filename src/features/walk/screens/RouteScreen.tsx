"use client";

import { useEffect, useState } from "react";

import GoogleRouteMap from "@/components/RouteMap";
import { MAPS_API_KEY } from "@/lib/google-maps";
import { QuestFailure } from "@/lib/quests";
import { IconName, IconSticker, ScreenHeading, Tone } from "@/components/sticker";

import { MapVariant, RouteMap } from "../components/RouteMap";
import { questsOf } from "../content";
import { eta, QuestSource, type WalkAction, type WalkState } from "../flow";
import { RouteStops } from "../route-stops/RouteStops";
import { summarizeLegs, type Leg } from "../terrain/legs";
import { loadTerrainGrids } from "../terrain/grids";

type RouteScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
  /** Google Maps の地図を使う。キーがない・読み込みに失敗したときは手描きの地図にする。 */
  realMap?: boolean;
};


/** AI が使えなかった原因ごとの、見本に切り替えたことの知らせ。 */
const FALLBACK_REASON: Record<QuestFailure, string> = {
  [QuestFailure.Timeout]: "AIの応答が時間内に届かなかった",
  [QuestFailure.InvalidOutput]: "AIの応答の形が正しくなかった",
  [QuestFailure.Upstream]: "AIの呼び出しに失敗した",
  [QuestFailure.Config]: "AIの設定・認証に失敗した",
  [QuestFailure.Network]: "通信に失敗した",
  [QuestFailure.RateLimited]: "短い時間にAIを呼びすぎた（1分ほど待つとまた使えます）",
};

const fallbackNotice = (failure: QuestFailure | undefined): string =>
  `${failure ? FALLBACK_REASON[failure] : "AIがうまく動かなかった"}ため、サンプルのクエストを表示しています（AIが作ったものではありません）`;

/** AI が作ったクエストであることの知らせ。地点の実在や内容は現地で確かめていない。 */
export const AI_NOTICE = "Gemini（AI）が作ったクエストです。地点や内容は現地で確かめていません";
/** live でないときの、見本のクエストであることの知らせ。 */
export const SAMPLE_NOTICE = "サンプルのクエストを表示しています（AIが作ったものではありません）";
/** 手描きの地図が実際の道順ではないことの知らせ（地図キーなし・読み込み失敗のとき）。 */
export const HAND_DRAWN_MAP_NOTE = "手描きのイメージ図です（実際の道順・混雑からは描いていません）";
/** 坂・日陰の比較が、いまの寄り道ルートではなく固定デモ経路の推定値であることの知らせ。 */
export const TERRAIN_DEMO_NOTE =
  "比較するのは上野公園〜谷中〜鶯谷の固定デモ経路です（いまの寄り道ルートとは別）。値は公開データからの推定値で現地は未検証。評価できない区間は「不明区間」として出ます";

/** クエストの出どころ（AI・見本・AI 失敗で見本）を知らせる文。 */
export const sourceNotice = (plan: WalkState["plan"]): string | null => {
  switch (plan?.source) {
    case QuestSource.Ai:
      return AI_NOTICE;
    case QuestSource.Sample:
      return SAMPLE_NOTICE;
    case QuestSource.Fallback:
      return fallbackNotice(plan.failure);
    default:
      return null;
  }
};
const BACK_SIZE = 44;

type DrawnRoutes = {
  direct: google.maps.LatLngLiteral[];
  detour: google.maps.LatLngLiteral[];
  straight: boolean;
  /** 出発地・地点1〜3・目的地。 */
  stops: google.maps.LatLngLiteral[];
};

/** 地図に描いた寄り道ルートを、地点ごとの区間に分けて坂・日陰・徒歩時間を出す。読み込み前・失敗時は空。 */
const useLegs = (routes: DrawnRoutes | null): readonly Leg[] => {
  const [result, setResult] = useState<{ routes: DrawnRoutes; legs: Leg[] } | null>(null);
  useEffect(() => {
    if (!routes) return;
    let cancelled = false;
    loadTerrainGrids()
      .then((g) => {
        if (!cancelled) setResult({ routes, legs: summarizeLegs(routes.detour, routes.stops, g.elev, g.shade) });
      })
      .catch(() => {
        if (!cancelled) setResult({ routes, legs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [routes]);
  return routes && result?.routes === routes ? result.legs : [];
};

/** 小さめの地図と、通る地点のリストを上下に並べる画面。 */
export const RouteScreen = ({ state, dispatch, realMap = false }: RouteScreenProps): React.ReactElement => {
  const [mapFailed, setMapFailed] = useState(false);
  const [routes, setRoutes] = useState<DrawnRoutes | null>(null);
  const quests = questsOf(state);
  const useGoogleMap = realMap && MAPS_API_KEY !== "" && !mapFailed;
  const notice = sourceNotice(state.plan);
  const legs = useLegs(useGoogleMap ? routes : null);
  const extra = eta(state.budget).extra;

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeading className="sr-only">寄り道ルート</ScreenHeading>
      <div className="relative h-56 shrink-0 overflow-hidden border-b border-line">
        {useGoogleMap ? (
          <GoogleRouteMap
            dest={state.dest}
            places={state.plan?.quests.map((q) => q.checkpoint)}
            step={state.step}
            onOrder={(order) => dispatch({ type: "reorder", order })}
            onRoutes={setRoutes}
            onError={() => setMapFailed(true)}
            fitPadding={{ top: 56, right: 32, bottom: 24, left: 32 }}
          />
        ) : (
          <RouteMap step={state.step} dest={state.dest} variant={MapVariant.Full} className="absolute inset-0" />
        )}
        <button
          type="button"
          aria-label="入力に戻る"
          onClick={() => dispatch({ type: "backToInput" })}
          className="absolute top-3 left-3 rounded-full transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:focus-ring"
        >
          <IconSticker name={IconName.Back} tone={Tone.Sky} size={BACK_SIZE} />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-5 pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line px-3 py-1 font-note text-xs text-ink-soft">
            {state.dest.trim() || "目的地"}まで +{extra}分
          </span>
          {state.care.slope ? <span className="rounded-full border border-accent bg-accent-soft px-3 py-1 font-note text-xs text-ink">坂少なめ</span> : null}
          {state.care.shade ? <span className="rounded-full border border-accent bg-accent-soft px-3 py-1 font-note text-xs text-ink">日陰多め</span> : null}
        </div>

        <RouteStops
          quests={quests}
          step={state.step}
          legs={legs}
          onCapture={() => dispatch({ type: "openCapture" })}
          onFound={() => dispatch({ type: "found" })}
        />

        <div className="flex flex-col gap-1.5">
          {notice ? (
            <p role="status" className="font-note text-xs leading-relaxed text-ink-soft">
              {notice}
            </p>
          ) : null}
          {useGoogleMap ? null : <p className="font-note text-xs leading-relaxed text-ink-soft">{HAND_DRAWN_MAP_NOTE}</p>}
          <p className="font-note text-xs leading-relaxed text-ink-soft">
            地図の点線が寄り道、線が最短。坂・日陰は夏の午前10時の推定値（公開データから計算、現地未検証・段差や道幅は分かりません）
          </p>
        </div>

        <a
          href="/terrain"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col gap-1.5 rounded-(--radius-chip) border border-dashed border-line px-4 py-3 transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:focus-ring"
        >
          <span className="font-hand text-sm text-ink">坂・日陰を比べる（固定デモ経路・別タブで開く）</span>
          <span className="font-note text-xs leading-relaxed text-ink-soft">{TERRAIN_DEMO_NOTE}</span>
        </a>
      </div>
    </div>
  );
};
