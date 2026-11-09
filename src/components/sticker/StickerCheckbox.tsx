import type { InputHTMLAttributes } from "react";

import { cx } from "./tokens";

type StickerCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "className"> & {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
};

/** マスのような小さなチェックボックス。中身は本物の <input type="checkbox">。 */
export const StickerCheckbox = ({ checked, onChange, disabled, children, className, ...rest }: StickerCheckboxProps): React.ReactElement => (
  <label className={cx("inline-flex items-center gap-2", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
    <span className="relative inline-grid shrink-0 place-items-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="peer sr-only forced-colors:not-sr-only"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cx(
          "size-6 rounded-md border-3 border-ink bg-surface-raised shadow-pressed transition-[background-color,box-shadow] duration-150 ease-out",
          "peer-checked:border-ink peer-checked:bg-mint peer-checked:shadow-sticker-sm",
          "peer-focus-visible:focus-ring",
          "peer-disabled:border-border-subtle peer-disabled:bg-surface-disabled peer-disabled:shadow-none",
        )}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute size-4 text-ink opacity-0 transition-opacity duration-150 peer-checked:opacity-100 peer-disabled:text-fg-subtle"
      >
        <path d="M2.5 8.5l3.5 3.5 7-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    {children ? <span className={cx("font-note text-base text-ink", disabled && "text-fg-subtle")}>{children}</span> : null}
  </label>
);
