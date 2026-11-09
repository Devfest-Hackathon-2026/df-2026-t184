import { ButtonSize, ButtonVariant, cx, IconName, IconSticker, StickerButton, StickerCard, Tape, TONE_FILL, Tone } from "@/components/sticker";

import type { Quest } from "../content";
import { CHECKPOINTS } from "../flow";

type QuestSheetProps = {
  quest: Quest;
  /** いま向かっている地点（0 始まり）。 */
  step: number;
  onCapture: () => void;
  onFound: () => void;
  className?: string;
};

const LAST_INDEX = CHECKPOINTS - 1;
const ORDERS: readonly number[] = [...Array(CHECKPOINTS).keys()];
const PROGRESS_SIZE = 28;
const PIN_SIZE = 24;
const CAMERA_SIZE = 28;
const TAPE_ANGLE = -9;
const PROGRESS_TILTS: readonly number[] = [-6, 4, -3];

/** 3 地点のうち、どこまで来たかを小さなシールで並べる。 */
const Progress = ({ done }: { done: number }): React.ReactElement => (
  <div role="img" aria-label={`${CHECKPOINTS} 地点のうち ${done} 地点を達成`} className="flex items-center gap-1.5">
    {ORDERS.map((i) =>
      i < done ? (
        <IconSticker key={i} name={IconName.Check} tone={Tone.Mint} size={PROGRESS_SIZE} />
      ) : (
        <span
          key={i}
          style={{ rotate: `${PROGRESS_TILTS[i % PROGRESS_TILTS.length]}deg` }}
          className={cx(
            "grid size-7 place-items-center rounded-full border-2 font-hand text-xs",
            i === done ? "border-ink bg-sticker text-ink" : "border-dashed border-ink-soft text-ink-soft",
          )}
        >
          {i + 1}
        </span>
      ),
    )}
  </div>
);

/** 地図の下から差し込む、いまの地点のクエストカード。 */
export const QuestSheet = ({ quest, step, onCapture, onFound, className }: QuestSheetProps): React.ReactElement => {
  const index = Math.min(step, LAST_INDEX);
  const done = Math.min(step, CHECKPOINTS);
  return (
    <StickerCard className={cx("flex flex-col gap-3 rounded-t-4xl px-5 pt-6 pb-5", className)}>
      <Tape tone={quest.tone} angle={TAPE_ANGLE} className="-top-3 left-1/2 -translate-x-1/2" />
      <div className="flex items-center justify-between gap-3">
        <span className={cx("rounded-full border-3 border-ink px-3 py-0.5 font-hand text-sm shadow-sticker-sm", TONE_FILL[quest.tone])}>
          {index + 1} / {CHECKPOINTS} 地点目
        </span>
        <Progress done={done} />
      </div>
      <p className="flex items-center gap-2 font-note text-sm text-ink-soft">
        <IconSticker name={IconName.Pin} tone={quest.tone} size={PIN_SIZE} />
        {quest.checkpoint}
      </p>
      <h2 className="font-hand text-xl leading-snug text-ink">{quest.title}</h2>
      <div className="rounded-(--radius-chip) border-2 border-dashed border-ink-soft bg-paper px-3 py-2">
        <h3 className="font-hand text-xs text-ink">なぜこの道？</h3>
        <p className="font-note text-sm leading-relaxed text-ink">{quest.why}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <StickerButton variant={ButtonVariant.Plain} size={ButtonSize.Lg} onClick={onCapture}>
          <IconSticker name={IconName.Camera} tone={Tone.Sky} size={CAMERA_SIZE} />
          記録する
        </StickerButton>
        <StickerButton tone={Tone.Mint} size={ButtonSize.Lg} onClick={onFound}>
          見つけた
        </StickerButton>
      </div>
    </StickerCard>
  );
};
