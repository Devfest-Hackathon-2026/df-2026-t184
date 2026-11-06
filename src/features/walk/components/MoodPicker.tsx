import { ChoiceChip, IconName, IconSticker } from "@/components/sticker";

import { MOODS } from "../content";
import { MoodId } from "../flow";

type MoodPickerProps = {
  value: MoodId;
  onChange: (mood: MoodId) => void;
};

const HEADING_ID = "walk-mood-heading";
const MOOD_TILTS: readonly number[] = [-1.2, 1, -0.6];
const CHECK_SIZE = 28;

/** 今の気分を 3 枚の傾いたカードから 1 つ選ぶ。 */
export const MoodPicker = ({ value, onChange }: MoodPickerProps): React.ReactElement => (
  <section className="flex flex-col gap-2">
    <h2 id={HEADING_ID} className="font-hand text-sm text-ink">
      今の気分
    </h2>
    <div role="radiogroup" aria-labelledby={HEADING_ID} className="flex flex-col gap-3">
      {MOODS.map((mood, i) => {
        const checked = mood.id === value;
        return (
          <ChoiceChip
            key={mood.id}
            checked={checked}
            onSelect={() => onChange(mood.id)}
            tone={mood.tone}
            tilt={MOOD_TILTS[i % MOOD_TILTS.length]}
            className="flex items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="font-hand text-base">{mood.label}</span>
              <span className="font-note text-sm text-ink-soft">{mood.description}</span>
            </span>
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center">
              {checked ? (
                <IconSticker name={IconName.Check} tone={mood.tone} size={CHECK_SIZE} className="animate-pop-in" />
              ) : (
                <span className="size-6 rounded-full border-2 border-dashed border-ink-soft" />
              )}
            </span>
          </ChoiceChip>
        );
      })}
    </div>
  </section>
);
