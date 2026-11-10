import { ButtonSize, ButtonVariant, cx, IconName, IconSticker, StickerButton, StickerCard, TONE_FILL, Tone } from "@/components/sticker";

import { MOODS, type Quest } from "../content";
import { CHECKPOINTS, type MoodId } from "../flow";

type QuestSheetProps = {
  quest: Quest;
  /** いま向かっている地点（0 始まり）。 */
  step: number;
  /** 点数のうち、選んだ気分の欄を強調する。 */
  mood?: MoodId;
  onCapture: () => void;
  onFound: () => void;
  className?: string;
};

const LAST_INDEX = CHECKPOINTS - 1;
const ORDERS: readonly number[] = [...Array(CHECKPOINTS).keys()];
const PROGRESS_SIZE = 28;
const PIN_SIZE = 24;
const CAMERA_SIZE = 28;
const SCORE_LABELS = ["静けさ", "レトロ度", "ローカル感"] as const;

/** 3 地点のうち、どこまで来たかを小さな丸で並べる。 */
const Progress = ({ done }: { done: number }): React.ReactElement => (
  <div role="img" aria-label={`${CHECKPOINTS} 地点のうち ${done} 地点を達成`} className="flex items-center gap-1.5">
    {ORDERS.map((i) =>
      i < done ? (
        <IconSticker key={i} name={IconName.Check} tone={Tone.Mint} size={PROGRESS_SIZE} />
      ) : (
        <span
          key={i}
          className={cx(
            "grid size-7 place-items-center rounded-full border font-hand text-xs",
            i === done ? "border-line bg-sticker text-ink" : "border-dashed border-line text-ink-soft",
          )}
        >
          {i + 1}
        </span>
      ),
    )}
  </div>
);

/** 地図の下から差し込む、いまの地点のクエストカード。 */
/** 静けさ・レトロ度・ローカル感の点数。選んだ気分の欄に色を付ける。 */
const Scores = ({ scores, mood }: { scores: readonly [number, number, number]; mood?: MoodId }): React.ReactElement => {
  const highlighted = MOODS.findIndex((m) => m.id === mood);
  return (
    <dl className="grid grid-cols-3 gap-2">
      {SCORE_LABELS.map((label, i) => (
        <div
          key={label}
          className={cx(
            "flex flex-col rounded-(--radius-chip) border px-3 py-1",
            i === highlighted ? cx("border-line", TONE_FILL[MOODS[i].tone]) : "border-dashed border-line",
          )}
        >
          <dt className="font-note text-xs text-ink-soft">{label}</dt>
          <dd className="font-hand text-xl text-ink">{scores[i]}</dd>
        </div>
      ))}
    </dl>
  );
};

export const QuestSheet = ({ quest, step, mood, onCapture, onFound, className }: QuestSheetProps): React.ReactElement => {
  const index = Math.min(step, LAST_INDEX);
  const done = Math.min(step, CHECKPOINTS);
  return (
    <StickerCard className={cx("flex flex-col gap-3 rounded-t-4xl px-5 pt-6 pb-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className={cx("rounded-full border border-line px-3 py-0.5 font-hand text-sm shadow-sticker-sm", TONE_FILL[quest.tone])}>
          {index + 1} / {CHECKPOINTS} 地点目
        </span>
        <Progress done={done} />
      </div>
      <p className="flex items-center gap-2 font-note text-sm text-ink-soft">
        <IconSticker name={IconName.Pin} tone={quest.tone} size={PIN_SIZE} />
        {quest.checkpoint}
      </p>
      <h2 className="font-hand text-xl leading-snug text-ink">{quest.title}</h2>
      <div className="rounded-(--radius-chip) border border-dashed border-line bg-paper px-3 py-2">
        <h3 className="font-hand text-xs text-ink">なぜこの道？</h3>
        <p className="font-note text-sm leading-relaxed text-ink">{quest.why}</p>
      </div>
      {quest.scores ? <Scores scores={quest.scores} mood={mood} /> : null}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <StickerButton variant={ButtonVariant.Plain} size={ButtonSize.Lg} onClick={onCapture}>
          <IconSticker name={IconName.Camera} tone={Tone.Sky} size={CAMERA_SIZE} />
          記録する
        </StickerButton>
        <StickerButton size={ButtonSize.Lg} onClick={onFound}>
          見つけた
        </StickerButton>
      </div>
    </StickerCard>
  );
};
