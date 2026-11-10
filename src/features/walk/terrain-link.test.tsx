// F09: /walk のルート画面から /terrain の坂・日陰の比較へ移れること、
// 比較の対象が上野〜谷中の固定デモ経路で、推定値・現地未検証・不明区間があることを画面に出すことを確かめる。
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initialWalk, Screen } from "./flow";
import { TERRAIN_DEMO_NOTE } from "./screens/RouteScreen";
import { WalkApp } from "./WalkApp";

vi.mock("@/lib/google-maps", () => ({
  get MAPS_API_KEY() {
    return "";
  },
  loadGoogleMaps: () => Promise.reject(new Error("テストでは読み込まない")),
}));
vi.mock("@/components/RouteMap", () => ({
  default: () => <div role="application" aria-label="寄り道ルートの地図" />,
}));

afterEach(() => cleanup());

describe("ルート画面から坂・日陰の比較へ（F09）", () => {
  it("/terrain へのリンクがあり、別タブで開く", () => {
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "上野公園" }} />);
    const link = screen.getByRole("link", { name: /坂・日陰を比べる/ });
    expect(link).toHaveAttribute("href", "/terrain");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("比較が上野〜谷中の固定デモ経路で、推定値・現地未検証・不明区間があることを画面に出す", () => {
    // 行き先が上野〜谷中以外でも、比較の対象は固定デモ経路のままだと分かること。
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "横浜中華街" }} />);
    const link = screen.getByRole("link", { name: /坂・日陰を比べる/ });
    expect(link).toHaveTextContent(TERRAIN_DEMO_NOTE);
    expect(link).toHaveTextContent("上野公園〜谷中〜鶯谷の固定デモ経路");
    expect(link).toHaveTextContent("推定値");
    expect(link).toHaveTextContent("現地は未検証");
    expect(link).toHaveTextContent("不明区間");
  });
});
