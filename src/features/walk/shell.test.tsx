import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { initialWalk, Screen } from "./flow";
import { WalkApp } from "./WalkApp";

afterEach(() => cleanup());

const INPUT_HEADING = "最短じゃない道で、まだ知らない街へ";

describe("はじめての案内", () => {
  it("3 枚を読み進めると、行き先の入力画面になる", () => {
    render(<WalkApp onboarding />);
    expect(screen.getByRole("heading", { name: "最短じゃない道を、歩いてみよう" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "はじめる" }));
    expect(screen.getByRole("heading", { name: INPUT_HEADING })).toBeInTheDocument();
  });

  it("スキップすると、すぐ入力画面になる", () => {
    render(<WalkApp onboarding />);
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    expect(screen.getByRole("heading", { name: INPUT_HEADING })).toBeInTheDocument();
  });
});

describe("下のタブ", () => {
  it("アルバム・ハンコ帳・ともだちを行き来できる", () => {
    render(<WalkApp />);
    const tabs = screen.getByRole("navigation", { name: "画面の切り替え" });
    expect(tabs).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "アルバム" }));
    expect(screen.getByRole("heading", { name: "寄り道アルバム" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アルバム" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "ハンコ帳" }));
    expect(screen.getByRole("heading", { name: "ハンコ帳" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ともだち" }));
    expect(screen.getByRole("heading", { name: "みんなの寄り道" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "さがす" }));
    expect(screen.getByRole("heading", { name: INPUT_HEADING })).toBeInTheDocument();
  });

  it("歩いている途中はタブを隠して、ルートに集中できるようにする", () => {
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "上野公園" }} />);
    expect(screen.queryByRole("navigation", { name: "画面の切り替え" })).not.toBeInTheDocument();
  });

  it("アルバムの 1 件を開くと思い出カードが見られ、戻ると一覧に戻る", () => {
    render(<WalkApp />);
    fireEvent.click(screen.getByRole("button", { name: "アルバム" }));
    fireEvent.click(screen.getByRole("button", { name: /谷中銀座/ }));
    expect(screen.getByRole("heading", { name: "谷中銀座への寄り道" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "アルバムに戻る" }));
    expect(screen.getByRole("heading", { name: "寄り道アルバム" })).toBeInTheDocument();
  });
});

describe("歩き終えたあと", () => {
  it("思い出カードになった散歩がアルバムの先頭に入る", () => {
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "清澄白河", step: 2 }} />);
    fireEvent.click(screen.getByRole("button", { name: "見つけた" }));
    expect(screen.getByRole("heading", { name: "今日の思い出カード" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "アルバム" }));
    const entries = screen.getAllByRole("listitem");
    expect(entries[0]).toHaveTextContent("清澄白河");
  });
});
