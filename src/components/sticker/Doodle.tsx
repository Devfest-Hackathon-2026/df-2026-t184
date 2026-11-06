import { cx } from "./tokens";

export enum DoodleKind {
  Star = "star",
  Heart = "heart",
  Wave = "wave",
  Sparkle = "sparkle",
}

type DoodleProps = {
  kind: DoodleKind;
  color?: string;
  size?: number;
  className?: string;
};

const DEFAULT_DOODLE_SIZE = 28;

const PATHS: Record<DoodleKind, React.ReactElement> = {
  [DoodleKind.Star]: <path d="M16 3 l3.6 8 8.4 1 -6.2 5.7 1.7 8.3 -7.5 -4.3 -7.5 4.3 1.7 -8.3 -6.2 -5.7 8.4 -1 z" strokeLinejoin="round" />,
  [DoodleKind.Heart]: <path d="M16 27 C5 19 3 12 7 8 c3.5 -3.5 7.5 -1.5 9 2 c1.5 -3.5 5.5 -5.5 9 -2 c4 4 2 11 -9 19 z" strokeLinejoin="round" />,
  [DoodleKind.Wave]: <path d="M2 18 q4 -8 8 0 t8 0 t8 0 t6 -2" fill="none" strokeLinecap="round" />,
  [DoodleKind.Sparkle]: <path d="M16 4 v8 M16 20 v8 M4 16 h8 M20 16 h8" fill="none" strokeLinecap="round" />,
};

/** 手描きの落書き。星・ハート・波線・きらり。装飾なので読み上げない。 */
export const Doodle = ({ kind, color = "var(--color-pink-deep)", size = DEFAULT_DOODLE_SIZE, className }: DoodleProps): React.ReactElement => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill={kind === DoodleKind.Wave || kind === DoodleKind.Sparkle ? "none" : color}
    stroke={kind === DoodleKind.Wave || kind === DoodleKind.Sparkle ? color : "var(--color-ink)"}
    strokeWidth="2.5"
    className={cx("pointer-events-none", className)}
  >
    {PATHS[kind]}
  </svg>
);
