import { cx, IconSticker, Tone } from "@/components/sticker";

import { type Tab, TABS } from "./tabs";

const ICON_SIZE = 32;

type TabBarProps = { current: Tab; onChange: (tab: Tab) => void };

/** 画面下の 4 つの行き先。いまの行き先はアイコンをピンクの円にする。 */
export const TabBar = ({ current, onChange }: TabBarProps): React.ReactElement => (
  <nav aria-label="画面の切り替え" className="sticky bottom-0 z-20 mt-auto border-t border-line bg-paper px-2 pt-1.5 pb-3">
    <ul className="grid grid-cols-4 gap-1">
      {TABS.map((tab) => {
        const active = tab.id === current;
        return (
          <li key={tab.id}>
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(tab.id)}
              className={cx(
                "flex w-full flex-col items-center gap-0.5 rounded-(--radius-sticker) py-1 font-hand text-xs transition-colors duration-150 focus-visible:focus-ring",
                active ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              <IconSticker name={tab.icon} tone={active ? Tone.Pink : undefined} size={ICON_SIZE} />
              {tab.label}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
