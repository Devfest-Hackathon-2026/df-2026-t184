"use client";

import { useState } from "react";

import { ButtonSize, ButtonVariant, cx, IconName, IconSticker, ScreenHeading, StickerButton, Tone } from "@/components/sticker";

import { RouteMap } from "../components/RouteMap";

type Slide = { title: string; body: string; art: React.ReactElement };

const ICON_SIZE = 72;

const IconArt = ({ name, tone }: { name: IconName; tone: Tone }): React.ReactElement => (
  <div className="grid aspect-[4/3] place-items-center">
    <IconSticker name={name} tone={tone} size={ICON_SIZE} />
  </div>
);

const SLIDES: readonly Slide[] = [
  {
    title: "最短じゃない道を、歩いてみよう",
    body: "行き先と今の気分を選ぶと、人の多い通りを避けた寄り道ルートを作ります。",
    art: <RouteMap step={1} dest="上野公園" className="aspect-[4/3]" />,
  },
  {
    title: "途中の 3 地点で、小さなクエスト",
    body: "口コミから選んだ地点ごとに、その場でできる小さなことを用意します。写真とひとことを残せます。",
    art: <IconArt name={IconName.Camera} tone={Tone.Sky} />,
  },
  {
    title: "歩き終えたら、思い出カードに",
    body: "写真とメモから思い出カードを作り、アルバムとハンコ帳にたまります。出発地には現在地を使います。",
    art: <IconArt name={IconName.Check} tone={Tone.Mint} />,
  },
];

type OnboardingScreenProps = { onDone: () => void };

/** はじめて開いたときの 3 枚の案内。どこからでもスキップできる。 */
export const OnboardingScreen = ({ onDone }: OnboardingScreenProps): React.ReactElement => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  return (
    <div className="flex flex-1 flex-col gap-6 p-5">
      <div className="flex justify-end">
        <StickerButton variant={ButtonVariant.Plain} onClick={onDone}>
          スキップ
        </StickerButton>
      </div>

      <div className="overflow-hidden rounded-(--radius-sticker) bg-kraft">{slide.art}</div>

      <div className="flex flex-col gap-2">
        <ScreenHeading key={index} className="font-hand text-2xl leading-snug text-ink">
          {slide.title}
        </ScreenHeading>
        <p className="font-note text-sm leading-relaxed text-ink-soft">{slide.body}</p>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <ol aria-label={`${SLIDES.length} 枚中 ${index + 1} 枚目`} className="flex justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <li key={s.title} className={cx("h-1.5 rounded-full transition-all duration-200", i === index ? "w-6 bg-accent" : "w-1.5 bg-line")} />
          ))}
        </ol>
        <StickerButton size={ButtonSize.Lg} className="w-full" onClick={() => (isLast ? onDone() : setIndex(index + 1))}>
          {isLast ? "はじめる" : "次へ"}
        </StickerButton>
      </div>
    </div>
  );
};
