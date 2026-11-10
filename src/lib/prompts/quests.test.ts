import { describe, expect, it } from "vitest";

import { buildQuestPrompt } from "./quests";

const BASE = { dest: "上野公園", moodLabel: "静けさ優先", moodDesc: "人の少ない路地", extraMin: 14 };

describe("buildQuestPrompt の出発地", () => {
  it("出発地があれば、命令として扱わない枠に入れて、出発地から目的地へ向かう途中を頼む", () => {
    const p = buildQuestPrompt({ ...BASE, start: "神田駅" });
    expect(p).toContain("<start>神田駅</start>");
    expect(p).toContain("出発地");
  });

  it("出発地がなければ出発地の行を足さない", () => {
    expect(buildQuestPrompt(BASE)).not.toContain("<start>");
  });
});

describe("buildQuestPrompt の歩きやすさの希望", () => {
  it("希望がなければ歩きやすさの行を足さない", () => {
    expect(buildQuestPrompt(BASE)).not.toContain("歩きやすさ");
  });

  it("坂を少なめ・日陰を選ぶと、その希望をプロンプトに足す", () => {
    const p = buildQuestPrompt({ ...BASE, care: { slope: true, shade: true } });
    expect(p).toContain("歩きやすさの希望");
    expect(p).toContain("坂");
    expect(p).toContain("日陰");
  });
});
