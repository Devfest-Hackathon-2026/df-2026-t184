import { describe, expect, it } from "vitest";

import { pickCheckpoints } from "./checkpoints";

const START = { lat: 35.68, lng: 139.7 };
const GOAL = { lat: 35.68, lng: 139.76 }; // 出発地の真東 約5.4km
const FALLBACK = [
  { lat: 35.681, lng: 139.715 },
  { lat: 35.679, lng: 139.733 },
  { lat: 35.681, lng: 139.748 },
];

describe("寄り道地点のピンの位置", () => {
  it("地名検索で見つかった地点はその位置に立て、見つかったと印を付ける", () => {
    const found = [
      { lat: 35.68, lng: 139.75 },
      { lat: 35.68, lng: 139.72 },
      { lat: 35.68, lng: 139.74 },
    ];
    const { route, order, located } = pickCheckpoints({ start: START, goal: GOAL, fallback: FALLBACK, found });
    // 出発地から目的地へ向かう順に並べ替える
    expect(order).toEqual([1, 2, 0]);
    expect(route.checkpoints).toEqual([found[1], found[2], found[0]]);
    expect(located).toEqual([true, true, true]);
  });

  it("見つからない・遠すぎる・目的地と同じ位置の地点は仮の位置にし、見つからなかったと印を付ける", () => {
    const found = [
      null, // 見つからない
      { lat: 35.68, lng: 139.72 }, // 見つかった
      { lat: 35.68, lng: 139.7601 }, // 目的地とほぼ同じ（目的地名にだけ一致したとみなす）
    ];
    const { route, order, located } = pickCheckpoints({ start: START, goal: GOAL, fallback: FALLBACK, found });
    expect(order).toEqual([0, 1, 2]);
    expect(route.checkpoints).toEqual([FALLBACK[0], found[1], FALLBACK[2]]);
    expect(located).toEqual([false, true, false]);
  });

  it("目的地から5km以上離れた地点は見つからなかった扱いにする", () => {
    const far = { lat: 35.68, lng: 139.6 }; // 目的地から約15km
    const { located } = pickCheckpoints({ start: START, goal: GOAL, fallback: FALLBACK, found: [far, far, far] });
    expect(located).toEqual([false, false, false]);
  });
});
