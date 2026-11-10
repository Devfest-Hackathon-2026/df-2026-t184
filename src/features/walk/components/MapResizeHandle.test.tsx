import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initialWalk, Screen } from "../flow";
import { RouteScreen } from "../screens/RouteScreen";

// 地図と地点リストの境目の持ち手で、ドラッグと矢印キーで地図の高さを変えられることを確かめる。
// Google マップは realMap なし（手描きの地図）で描くので、キーもマップの読み込みも要らない。

afterEach(() => cleanup());

const MAP_HEIGHT_MIN = 160;
const mapHeightMax = (): number => window.innerHeight - 160;

const renderRoute = (): void => {
  render(<RouteScreen state={{ ...initialWalk, screen: Screen.Route, dest: "上野公園" }} dispatch={vi.fn()} />);
};

const handle = (): HTMLElement => screen.getByRole("separator", { name: "地図の高さを変える" });

/** 地図ペイン（「入力に戻る」ボタンの入っている枠）の高さ(px)。 */
const mapPaneHeight = (): number => {
  const pane = screen.getByRole("button", { name: "入力に戻る" }).parentElement;
  expect(pane).not.toBeNull();
  return Number.parseFloat((pane as HTMLElement).style.height);
};

describe("地図の高さを変える持ち手", () => {
  it("境目に separator があり、いまの高さと上下限を伝える", () => {
    renderRoute();
    const el = handle();
    expect(el).toHaveAttribute("aria-orientation", "horizontal");
    expect(el).toHaveAttribute("aria-valuenow", "224");
    expect(el).toHaveAttribute("aria-valuemin", String(MAP_HEIGHT_MIN));
    expect(el).toHaveAttribute("aria-valuemax", String(mapHeightMax()));
    expect(el.tabIndex).toBe(0);
    expect(mapPaneHeight()).toBe(224);
  });

  it("ArrowDown で地図が 32px 高くなり、ArrowUp で戻る", async () => {
    const user = userEvent.setup();
    renderRoute();
    handle().focus();
    await user.keyboard("{ArrowDown}");
    expect(handle()).toHaveAttribute("aria-valuenow", "256");
    expect(mapPaneHeight()).toBe(256);
    await user.keyboard("{ArrowUp}");
    expect(handle()).toHaveAttribute("aria-valuenow", "224");
    expect(mapPaneHeight()).toBe(224);
  });

  it("矢印キーでは下限 160px・上限（画面の高さ − 160px）で止まる", async () => {
    const user = userEvent.setup();
    renderRoute();
    handle().focus();
    for (let i = 0; i < 10; i++) await user.keyboard("{ArrowUp}");
    expect(handle()).toHaveAttribute("aria-valuenow", String(MAP_HEIGHT_MIN));
    expect(mapPaneHeight()).toBe(MAP_HEIGHT_MIN);
    for (let i = 0; i < 30; i++) await user.keyboard("{ArrowDown}");
    expect(handle()).toHaveAttribute("aria-valuenow", String(mapHeightMax()));
    expect(mapPaneHeight()).toBe(mapHeightMax());
  });

  it("ポインターのドラッグで動いた分だけ高さが変わり、上下限で止まる", () => {
    renderRoute();
    const el = handle();
    fireEvent.pointerDown(el, { pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 1, clientY: 160 });
    expect(handle()).toHaveAttribute("aria-valuenow", "284");
    expect(mapPaneHeight()).toBe(284);
    fireEvent.pointerMove(el, { pointerId: 1, clientY: 10000 });
    expect(handle()).toHaveAttribute("aria-valuenow", String(mapHeightMax()));
    fireEvent.pointerUp(el, { pointerId: 1, clientY: 10000 });
    // ドラッグが終わったあとは、動かしても高さは変わらない。
    fireEvent.pointerMove(el, { pointerId: 1, clientY: 500 });
    expect(handle()).toHaveAttribute("aria-valuenow", String(mapHeightMax()));
  });
});
