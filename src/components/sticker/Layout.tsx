import type { HTMLAttributes } from "react";

import { cx } from "./tokens";

type LayoutProps = HTMLAttributes<HTMLDivElement> & {
  /** Tailwind の gap クラス名。既定は gap-3。余白の基準は gap-grid。 */
  gap?: string;
};

/** 縦に一定間隔で積むレイアウト。smarthr-ui の Stack に相当。 */
export const Stack = ({ gap = "gap-3", className, ...rest }: LayoutProps): React.ReactElement => (
  <div className={cx("flex flex-col", gap, className)} {...rest} />
);

/** 横に並べて、収まらなければ折り返すレイアウト。smarthr-ui の Cluster に相当。 */
export const Cluster = ({ gap = "gap-3", className, ...rest }: LayoutProps): React.ReactElement => (
  <div className={cx("flex flex-wrap items-center", gap, className)} {...rest} />
);
