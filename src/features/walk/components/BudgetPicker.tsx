import { ChoiceChip, Tone, TILT_CELL_DEG } from "@/components/sticker";

import { Budget, BUDGETS } from "../flow";

type BudgetPickerProps = {
  value: Budget;
  onChange: (budget: Budget) => void;
};

const HEADING_ID = "walk-budget-heading";
const CELL_TONES: readonly Tone[] = [Tone.Sky, Tone.Lemon, Tone.Lilac];

/** 寄り道に使ってもいい時間を、方眼のマスのような 3 つのセルから選ぶ。 */
export const BudgetPicker = ({ value, onChange }: BudgetPickerProps): React.ReactElement => (
  <section className="flex flex-col gap-2">
    <h2 id={HEADING_ID} className="font-hand text-sm text-ink">
      寄り道してもいい時間
    </h2>
    <div role="radiogroup" aria-labelledby={HEADING_ID} className="grid grid-cols-3 gap-3">
      {BUDGETS.map((budget, i) => (
        <ChoiceChip
          key={budget}
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
  </section>
);
