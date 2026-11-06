import type { ButtonHTMLAttributes } from "react";

import { cx, TONE_FILL, Tone } from "./tokens";

export enum ButtonSize {
  Md = "md",
  Lg = "lg",
}

type StickerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: ButtonSize;
  plain?: boolean;
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  [ButtonSize.Md]: "min-h-12 px-5 text-base",
  [ButtonSize.Lg]: "min-h-14 px-6 text-lg",
};

/** 焦げ茶の縁取りと、ぼかさない影のボタン。押すと影がつぶれて沈み、ぷるっと戻る。 */
export const StickerButton = ({
  tone = Tone.Lemon,
  size = ButtonSize.Md,
  plain = false,
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
      "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky-deep",
      "disabled:cursor-not-allowed disabled:border-ink-soft disabled:bg-paper-line disabled:text-ink-soft disabled:shadow-none disabled:hover:translate-y-0",
      plain ? "bg-sticker" : TONE_FILL[tone],
      SIZE_CLASS[size],
      className,
    )}
    {...rest}
  />
);
