import { cx } from "./tokens";

export enum MascotMood {
  Idle = "idle",
  Thinking = "thinking",
  Cheer = "cheer",
  Calm = "calm",
}

type MascotProps = {
  mood?: MascotMood;
  size?: number;
  className?: string;
  label?: string;
};

const DEFAULT_SIZE = 96;

const Eyes = ({ mood }: { mood: MascotMood }): React.ReactElement => {
  if (mood === MascotMood.Calm) {
    return (
      <g fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round">
        <path d="M44 66 q5 -5 10 0" />
        <path d="M66 66 q5 -5 10 0" />
      </g>
    );
  }
  if (mood === MascotMood.Cheer) {
    return (
      <g fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round">
        <path d="M43 66 l6 -5 l6 5" />
        <path d="M65 66 l6 -5 l6 5" />
      </g>
    );
  }
  const look = mood === MascotMood.Thinking ? -3 : 0;
  return (
    <g fill="var(--color-ink)">
      <ellipse cx="49" cy={65 + look} rx="4" ry="5" />
      <ellipse cx="71" cy={65 + look} rx="4" ry="5" />
      <circle cx="50.5" cy={63 + look} r="1.4" fill="var(--color-sticker)" />
      <circle cx="72.5" cy={63 + look} r="1.4" fill="var(--color-sticker)" />
    </g>
  );
};

const Mouth = ({ mood }: { mood: MascotMood }): React.ReactElement => {
  if (mood === MascotMood.Cheer) {
    return <path d="M52 76 q8 10 16 0 z" fill="var(--color-pink-deep)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" />;
  }
  if (mood === MascotMood.Thinking) {
    return <path d="M55 79 q5 -3 10 0" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />;
  }
  return <path d="M54 76 q6 6 12 0" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />;
};

/**
 * 寄り道コンパスのマスコット「ミチノコ」。方位針の帽子をかぶった、まるい方位磁石。
 * 気分で表情と手の形が変わる。白フチと焦げ茶の影でステッカーとして浮かせる。
 */
export const Mascot = ({ mood = MascotMood.Idle, size = DEFAULT_SIZE, className, label = "ミチノコ" }: MascotProps): React.ReactElement => {
  const armsUp = mood === MascotMood.Cheer;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={cx("sticker-fringe overflow-visible", className)}
    >
      <g className={cx("origin-[60px_30px]", mood === MascotMood.Thinking ? "animate-[needle-spin_1.6s_linear_infinite]" : "animate-[needle-wiggle_2.4s_ease-in-out_infinite]")}>
        <path d="M60 8 L69 32 L60 28 L51 32 Z" fill="var(--color-pink-deep)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="60" cy="30" r="4" fill="var(--color-lemon-deep)" stroke="var(--color-ink)" strokeWidth="2.5" />
      </g>
      <g stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" fill="none">
        {armsUp ? (
          <>
            <path d="M28 70 q-12 -10 -10 -24" />
            <path d="M92 70 q12 -10 10 -24" />
          </>
        ) : (
          <>
            <path d="M27 76 q-10 4 -12 12" />
            <path d="M93 76 q10 4 12 12" />
          </>
        )}
        <path d="M48 104 v8" />
        <path d="M72 104 v8" />
      </g>
      <circle cx="60" cy="70" r="36" fill="var(--color-sticker)" stroke="var(--color-ink)" strokeWidth="3" />
      <circle cx="60" cy="70" r="29" fill="var(--color-mint)" stroke="var(--color-ink)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      <g fill="var(--color-ink)" fontFamily="var(--font-hand)" fontSize="8" textAnchor="middle">
        <text x="60" y="48">N</text>
        <text x="86" y="73">E</text>
        <text x="34" y="73">W</text>
      </g>
      <ellipse cx="41" cy="77" rx="6" ry="3.5" fill="var(--color-pink)" />
      <ellipse cx="79" cy="77" rx="6" ry="3.5" fill="var(--color-pink)" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </svg>
  );
};
