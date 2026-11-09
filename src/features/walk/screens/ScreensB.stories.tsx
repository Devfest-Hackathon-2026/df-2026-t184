import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PaperScreen } from "@/components/sticker";

import { CHECKPOINTS, initialWalk, MoodId, Screen, type WalkState } from "../flow";
import { WalkApp } from "../WalkApp";
import { FeedScreen } from "./FeedScreen";

const meta: Meta = { title: "Walk/Screens B", parameters: { layout: "fullscreen" } };
export default meta;

type Story = StoryObj;

const BASE: WalkState = { ...initialWalk, dest: "上野公園", mood: MoodId.Quiet };
const SAMPLE_MEMOS = ["風鈴の音が思ったより大きかった", "", "ベンチで10分、ぼーっとした"];

const CAPTURE_FIRST: WalkState = { ...BASE, screen: Screen.Capture, step: 0 };
const CAPTURE_SHOT: WalkState = { ...BASE, screen: Screen.Capture, step: 1, shots: [true, true, false], memos: [SAMPLE_MEMOS[0], "", ""] };
const MEMORY: WalkState = { ...BASE, screen: Screen.Memory, step: CHECKPOINTS, shots: [true, false, true], memos: SAMPLE_MEMOS };

/** 実際の画面遷移（walkReducer + フィード開閉）をそのまま使い、途中の画面から始める。 */
const Flow = ({ initial }: { initial: WalkState }): React.ReactElement => (
  <div className="mx-auto w-full max-w-97.5">
    <WalkApp initial={initial} />
  </div>
);

export const Capture: Story = { render: () => <Flow initial={CAPTURE_FIRST} /> };
export const CaptureAfterShot: Story = { render: () => <Flow initial={CAPTURE_SHOT} /> };
export const Memory: Story = { render: () => <Flow initial={MEMORY} /> };

/** 投稿一覧だけの静止表示。戻るボタンが要る流れは Memory story から実際に開ける。 */
export const Feed: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-97.5">
      <PaperScreen>
        <FeedScreen />
      </PaperScreen>
    </div>
  ),
};
