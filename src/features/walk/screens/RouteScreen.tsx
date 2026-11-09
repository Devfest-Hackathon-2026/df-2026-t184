"use client";

import { IconName, IconSticker, Mascot, MascotMood, Tone } from "@/components/sticker";

import { QuestSheet } from "../components/QuestSheet";
import { MapVariant, RouteMap } from "../components/RouteMap";
import { moodById } from "../content";
import { CHECKPOINTS, type WalkAction, type WalkState } from "../flow";

type RouteScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
};

const LAST_INDEX = CHECKPOINTS - 1;
const BACK_SIZE = 44;
const MASCOT_SIZE = 76;

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
export const RouteScreen = ({ state, dispatch }: RouteScreenProps): React.ReactElement => {
  const quest = moodById(state.mood).quests[Math.min(state.step, LAST_INDEX)];
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative min-h-80 flex-1 overflow-hidden border-b-3 border-ink">
        <RouteMap step={state.step} dest={state.dest} variant={MapVariant.Full} className="absolute inset-0" />
        <button
          type="button"
          aria-label="入力に戻る"
          onClick={() => dispatch({ type: "restart" })}
          className="absolute top-4 left-4 rounded-full transition-transform duration-150 ease-out hover:-translate-y-0.5 active:animate-jelly focus-visible:focus-ring"
        >
          <IconSticker name={IconName.Back} tone={Tone.Sky} size={BACK_SIZE} />
        </button>
        <div className="absolute top-4 right-4 flex border-3 border-ink rotate-(--tilt-right) flex-col gap-1 rounded-(--radius-chip) bg-sticker px-3 py-2 shadow-sticker-sm">
          <p className="flex items-center gap-2 font-note text-xs text-ink">
            <LegendLine dotted />
            点線が寄り道
          </p>
          <p className="flex items-center gap-2 font-note text-xs text-ink">
            <LegendLine dotted={false} />
            線が最短
          </p>
        </div>
      </div>
      <div className="relative z-10 -mt-6 px-3 pb-3">
        <QuestSheet
          quest={quest}
          step={state.step}
          onCapture={() => dispatch({ type: "openCapture" })}
          onFound={() => dispatch({ type: "found" })}
        />
        <Mascot mood={MascotMood.Cheer} size={MASCOT_SIZE} className="absolute -top-16 left-6 rotate-(--tilt-mascot)" />
      </div>
    </div>
  );
};
