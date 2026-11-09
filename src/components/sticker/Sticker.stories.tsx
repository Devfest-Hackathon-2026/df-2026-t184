import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  ButtonSize,
  ButtonVariant,
  ChoiceChip,
  IconName,
  IconSticker,
  StickerButton,
  StickerCard,
  TextAreaField,
  TextField,
  Toast,
  Tone,
} from ".";

const meta: Meta = { title: "Design System/Foundations" };
export default meta;

type Story = StoryObj;

const TONES = Object.values(Tone);

export const Palette: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {TONES.map((tone) => (
        <StickerCard key={tone} tone={tone} className="w-28">
          <p className="font-hand text-sm">{tone}</p>
          <IconSticker name={IconName.Heart} tone={tone} size={32} className="mt-2" />
        </StickerCard>
      ))}
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <StickerButton size={ButtonSize.Lg}>寄り道ルートを作る</StickerButton>
      <div className="flex gap-3">
        <StickerButton>見つけた</StickerButton>
        <StickerButton variant={ButtonVariant.Plain}>記録する</StickerButton>
        <StickerButton disabled>押せない</StickerButton>
      </div>
    </div>
  ),
};

export const Icons: Story = {
  render: () => (
    <div className="flex gap-3">
      {Object.values(IconName).map((name, i) => (
        <IconSticker key={name} name={name} tone={TONES[i % TONES.length]} />
      ))}
    </div>
  ),
};

const ChipsDemo = (): React.ReactElement => {
  const [picked, setPicked] = useState(0);
  return (
    <fieldset className="m-0 flex min-w-0 border-0 p-0">
      <legend className="sr-only">今の気分</legend>
      <div className="flex gap-3">
        {["静けさ", "レトロ", "グルメ"].map((label, i) => (
          <ChoiceChip key={label} name="demo-mood" value={label} checked={picked === i} onSelect={() => setPicked(i)} className="px-4 py-2 font-hand">
            {label}
          </ChoiceChip>
        ))}
      </div>
    </fieldset>
  );
};

export const Chips: Story = { render: () => <ChipsDemo /> };

export const Fields: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <TextField id="sb-dest" label="行き先" placeholder="行き先を入力" defaultValue="上野公園" />
      <TextAreaField id="sb-memo" label="ひとことメモ" placeholder="気づいたことを一言" hint="写真とメモから、Gemini が思い出カードを書きます" />
    </div>
  ),
};

export const Notice: Story = { render: () => <Toast>共有リンクをコピーしました</Toast> };
