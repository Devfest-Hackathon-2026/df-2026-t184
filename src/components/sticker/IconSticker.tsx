import { cx, TONE_FILL, Tone } from "./tokens";

export enum IconName {
  Camera = "camera",
  Pin = "pin",
  Back = "back",
  Share = "share",
  Check = "check",
  Heart = "heart",
  Walk = "walk",
}

type IconStickerProps = {
  name: IconName;
  tone?: Tone;
  size?: number;
  className?: string;
};

const DEFAULT_ICON_SIZE = 40;

const ICON_PATHS: Record<IconName, React.ReactElement> = {
  [IconName.Camera]: (
    <>
      <path d="M8 11 h3 l2 -3 h6 l2 3 h3 a1.5 1.5 0 0 1 1.5 1.5 v9 a1.5 1.5 0 0 1 -1.5 1.5 h-16 a1.5 1.5 0 0 1 -1.5 -1.5 v-9 a1.5 1.5 0 0 1 1.5 -1.5 z" />
      <circle cx="16" cy="17" r="3.5" />
    </>
  ),
  [IconName.Pin]: (
    <>
      <path d="M16 27 s-7 -6.5 -7 -12.5 a7 7 0 0 1 14 0 c0 6 -7 12.5 -7 12.5 z" />
      <circle cx="16" cy="14.5" r="2.5" />
    </>
  ),
  [IconName.Back]: <path d="M19 9 l-7 7 7 7" />,
  [IconName.Share]: (
    <>
      <path d="M16 6 v13" />
      <path d="M11 11 l5 -5 5 5" />
      <path d="M9 17 v6 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2 -2 v-6" />
    </>
  ),
  [IconName.Check]: <path d="M9 16.5 l4.5 4.5 l9.5 -10" />,
  [IconName.Heart]: <path d="M16 25 C8 19.5 6.5 14.5 9.5 11.5 c2.5 -2.5 5.3 -1 6.5 1.3 c1.2 -2.3 4 -3.8 6.5 -1.3 c3 3 1.5 8 -6.5 13.5 z" />,
  [IconName.Walk]: (
    <>
      <circle cx="17" cy="7.5" r="2" />
      <path d="M14 26 l2.5 -7 l3 3 v4" />
      <path d="M11 15 l3.5 -4 l4 1 l2.5 4 l3 1" />
      <path d="M16.5 19 l-1 -5" />
    </>
  ),
};

/** 白い円で縁取ったアイコンのステッカー。線は焦げ茶で 2px。 */
export const IconSticker = ({ name, tone = Tone.Sky, size = DEFAULT_ICON_SIZE, className }: IconStickerProps): React.ReactElement => (
  <span
    aria-hidden="true"
    style={{ width: size, height: size }}
    className={cx("inline-grid shrink-0 place-items-center rounded-full border-[2.5px] border-ink shadow-sticker-sm outline-[3px] outline-sticker", TONE_FILL[tone], className)}
  >
    <svg viewBox="0 0 32 32" width={size * 0.66} height={size * 0.66} fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  </span>
);
