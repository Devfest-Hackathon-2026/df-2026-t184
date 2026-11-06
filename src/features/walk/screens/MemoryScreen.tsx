"use client";

import { useEffect, useRef, useState } from "react";

import { BubbleTail, ButtonSize, IconName, IconSticker, Mascot, MascotMood, SpeechBubble, StickerButton, Toast } from "@/components/sticker";

import { MemoryCard } from "../components/MemoryCard";
import { moodById } from "../content";
import { eta, type WalkAction, type WalkState } from "../flow";

const MASCOT_SIZE = 128;
const SHARE_ICON_SIZE = 28;
const TOAST_VISIBLE_MS = 2400;
// WalkState にまだ歩いた日がないので、見本の日付を置いている。
const SAMPLE_WALKED_ON = "2026年11月5日";

type MemoryScreenProps = {
  state: WalkState;
  dispatch: (a: WalkAction) => void;
  onOpenFeed?: () => void;
};

/** 歩き終えたあとの画面。マスコットが手を上げて、思い出カードを見せる。 */
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
        <Mascot mood={MascotMood.Cheer} size={MASCOT_SIZE} className="shrink-0 rotate-(--tilt-mascot)" />
        <SpeechBubble tail={BubbleTail.Left}>
          おつかれさま、いい寄り道だったね
        </SpeechBubble>
      </div>

      <h1 className="font-hand text-2xl text-ink">今日の思い出カード</h1>

      <MemoryCard
        dest={state.dest}
        mood={moodById(state.mood)}
        shots={state.shots}
        memos={state.memos}
        extraMinutes={eta(state.budget).extra}
        walkedOn={SAMPLE_WALKED_ON}
      />

      <div className="flex flex-col gap-3 pt-2">
        <StickerButton size={ButtonSize.Lg} onClick={share}>
          <IconSticker name={IconName.Share} size={SHARE_ICON_SIZE} />
          シェアする
        </StickerButton>
        <StickerButton plain onClick={() => dispatch({ type: "restart" })}>
          もう一度歩く
        </StickerButton>
      </div>

      <div className="flex min-h-12 justify-center">{copied ? <Toast>共有リンクをコピーしました</Toast> : null}</div>

      {onOpenFeed ? (
        <button
          type="button"
          onClick={onOpenFeed}
          className="self-center rounded-sm px-2 py-1 font-hand text-base text-ink underline decoration-pink-deep decoration-wavy decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
        >
          ともだちの寄り道を見る
        </button>
      ) : null}
    </div>
  );
};
