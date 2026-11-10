import { useEffect, useRef } from "react";

import { cx } from "./tokens";

type ScreenHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 画面の先頭の見出し。画面が切り替わって現れたとき、ここにフォーカスを移して
 * キーボード・読み上げのユーザーにも場所の変化を伝える（SPA の画面遷移の定石）。
 * tabIndex -1 なので Tab の順序には入らず、プログラムからしかフォーカスできない。
 */
export const ScreenHeading = ({ children, className }: ScreenHeadingProps): React.ReactElement => {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={cx("outline-none", className)}>
      {children}
    </h1>
  );
};
