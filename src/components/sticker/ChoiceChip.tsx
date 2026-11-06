import { cx, TONE_FILL, Tone } from "./tokens";

type ChoiceChipProps = {
  checked: boolean;
  onSelect: () => void;
  tone?: Tone;
  tilt?: number;
  children: React.ReactNode;
  className?: string;
};

/** ラジオの 1 項目として使うチップ。選ぶと色が付いて影が浮く。 */
export const ChoiceChip = ({ checked, onSelect, tone = Tone.Mint, tilt = 0, children, className }: ChoiceChipProps): React.ReactElement => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    onClick={onSelect}
    style={{ rotate: `${tilt}deg` }}
    className={cx(
      "rounded-(--radius-chip) border-3 border-ink text-ink transition-[transform,box-shadow,background-color] duration-150 ease-out",
      "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep active:animate-jelly",
      checked ? cx(TONE_FILL[tone], "shadow-sticker") : "bg-sticker shadow-pressed hover:shadow-sticker-sm",
      className,
    )}
  >
    {children}
  </button>
);
