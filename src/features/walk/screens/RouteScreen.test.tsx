import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initialWalk, Screen } from "../flow";
import { RouteScreen } from "./RouteScreen";

vi.mock("@/lib/google-maps", () => ({ MAPS_API_KEY: "test-key" }));

// 地図の部品は、出発地・行き先が見つからなかったことだけを知らせる偽物にする
vi.mock("@/components/RouteMap", () => ({
  default: ({ onEndsMissing }: { onEndsMissing?: (m: { start: boolean; goal: boolean }) => void }) => (
    <div role="application" aria-label="寄り道ルートの地図">
      <button type="button" onClick={() => onEndsMissing?.({ start: false, goal: true })}>
        行き先が見つからない
      </button>
    </div>
  ),
}));

afterEach(() => cleanup());

describe("ルート画面で行き先が地図で見つからないとき", () => {
  it("別の場所で代わりにせず、見つからなかったと知らせて入力に戻れるようにする", () => {
    const dispatch = vi.fn();
    render(<RouteScreen state={{ ...initialWalk, screen: Screen.Route, start: "高円寺駅", dest: "杉並区立図書館" }} dispatch={dispatch} realMap />);
    fireEvent.click(screen.getByRole("button", { name: "行き先が見つからない" }));

    expect(screen.getByRole("alert")).toHaveTextContent("行き先「杉並区立図書館」が地図で見つかりませんでした");
    fireEvent.click(screen.getByRole("button", { name: "行き先を入れ直す" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "backToInput" });
  });
});
