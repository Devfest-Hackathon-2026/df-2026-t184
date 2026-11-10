import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tone } from "@/components/sticker";

import type { Quest } from "../content";
import { TerrainArea, type RouteTerrain } from "../terrain/summary";
import { RouteStops } from "./RouteStops";

afterEach(() => cleanup());

const q = (n: number): Quest => ({ checkpoint: `地点${n}`, title: `クエスト${n}`, why: `理由${n}`, tone: Tone.Pink });
const QUESTS = [q(1), q(2), q(3)];
const inside = (ascentM: number, shade: number): RouteTerrain => ({
  area: TerrainArea.Inside, ascentM, maxGradientPct: 4, coverage: 1, shade: [{ label: "10:00", ratio: shade }],
});
const LEGS = [
  { terrain: inside(2, 0.7), minutes: 5 },
  { terrain: inside(9, 0.2), minutes: 7 },
  { terrain: inside(0, 0.5), minutes: 4 },
  { terrain: inside(1, 0.4), minutes: 6 },
];

const renderStops = (step = 1) => {
  const onFound = vi.fn();
  const onCapture = vi.fn();
  render(<RouteStops quests={QUESTS} step={step} legs={LEGS} onFound={onFound} onCapture={onCapture} />);
  return { onFound, onCapture };
};

describe("通る地点のリスト", () => {
  it("3 地点を順に並べ、いまの地点だけにクエストとボタンを出す", () => {
    const { onFound, onCapture } = renderStops();
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).queryByText(/地点\d/)?.textContent)).toEqual(["地点1", "地点2", "地点3"]);
    const current = screen.getByRole("listitem", { current: "step" });
    expect(within(current).getByRole("heading", { name: "クエスト2" })).toBeInTheDocument();
    expect(screen.queryByText("クエスト3")).not.toBeInTheDocument();
    fireEvent.click(within(current).getByRole("button", { name: "見つけた" }));
    fireEvent.click(within(current).getByRole("button", { name: /記録する/ }));
    expect(onFound).toHaveBeenCalledOnce();
    expect(onCapture).toHaveBeenCalledOnce();
  });

  it("進み具合を読み上げられる", () => {
    renderStops();
    expect(screen.getByRole("img", { name: "3 地点のうち 1 地点を達成" })).toBeInTheDocument();
  });

  it("まだの地点に、そこまでの道の坂・日陰をタグで出す", () => {
    renderStops();
    const current = screen.getByRole("listitem", { current: "step" });
    expect(within(current).getByText("上り 9m")).toBeInTheDocument();
    expect(within(current).getByText("日陰 20%")).toBeInTheDocument();
  });

  it("坂・日陰が対象外なら、値の代わりに対象の地域をひと言出す", () => {
    render(
      <RouteStops
        quests={QUESTS}
        step={0}
        legs={LEGS.map((l) => ({ ...l, terrain: { area: TerrainArea.Outside } }))}
        onFound={() => {}}
        onCapture={() => {}}
      />,
    );
    expect(screen.getByText(/坂・日陰は上野〜谷中だけ/)).toBeInTheDocument();
    expect(screen.queryByText(/上り \d+m/)).not.toBeInTheDocument();
  });

  it("地図で見つからなかった地点には、ピンが仮の位置だと出し、その前後の区間の坂・日陰を出さない", () => {
    render(<RouteStops quests={QUESTS} step={0} legs={LEGS} located={[true, false, true]} onFound={() => {}} onCapture={() => {}} />);
    const [first, second, third] = screen.getAllByRole("listitem");
    expect(within(first).queryByText(/仮の位置/)).not.toBeInTheDocument();
    expect(within(first).getByText("坂ほぼなし")).toBeInTheDocument();
    expect(within(second).getByText(/地図で見つからず、ピンは仮の位置です/)).toBeInTheDocument();
    // 仮の位置へ向かう区間・仮の位置から出る区間は、実際の道ではないので出さない
    expect(within(second).queryByText(/上り|坂ほぼなし/)).not.toBeInTheDocument();
    expect(within(third).queryByText(/上り|坂ほぼなし/)).not.toBeInTheDocument();
  });
});
