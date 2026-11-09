import { BubbleTail, Doodle, DoodleKind, Mascot, MascotMood, ScreenHeading, SpeechBubble } from "@/components/sticker";

import { LoadingStages } from "../components/LoadingStages";
import { moodById } from "../content";
import type { WalkState } from "../flow";

type LoadingScreenProps = {
  state: WalkState;
};

const MASCOT_SIZE = 168;
const SPARKLE_SIZE = 26;
const STAR_SIZE = 22;

/** マスコットが考えこんでいる間に、探索の段階を 1 つずつ進めて見せる画面。 */
export const LoadingScreen = ({ state }: LoadingScreenProps): React.ReactElement => {
  const mood = moodById(state.mood);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <ScreenHeading className="sr-only">ルートを探しています</ScreenHeading>
      <div className="flex flex-col items-center gap-4">
        <SpeechBubble tail={BubbleTail.Bottom} className="text-base">
          口コミから裏道を探しているよ
        </SpeechBubble>
        <div className="relative px-8">
          <Doodle kind={DoodleKind.Sparkle} color="var(--color-lilac-deep)" size={SPARKLE_SIZE} className="absolute top-2 left-0" />
          <Doodle kind={DoodleKind.Star} color="var(--color-lemon-deep)" size={STAR_SIZE} className="absolute right-0 bottom-6" />
          <Mascot mood={MascotMood.Thinking} size={MASCOT_SIZE} />
        </div>
        <p className="text-center font-note text-sm text-balance text-ink-soft">
          {state.dest}まで、「{mood.label}」の道を選んでいます
        </p>
      </div>
      <LoadingStages stage={state.stage} />
    </div>
  );
};
