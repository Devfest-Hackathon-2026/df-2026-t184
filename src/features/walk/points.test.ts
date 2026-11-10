import { describe, expect, it } from "vitest";

import { moodById, SAMPLE_ALBUM, type AlbumEntry } from "./content";
import { MoodId } from "./flow";
import { nextTitle, pointBreakdown, POINTS, TITLES, titleOf, totalPoints, walkPoints } from "./points";

const entry = (id: string, overrides: Partial<AlbumEntry> = {}): AlbumEntry => ({
  id,
  dest: "上野公園",
  mood: MoodId.Quiet,
  walkedOn: "11月10日",
  extraMinutes: 14,
  quests: moodById(MoodId.Quiet).quests,
  shots: [false, false, false],
  memos: ["", "", ""],
  ...overrides,
});

describe("walkPoints", () => {
  it("3 地点を「見つけた」だけで回ると、達成とクリアのポイントが付く", () => {
    expect(walkPoints({ shots: [false, false, false], memos: ["", "", ""] })).toBe(3 * POINTS.reached + POINTS.complete);
  });

  it("写真とメモを残すと、そのぶん加点される（空白だけのメモは数えない）", () => {
    const record = { shots: [true, true, false], memos: ["猫がいた", "  ", "ベンチ"] };
    expect(walkPoints(record)).toBe(3 * POINTS.reached + 2 * POINTS.photo + 2 * POINTS.memo + POINTS.complete);
  });

  it("全部記録すると 1 回で 70 pt", () => {
    expect(walkPoints({ shots: [true, true, true], memos: ["a", "b", "c"] })).toBe(70);
  });

  it("途中までなら、たどり着いた地点の記録だけを数え、クリアの加点はない", () => {
    const record = { shots: [true, true, true], memos: ["a", "b", "c"], reached: 1 };
    expect(walkPoints(record)).toBe(POINTS.reached + POINTS.photo + POINTS.memo);
    expect(pointBreakdown(record).map((l) => l.label)).not.toContain("全地点クリア");
  });

  it("内訳の合計がポイントと一致し、0 点の行は出さない", () => {
    const record = { shots: [true, false, false], memos: ["", "", ""] };
    const lines = pointBreakdown(record);
    expect(lines.reduce((s, l) => s + l.points, 0)).toBe(walkPoints(record));
    expect(lines.every((l) => l.points > 0)).toBe(true);
    expect(lines.map((l) => l.label)).not.toContain("ひとことメモ 0 件");
  });
});

describe("totalPoints", () => {
  it("見本の記録は数えない", () => {
    expect(totalPoints(SAMPLE_ALBUM)).toBe(0);
    expect(SAMPLE_ALBUM.every((e) => e.sample)).toBe(true);
  });

  it("自分の記録だけを合計する", () => {
    const album = [entry("a"), entry("b", { shots: [true, true, true] }), ...SAMPLE_ALBUM];
    expect(totalPoints(album)).toBe(40 + 55);
  });
});

describe("称号", () => {
  it("合計ポイントに応じて称号が上がる", () => {
    expect(titleOf(0).label).toBe("寄り道みならい");
    expect(titleOf(29).label).toBe("寄り道みならい");
    expect(titleOf(30).label).toBe("寄り道さんぽ人");
    expect(titleOf(70).label).toBe("寄り道名人");
    expect(titleOf(500).label).toBe("寄り道マスター");
  });

  it("次の称号までの残りを出し、いちばん上なら null", () => {
    expect(nextTitle(40)).toEqual({ title: TITLES[2], remaining: 30 });
    expect(nextTitle(140)).toBeNull();
  });

  it("称号は小さい順に並び、最初は 0 pt から", () => {
    expect(TITLES[0].min).toBe(0);
    expect(TITLES.every((t, i) => i === 0 || t.min > TITLES[i - 1].min)).toBe(true);
  });
});
