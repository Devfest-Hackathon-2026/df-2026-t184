import { cx } from "./tokens";

type StampProps = {
  children: React.ReactNode;
  className?: string;
};

/** 達成のしるし。アクセント色の細い円に文字を入れる。 */
export const Stamp = ({ children, className }: StampProps): React.ReactElement => (
  <span
    className={cx(
      "inline-grid size-16 place-items-center rounded-full border-2 border-accent bg-accent-soft p-1",
      "text-center font-hand text-xs leading-tight text-ink",
      className,
    )}
  >
    {children}
  </span>
);
