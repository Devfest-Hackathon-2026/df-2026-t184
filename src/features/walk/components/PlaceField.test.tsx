import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlaceOption, PlacePick, SuggestPlaces } from "@/lib/places";

import { PlaceField } from "./PlaceField";

afterEach(() => cleanup());

const HIBIYA: PlacePick = { name: "日比谷公園", at: { lat: 35.6736, lng: 139.7559 } };
const option = (id: string, main: string, sub: string, pick: PlacePick | null = null): PlaceOption => ({
  id,
  main,
  sub,
  pick: async () => pick,
});

const Harness = ({ suggest, onPick }: { suggest?: SuggestPlaces; onPick: (p: PlacePick) => void }) => {
  const [value, setValue] = useState("");
  return <PlaceField id="dest" label="行き先" value={value} onType={setValue} onPick={(p) => { setValue(p.name); onPick(p); }} suggest={suggest} />;
};

describe("候補つきの場所の入力欄", () => {
  it("打った文字から候補を出し、矢印キーと Enter で選ぶと座標つきで知らせる", async () => {
    const suggest = vi.fn<SuggestPlaces>(async () => [option("a", "日比谷駅", "東京都千代田区"), option("b", "日比谷公園", "東京都千代田区", HIBIYA)]);
    const onPick = vi.fn();
    render(<Harness suggest={suggest} onPick={onPick} />);
    const input = screen.getByRole("combobox", { name: "行き先" });

    fireEvent.change(input, { target: { value: "日比谷" } });
    expect(await screen.findByRole("option", { name: /日比谷公園/ })).toBeInTheDocument();
    expect(suggest).toHaveBeenCalledWith("日比谷");
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "dest-option-1");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onPick).toHaveBeenCalledWith(HIBIYA));
    expect(input).toHaveValue("日比谷公園");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Escape で候補を閉じる。1文字では候補を探さない", async () => {
    const suggest = vi.fn<SuggestPlaces>(async () => [option("a", "上野公園", "東京都台東区")]);
    render(<Harness suggest={suggest} onPick={() => {}} />);
    const input = screen.getByRole("combobox", { name: "行き先" });
    fireEvent.change(input, { target: { value: "上" } });
    await new Promise((r) => setTimeout(r, 400));
    expect(suggest).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "上野" } });
    await screen.findByRole("option", { name: /上野公園/ });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("候補を出せないとき（地図キーなし）は普通の入力欄にする", () => {
    render(<Harness onPick={() => {}} />);
    expect(screen.getByRole("textbox", { name: "行き先" })).toBeInTheDocument();
  });
});
