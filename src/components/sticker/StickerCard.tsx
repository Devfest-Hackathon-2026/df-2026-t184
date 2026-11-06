import type { HTMLAttributes } from "react";

import { cx, TILT_CLASS, Tilt, TONE_FILL, Tone } from "./tokens";

type StickerCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  tilt?: Tilt;
};

/** 紙を切って貼ったカード。少し傾けるのがこの世界のルール。 */
export const StickerCard = ({ tone, tilt = Tilt.None, className, ...rest }: StickerCardProps): React.ReactElement => (
  <div
    className={cx("sticker-edge relative rounded-(--radius-sticker) p-4", tone ? TONE_FILL[tone] : "bg-sticker", TILT_CLASS[tilt], className)}
    {...rest}
  />
);
