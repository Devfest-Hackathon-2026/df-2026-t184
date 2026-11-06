import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { moodById } from "../content";
import { type Budget, LOADING_STAGES, MoodId } from "../flow";
import { BudgetPicker } from "./BudgetPicker";
import { EtaNote } from "./EtaNote";
import { LoadingStages } from "./LoadingStages";
import { MoodPicker } from "./MoodPicker";
import { QuestSheet } from "./QuestSheet";

const meta: Meta = { title: "Walk/Parts A" };
export default meta;

type Story = StoryObj;

const DEFAULT_BUDGET: Budget = 20;
const MID_STAGE = 2;

const MoodDemo = (): React.ReactElement => {
  const [mood, setMood] = useState(MoodId.Quiet);
  return (
    <div className="w-80">
      <MoodPicker value={mood} onChange={setMood} />
    </div>
  );
};

export const Moods: Story = { render: () => <MoodDemo /> };

const BudgetDemo = (): React.ReactElement => {
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  return (
    <div className="flex w-80 flex-col gap-4">
      <BudgetPicker value={budget} onChange={setBudget} />
      <EtaNote budget={budget} />
    </div>
  );
};

export const BudgetAndEta: Story = { render: () => <BudgetDemo /> };

export const Loading: Story = {
  render: () => (
    <div className="w-80">
      <LoadingStages stage={MID_STAGE} />
    </div>
  ),
};

export const LoadingDone: Story = {
  render: () => (
    <div className="w-80">
      <LoadingStages stage={LOADING_STAGES.length} />
    </div>
  ),
};

const QuestDemo = (): React.ReactElement => {
  const [step, setStep] = useState(0);
  const quests = moodById(MoodId.Retro).quests;
  return (
    <div className="w-90">
      <QuestSheet
        quest={quests[Math.min(step, quests.length - 1)]}
        step={step}
        onCapture={() => undefined}
        onFound={() => setStep((s) => (s + 1) % (quests.length + 1))}
      />
    </div>
  );
};

export const Quest: Story = { render: () => <QuestDemo /> };
