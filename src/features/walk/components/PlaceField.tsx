"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cx, TextField } from "@/components/sticker";
import type { PlaceOption, PlacePick, SuggestPlaces } from "@/lib/places";

/** 打つたびに候補を取りに行かないよう、打ち終わってから待つ時間。 */
const DEBOUNCE_MS = 250;
/** これより短い入力では候補を探さない。 */
const MIN_CHARS = 2;

type PlaceFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  /** 文字を打ったとき。候補から選んだ座標は捨てる。 */
  onType: (text: string) => void;
  /** 候補から選んだとき。 */
  onPick: (place: PlacePick) => void;
  /** 候補の取り方。ないとき（地図キーなし）は普通の入力欄にする。 */
  suggest?: SuggestPlaces;
};

/** 打った文字から場所の候補を出し、選ぶと座標も渡す入力欄（combobox）。 */
export const PlaceField = ({ id, label, placeholder, value, onType, onPick, suggest }: PlaceFieldProps): React.ReactElement => {
  const [options, setOptions] = useState<readonly PlaceOption[]>([]);
  const [active, setActive] = useState(-1);
  // 候補を選んだ直後の値で、もう一度候補を探さないための印
  const [query, setQuery] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    if (!suggest || query === null) return;
    const text = query.trim();
    if (text.length < MIN_CHARS) return;
    const ticket = ++latest.current;
    const timer = window.setTimeout(() => {
      suggest(text)
        .then((list) => {
          if (ticket !== latest.current) return;
          setOptions(list);
          setActive(-1);
        })
        .catch((e: unknown) => {
          console.warn("[places] 候補を取れませんでした", e);
          if (ticket === latest.current) setOptions([]);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, suggest]);

  if (!suggest) {
    return <TextField id={id} label={label} placeholder={placeholder} autoComplete="off" value={value} onChange={(e) => onType(e.target.value)} />;
  }

  const listId = `${id}-options`;
  const open = options.length > 0;
  const close = (): void => {
    latest.current++;
    setOptions([]);
    setActive(-1);
    setQuery(null);
  };
  const choose = (option: PlaceOption): void => {
    close();
    void option
      .pick()
      .then((place) => {
        if (place) onPick(place);
        else onType(option.main);
      })
      .catch((e: unknown) => {
        console.warn("[places] 場所の座標を取れませんでした", e);
        onType(option.main);
      });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (event.key === "Enter" && active >= 0) {
      // フォームの送信（次へ）ではなく、候補を選ぶ
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="relative">
      <TextField
        id={id}
        label={label}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
        value={value}
        onChange={(e) => {
          onType(e.target.value);
          setQuery(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={close}
      />
      {open ? (
        // 入力欄は画面の下（タブバーのすぐ上）にあるので、候補は上に開く。下に開くとタブバーと画面の端で切れてスクロールできない
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label}の候補`}
          className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-[min(16rem,50vh)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface-raised py-1 shadow-sticker"
        >
          {options.map((option, i) => (
            <li
              key={option.id}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={i === active}
              // 入力欄の blur より先に選ぶ
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
              className={cx("flex min-h-11 cursor-pointer flex-col justify-center px-4 py-1.5", i === active ? "bg-accent-soft" : "hover:bg-paper-line")}
            >
              <span className="font-note text-sm text-ink">{option.main}</span>
              {option.sub ? <span className="font-note text-xs text-ink-soft">{option.sub}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
