import { cx } from "./tokens";

type StampProps = {
  children: React.ReactNode;
  className?: string;
};

/** 朱色のハンコ。少しかすれて、-12° 傾いて押されている。 */
export const Stamp = ({ children, className }: StampProps): React.ReactElement => (
  <span
    className={cx(
      "ink-worn inline-grid size-16 rotate-(--tilt-stamp) place-items-center rounded-full border-4 border-double border-coral-ink",
      "text-center font-hand text-xs leading-tight text-coral-ink",
      className,
    )}
  >
    {children}
  </span>
);
