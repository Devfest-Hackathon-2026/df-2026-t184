import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

import { ChoiceChip } from "./ChoiceChip";
import { ButtonVariant, StickerButton } from "./StickerButton";
import { StickerCheckbox } from "./StickerCheckbox";
import { TextField } from "./TextField";
import { Tone } from "./tokens";

describe("StickerButton", () => {
  it("danger バリアントは危険色で描かれる", () => {
    render(<StickerButton variant={ButtonVariant.Danger}>削除する</StickerButton>);
    const button = screen.getByRole("button", { name: "削除する" });
    expect(button.className).toContain("bg-danger");
  });

  it("disabled はクリックを受け付けない", () => {
    const onClick = vi.fn();
    render(
      <StickerButton disabled onClick={onClick}>
        押せない
      </StickerButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "押せない" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("TextField", () => {
  it("error を渡すと aria-invalid と説明文の関連付けが付く", () => {
    render(<TextField id="f1" label="行き先" error="入力してください" />);
    const input = screen.getByLabelText("行き先");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByText("入力してください");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("required を渡すと必須バッジと required 属性が付く", () => {
    render(<TextField id="f2" label="行き先" required />);
    expect(screen.getByText("必須")).toBeInTheDocument();
    expect(screen.getByLabelText(/行き先/)).toBeRequired();
  });

  it("hint と error が両方あるとき aria-describedby に両方並ぶ", () => {
    render(<TextField id="f3" label="メモ" hint="30字まで" error="長すぎます" />);
    const describedby = screen.getByLabelText("メモ").getAttribute("aria-describedby") ?? "";
    expect(describedby).toContain(screen.getByText("30字まで").id);
    expect(describedby).toContain(screen.getByText("長すぎます").id);
  });
});

describe("ChoiceChip", () => {
  it("実際のラジオ入力として描かれ、name でグループ化される", () => {
    render(
      <>
        <ChoiceChip name="mood" checked={false} onSelect={() => {}}>
          静けさ優先
        </ChoiceChip>
        <ChoiceChip name="mood" checked onSelect={() => {}}>
          賑やか優先
        </ChoiceChip>
      </>,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("name", "mood");
    expect(radios[1]).toBeChecked();
  });

  it("選ぶと onSelect が呼ばれる", () => {
    const onSelect = vi.fn();
    render(
      <ChoiceChip name="mood" checked={false} onSelect={onSelect} tone={Tone.Mint}>
        静けさ優先
      </ChoiceChip>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "静けさ優先" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("disabled では選べない", () => {
    const onSelect = vi.fn();
    render(
      <ChoiceChip name="mood" checked={false} onSelect={onSelect} disabled>
        選べない
      </ChoiceChip>,
    );
    expect(screen.getByRole("radio", { name: "選べない" })).toBeDisabled();
  });
});

describe("StickerCheckbox", () => {
  it("ラベルつきのチェックボックスとして切り替わる", () => {
    const onChange = vi.fn();
    render(<StickerCheckbox onChange={onChange}>写真を残す</StickerCheckbox>);
    const box = screen.getByRole("checkbox", { name: "写真を残す" });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disabled では切り替わらない", () => {
    const onChange = vi.fn();
    render(
      <StickerCheckbox disabled onChange={onChange}>
        触れない
      </StickerCheckbox>,
    );
    expect(screen.getByRole("checkbox", { name: "触れない" })).toBeDisabled();
  });
});
