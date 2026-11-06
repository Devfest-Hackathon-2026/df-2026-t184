import type { Preview } from "@storybook/nextjs-vite";

import { fontVariables } from "../src/app/fonts";
import "../src/app/globals.css";

const FULLSCREEN = "fullscreen";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  decorators: [
    (Story, context) => (
      <div lang="ja" className={`${fontVariables} font-note text-ink ${context.parameters.layout === FULLSCREEN ? "" : "paper min-h-50 p-8"}`}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
