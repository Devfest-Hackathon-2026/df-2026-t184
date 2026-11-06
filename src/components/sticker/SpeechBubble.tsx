import { cx } from "./tokens";

export enum BubbleTail {
  Left = "left",
  Right = "right",
  Bottom = "bottom",
}

type SpeechBubbleProps = {
  children: React.ReactNode;
  /** しっぽの向き。マスコットがいる側を指す。 */
  tail?: BubbleTail;
  className?: string;
};

const TAIL_CLASS: Record<BubbleTail, string> = {
  [BubbleTail.Left]: "-left-2 top-1/2 -translate-y-1/2 rotate-45 border-b-3 border-l-3",
  [BubbleTail.Right]: "-right-2 top-1/2 -translate-y-1/2 rotate-45 border-r-3 border-t-3",
  [BubbleTail.Bottom]: "-bottom-2 left-1/2 -translate-x-1/2 rotate-45 border-b-3 border-r-3",
};

/** マスコットのせりふ。白い紙に焦げ茶の縁取り、しっぽでマスコットを指す。 */
export const SpeechBubble = ({ children, tail = BubbleTail.Left, className }: SpeechBubbleProps): React.ReactElement => (
  <p className={cx("sticker-edge relative m-0 rounded-(--radius-chip) bg-sticker px-3 py-2 font-hand text-sm leading-snug text-ink", className)}>
    <span aria-hidden="true" className={cx("absolute size-3.5 border-ink bg-sticker", TAIL_CLASS[tail])} />
    <span className="relative text-balance">{children}</span>
  </p>
);
