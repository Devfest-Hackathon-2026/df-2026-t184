import { ChoiceChip } from "@/components/sticker";

import { Budget, BUDGETS } from "../flow";

type BudgetPickerProps = {
  value: Budget;
  onChange: (budget: Budget) => void;
};


/** 寄り道に使ってもいい時間を 3 つから選ぶ。 */
export const BudgetPicker = ({ value, onChange }: BudgetPickerProps): React.ReactElement => (
  <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
    <legend className="float-left w-full p-0 pb-2 font-hand text-sm text-ink">寄り道してもいい時間</legend>
    <div className="grid grid-cols-3 gap-3">
      {BUDGETS.map((budget) => (
        <ChoiceChip
          key={budget}
          name="walk-budget"
          value={String(budget)}
          checked={budget === value}
          onSelect={() => onChange(budget)}
          className="min-h-12 px-2 py-2 font-hand text-base"
        >
          +{budget}分
        </ChoiceChip>
      ))}
    </div>
  </fieldset>
);
