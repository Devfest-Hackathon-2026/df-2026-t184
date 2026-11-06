import { cx, TONE_FILL, Tone } from "./tokens";

type TapeProps = {
  tone?: Tone;
  angle?: number;
  className?: string;
};

const DEFAULT_ANGLE = -9;

/** マスキングテープ。半透明で、両端がギザギザ。装飾なので読み上げない。 */
export const Tape = ({ tone = Tone.Lemon, angle = DEFAULT_ANGLE, className }: TapeProps): React.ReactElement => (
  <span
    aria-hidden="true"
    style={{ rotate: `${angle}deg` }}
    className={cx(
      "tape-edge pointer-events-none absolute block h-6 w-24 opacity-80",
      TONE_FILL[tone],
      className,
    )}
  />
);
