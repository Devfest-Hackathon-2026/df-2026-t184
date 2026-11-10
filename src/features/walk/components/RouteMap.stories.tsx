import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MapVariant, RouteMap } from "./RouteMap";

const meta: Meta<typeof RouteMap> = {
  title: "Walk/RouteMap",
  component: RouteMap,
  args: { step: 1, dest: "上野公園", variant: MapVariant.Full },
  argTypes: {
    step: { control: { type: "range", min: 0, max: 3, step: 1 } },
    variant: { control: "inline-radio", options: Object.values(MapVariant) },
  },
  decorators: [
    (Story) => (
      <div className="sticker-edge h-96 w-80 overflow-hidden rounded-(--radius-sticker)">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof RouteMap>;

export const Walking: Story = {};
export const Start: Story = { args: { step: 0 } };
export const Mini: Story = { args: { step: 3, variant: MapVariant.Mini } };
