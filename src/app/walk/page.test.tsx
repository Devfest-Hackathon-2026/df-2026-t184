import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WalkPage from "./page";

afterEach(() => cleanup());

describe("/walk ページ", () => {
  it("新デザインの寄り道アプリを、はじめての案内から表示する", () => {
    render(<WalkPage />);
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { name: "最短じゃない道を、歩いてみよう" }),
    );
  });
});
