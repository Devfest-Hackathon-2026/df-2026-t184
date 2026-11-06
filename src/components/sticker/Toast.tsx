import { cx } from "./tokens";

type ToastProps = { children: React.ReactNode; className?: string };

/** 画面下に貼られる付箋のお知らせ。role=status で読み上げる。 */
export const Toast = ({ children, className }: ToastProps): React.ReactElement => (
  <div
    role="status"
    className={cx("sticker-edge inline-flex rotate-(--tilt-slight) items-center gap-2 rounded-(--radius-chip) bg-lemon px-4 py-2 font-hand text-sm animate-[pop-in_360ms_var(--ease-pop)]", className)}
  >
    {children}
  </div>
);
