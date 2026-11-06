import type { Preview } from "@storybook/nextjs-vite";

import { fontVariables } from "../src/app/fonts";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <div className={`${fontVariables} paper min-h-[200px] p-8 font-note text-ink`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
