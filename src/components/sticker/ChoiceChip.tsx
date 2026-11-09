import type { InputHTMLAttributes } from "react";

import { cx, TONE_FILL, Tone } from "./tokens";

type ChoiceChipProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onSelect" | "onChange" | "className" | "children"> & {
  /** 同じ選択肢グループのチップは同じ name を渡す（矢印キー移動はブラウザ任せ）。 */
  name: string;
  checked: boolean;
  onSelect: () => void;
  tone?: Tone;
  tilt?: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * 1 つ選ぶ選択肢のチップ。中身は本物の <input type="radio"> で、
 * ラベルと同じ枠の中に置く。選ぶと色が付いて影が浮く。
 */
export const ChoiceChip = ({ name, checked, onSelect, disabled, tone = Tone.Mint, tilt = 0, children, className, ...rest }: ChoiceChipProps): React.ReactElement => (
  <label className="block" style={{ rotate: `${tilt}deg` }}>
    <input
      type="radio"
      name={name}
      checked={checked}
      disabled={disabled}
      onChange={onSelect}
      /* 見た目は隠して意味だけ残す。強制カラーモードではネイティブのラジオを出す */
      className="peer sr-only forced-colors:not-sr-only"
      {...rest}
    />
    <span
      className={cx(
        "block rounded-(--radius-chip) border-3 border-ink text-ink transition-[transform,box-shadow,background-color] duration-150 ease-out",
        "peer-focus-visible:focus-ring peer-active:animate-jelly",
        "peer-disabled:cursor-not-allowed peer-disabled:border-border-subtle peer-disabled:bg-surface-disabled peer-disabled:text-fg-subtle peer-disabled:shadow-none",
        checked ? cx(TONE_FILL[tone], "shadow-sticker") : "bg-surface-raised shadow-pressed peer-hover:shadow-sticker-sm",
        className,
      )}
    >
      {children}
    </span>
  </label>
);
