import type { AlbumEntry } from "./content";
import { CHECKPOINTS } from "./flow";

// ポイントの配点。ゲームの決めごとで、実在の基準や統計にもとづく値ではない。
export const POINTS = {
  /** 地点にたどり着いた（「見つけた」または「記録して次へ」）。 */
  reached: 10,
  /** その地点で写真枠を埋めた。 */
  photo: 5,
  /** その地点でひとことメモを書いた。 */
  memo: 5,
  /** 全地点を回りきった。 */
  complete: 10,
} as const;

/** 1 回の寄り道の記録。地点ごとの写真とメモ。 */
export type WalkRecord = { shots: readonly boolean[]; memos: readonly string[]; reached?: number };

export type PointLine = { label: string; points: number };

/** 1 回の寄り道で付いたポイントの内訳。0 点の行は出さない。 */
export const pointBreakdown = ({ shots, memos, reached = CHECKPOINTS }: WalkRecord): readonly PointLine[] => {
  const spots = Math.min(Math.max(reached, 0), CHECKPOINTS);
  const photos = shots.slice(0, spots).filter(Boolean).length;
  const notes = memos.slice(0, spots).filter((m) => m.trim() !== "").length;
  const lines: PointLine[] = [
    { label: `地点の達成 ${spots} か所`, points: spots * POINTS.reached },
    { label: `写真 ${photos} 枚`, points: photos * POINTS.photo },
    { label: `ひとことメモ ${notes} 件`, points: notes * POINTS.memo },
    { label: "全地点クリア", points: spots >= CHECKPOINTS ? POINTS.complete : 0 },
  ];
  return lines.filter((l) => l.points > 0);
};

export const walkPoints = (record: WalkRecord): number => pointBreakdown(record).reduce((sum, l) => sum + l.points, 0);

/** 見本ではない、このページで歩いた記録だけを合計する。 */
export const totalPoints = (album: readonly AlbumEntry[]): number =>
  album.filter((e) => !e.sample).reduce((sum, e) => sum + walkPoints(e), 0);

export type Title = { label: string; min: number };

// 称号。合計ポイントが min 以上で付く。小さい順に並べる。
export const TITLES: readonly Title[] = [
  { label: "寄り道みならい", min: 0 },
  { label: "寄り道さんぽ人", min: 30 },
  { label: "寄り道名人", min: 70 },
  { label: "寄り道マスター", min: 140 },
];

export const titleOf = (points: number): Title => TITLES.reduce((got, t) => (points >= t.min ? t : got), TITLES[0]);

/** 次の称号と、あと何ポイントか。いちばん上なら null。 */
export const nextTitle = (points: number): { title: Title; remaining: number } | null => {
  const next = TITLES.find((t) => t.min > points);
  return next ? { title: next, remaining: next.min - points } : null;
};

/** ポイントを保存しないことの知らせ。 */
export const POINTS_NOT_SAVED_NOTE = "ポイントと称号は保存しません。ページを再読み込みすると消えます";
/** 見本の記録をポイントに数えないことの知らせ。 */
export const POINTS_SAMPLE_NOTE = "見本の記録はポイントに数えません（ハンコには数えます）";
