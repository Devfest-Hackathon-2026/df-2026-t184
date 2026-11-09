import { BubbleTail, cx, Doodle, DoodleKind, IconName, IconSticker, Mascot, MascotMood, ScreenHeading, SpeechBubble, Tilt } from "@/components/sticker";

import { FeedCard } from "../components/FeedCard";
import { SAMPLE_FEED } from "../content";

const MASCOT_SIZE = 96;
const BACK_ICON_SIZE = 44;
const DOODLE_SIZE = 32;
const CARD_TILTS: readonly Tilt[] = [Tilt.Left, Tilt.Right, Tilt.Slight];
const GAP_DOODLES: readonly { kind: DoodleKind; color: string }[] = [
  { kind: DoodleKind.Star, color: "var(--color-lemon-deep)" },
  { kind: DoodleKind.Wave, color: "var(--color-sky-deep)" },
  { kind: DoodleKind.Heart, color: "var(--color-pink-deep)" },
];

type FeedScreenProps = { onBack?: () => void };

/** ともだちの思い出カードを、手帳に貼るように縦に並べる画面。 */
export const FeedScreen = ({ onBack }: FeedScreenProps): React.ReactElement => (
  <div className="flex flex-col gap-5 p-5">
    <header className="flex items-center gap-3">
      {onBack ? (
        <button
          type="button"
          aria-label="思い出カードに戻る"
          onClick={onBack}
          className="shrink-0 rounded-full transition-transform duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 focus-visible:focus-ring"
        >
          <IconSticker name={IconName.Back} size={BACK_ICON_SIZE} />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <ScreenHeading className="font-hand text-2xl text-ink">ともだちの寄り道</ScreenHeading>
        <p className="text-xs text-ink-soft">ここに並ぶのは見本の投稿です</p>
      </div>
    </header>

    <div className="flex items-center gap-3 pr-2">
      <SpeechBubble tail={BubbleTail.Right} className="ml-auto">
        みんなの寄り道、のぞいてみよう
      </SpeechBubble>
      <Mascot mood={MascotMood.Calm} size={MASCOT_SIZE} className="shrink-0 rotate-(--tilt-mascot)" />
    </div>

    <ul className="flex flex-col">
      {SAMPLE_FEED.map((post, i) => {
        const doodle = GAP_DOODLES[i % GAP_DOODLES.length];
        const isLast = i === SAMPLE_FEED.length - 1;
        return (
          <li key={post.id} className="flex flex-col">
            <FeedCard post={post} tilt={CARD_TILTS[i % CARD_TILTS.length]} />
            {isLast ? null : (
              <div className={cx("flex h-14 items-center px-6", i % 2 ? "justify-start" : "justify-end")}>
                <Doodle kind={doodle.kind} color={doodle.color} size={DOODLE_SIZE} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  </div>
);
