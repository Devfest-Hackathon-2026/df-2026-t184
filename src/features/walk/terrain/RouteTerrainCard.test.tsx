import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TerrainArea, type RouteTerrain } from "./summary";
import { RouteTerrainCard, TerrainStatus } from "./RouteTerrainCard";

afterEach(() => cleanup());

const inside = (ascentM: number, shade10: number): RouteTerrain => ({
  area: TerrainArea.Inside,
  ascentM,
  maxGradientPct: 6,
  coverage: 1,
  shade: [
    { label: "10:00", ratio: shade10 },
    { label: "15:00", ratio: 0.2 },
  ],
});

describe("ルート画面の坂・日陰カード", () => {
  it("寄り道ルートと最短ルートの上り・日陰を推定値として並べる", () => {
    render(
      <RouteTerrainCard
        status={TerrainStatus.Ready}
        detour={inside(8, 0.62)}
        direct={inside(15, 0.3)}
        care={{ slope: false, shade: false }}
      />,
    );
    expect(screen.getByRole("heading", { name: /このルートの坂と日陰/ })).toBeInTheDocument();
    expect(screen.getByText(/上り 8m/)).toBeInTheDocument();
    expect(screen.getByText(/上り 15m/)).toBeInTheDocument();
    expect(screen.getByText(/日陰 62%/)).toBeInTheDocument();
    expect(screen.getByText(/推定値/)).toBeInTheDocument();
  });

  it("坂を少なめ・日陰を選んだ人には、寄り道ルートの方が良い点をひと言で伝える", () => {
    render(
      <RouteTerrainCard
        status={TerrainStatus.Ready}
        detour={inside(8, 0.62)}
        direct={inside(15, 0.3)}
        care={{ slope: true, shade: true }}
      />,
    );
    expect(screen.getByText(/最短より上りが 7m 少ない/)).toBeInTheDocument();
    expect(screen.getByText(/最短より日陰が 32 ポイント多い/)).toBeInTheDocument();
  });

  it("データの範囲外なら値を出さず、対象の地域を知らせる", () => {
    render(
      <RouteTerrainCard
        status={TerrainStatus.Ready}
        detour={{ area: TerrainArea.Outside }}
        direct={{ area: TerrainArea.Outside }}
        care={{ slope: true, shade: false }}
      />,
    );
    expect(screen.getByText(/上野〜谷中/)).toBeInTheDocument();
    expect(screen.queryByText(/上り \d+m/)).not.toBeInTheDocument();
  });

  it("地図が使えずルートが分からないときは、計算できないことを知らせる", () => {
    render(<RouteTerrainCard status={TerrainStatus.NoRoute} care={{ slope: false, shade: false }} />);
    expect(screen.getByText(/ルートが取れないため/)).toBeInTheDocument();
  });
});
