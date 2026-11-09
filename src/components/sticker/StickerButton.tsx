import type { ButtonHTMLAttributes } from "react";

import { cx, TONE_FILL, Tone } from "./tokens";

export enum ButtonSize {
  Md = "md",
  Lg = "lg",
}

export enum ButtonVariant {
  /** パステルの面で押せる主ボタン。色の意味は tone で渡す。 */
  Solid = "solid",
  /** 白い紙の控えめなボタン。副操作・戻る系に使う。 */
  Plain = "plain",
  /** 取り返しのつきにくい操作だけに使う危険色。 */
  Danger = "danger",
}

type StickerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  [ButtonSize.Md]: "min-h-12 px-5 text-base",
  [ButtonSize.Lg]: "min-h-14 px-6 text-lg",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  [ButtonVariant.Solid]: "",
  [ButtonVariant.Plain]: "bg-surface-raised",
  [ButtonVariant.Danger]: "bg-danger text-fg-on-deep",
};

/** 焦げ茶の縁取りと、ぼかさない影のボタン。押すと影がつぶれて沈み、ぷるっと戻る。 */
export const StickerButton = ({
  tone = Tone.Lemon,
  size = ButtonSize.Md,
  variant = ButtonVariant.Solid,
  className,
  type = "button",
  ...rest
}: StickerButtonProps): React.ReactElement => (
  <button
    type={type}
    className={cx(
      "sticker-edge inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius-sticker) font-hand text-ink",
      "transition-[transform,box-shadow] duration-150 ease-out",
      "hover:-translate-y-0.5 hover:shadow-sticker-lg active:translate-x-0.75 active:translate-y-0.75 active:shadow-pressed active:animate-jelly",
      "focus-visible:focus-ring",
      "disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-disabled disabled:text-fg-subtle disabled:shadow-none disabled:hover:translate-y-0",
      variant === ButtonVariant.Solid ? TONE_FILL[tone] : VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      className,
    )}
    {...rest}
  />
);
