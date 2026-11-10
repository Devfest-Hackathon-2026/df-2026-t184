import { cx } from "./tokens";

type ToastProps = { children: React.ReactNode; className?: string };

/** 画面下に出る短いお知らせ。role=status で読み上げる。 */
export const Toast = ({ children, className }: ToastProps): React.ReactElement => (
  <div
    role="status"
    className={cx("inline-flex items-center gap-2 rounded-(--radius-sticker) bg-ink px-4 py-2 font-hand text-sm text-fg-on-deep shadow-sticker-lg animate-pop-in", className)}
  >
    {children}
  </div>
);
