import { cx } from "./tokens";

type PaperScreenProps = { children: React.ReactNode; className?: string };

/**
 * アプリ 1 画面分の紙。外側はクラフト紙の枠、内側は方眼の紙。
 * 画面幅いっぱいのスマホでは枠を細く、PC では端末幅に収める。
 */
export const PaperScreen = ({ children, className }: PaperScreenProps): React.ReactElement => (
  <div className="kraft flex min-h-dvh justify-center p-2 sm:items-center sm:p-6">
    <div className={cx("paper sticker-edge relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] sm:min-h-[820px]", className)}>{children}</div>
  </div>
);
