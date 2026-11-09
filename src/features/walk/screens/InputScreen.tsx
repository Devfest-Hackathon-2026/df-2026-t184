"use client";

import type { FormEvent } from "react";

import { ButtonSize, ScreenHeading, StickerButton, TextField } from "@/components/sticker";

import { BudgetPicker } from "../components/BudgetPicker";
import { EtaNote } from "../components/EtaNote";
import { MoodPicker } from "../components/MoodPicker";
import type { WalkAction, WalkState } from "../flow";

type InputScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
};

const DEST_ID = "walk-dest";

/** 行き先・気分・寄り道時間を決めて、寄り道ルートを頼む最初の画面。 */
export const InputScreen = ({ state, dispatch }: InputScreenProps): React.ReactElement => {
  const canStart = state.dest.trim() !== "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    dispatch({ type: "start" });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-5">
      <header className="flex flex-col gap-1 pt-4">
        <ScreenHeading className="font-hand text-2xl leading-snug text-ink">最短じゃない道で、まだ知らない街へ</ScreenHeading>
        <p className="font-note text-sm text-fg-subtle">今日はどんな気分で歩く？</p>
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
