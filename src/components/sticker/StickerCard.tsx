import type { HTMLAttributes } from "react";

import { cx, TONE_FILL, Tone } from "./tokens";

type StickerCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
};

/** 白地に細い線とやわらかい影のカード。tone を渡すと淡い面になる。 */
export const StickerCard = ({ tone, className, ...rest }: StickerCardProps): React.ReactElement => (
  <div className={cx("sticker-edge relative rounded-(--radius-sticker) p-4", tone ? TONE_FILL[tone] : "bg-sticker", className)} {...rest} />
);
