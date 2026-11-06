import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useReducer, useState } from "react";

import { PaperScreen, StickerButton } from "@/components/sticker";

import { CHECKPOINTS, initialWalk, MoodId, Screen, walkReducer, type WalkState } from "../flow";
import { CaptureScreen } from "./CaptureScreen";
import { FeedScreen } from "./FeedScreen";
import { MemoryScreen } from "./MemoryScreen";

const meta: Meta = { title: "Walk/Screens B", parameters: { layout: "fullscreen" } };
export default meta;

type Story = StoryObj;

const BASE: WalkState = { ...initialWalk, dest: "上野公園", mood: MoodId.Quiet };
const SAMPLE_MEMOS = ["風鈴の音が思ったより大きかった", "", "ベンチで10分、ぼーっとした"];

const CAPTURE_FIRST: WalkState = { ...BASE, screen: Screen.Capture, step: 0 };
const CAPTURE_SHOT: WalkState = { ...BASE, screen: Screen.Capture, step: 1, shots: [true, true, false], memos: [SAMPLE_MEMOS[0], "", ""] };
const MEMORY: WalkState = { ...BASE, screen: Screen.Memory, step: CHECKPOINTS, shots: [true, false, true], memos: SAMPLE_MEMOS };

/** 状態に合わせて画面を出し分ける。Screens A の画面に移ったら、撮影へ戻るボタンだけ出す。 */
const Flow = ({ initial }: { initial: WalkState }): React.ReactElement => {
  const [state, dispatch] = useReducer(walkReducer, initial);
  const [feedOpen, setFeedOpen] = useState(false);
  const body = ((): React.ReactElement => {
    if (feedOpen) return <FeedScreen onBack={() => setFeedOpen(false)} />;
    if (state.screen === Screen.Capture) return <CaptureScreen state={state} dispatch={dispatch} />;
    if (state.screen === Screen.Memory) return <MemoryScreen state={state} dispatch={dispatch} onOpenFeed={() => setFeedOpen(true)} />;
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <p className="font-hand text-base">この画面は Walk/Screens A にあります</p>
        <StickerButton onClick={() => dispatch({ type: "openCapture" })}>撮影画面を開く</StickerButton>
      </div>
    );
  })();
  return <PaperScreen>{body}</PaperScreen>;
};

const Mobile = ({ children }: { children: React.ReactNode }): React.ReactElement => <div className="mx-auto w-full max-w-97.5">{children}</div>;

export const Capture: Story = { render: () => <Mobile><Flow initial={CAPTURE_FIRST} /></Mobile> };
export const CaptureAfterShot: Story = { render: () => <Mobile><Flow initial={CAPTURE_SHOT} /></Mobile> };
export const Memory: Story = { render: () => <Mobile><Flow initial={MEMORY} /></Mobile> };
export const Feed: Story = { render: () => <Mobile><PaperScreen><FeedScreen onBack={() => undefined} /></PaperScreen></Mobile> };
