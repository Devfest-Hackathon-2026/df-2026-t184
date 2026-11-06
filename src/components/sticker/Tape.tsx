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
      "pointer-events-none absolute block h-6 w-24 opacity-80",
      "[clip-path:polygon(0_8%,4%_0,8%_10%,12%_0,100%_0,96%_12%,100%_24%,96%_40%,100%_56%,96%_72%,100%_88%,96%_100%,0_100%,4%_88%,0_74%,4%_58%,0_42%,4%_26%)]",
      TONE_FILL[tone],
      className,
    )}
  />
);
