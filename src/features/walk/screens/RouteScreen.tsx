"use client";

import { useState } from "react";

import GoogleRouteMap from "@/components/RouteMap";
import { MAPS_API_KEY } from "@/lib/google-maps";
import { QuestFailure } from "@/lib/quests";
import { IconName, IconSticker, ScreenHeading, Tone } from "@/components/sticker";

import { QuestSheet } from "../components/QuestSheet";
import { MapVariant, RouteMap } from "../components/RouteMap";
import { questsOf } from "../content";
import { CHECKPOINTS, QuestSource, type WalkAction, type WalkState } from "../flow";

type RouteScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
  /** Google Maps の地図を使う。キーがない・読み込みに失敗したときは手描きの地図にする。 */
  realMap?: boolean;
};

const LAST_INDEX = CHECKPOINTS - 1;

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

/** 凡例の線見本。地図と同じ色・太さで、点線が寄り道、薄い線が最短。 */
const LegendLine = ({ dotted }: { dotted: boolean }): React.ReactElement => (
  <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6 shrink-0" fill="none" strokeLinecap="round">
    {dotted ? (
      <path d="M2 4 H22" stroke="var(--color-pink-deep)" strokeWidth="4" strokeDasharray="0.1 6" />
    ) : (
      <path d="M2 4 H22" stroke="var(--color-ink-soft)" strokeWidth="2.5" />
    )}
  </svg>
);

/** 手描きの地図と、いまの地点のクエストを上下に並べる画面。 */
export const RouteScreen = ({ state, dispatch, realMap = false }: RouteScreenProps): React.ReactElement => {
  const [mapFailed, setMapFailed] = useState(false);
  const quest = questsOf(state)[Math.min(state.step, LAST_INDEX)];
  const useGoogleMap = realMap && MAPS_API_KEY !== "" && !mapFailed;
  const notice = sourceNotice(state.plan);
  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeading className="sr-only">寄り道ルート</ScreenHeading>
      <div className="relative min-h-80 flex-1 overflow-hidden border-b border-line">
        {useGoogleMap ? (
          <GoogleRouteMap
            dest={state.dest}
            places={state.plan?.quests.map((q) => q.checkpoint)}
            step={state.step}
            onOrder={(order) => dispatch({ type: "reorder", order })}
            onError={() => setMapFailed(true)}
          />
        ) : (
          <RouteMap step={state.step} dest={state.dest} variant={MapVariant.Full} className="absolute inset-0" />
        )}
        <button
          type="button"
          aria-label="入力に戻る"
          onClick={() => dispatch({ type: "backToInput" })}
          className="absolute top-4 left-4 rounded-full transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:focus-ring"
        >
          <IconSticker name={IconName.Back} tone={Tone.Sky} size={BACK_SIZE} />
        </button>
        <div className="absolute top-4 right-4 flex border border-line flex-col gap-1 rounded-(--radius-chip) bg-sticker px-3 py-2 shadow-sticker-sm">
          <p className="flex items-center gap-2 font-note text-xs text-ink">
            <LegendLine dotted />
            点線が寄り道
          </p>
          <p className="flex items-center gap-2 font-note text-xs text-ink">
            <LegendLine dotted={false} />
            線が最短
          </p>
          {/* 混雑は Google の地図でも計算していないので、イメージ図のときだけ出す。 */}
          {useGoogleMap ? null : <p className="font-note text-xs text-coral-ink">混雑を回避（イメージ）</p>}
        </div>
      </div>
      {useGoogleMap ? null : <p className="mx-3 mt-3 font-note text-xs text-ink-soft">{HAND_DRAWN_MAP_NOTE}</p>}
      {notice ? (
        <p role="status" className="mx-3 mt-3 rounded-(--radius-chip) border border-line bg-sticker px-3 py-2 font-note text-xs text-ink">
          {notice}
        </p>
      ) : null}
      <a
        href="/terrain"
        target="_blank"
        rel="noreferrer"
        className="mx-3 mt-3 mb-8 flex flex-col gap-1 rounded-(--radius-chip) border border-line bg-sticker px-3 py-2 shadow-sticker-sm transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:focus-ring"
      >
        <span className="flex items-center gap-2 font-hand text-sm text-ink">
          <IconSticker name={IconName.Pin} tone={Tone.Mint} size={28} />
          坂・日陰を比べる（別タブで開く）
        </span>
        <span className="font-note text-xs text-ink-soft">{TERRAIN_DEMO_NOTE}</span>
      </a>
      <div className="relative z-10 -mt-6 px-3 pb-3">
        <QuestSheet
          quest={quest}
          step={state.step}
          mood={state.mood}
          onCapture={() => dispatch({ type: "openCapture" })}
          onFound={() => dispatch({ type: "found" })}
        />
      </div>
    </div>
  );
};
