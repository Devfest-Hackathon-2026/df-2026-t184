"use client";

import { useState } from "react";

import GoogleRouteMap, { type FixedRoute } from "@/components/RouteMap";
import { MAPS_API_KEY } from "@/lib/google-maps";
import { ButtonSize, ButtonVariant, cx, IconName, IconSticker, ScreenHeading, StickerButton, Tone } from "@/components/sticker";

import { RouteMap } from "../components/RouteMap";

type Slide = { title: string; body: string; art: (realMap: boolean) => React.ReactElement };

const ICON_SIZE = 72;

const IconArt = ({ name, tone }: { name: IconName; tone: Tone }): React.ReactElement => (
  <div className="grid aspect-[4/3] place-items-center">
    <IconSticker name={name} tone={tone} size={ICON_SIZE} />
  </div>
);

// 案内で見せる上野〜谷中の寄り道。出発地・夕やけだんだん・到着地は /terrain と同じ地点。
const UENO_YANAKA: FixedRoute = {
  start: { lat: 35.7148, lng: 139.7745 }, // 上野公園 噴水広場前
  checkpoints: [
    { lat: 35.7191, lng: 139.7725 }, // 東京藝術大学 付近
    { lat: 35.7247, lng: 139.77 }, // 谷中霊園 付近
    { lat: 35.7278, lng: 139.7649 }, // 谷中銀座「夕やけだんだん」
  ],
  goal: { lat: 35.7205, lng: 139.779 }, // 鶯谷駅
};

const FIT_PADDING = { top: 24, right: 56, bottom: 24, left: 24 };

/** 本番では本体と同じ Google マップを出す。キーがない・失敗したときは手描きの地図にする。 */
const WalkMapArt = ({ realMap }: { realMap: boolean }): React.ReactElement => {
  const [failed, setFailed] = useState(false);
  if (!realMap || MAPS_API_KEY === "" || failed) return <RouteMap step={1} dest="谷中" className="aspect-[4/3]" />;
  return (
    <div className="relative aspect-[4/3]">
      <GoogleRouteMap dest="谷中" step={0} fixed={UENO_YANAKA} fitPadding={FIT_PADDING} onError={() => setFailed(true)} />
    </div>
  );
};

const SLIDES: readonly Slide[] = [
  {
    title: "最短じゃない道を、歩いてみよう",
    body: "行き先と今の気分を選ぶと、途中に 3 つの寄り道先をはさんだルートを作ります。",
    art: (realMap) => <WalkMapArt realMap={realMap} />,
  },
  {
    title: "途中の 3 地点で、小さなクエスト",
    body: "口コミから選んだ地点ごとに、その場でできる小さなことを用意します。写真とひとことを残せます。",
    art: () => <IconArt name={IconName.Camera} tone={Tone.Sky} />,
  },
  {
    title: "歩き終えたら、思い出カードに",
    body: "写真とメモから思い出カードを作り、アルバムとハンコ帳にたまります。出発地には現在地を使います。",
    art: () => <IconArt name={IconName.Check} tone={Tone.Mint} />,
  },
];

type OnboardingScreenProps = {
  onDone: () => void;
  /** Google Maps の地図を使う。省略時は手描きの地図。 */
  realMap?: boolean;
};

/** はじめて開いたときの 3 枚の案内。どこからでもスキップできる。 */
export const OnboardingScreen = ({ onDone, realMap = false }: OnboardingScreenProps): React.ReactElement => {
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

      <div className="overflow-hidden rounded-(--radius-sticker) bg-kraft">{slide.art(realMap)}</div>

      <div className="flex flex-col gap-2">
        <ScreenHeading key={index} className="font-hand text-2xl leading-snug text-ink">
          {slide.title}
        </ScreenHeading>
        <p className="font-note text-sm leading-relaxed text-ink-soft">{slide.body}</p>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        {/* 中身のない点の並びを list として読ませず、何枚目かを 1 つの画像の名前で伝える。 */}
        <div role="img" aria-label={`${SLIDES.length} 枚中 ${index + 1} 枚目`} className="flex justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span key={s.title} className={cx("h-1.5 rounded-full transition-all duration-200", i === index ? "w-6 bg-accent" : "w-1.5 bg-line")} />
          ))}
        </div>
        <StickerButton size={ButtonSize.Lg} className="w-full" onClick={() => (isLast ? onDone() : setIndex(index + 1))}>
          {isLast ? "はじめる" : "次へ"}
        </StickerButton>
      </div>
    </div>
  );
};
