import { IconName, IconSticker, ScreenHeading } from "@/components/sticker";

import { FeedCard } from "../components/FeedCard";
import { SAMPLE_FEED } from "../content";

const BACK_ICON_SIZE = 40;

type FeedScreenProps = { onBack?: () => void };

/** ともだちの思い出カードを縦に並べる画面。 */
export const FeedScreen = ({ onBack }: FeedScreenProps): React.ReactElement => (
  <div className="flex flex-col gap-5 p-5">
    <header className="flex items-center gap-3">
      {onBack ? (
        <button type="button" aria-label="思い出カードに戻る" onClick={onBack} className="shrink-0 rounded-full focus-visible:focus-ring">
          <IconSticker name={IconName.Back} size={BACK_ICON_SIZE} bg="bg-sticker" className="shadow-sticker" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <ScreenHeading className="font-hand text-2xl text-ink">ともだちの寄り道</ScreenHeading>
        <p className="text-xs text-ink-soft">ここに並ぶのは見本の投稿です</p>
      </div>
    </header>

    <ul className="flex flex-col gap-3">
      {SAMPLE_FEED.map((post) => (
        <li key={post.id}>
          <FeedCard post={post} />
        </li>
      ))}
    </ul>
  </div>
);
