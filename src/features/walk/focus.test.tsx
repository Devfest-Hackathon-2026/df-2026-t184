import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initialWalk, Screen } from "./flow";
import { WalkApp } from "./WalkApp";

afterEach(() => cleanup());

const INPUT_HEADING = "最短じゃない道で、まだ知らない街へ";

const focusedHeading = (): string | null =>
  document.activeElement instanceof HTMLHeadingElement ? document.activeElement.textContent : null;

describe("画面遷移のフォーカス", () => {
  it("画面は main ランドマークの中にある", () => {
    render(<WalkApp initial={{ ...initialWalk, dest: "上野公園" }} />);
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByRole("heading", { name: INPUT_HEADING }));
  });

  it("画面が切り替わると、その画面の見出しにフォーカスが移る", () => {
    vi.useFakeTimers();
    try {
      render(<WalkApp initial={{ ...initialWalk, dest: "上野公園" }} />);
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: INPUT_HEADING }));

      fireEvent.click(screen.getByRole("button", { name: "寄り道ルートを作る" }));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "ルートを探しています" }));

      for (let stage = 0; stage < 4; stage++) {
        act(() => vi.advanceTimersByTime(700));
      }
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "寄り道ルート" }));

      fireEvent.click(screen.getByRole("button", { name: "記録する" }));
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: "裏通りの小さな神社" }));
      expect(focusedHeading()).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("地図から入力に戻ると入力画面の見出しにフォーカスが戻る", () => {
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "上野公園" }} />);
    fireEvent.click(screen.getByRole("button", { name: "入力に戻る" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: INPUT_HEADING }));
  });
});
