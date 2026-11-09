import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { initialWalk } from "../flow";
import { WalkApp } from "../WalkApp";
import { HypothesisFrame } from "./HypothesisFrame";
import { SCENARIOS, type Scenario } from "./scenarios";

const meta: Meta = {
  title: "Hypothesis/仮説モック WalkApp",
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj;

const scenarioOf = (id: Scenario["id"]): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

const ScenarioDemo = ({ scenario }: { scenario: Scenario }): React.ReactElement => (
  <HypothesisFrame scenario={scenario}>
    <WalkApp initial={{ ...initialWalk, dest: scenario.dest }} />
  </HypothesisFrame>
);

export const DailyDetour: Story = {
  name: "場面A: 日常の寄り道",
  render: () => <ScenarioDemo scenario={scenarioOf("daily")} />,
};

export const TourismDetour: Story = {
  name: "場面B: 観光での寄り道",
  render: () => <ScenarioDemo scenario={scenarioOf("tourism")} />,
};
