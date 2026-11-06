import { Tone } from "@/components/sticker";

import { MoodId } from "./flow";

export type Quest = {
  checkpoint: string;
  title: string;
  why: string;
  tone: Tone;
};

export type Mood = {
  id: MoodId;
  label: string;
  description: string;
  tone: Tone;
  essay: string;
  quests: readonly Quest[];
};

// モックの文面をそのまま使う。本番では Places API と Gemini が作る。
export const MOODS: readonly Mood[] = [
  {
    id: MoodId.Quiet,
    label: "静けさ優先",
    description: "人の少ない路地や小道を選ぶ",
    tone: Tone.Mint,
    essay: "人の声が遠のいた路地で、風鈴だけが小さく鳴っていた。遠回りした分だけ、今日の街は少し静かに、少し近くなった。",
    quests: [
      { checkpoint: "裏通りの小さな神社", title: "鳥居の奥で、風鈴の音を探そう", why: "口コミで「昼でも人がまばら」と言われる境内を通ります", tone: Tone.Mint },
      { checkpoint: "古書店の並ぶ路地", title: "店先でいちばん古い本の年を見つけよう", why: "「時間がゆっくり流れる通り」という声が多い一本裏の道です", tone: Tone.Lemon },
      { checkpoint: "川沿いのベンチ", title: "水の音だけを 1 分聞いてみよう", why: "大通りの混雑を避けて、川沿いから目的地へ抜けます", tone: Tone.Sky },
    ],
  },
  {
    id: MoodId.Retro,
    label: "レトロ・ノスタルジック",
    description: "古い看板や昔ながらの店をめぐる",
    tone: Tone.Coral,
    essay: "色あせた看板と、銭湯の煙突。知らないはずの昭和が、角を曲がるたびに顔を出した。最短ルートでは出会えない時間だった。",
    quests: [
      { checkpoint: "昭和の喫茶店前", title: "色あせた看板の文字を読み解こう", why: "「看板が当時のまま」という口コミが目立つ喫茶店です", tone: Tone.Coral },
      { checkpoint: "銭湯のある角", title: "煙突を見上げて写真に収めよう", why: "「街並みがタイムスリップしたよう」という声がある一角です", tone: Tone.Lilac },
      { checkpoint: "路地裏の商店", title: "ガラスケースの駄菓子を 1 つ選ぼう", why: "観光客の少ない時間帯でも開いている、地元の商店です", tone: Tone.Pink },
    ],
  },
  {
    id: MoodId.Local,
    label: "ローカルグルメ",
    description: "地元の人が通う小さな店に寄る",
    tone: Tone.Lemon,
    essay: "総菜屋の行列に並び、焼きたてのパンの匂いに足を止めた。寄り道の数だけ、この街の味をひとつずつ覚えていく。",
    quests: [
      { checkpoint: "商店街の総菜屋", title: "地元の人が並ぶ一品を見つけよう", why: "口コミで「近所の人ばかり」と言われる総菜屋の前を通ります", tone: Tone.Lemon },
      { checkpoint: "路地の老舗パン屋", title: "焼きたての時間を店主に聞いてみよう", why: "「昔から変わらない味」という声が多いパン屋です", tone: Tone.Coral },
      { checkpoint: "角のたい焼き屋", title: "しっぽまで餡が入っているか確かめよう", why: "観光ガイドに載らない、地元の評価が高い店です", tone: Tone.Pink },
    ],
  },
];

export const moodById = (id: MoodId): Mood => MOODS.find((m) => m.id === id) ?? MOODS[0];

export type FeedPost = {
  id: string;
  author: string;
  tone: Tone;
  dest: string;
  extraMinutes: number;
  moodId: MoodId;
  excerpt: string;
  likes: number;
  walkedOn: string;
};

// ともだちの思い出カード。見本データなので画面上でも「見本」と分かる名前にしている。
export const SAMPLE_FEED: readonly FeedPost[] = [
  { id: "p1", author: "はるか", tone: Tone.Pink, dest: "谷中銀座", extraMinutes: 23, moodId: MoodId.Retro, excerpt: "夕やけだんだんの手前で、猫が三匹並んで日なたぼっこしていた。", likes: 12, walkedOn: "11月4日" },
  { id: "p2", author: "そうた", tone: Tone.Sky, dest: "清澄白河", extraMinutes: 8, moodId: MoodId.Quiet, excerpt: "川沿いを一本ずらしただけで、聞こえるのが水の音だけになった。", likes: 7, walkedOn: "11月3日" },
  { id: "p3", author: "みお", tone: Tone.Lilac, dest: "蔵前", extraMinutes: 14, moodId: MoodId.Local, excerpt: "コーヒー豆の焙煎の匂いをたどったら、知らない角に出た。", likes: 21, walkedOn: "11月1日" },
];
