import {
  BubbleTail,
  ButtonSize,
  IconName,
  IconSticker,
  Mascot,
  MascotMood,
  SpeechBubble,
  StickerButton,
  StickerCard,
  TextAreaField,
  Tilt,
} from "@/components/sticker";

import { PhotoSlot } from "../components/PhotoSlot";
import { moodById } from "../content";
import { CHECKPOINTS, type WalkAction, type WalkState } from "../flow";

const MASCOT_SIZE = 112;
const BACK_ICON_SIZE = 44;
const MEMO_ID = "capture-memo";

type CaptureScreenProps = { state: WalkState; dispatch: (a: WalkAction) => void };

/** チェックポイントで写真とひとことを残す画面。 */
export const CaptureScreen = ({ state, dispatch }: CaptureScreenProps): React.ReactElement => {
  const index = Math.min(state.step, CHECKPOINTS - 1);
  const quest = moodById(state.mood).quests[index];
  const taken = state.shots[index] ?? false;
  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="地図に戻る"
          onClick={() => dispatch({ type: "backToRoute" })}
          className="rounded-full transition-transform duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 focus-visible:focus-ring"
        >
          <IconSticker name={IconName.Back} size={BACK_ICON_SIZE} />
        </button>
        <div className="flex min-w-0 flex-col">
          <p className="font-hand text-sm text-ink-soft">
            チェックポイント {index + 1} / {CHECKPOINTS}
          </p>
          <h1 className="font-hand text-xl leading-snug text-ink">{quest.checkpoint}</h1>
        </div>
      </header>

      <div className="flex flex-col">
        <div className="relative z-0 -mb-3 flex items-end justify-end gap-3 pr-2">
          <SpeechBubble tail={BubbleTail.Right} className="mb-8">
            {taken ? "いい写真だね" : "パシャっと撮ってみて"}
          </SpeechBubble>
          <Mascot mood={taken ? MascotMood.Cheer : MascotMood.Idle} size={MASCOT_SIZE} className="shrink-0 rotate-(--tilt-mascot)" />
        </div>
        <StickerCard tone={quest.tone} tilt={Tilt.Slight} className="z-10 flex flex-col gap-1 pt-6">
          <p className="font-hand text-xs text-ink-soft">クエスト</p>
          <p className="font-hand text-lg leading-snug text-ink">{quest.title}</p>
        </StickerCard>
      </div>

      <PhotoSlot taken={taken} tone={quest.tone} caption={quest.checkpoint} onShoot={() => dispatch({ type: "shoot" })} />

      <TextAreaField
        id={MEMO_ID}
        label="ひとことメモ"
        placeholder="気づいたことを一言"
        hint="写真とメモから、Gemini が最後に思い出カードを書きます"
        value={state.memos[index] ?? ""}
        onChange={(e) => dispatch({ type: "setMemo", memo: e.target.value })}
      />

      <StickerButton size={ButtonSize.Lg} className="w-full" onClick={() => dispatch({ type: "saveAndNext" })}>
        記録して次へ
      </StickerButton>
    </div>
  );
};
