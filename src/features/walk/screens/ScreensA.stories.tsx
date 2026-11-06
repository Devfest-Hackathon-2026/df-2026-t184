import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useReducer } from "react";

import { PaperScreen } from "@/components/sticker";

import { initialWalk, MoodId, Screen, walkReducer, type WalkState } from "../flow";
import { InputScreen } from "./InputScreen";
import { LoadingScreen } from "./LoadingScreen";
import { RouteScreen } from "./RouteScreen";

const meta: Meta = { title: "Walk/Screens A", parameters: { layout: "fullscreen" } };
export default meta;

type Story = StoryObj;

const SAMPLE_DEST = "上野公園";
const MID_STAGE = 2;

const Phone = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <div className="mx-auto w-97.5">
    <PaperScreen>{children}</PaperScreen>
  </div>
);

const InputDemo = ({ initial }: { initial: WalkState }): React.ReactElement => {
  const [state, dispatch] = useReducer(walkReducer, initial);
  return <Phone>{state.screen === Screen.Input ? <InputScreen state={state} dispatch={dispatch} /> : <LoadingScreen state={state} />}</Phone>;
};

export const InputEmpty: Story = { render: () => <InputDemo initial={initialWalk} /> };

export const InputFilled: Story = {
  render: () => <InputDemo initial={{ ...initialWalk, dest: SAMPLE_DEST, mood: MoodId.Retro, budget: 30 }} />,
};

export const Loading: Story = {
  render: () => (
    <Phone>
      <LoadingScreen state={{ ...initialWalk, screen: Screen.Loading, dest: SAMPLE_DEST, mood: MoodId.Quiet, stage: MID_STAGE }} />
    </Phone>
  ),
};

const RouteDemo = ({ initial }: { initial: WalkState }): React.ReactElement => {
  const [state, dispatch] = useReducer(walkReducer, initial);
  if (state.screen === Screen.Input) return <Phone><InputScreen state={state} dispatch={dispatch} /></Phone>;
  return <Phone><RouteScreen state={state} dispatch={dispatch} /></Phone>;
};

export const Route: Story = {
  render: () => <RouteDemo initial={{ ...initialWalk, screen: Screen.Route, dest: SAMPLE_DEST, mood: MoodId.Quiet, step: 1 }} />,
};
