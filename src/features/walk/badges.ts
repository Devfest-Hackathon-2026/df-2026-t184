import { MOODS, type AlbumEntry } from "./content";
import { BUDGETS } from "./flow";

export type Badge = {
  id: string;
  label: string;
  /** まだもらっていないときに見せる、もらい方のヒント。 */
  hint: string;
  earned: (album: readonly AlbumEntry[]) => boolean;
};

const LONGEST_EXTRA_MINUTES = 23;

// ハンコの一覧。条件はアルバムだけから決まるので、足すときはこの表に 1 行足す。
export const BADGES: readonly Badge[] = [
  { id: "first", label: "はじめての寄り道", hint: "1 回歩く", earned: (album) => album.length >= 1 },
  { id: "three-walks", label: "寄り道 3 回", hint: "3 回歩く", earned: (album) => album.length >= 3 },
  {
    id: "all-moods",
    label: "気分めぐり",
    hint: `${MOODS.length} つの気分をぜんぶ試す`,
    earned: (album) => MOODS.every((m) => album.some((e) => e.mood === m.id)),
  },
  {
    id: "photographer",
    label: "カメラ係",
    hint: "1 回の寄り道で、全地点の写真を撮る",
    earned: (album) => album.some((e) => e.shots.every(Boolean)),
  },
  {
    id: "long-detour",
    label: "大回り",
    hint: `+${BUDGETS[BUDGETS.length - 1]}分まで寄り道する`,
    earned: (album) => album.some((e) => e.extraMinutes >= LONGEST_EXTRA_MINUTES),
  },
];

export const earnedBadges = (album: readonly AlbumEntry[]): readonly Badge[] => BADGES.filter((b) => b.earned(album));
