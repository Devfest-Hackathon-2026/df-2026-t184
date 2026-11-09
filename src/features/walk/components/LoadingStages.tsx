import { cx, IconName, IconSticker, StickerCard, Tone } from "@/components/sticker";

import { LOADING_STAGES } from "../flow";

type LoadingStagesProps = {
  /** いま進めている段階（0 始まり）。段階数以上なら全部終わり。 */
  stage: number;
};

enum StageStatus {
  Done = "done",
  Current = "current",
  Pending = "pending",
}

const CHECK_SIZE = 32;

const STATUS_LABEL: Record<StageStatus, string> = {
  [StageStatus.Done]: "完了",
  [StageStatus.Current]: "進行中",
  [StageStatus.Pending]: "待機中",
};

const statusOf = (index: number, stage: number): StageStatus => {
  if (index < stage) return StageStatus.Done;
  if (index === stage) return StageStatus.Current;
  return StageStatus.Pending;
};

const StageMark = ({ status, order }: { status: StageStatus; order: number }): React.ReactElement => {
  if (status === StageStatus.Done) {
    return <IconSticker name={IconName.Check} tone={Tone.Mint} size={CHECK_SIZE} className=" animate-pop-in" />;
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid size-8 shrink-0 place-items-center rounded-full border font-hand text-sm",
        status === StageStatus.Current ? "border-line bg-lemon-deep text-ink" : "border-dashed border-line text-ink-soft",
      )}
    >
      {order}
    </span>
  );
};

/** 探索の 4 段階を、終わったものからハンコを押していくチェックリスト。 */
export const LoadingStages = ({ stage }: LoadingStagesProps): React.ReactElement => {
  const current = LOADING_STAGES[stage];
  return (
    <StickerCard className="w-full">
      <ol className="flex flex-col gap-2">
        {LOADING_STAGES.map((item, i) => {
          const status = statusOf(i, stage);
          return (
            <li
              key={item.label}
              aria-current={status === StageStatus.Current ? "step" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-(--radius-chip) px-2 py-2",
                status === StageStatus.Current && "bg-lemon",
              )}
            >
              <StageMark status={status} order={i + 1} />
              <span className="flex flex-1 flex-col">
                <span className={cx("font-note text-sm", status === StageStatus.Pending ? "text-ink-soft" : "text-ink")}>{item.label}</span>
                <span className="font-note text-xs text-ink-soft">{item.api}</span>
              </span>
              <span className="sr-only">{STATUS_LABEL[status]}</span>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {current ? current.label : "ルートができました"}
      </p>
    </StickerCard>
  );
};
