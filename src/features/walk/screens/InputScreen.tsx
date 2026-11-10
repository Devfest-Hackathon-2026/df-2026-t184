"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ButtonSize, ScreenHeading, StickerButton, StickerCheckbox, TextField } from "@/components/sticker";

import { BudgetPicker } from "../components/BudgetPicker";
import { EtaNote } from "../components/EtaNote";
import { BotSays } from "../components/GuideBot";
import { MoodPicker } from "../components/MoodPicker";
import { moodById } from "../content";
import type { WalkAction, WalkState } from "../flow";

type InputScreenProps = {
  state: WalkState;
  dispatch: (action: WalkAction) => void;
};

enum Question {
  Dest = "dest",
  Mood = "mood",
  Budget = "budget",
}

type QuestionDef = {
  id: Question;
  /** キャラクターが吹き出しで聞く言葉。 */
  ask: string;
  /** 答えのチップに出す名前と中身。 */
  label: string;
  answerOf: (s: WalkState) => string;
};

const QUESTIONS: readonly QuestionDef[] = [
  { id: Question.Dest, ask: "今日はどこまで歩く？", label: "行き先", answerOf: (s) => s.dest.trim() },
  { id: Question.Mood, ask: "どんな気分の道がいい？", label: "気分", answerOf: (s) => moodById(s.mood).label },
  { id: Question.Budget, ask: "寄り道は何分までなら大丈夫？", label: "寄り道", answerOf: (s) => `+${s.budget}分` },
];

const LAST = QUESTIONS.length - 1;
const DEST_ID = "walk-dest";
// 質問が切り替わったら、その質問の最初の入力へフォーカスを移す。
const FOCUS_SELECTOR: Record<Question, string> = {
  [Question.Dest]: `#${DEST_ID}`,
  [Question.Mood]: 'input[name="walk-mood"]:checked',
  [Question.Budget]: 'input[name="walk-budget"]:checked',
};

/** キャラクターが 1 問ずつ聞き、進み具合のバーと一緒に進む最初の画面。 */
export const InputScreen = ({ state, dispatch }: InputScreenProps): React.ReactElement => {
  const [index, setIndex] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const question = QUESTIONS[index];
  const isLast = index === LAST;
  const canAdvance = question.id !== Question.Dest || state.dest.trim() !== "";

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    form.current?.querySelector<HTMLElement>(FOCUS_SELECTOR[question.id])?.focus();
  }, [question.id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canAdvance) return;
    if (isLast) dispatch({ type: "start" });
    else setIndex(index + 1);
  };

  return (
    <form ref={form} onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 p-5">
      <header className="flex flex-col gap-4 pt-2">
        <p aria-hidden="true" className="text-center font-hand text-3xl tracking-tight text-accent">yorimichi</p>
        <ScreenHeading className="font-hand text-base leading-snug text-ink">
          <span aria-hidden="true">→ </span>最短じゃない道で、まだ知らない街へ
        </ScreenHeading>
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="質問の進み具合"
            aria-valuemin={1}
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={index + 1}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }} />
          </div>
          <span className="font-note text-xs text-ink-soft tabular-nums">
            {index + 1} / {QUESTIONS.length}
          </span>
        </div>
        {index > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {QUESTIONS.slice(0, index).map((q, i) => (
              <li key={q.id}>
                <button
                  type="button"
                  aria-label={`${q.label}：${q.answerOf(state)}（答え直す）`}
                  onClick={() => setIndex(i)}
                  className="rounded-full bg-sticker px-3 py-1 font-note text-xs text-ink shadow-sticker-sm transition-colors hover:bg-paper-line focus-visible:focus-ring"
                >
                  <span className="text-ink-soft">{q.label}</span> {q.answerOf(state)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <BotSays text={question.ask} className="mt-auto" />

      <div className="flex flex-col gap-3">
        <p className="sr-only" aria-live="polite">
          {question.ask}
        </p>
        {question.id === Question.Dest ? (
          <TextField
            id={DEST_ID}
            label="行き先"
            placeholder="例：上野公園"
            autoComplete="off"
            value={state.dest}
            onChange={(event) => dispatch({ type: "setDest", dest: event.target.value })}
          />
        ) : null}
        {question.id === Question.Mood ? (
          <MoodPicker
            value={state.mood}
            onChange={(mood) => dispatch({ type: "pickMood", mood })}
            onCommit={() => setIndex(index + 1)}
          />
        ) : null}
        {question.id === Question.Budget ? (
          <>
            <BudgetPicker value={state.budget} onChange={(budget) => dispatch({ type: "pickBudget", budget })} />
            <EtaNote budget={state.budget} />
            <fieldset className="flex flex-col gap-2 rounded-(--radius-chip) border border-dashed border-line px-4 py-3">
              <legend className="px-1 font-hand text-sm text-ink">歩きやすさ（任意）</legend>
              <StickerCheckbox checked={state.care.slope} onChange={(on) => dispatch({ type: "setCare", key: "slope", on })}>
                <span className="font-note text-sm text-ink">坂は少なめがいい</span>
              </StickerCheckbox>
              <StickerCheckbox checked={state.care.shade} onChange={(on) => dispatch({ type: "setCare", key: "shade", on })}>
                <span className="font-note text-sm text-ink">日陰を通りたい</span>
              </StickerCheckbox>
              <p className="font-note text-xs text-ink-soft">AIの地点選びに伝えます。坂・日陰の値は上野〜谷中だけ、公開データからの推定で出します</p>
            </fieldset>
          </>
        ) : null}

        <StickerButton type="submit" size={ButtonSize.Lg} disabled={!canAdvance} className="w-full">
          {isLast ? "寄り道ルートを作る" : "次へ"}
        </StickerButton>
      </div>
    </form>
  );
};
