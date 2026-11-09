import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PaperScreen } from "@/components/sticker";

import { initialWalk, MoodId, Screen, type WalkState } from "../flow";
import { WalkApp } from "../WalkApp";
import { LoadingScreen } from "./LoadingScreen";

const meta: Meta = { title: "Walk/Screens A", parameters: { layout: "fullscreen" } };
export default meta;

type Story = StoryObj;

const SAMPLE_DEST = "上野公園";
const MID_STAGE = 2;

/**
 * 実際の画面遷移（walkReducer + 探索タイマー）をそのまま使う。
 * 初期状態だけ変えて、途中の画面から確認できるようにする。
 */
const Flow = ({ initial }: { initial: WalkState }): React.ReactElement => (
  <div className="mx-auto w-full max-w-97.5">
    <WalkApp initial={initial} />
  </div>
);

export const InputEmpty: Story = { render: () => <Flow initial={initialWalk} /> };

export const InputFilled: Story = {
  render: () => <Flow initial={{ ...initialWalk, dest: SAMPLE_DEST, mood: MoodId.Retro, budget: 30 }} />,
};

/** 探索中の途中表示（静止画）。段階の進行自体は InputFilled から実際に進められる。 */
export const Loading: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-97.5">
      <PaperScreen>
        <LoadingScreen state={{ ...initialWalk, screen: Screen.Loading, dest: SAMPLE_DEST, mood: MoodId.Quiet, stage: MID_STAGE }} />
      </PaperScreen>
    </div>
  ),
};

export const Route: Story = {
  render: () => <Flow initial={{ ...initialWalk, screen: Screen.Route, dest: SAMPLE_DEST, mood: MoodId.Quiet, step: 1 }} />,
};
