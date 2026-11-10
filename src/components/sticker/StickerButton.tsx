import type { ButtonHTMLAttributes } from "react";

import { cx } from "./tokens";

export enum ButtonSize {
  Md = "md",
  Lg = "lg",
}

export enum ButtonVariant {
  /** 画面で一番大事な操作。ピンクで塗り、文字は ink（白文字はコントラストが足りない）。 */
  Solid = "solid",
  /** 白地に細い線の控えめなボタン。副操作・戻る系に使う。 */
  Plain = "plain",
  /** 取り返しのつきにくい操作だけに使う危険色。 */
  Danger = "danger",
}

type StickerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  [ButtonSize.Md]: "min-h-11 px-4 text-sm",
  [ButtonSize.Lg]: "min-h-13 px-6 text-base",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Solid]: "bg-accent text-ink hover:bg-accent-strong",
  [ButtonVariant.Plain]: "bg-surface-raised text-ink shadow-sticker hover:bg-paper-line",
  [ButtonVariant.Danger]: "bg-danger text-fg-on-deep",
};

/** 丸いボタン。押すとわずかに縮む。 */
export const StickerButton = ({
  size = ButtonSize.Md,
  variant = ButtonVariant.Solid,
  className,
  type = "button",
  ...rest
}: StickerButtonProps): React.ReactElement => (
  <button
    type={type}
    className={cx(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-hand",
      "transition-[background-color,scale] duration-150 ease-out active:scale-[0.98]",
      "focus-visible:focus-ring",
      "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-disabled disabled:text-fg-subtle",
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      className,
    )}
    {...rest}
  />
);
