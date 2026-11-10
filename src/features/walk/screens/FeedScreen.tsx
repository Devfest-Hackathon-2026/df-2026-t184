import { IconName, IconSticker, ScreenHeading } from "@/components/sticker";

import { FeedCard } from "../components/FeedCard";
import { SAMPLE_FEED } from "../content";

const ROUND_ICON_SIZE = 44;
/** 友だちの投稿が見本データであることの知らせ。 */
export const FEED_SAMPLE_NOTE = "ここに並ぶのは見本の投稿です（実在の人の投稿ではありません）";

type FeedScreenProps = { onBack?: () => void };

/** ともだちの寄り道ログを、新しい順に縦に並べる画面。 */
export const FeedScreen = ({ onBack }: FeedScreenProps): React.ReactElement => (
  <div className="flex flex-col gap-4 p-4">
    <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-1 pt-1">
      {onBack ? (
        <button type="button" aria-label="思い出カードに戻る" onClick={onBack} className="rounded-full focus-visible:focus-ring">
          <IconSticker name={IconName.Back} size={ROUND_ICON_SIZE} bg="bg-sticker" className="shadow-sticker" />
        </button>
      ) : (
        <span />
      )}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-note text-xs tracking-widest text-ink-soft">WALK JOURNAL</span>
        <ScreenHeading className="font-note text-base font-semibold text-ink">みんなの寄り道</ScreenHeading>
      </div>
      <span />
    </header>
    <p className="text-center font-note text-xs text-ink-soft">友だちが見つけた、いつもの道の小さな発見</p>
    <p role="note" className="mx-1 rounded-(--radius-chip) border border-line bg-sticker px-3 py-2 text-center font-note text-xs text-ink">
      {FEED_SAMPLE_NOTE}
    </p>

    <ul aria-label="友だちの寄り道ログ" className="flex flex-col gap-4">
      {SAMPLE_FEED.map((post) => (
        <li key={post.id}>
          <FeedCard post={post} />
        </li>
      ))}
    </ul>
  </div>
);
