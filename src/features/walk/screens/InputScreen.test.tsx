import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WalkApp } from "../WalkApp";

afterEach(() => cleanup());

const progress = (): HTMLElement => screen.getByRole("progressbar", { name: "質問の進み具合" });

describe("1 問ずつ聞く入力画面", () => {
  it("最初は行き先だけを聞き、進み具合は 1 / 3", () => {
    render(<WalkApp />);
    expect(screen.getByLabelText("行き先")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(progress()).toHaveAttribute("aria-valuenow", "1");
  });

  it("行き先が空のうちは次へ進めない", () => {
    render(<WalkApp />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("行き先を入れて Enter を押すと気分の質問になり、気分を選ぶとすぐ時間の質問になる", () => {
    render(<WalkApp />);
    const dest = screen.getByLabelText("行き先");
    fireEvent.change(dest, { target: { value: "上野公園" } });
    fireEvent.submit(dest);

    expect(progress()).toHaveAttribute("aria-valuenow", "2");
    fireEvent.click(screen.getByRole("radio", { name: /レトロ/ }));

    expect(progress()).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("radio", { name: "+20分" })).toBeChecked();
    expect(screen.getByRole("button", { name: "寄り道ルートを作る" })).toBeEnabled();
  });

  it("答えたチップを押すと、その質問に戻って答え直せる", () => {
    render(<WalkApp />);
    fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "上野公園" } });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    fireEvent.click(screen.getByRole("button", { name: "行き先：上野公園（答え直す）" }));
    expect(screen.getByLabelText("行き先")).toHaveValue("上野公園");
    expect(progress()).toHaveAttribute("aria-valuenow", "1");
  });

  it("最後の質問で作ると、探索中の画面になる", () => {
    render(<WalkApp />);
    fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "上野公園" } });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "寄り道ルートを作る" }));
    expect(screen.getByRole("heading", { name: "ルートを探しています" })).toBeInTheDocument();
  });

  it("最後の質問で、坂を少なめ・日陰を通りたいを選べる（任意）", () => {
    render(<WalkApp />);
    fireEvent.change(screen.getByLabelText("行き先"), { target: { value: "上野公園" } });
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    const slope = screen.getByRole("checkbox", { name: /坂は少なめ/ });
    const shade = screen.getByRole("checkbox", { name: /日陰を通りたい/ });
    expect(slope).not.toBeChecked();
    fireEvent.click(slope);
    expect(slope).toBeChecked();
    expect(shade).not.toBeChecked();
  });
});
