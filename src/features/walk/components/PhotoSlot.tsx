import { cx, IconName, IconSticker, StickerButton, Tape, Tone } from "@/components/sticker";

const SHOOT_ICON_SIZE = 56;
const RETAKE_ICON_SIZE = 28;
const PHOTO_TAPE_ANGLE = -4;
const SAMPLE_PHOTO_LABEL = "撮影した写真（見本）";

const toneVar = (tone: Tone, deep: boolean): string => `var(--color-${tone}${deep ? "-deep" : ""})`;

type PhotoArtProps = { tone: Tone; label: string; className?: string };

/** 本物の写真がそろうまでの見本。クエストの色の空に、お日さまと屋根の線だけを描く。 */
export const PhotoArt = ({ tone, label, className }: PhotoArtProps): React.ReactElement => (
  <svg viewBox="0 0 160 120" role="img" aria-label={label} className={cx("block w-full", className)} preserveAspectRatio="xMidYMid slice">
    <rect width="160" height="120" fill={toneVar(tone, false)} />
    <circle cx="118" cy="34" r="15" fill="var(--color-lemon-deep)" stroke="var(--color-ink)" strokeWidth="2.5" />
    <path d="M14 30 q8 -6 16 0 t16 0" fill="none" stroke="var(--color-sticker)" strokeWidth="3" strokeLinecap="round" />
    <path d="M0 120 V82 L22 64 L44 82 V70 L70 48 L96 70 V86 L112 74 L132 88 V78 L160 60 V120 Z" fill="var(--color-sticker)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M0 82 L22 64 L44 82 M44 70 L70 48 L96 70 M96 86 L112 74 L132 88 M132 78 L160 60" fill="none" stroke={toneVar(tone, true)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <g fill={toneVar(tone, false)} stroke="var(--color-ink)" strokeWidth="2">
      <rect x="16" y="88" width="12" height="12" rx="2" />
      <rect x="62" y="74" width="16" height="22" rx="2" />
      <rect x="140" y="90" width="10" height="10" rx="2" />
    </g>
  </svg>
);

type PhotoSlotProps = {
  taken: boolean;
  tone: Tone;
  caption: string;
  onShoot: () => void;
};

/** ポラロイド風の写真枠。撮る前は点線の撮影ボタン、撮ったら見本の写真をマステで貼る。 */
export const PhotoSlot = ({ taken, tone, caption, onShoot }: PhotoSlotProps): React.ReactElement => {
  if (!taken) {
    return (
      <button
        type="button"
        onClick={onShoot}
        className={cx(
          "flex aspect-4/3 w-full flex-col items-center justify-center gap-3 rounded-(--radius-sticker) border-3 border-dashed border-ink bg-sticker font-hand text-lg text-ink",
          "transition-[transform,box-shadow] duration-150 ease-out hover:shadow-sticker-sm active:animate-jelly",
          "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky-deep",
        )}
      >
        <IconSticker name={IconName.Camera} tone={tone} size={SHOOT_ICON_SIZE} />
        タップして撮影
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-3 pt-3">
      <figure className="sticker-edge relative w-full rotate-(--tilt-left) rounded-sm bg-sticker p-3 pb-2 animate-pop-in">
        <Tape tone={Tone.Pink} angle={PHOTO_TAPE_ANGLE} className="-top-3 left-1/2 -translate-x-1/2" />
        <div className="overflow-hidden border-2 border-ink">
          <PhotoArt tone={tone} label={SAMPLE_PHOTO_LABEL} className="aspect-4/3" />
        </div>
        <figcaption className="pt-2 text-center font-hand text-sm text-ink">{caption}</figcaption>
      </figure>
      <StickerButton plain onClick={onShoot}>
        <IconSticker name={IconName.Camera} tone={tone} size={RETAKE_ICON_SIZE} />
        撮り直す
      </StickerButton>
    </div>
  );
};
