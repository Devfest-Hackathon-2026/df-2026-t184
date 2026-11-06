import { cx } from "./tokens";

type StampProps = {
  children: React.ReactNode;
  className?: string;
};

/** 朱色のハンコ。少しかすれて、-12° 傾いて押されている。 */
export const Stamp = ({ children, className }: StampProps): React.ReactElement => (
  <span
    className={cx(
      "inline-grid size-16 rotate-(--tilt-stamp) place-items-center rounded-full border-[3px] border-double border-coral-deep",
      "text-center font-hand text-[11px] leading-tight text-coral-deep opacity-90 [mask-image:var(--paper-noise),linear-gradient(#000,#000)]",
      className,
    )}
  >
    {children}
  </span>
);
