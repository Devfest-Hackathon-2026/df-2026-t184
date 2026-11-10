"use client";

import { useRef, type KeyboardEvent } from "react";

import { ChoiceChip, IconName, IconSticker } from "@/components/sticker";

import { MOODS } from "../content";
import { MoodId } from "../flow";

type MoodPickerProps = {
  value: MoodId;
  onChange: (mood: MoodId) => void;
  /**
   * 気分を「決めた」とき（ポインター・Space で選んだとき）に呼ぶ。矢印キーで選択肢を見て回っているあいだは呼ばない。
   * 矢印キーはラジオの選択も動かすので、選んだ瞬間に次の質問へ進めると、キーボードでは 2 つ目しか選べなくなる。
   */
  onCommit?: () => void;
};

// ラジオのグループ内で選択を動かすキー。
const NAVIGATION_KEYS: ReadonlySet<string> = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

const CHECK_SIZE = 28;

/** 今の気分を 3 つの選択肢から 1 つ選ぶ。 */
export const MoodPicker = ({ value, onChange, onCommit }: MoodPickerProps): React.ReactElement => {
  const navigating = useRef(false);
  const handleKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>): void => {
    navigating.current = NAVIGATION_KEYS.has(event.key);
  };
  const handleSelect = (mood: MoodId): void => {
    onChange(mood);
    if (!navigating.current) onCommit?.();
    navigating.current = false;
  };
  return (
    <fieldset onKeyDown={handleKeyDown} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="sr-only">今の気分</legend>
      <div className="flex flex-col gap-3">
        {MOODS.map((mood) => {
          const checked = mood.id === value;
          return (
            <ChoiceChip
              key={mood.id}
              name="walk-mood"
              value={mood.id}
              checked={checked}
              onSelect={() => handleSelect(mood.id)}
              className="flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-hand text-base">{mood.label}</span>
                <span className="font-note text-sm text-fg-subtle">{mood.description}</span>
              </span>
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center">
                {checked ? (
                  <IconSticker name={IconName.Check} bg="bg-sticker" size={CHECK_SIZE} className="animate-pop-in" />
                ) : (
                  <span className="size-6 rounded-full border border-dashed border-border-subtle" />
                )}
              </span>
            </ChoiceChip>
          );
        })}
      </div>
    </fieldset>
  );
};
