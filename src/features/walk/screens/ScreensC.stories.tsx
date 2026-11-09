import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PaperScreen } from "@/components/sticker";

import { BotSays, GuideBot } from "../components/GuideBot";
import { SAMPLE_ALBUM } from "../content";
import { WalkApp } from "../WalkApp";
import { AlbumScreen } from "./AlbumScreen";
import { StampsScreen } from "./StampsScreen";

const meta: Meta = { title: "Walk/Screens C", parameters: { layout: "fullscreen" } };
export default meta;

type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }): React.ReactElement => <div className="mx-auto w-full max-w-97.5">{children}</div>;

export const Onboarding: Story = {
  name: "はじめての案内（そのまま操作できる）",
  render: () => (
    <Frame>
      <WalkApp onboarding />
    </Frame>
  ),
};

export const Album: Story = {
  name: "寄り道アルバム",
  render: () => (
    <Frame>
      <PaperScreen>
        <AlbumScreen album={SAMPLE_ALBUM} />
      </PaperScreen>
    </Frame>
  ),
};

export const Stamps: Story = {
  name: "ハンコ帳（見本 2 件ぶん）",
  render: () => (
    <Frame>
      <PaperScreen>
        <StampsScreen album={SAMPLE_ALBUM} />
      </PaperScreen>
    </Frame>
  ),
};

export const StampsEmpty: Story = {
  name: "ハンコ帳（まだ 0 件）",
  render: () => (
    <Frame>
      <PaperScreen>
        <StampsScreen album={[]} />
      </PaperScreen>
    </Frame>
  ),
};

export const Bot: Story = {
  name: "案内キャラクター",
  render: () => (
    <Frame>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-end gap-6">
          <GuideBot />
          <GuideBot thinking />
          <GuideBot size={120} />
        </div>
        <BotSays text="今日はどこまで歩く？" />
        <BotSays text="考え中" thinking />
      </div>
    </Frame>
  ),
};
