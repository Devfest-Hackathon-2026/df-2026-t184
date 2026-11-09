import { ChoiceChip, Tone, TILT_CELL_DEG } from "@/components/sticker";

import { Budget, BUDGETS } from "../flow";

type BudgetPickerProps = {
  value: Budget;
  onChange: (budget: Budget) => void;
};

const CELL_TONES: readonly Tone[] = [Tone.Sky, Tone.Lemon, Tone.Lilac];

/** 寄り道に使ってもいい時間を、方眼のマスのような 3 つのセルから選ぶ。 */
export const BudgetPicker = ({ value, onChange }: BudgetPickerProps): React.ReactElement => (
  <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
    <legend className="float-left w-full p-0 pb-2 font-hand text-sm text-ink">寄り道してもいい時間</legend>
    <div className="grid grid-cols-3 gap-3">
      {BUDGETS.map((budget, i) => (
        <ChoiceChip
          key={budget}
          name="walk-budget"
          value={String(budget)}
          checked={budget === value}
          onSelect={() => onChange(budget)}
          tone={CELL_TONES[i % CELL_TONES.length]}
          tilt={i % 2 ? TILT_CELL_DEG : -TILT_CELL_DEG}
          className="min-h-12 px-2 py-2 font-hand text-base"
        >
          +{budget}分
        </ChoiceChip>
      ))}
    </div>
  </fieldset>
);
