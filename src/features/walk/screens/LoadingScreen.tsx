import { ScreenHeading } from "@/components/sticker";

import { BotSays } from "../components/GuideBot";
import { LoadingStages } from "../components/LoadingStages";
import { moodById } from "../content";
import { LOADING_STAGES, type WalkState } from "../flow";

type LoadingScreenProps = {
  state: WalkState;
};

/** 探索の段階が演出であることの知らせ。Places API は使っておらず、AI はクエストを作るだけ。 */
export const LOADING_STAGES_NOTE =
  "段階の表示は演出です。実際に使うのは、クエストを作る Gemini と、地図キーがあるときの Google マップの道順だけです";

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
      <p className="font-note text-xs text-balance text-center text-ink-soft">{LOADING_STAGES_NOTE}</p>
      <BotSays text={`${LOADING_STAGES[Math.min(state.stage, LOADING_STAGES.length - 1)].label}ところ…`} className="w-full" />
    </div>
  );
};
