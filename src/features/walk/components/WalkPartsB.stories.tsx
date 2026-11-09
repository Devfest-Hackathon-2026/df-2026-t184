import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Tone } from "@/components/sticker";

import { moodById, SAMPLE_FEED } from "../content";
import { MoodId } from "../flow";
import { FeedCard } from "./FeedCard";
import { MemoryCard } from "./MemoryCard";
import { PhotoSlot } from "./PhotoSlot";

const meta: Meta = { title: "Walk/Parts B" };
export default meta;

type Story = StoryObj;

const QUIET = moodById(MoodId.Quiet);
const SAMPLE_SHOTS = [true, false, true];
const SAMPLE_MEMOS = ["風鈴の音が思ったより大きかった", "", "ベンチで10分、ぼーっとした"];
const SAMPLE_EXTRA_MINUTES = 14;

const PhotoSlotDemo = ({ initiallyTaken }: { initiallyTaken: boolean }): React.ReactElement => {
  const [taken, setTaken] = useState(initiallyTaken);
  return (
    <div className="w-80">
      <PhotoSlot taken={taken} tone={Tone.Mint} caption="裏通りの小さな神社" onShoot={() => setTaken(true)} />
    </div>
  );
};

export const PhotoSlotEmpty: Story = { render: () => <PhotoSlotDemo initiallyTaken={false} /> };
export const PhotoSlotTaken: Story = { render: () => <PhotoSlotDemo initiallyTaken /> };

export const Memory: Story = {
  render: () => (
    <div className="w-88">
      <MemoryCard dest="上野公園" mood={QUIET} quests={QUIET.quests} shots={SAMPLE_SHOTS} memos={SAMPLE_MEMOS} extraMinutes={SAMPLE_EXTRA_MINUTES} walkedOn="2026年11月5日" />
    </div>
  ),
};

export const Feed: Story = {
  render: () => (
    <div className="flex w-88 flex-col gap-10">
      <FeedCard post={SAMPLE_FEED[0]} />
      <FeedCard post={SAMPLE_FEED[1]} />
    </div>
  ),
};
