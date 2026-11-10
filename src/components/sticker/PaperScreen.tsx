import { cx } from "./tokens";

type PaperScreenProps = { children: React.ReactNode; className?: string };

/**
 * アプリ 1 画面分の地。外側は薄いグレー、内側は画面の地の色。
 * 画面幅いっぱいのスマホでは枠を細く、PC では端末幅に収める。
 */
export const PaperScreen = ({ children, className }: PaperScreenProps): React.ReactElement => (
  <div className="sticker-app kraft flex min-h-dvh justify-center p-2 sm:items-center sm:p-6">
    <main className={cx("paper sticker-edge relative flex w-full max-w-md flex-col overflow-hidden rounded-4xl sm:min-h-205", className)}>{children}</main>
  </div>
);
