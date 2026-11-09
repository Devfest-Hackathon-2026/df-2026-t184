import type { HTMLAttributes } from "react";

/** 目には見せず、支援技術だけに伝える文字。装飾の代替や文脈の補足に使う。 */
export const VisuallyHidden = ({ children, ...rest }: HTMLAttributes<HTMLSpanElement>): React.ReactElement => (
  <span className="sr-only" {...rest}>
    {children}
  </span>
);
