import type { InputHTMLAttributes } from "react";

import { cx } from "./tokens";

type ChoiceChipProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onSelect" | "onChange" | "className" | "children"> & {
  /** 同じ選択肢グループのチップは同じ name を渡す（矢印キー移動はブラウザ任せ）。 */
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * 1 つ選ぶ選択肢のチップ。中身は本物の <input type="radio"> で、
 * ラベルと同じ枠の中に置く。細い枠の四角で、選ぶとピンクで塗る。
 */
export const ChoiceChip = ({ name, checked, onSelect, disabled, children, className, ...rest }: ChoiceChipProps): React.ReactElement => (
  <label className={cx("block", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
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
        "block rounded-xl border border-ink-soft bg-surface-raised text-ink transition-[border-color,background-color] duration-150 ease-out",
        "peer-hover:border-ink peer-focus-visible:focus-ring",
        "peer-checked:border-accent peer-checked:bg-accent",
        "peer-disabled:cursor-not-allowed peer-disabled:bg-surface-disabled peer-disabled:text-fg-subtle",
        className,
      )}
    >
      {children}
    </span>
  </label>
);
