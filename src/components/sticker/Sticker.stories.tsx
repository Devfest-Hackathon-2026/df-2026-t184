import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  ButtonSize,
  ButtonVariant,
  ChoiceChip,
  Doodle,
  DoodleKind,
  IconName,
  IconSticker,
  Mascot,
  MascotMood,
  Stamp,
  StickerButton,
  StickerCard,
  Tape,
  TextAreaField,
  TextField,
  Tilt,
  Toast,
  Tone,
} from ".";

const meta: Meta = { title: "Sticker/Foundations" };
export default meta;

type Story = StoryObj;

const TONES = Object.values(Tone);
const MOODS = Object.values(MascotMood);

export const Palette: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {TONES.map((tone, i) => (
        <StickerCard key={tone} tone={tone} tilt={i % 2 ? Tilt.Right : Tilt.Left} className="w-28">
          <p className="font-hand text-sm">{tone}</p>
          <IconSticker name={IconName.Heart} tone={tone} size={32} className="mt-2" />
        </StickerCard>
      ))}
    </div>
  ),
};

export const MascotMoods: Story = {
  render: () => (
    <div className="flex gap-6">
      {MOODS.map((mood) => (
        <figure key={mood} className="flex flex-col items-center gap-2">
          <Mascot mood={mood} />
          <figcaption className="font-hand text-xs">{mood}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <StickerButton size={ButtonSize.Lg}>寄り道ルートを作る</StickerButton>
      <div className="flex gap-3">
        <StickerButton tone={Tone.Mint}>見つけた</StickerButton>
        <StickerButton variant={ButtonVariant.Plain}>記録する</StickerButton>
        <StickerButton disabled>押せない</StickerButton>
      </div>
    </div>
  ),
};

export const Decorations: Story = {
  render: () => (
    <div className="relative flex h-48 w-80 items-center justify-around">
      <Tape tone={Tone.Pink} angle={-9} className="-top-1 left-4" />
      <Tape tone={Tone.Sky} angle={7} className="-top-1 right-4" />
      <Doodle kind={DoodleKind.Star} color="var(--color-lemon-deep)" />
      <Doodle kind={DoodleKind.Heart} />
      <Doodle kind={DoodleKind.Wave} color="var(--color-sky-deep)" size={40} />
      <Doodle kind={DoodleKind.Sparkle} color="var(--color-lilac-deep)" />
      <Stamp>寄り道<br />達成</Stamp>
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
          <ChoiceChip key={label} name="demo-mood" value={label} checked={picked === i} onSelect={() => setPicked(i)} tilt={i % 2 ? 2 : -2} className="px-4 py-2 font-hand">
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
