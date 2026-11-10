"use client";

import { useEffect, useRef, useState } from "react";

import { ButtonSize, ButtonVariant, IconName, IconSticker, ScreenHeading, StickerButton, Toast } from "@/components/sticker";

import { MemoryCard } from "../components/MemoryCard";
import { moodById, questsOf } from "../content";
import { eta, type WalkAction, type WalkState } from "../flow";
import { POINTS_NOT_SAVED_NOTE, walkPoints } from "../points";

const SHARE_ICON_SIZE = 28;
const TOAST_VISIBLE_MS = 2400;
// 歩き終えた日として、思い出カードを開いた日を出す（固定の見本日付は本物の記録に見えるので使わない）。
const todayLabel = (): string => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

type MemoryScreenProps = {
  state: WalkState;
  dispatch: (a: WalkAction) => void;
  onOpenFeed?: () => void;
};

/** 歩き終えたあとの画面。思い出カードを見せる。 */
export const MemoryScreen = ({ state, dispatch, onOpenFeed }: MemoryScreenProps): React.ReactElement => {
  const [copied, setCopied] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const share = (): void => {
    setCopied(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setCopied(false), TOAST_VISIBLE_MS);
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-3 pt-2">
        <p className="font-note text-sm text-fg-subtle">
          おつかれさま、いい寄り道だったね
        </p>
      </div>

      <ScreenHeading className="font-hand text-2xl text-ink">今日の思い出カード</ScreenHeading>

      <MemoryCard
        dest={state.dest}
        mood={moodById(state.mood)}
        quests={questsOf(state)}
        shots={state.shots}
        memos={state.memos}
        extraMinutes={eta(state.budget).extra}
        walkedOn={todayLabel()}
      />

      <p className="font-hand text-base text-ink">
        この寄り道で +{walkPoints(state)} pt（ハンコ帳で称号を見られます）
        <span className="block font-note text-xs text-ink-soft">{POINTS_NOT_SAVED_NOTE}</span>
      </p>

      <div className="flex flex-col gap-3 pt-2">
        <StickerButton size={ButtonSize.Lg} onClick={share}>
          <IconSticker name={IconName.Share} size={SHARE_ICON_SIZE} />
          シェアする
        </StickerButton>
        <StickerButton variant={ButtonVariant.Plain} onClick={() => dispatch({ type: "restart" })}>
          もう一度歩く
        </StickerButton>
      </div>

      <div aria-live="polite" className="flex min-h-12 justify-center">
        {copied ? <Toast>見本：共有リンクは実際にはコピーされません</Toast> : null}
      </div>

      {onOpenFeed ? (
        <button
          type="button"
          onClick={onOpenFeed}
          className="self-center rounded-sm px-2 py-1 font-hand text-base text-ink underline decoration-pink-deep decoration-wavy decoration-2 underline-offset-4 focus-visible:focus-ring"
        >
          ともだちの寄り道を見る
        </button>
      ) : null}
    </div>
  );
};
