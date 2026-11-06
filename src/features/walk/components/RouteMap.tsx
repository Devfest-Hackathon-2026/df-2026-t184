import { cx } from "@/components/sticker";

import { CHECKPOINTS } from "../flow";

export enum MapVariant {
  Full = "full",
  Mini = "mini",
}

type RouteMapProps = {
  /** いま向かっている地点（0 始まり）。CHECKPOINTS 以上なら全部達成。 */
  step: number;
  dest: string;
  variant?: MapVariant;
  className?: string;
};

type Point = { x: number; y: number };

const START: Point = { x: 44, y: 70 };
const GOAL: Point = { x: 300, y: 344 };
const CHECKPOINT_POINTS: readonly Point[] = [
  { x: 44, y: 168 },
  { x: 124, y: 246 },
  { x: 200, y: 312 },
];
const DETOUR_PATH = "M44 70 V210 H124 V276 H200 V344 H300";
const CROWD_BAND = "92,146 252,316 280,290 120,120";
const DOT_TONES = ["var(--color-mint-deep)", "var(--color-lemon-deep)", "var(--color-sky-deep)"] as const;

const positionOf = (step: number): Point => {
  if (step <= 0) return START;
  if (step >= CHECKPOINTS) return GOAL;
  return CHECKPOINT_POINTS[step - 1];
};

/**
 * 手描きの散歩地図。人が多い通りを最短の直線として薄く引き、
 * その横を回り道する点線が寄り道ルート。地点は番号付きのシールで貼る。
 */
export const RouteMap = ({ step, dest, variant = MapVariant.Full, className }: RouteMapProps): React.ReactElement => {
  const me = positionOf(step);
  const mini = variant === MapVariant.Mini;
  return (
    <svg
      viewBox={mini ? "20 40 300 330" : "0 0 340 400"}
      role="img"
      aria-label={`人が多い通りを避けて路地を回り、${CHECKPOINTS} つの地点を通って${dest}に着く寄り道ルート`}
      className={cx("block h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="-20" y="-20" width="380" height="440" fill="var(--color-paper)" />
      <path d="M-10 362 C60 344 130 380 214 366 S316 340 352 350 V420 H-10Z" fill="var(--color-sky)" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M20 380 q10 -6 20 0 t20 0 M240 392 q10 -6 20 0 t20 0" fill="none" stroke="var(--color-sky-deep)" strokeWidth="2" strokeLinecap="round" />
      <g fill="none" stroke="var(--color-paper-line)" strokeWidth="8" strokeLinecap="round">
        <path d="M0 70 H340 M0 120 H340 M0 276 H340 M44 0 V350 M124 0 V350 M200 0 V350 M300 0 V350" />
      </g>
      <g fill="none" stroke="var(--color-kraft)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round">
        <path d="M0 70 H340 M0 120 H340 M0 276 H340 M44 0 V350 M124 0 V350 M200 0 V350 M300 0 V350" />
      </g>
      <rect x="140" y="128" width="104" height="70" rx="14" fill="var(--color-mint)" stroke="var(--color-ink)" strokeWidth="2" />
      <g fill="var(--color-mint-deep)" stroke="var(--color-ink)" strokeWidth="1.5">
        <circle cx="162" cy="150" r="7" />
        <circle cx="182" cy="172" r="8" />
        <circle cx="216" cy="156" r="7" />
      </g>
      <polygon points={CROWD_BAND} fill="var(--color-coral)" stroke="var(--color-coral-deep)" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M44 70 L300 344" stroke="var(--color-ink-soft)" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      {mini ? null : (
        <text x="268" y="262" fill="var(--color-coral-deep)" fontFamily="var(--font-hand)" fontSize="12">
          人が多い
        </text>
      )}
      <path d={DETOUR_PATH} fill="none" stroke="var(--color-sticker)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d={DETOUR_PATH} fill="none" stroke="var(--color-pink-deep)" strokeWidth="5" strokeDasharray="0.1 10" strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <path d={`M${GOAL.x} ${GOAL.y} v-30`} stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${GOAL.x} ${GOAL.y - 30} l20 6 l-20 8 z`} fill="var(--color-lemon-deep)" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
        {mini ? null : (
          <text x={GOAL.x - 8} y={GOAL.y + 20} textAnchor="end" fill="var(--color-ink)" fontFamily="var(--font-hand)" fontSize="13">
            {dest}
          </text>
        )}
      </g>
      {CHECKPOINT_POINTS.map((p, i) => {
        const done = i < step;
        return (
          <g key={`${p.x}-${p.y}`} transform={`rotate(${i % 2 ? 6 : -6} ${p.x} ${p.y})`}>
            <circle cx={p.x + 2} cy={p.y + 3} r="14" fill="var(--color-ink)" />
            <circle cx={p.x} cy={p.y} r="14" fill={done || mini ? DOT_TONES[i] : "var(--color-sticker)"} stroke="var(--color-ink)" strokeWidth="2.5" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fill="var(--color-ink)" fontFamily="var(--font-hand)" fontSize="13">
              {i + 1}
            </text>
          </g>
        );
      })}
      {mini ? null : (
        <g>
          <circle cx={me.x} cy={me.y} r="20" fill="var(--color-pink-deep)" opacity="0.18" />
          <circle cx={me.x} cy={me.y} r="8" fill="var(--color-pink-deep)" stroke="var(--color-sticker)" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
};
