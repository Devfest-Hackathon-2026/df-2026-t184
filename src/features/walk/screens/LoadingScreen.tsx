import { ScreenHeading } from "@/components/sticker";

import { LoadingStages } from "../components/LoadingStages";
import { moodById } from "../content";
import type { WalkState } from "../flow";

type LoadingScreenProps = {
  state: WalkState;
};


/** ルートを探している間、探索の段階を 1 つずつ進めて見せる画面。 */
export const LoadingScreen = ({ state }: LoadingScreenProps): React.ReactElement => {
  const mood = moodById(state.mood);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <ScreenHeading className="sr-only">ルートを探しています</ScreenHeading>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-hand text-xl text-ink">口コミから裏道を探しています</p>
        <p className="font-note text-sm text-balance text-ink-soft">
          {state.dest}まで、「{mood.label}」の道を選んでいます
        </p>
      </div>
      <LoadingStages stage={state.stage} />
    </div>
  );
};
