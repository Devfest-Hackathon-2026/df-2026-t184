"use client";

import { useState } from "react";

import GoogleRouteMap from "@/components/RouteMap";
import { MAPS_API_KEY } from "@/lib/google-maps";
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
          <p className="font-note text-xs text-coral-ink">混雑を回避</p>
        </div>
      </div>
      {state.plan?.source === QuestSource.Fallback ? (
        <p role="status" className="mx-3 mt-3 rounded-(--radius-chip) border border-line bg-sticker px-3 py-2 font-note text-xs text-ink">
          AIがうまく動かなかったため、サンプルのクエストを表示しています
        </p>
      ) : null}
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
