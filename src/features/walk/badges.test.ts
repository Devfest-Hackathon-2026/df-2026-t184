import { describe, expect, it } from "vitest";

import { BADGES, earnedBadges } from "./badges";
import { moodById, type AlbumEntry } from "./content";
import { MoodId } from "./flow";

const entry = (id: string, mood: MoodId, overrides: Partial<AlbumEntry> = {}): AlbumEntry => ({
  id,
  dest: "上野公園",
  mood,
  walkedOn: "11月10日",
  extraMinutes: 14,
  quests: moodById(mood).quests,
  shots: [false, false, false],
  memos: ["", "", ""],
  ...overrides,
});

const ids = (album: readonly AlbumEntry[]): string[] => earnedBadges(album).map((b) => b.id);

describe("earnedBadges", () => {
  it("まだ歩いていなければハンコは 1 つもない", () => {
    expect(ids([])).toEqual([]);
  });

  it("1 回歩くと「はじめての寄り道」がもらえる", () => {
    expect(ids([entry("a", MoodId.Quiet)])).toEqual(["first"]);
  });

  it("3 回歩き、3 つの気分をすべて試すと、それぞれのハンコがもらえる", () => {
    const album = [entry("a", MoodId.Quiet), entry("b", MoodId.Retro), entry("c", MoodId.Local)];
    expect(ids(album)).toEqual(expect.arrayContaining(["first", "three-walks", "all-moods"]));
  });

  it("3 地点すべてで写真を撮ると「カメラ係」、+30 分まで寄り道すると「大回り」がもらえる", () => {
    const album = [entry("a", MoodId.Quiet, { shots: [true, true, true], extraMinutes: 23 })];
    expect(ids(album)).toEqual(expect.arrayContaining(["photographer", "long-detour"]));
  });

  it("ハンコの id は重ならない", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});
