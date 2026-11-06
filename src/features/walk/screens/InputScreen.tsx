"use client";

import type { FormEvent } from "react";

import { BubbleTail, ButtonSize, Doodle, DoodleKind, Mascot, MascotMood, SpeechBubble, StickerButton, Tape, TextField, Tone } from "@/components/sticker";

import { BudgetPicker } from "../components/BudgetPicker";
import { EtaNote } from "../components/EtaNote";
import { MoodPicker } from "../components/MoodPicker";
import type { WalkAction, WalkState } from "../flow";

type InputScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
};

const DEST_ID = "walk-dest";
const MASCOT_SIZE = 96;
const STAR_SIZE = 22;
const WAVE_SIZE = 36;
const TAPE_ANGLE = 7;

/** 行き先・気分・寄り道時間を決めて、寄り道ルートを頼む最初の画面。 */
export const InputScreen = ({ state, dispatch }: InputScreenProps): React.ReactElement => {
  const canStart = state.dest.trim() !== "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    dispatch({ type: "start" });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3 pt-2">
          <Mascot mood={MascotMood.Idle} size={MASCOT_SIZE} className="shrink-0 rotate-(--tilt-mascot)" />
          <div className="flex flex-1 flex-col gap-1">
            <SpeechBubble tail={BubbleTail.Left}>今日はどんな気分で歩く？</SpeechBubble>
            <div aria-hidden="true" className="flex items-center justify-end gap-2 pr-2">
              <Doodle kind={DoodleKind.Star} color="var(--color-lemon-deep)" size={STAR_SIZE} />
              <Doodle kind={DoodleKind.Wave} color="var(--color-sky-deep)" size={WAVE_SIZE} />
            </div>
          </div>
        </div>
        <div className="relative pt-10">
          <Tape tone={Tone.Pink} angle={TAPE_ANGLE} className="top-0 right-4" />
          <h1 className="font-hand text-2xl leading-snug text-ink">最短じゃない道で、まだ知らない街へ</h1>
        </div>
      </header>

      <TextField
        id={DEST_ID}
        label="行き先"
        placeholder="例：上野公園"
        autoComplete="off"
        value={state.dest}
        onChange={(event) => dispatch({ type: "setDest", dest: event.target.value })}
      />
      <MoodPicker value={state.mood} onChange={(mood) => dispatch({ type: "pickMood", mood })} />
      <BudgetPicker value={state.budget} onChange={(budget) => dispatch({ type: "pickBudget", budget })} />
      <EtaNote budget={state.budget} />

      <StickerButton type="submit" size={ButtonSize.Lg} disabled={!canStart} className="mt-auto w-full">
        寄り道ルートを作る
      </StickerButton>
    </form>
  );
};
