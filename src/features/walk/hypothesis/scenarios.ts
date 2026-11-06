import { Tone } from "@/components/sticker";

/**
 * 仮説モックのシナリオ。docs/REQUIREMENTS.md（仮説草案）と
 * docs/decisions/2026-11-06-hypothesis-mock.md の回答に対応する検証用メタデータ。
 * アプリ本体の画面には出さず、Storybook の外枠（HypothesisFrame）でのみ表示する。
 */
export type Scenario = {
  id: "daily" | "tourism";
  /** story と外枠に出すシナリオ名。 */
  label: string;
  /** 入力画面に入れる行き先の初期値（見本）。 */
  dest: string;
  /** 対象（仮説）。 */
  target: string;
  /** 困りごと（仮説）。 */
  problem: string;
  /** 期待する変化（仮説）。 */
  expected: string;
  /** メンバーに評価してほしい質問。 */
  questions: readonly string[];
  tone: Tone;
};

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "daily",
    label: "場面A: 日常の徒歩移動",
    dest: "いつもの駅",
    target: "日常の徒歩移動で、少し時間に余裕はあるが寄り道先を決められない人",
    problem: "寄り道してもいい時間はあるのに、どこに寄るか思いつかず、いつもの最短ルートで着いてしまうかもしれない",
    expected: "気分と使える時間を入れるだけで寄り道候補つきのルートが決まり、遠回りが今日の小さな思い出として残る",
    questions: [
      "この流れで「実際に寄り道してみたい」と思えるか",
      "気分と時間の選び方は、日常の自分の状況に合っていたか",
      "思い出カードと「ともだちの寄り道」は、もう一度使う理由になるか",
    ],
    tone: Tone.Mint,
  },
  {
    id: "tourism",
    label: "場面B: 観光地での滞在",
    dest: "浅草寺",
    target: "観光地を訪れ、限られた時間に自分好みの場所を探したい旅行者",
    problem: "目的地と目的地の合間の空き時間を、ガイドに載らない自分好みの過ごし方に使えていないかもしれない",
    expected: "次の目的地までの時間内で気分に合う寄り道が提案され、旅の思い出カードとして残せる",
    questions: [
      "観光の空き時間の使い方として、この流れは役に立ちそうか",
      "気分と時間の選び方は、旅行者の状況に合っていたか",
      "思い出カードと「ともだちの寄り道」は旅先で見たい情報か",
    ],
    tone: Tone.Sky,
  },
];

/** 見本データと実機能の誤認を防ぐための注意文。外枠に必ず出す。 */
export const MOCK_DATA_NOTICE =
  "口コミ・クエスト・思い出の文面、所要時間、地図、写真、ともだちの投稿はすべて見本データです。撮影・保存・シェア・AIによる文章生成は実際には動きません";
