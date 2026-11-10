import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { initialWalk, Screen } from "./flow";
import { WalkApp } from "./WalkApp";

// F07: /walk の全画面をキーボードだけで操作できること、画面遷移でフォーカスが見出しへ移ること、
// 操作要素に role と名前があることを、jsdom + testing-library で確かめる。
// 操作はすべて user-event のキー入力（Tab・Shift+Tab・Enter・Space・矢印・文字入力）で行い、クリックは使わない。

afterEach(() => cleanup());

/** Tab を押す回数の上限。1 画面の操作要素はこれより少ない。 */
const MAX_TABS = 40;
/** 探索中の演出（700ms × 4 段）を待つ上限。 */
const LOADING_TIMEOUT_MS = 5000;

/** Tab キーだけで target までフォーカスを進める。届かなければ失敗させる。 */
const tabTo = async (user: UserEvent, target: HTMLElement): Promise<void> => {
  for (let i = 0; i < MAX_TABS; i++) {
    if (document.activeElement === target) return;
    await user.tab();
  }
  expect(document.activeElement, `Tab で ${target.outerHTML.slice(0, 80)} に届かない`).toBe(target);
};

const pressButton = async (user: UserEvent, name: string | RegExp, key: "{Enter}" | " " = "{Enter}"): Promise<void> => {
  await tabTo(user, screen.getByRole("button", { name }));
  await user.keyboard(key);
};

const expectHeadingFocused = (name: string | RegExp): void => {
  const heading = screen.getByRole("heading", { level: 1, name });
  expect(document.activeElement).toBe(heading);
};

/** 画面の操作要素に名前があり、Tab の順序を乱す正の tabindex がないことを確かめる。 */
const expectNamedControls = (): void => {
  const main = screen.getByRole("main");
  const roles = ["button", "radio", "textbox", "checkbox", "link", "progressbar", "img", "navigation"] as const;
  for (const role of roles) {
    const all = within(main).queryAllByRole(role);
    const named = within(main).queryAllByRole(role, { name: /\S/ });
    const unnamed = all.filter((el) => !named.includes(el)).map((el) => el.outerHTML.slice(0, 120));
    expect(unnamed, `${role} に名前がない`).toEqual([]);
  }
  for (const control of within(main).queryAllByRole("button")) {
    expect(control.tagName, "ボタンは <button> 要素（Enter・Space で押せる）").toBe("BUTTON");
  }
  for (const el of main.querySelectorAll("[tabindex]")) {
    expect(Number(el.getAttribute("tabindex")), "正の tabindex は使わない").toBeLessThanOrEqual(0);
  }
  // 1 画面に h1 は 1 つで、見出しから画面の内容が分かる。
  expect(within(main).getAllByRole("heading", { level: 1 })).toHaveLength(1);
};

describe("キーボードだけで /walk を最後まで使える", () => {
  it(
    "案内 → 入力 → 探索 → 地図 → 記録 → 思い出カード → ともだち → アルバム → ハンコ帳 → もう一度歩く",
    async () => {
      const user = userEvent.setup();
      render(<WalkApp onboarding />);

      // はじめての案内: 3 枚を Enter で進める。スライドが替わるたびに見出しへフォーカスが移る。
      expectHeadingFocused("最短じゃない道を、歩いてみよう");
      expectNamedControls();
      await pressButton(user, "次へ");
      expectHeadingFocused("途中の 3 地点で、小さなクエスト");
      await pressButton(user, "次へ");
      expectHeadingFocused("歩き終えたら、思い出カードに");
      await pressButton(user, "はじめる");

      // 入力: 行き先を打って Enter、気分は矢印で選び直し、時間も矢印で選ぶ。
      expectHeadingFocused("最短じゃない道で、まだ知らない街へ");
      expectNamedControls();
      await tabTo(user, screen.getByRole("textbox", { name: "行き先" }));
      await user.keyboard("上野公園{Enter}");
      const progress = screen.getByRole("progressbar", { name: "質問の進み具合" });
      expect(progress).toHaveAttribute("aria-valuenow", "2");
      expect(document.activeElement).toBe(screen.getByRole("radio", { name: /静けさ優先/ }));
      expectNamedControls();

      // 矢印キーは選択肢を見て回る操作なので、選んだだけでは次の質問へ飛ばない。
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("radio", { name: /レトロ/ })).toBeChecked();
      expect(progress).toHaveAttribute("aria-valuenow", "2");
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("radio", { name: /ローカルグルメ/ })).toBeChecked();
      expect(progress).toHaveAttribute("aria-valuenow", "2");
      await pressButton(user, "次へ");
      expect(progress).toHaveAttribute("aria-valuenow", "3");
      expect(document.activeElement).toBe(screen.getByRole("radio", { name: "+20分" }));
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("radio", { name: "+30分" })).toBeChecked();
      expectNamedControls();

      // 答えたチップから答え直しもキーボードでできる。
      await pressButton(user, "気分：ローカルグルメ（答え直す）");
      expect(progress).toHaveAttribute("aria-valuenow", "2");
      expect(document.activeElement).toBe(screen.getByRole("radio", { name: /ローカルグルメ/ }));
      await pressButton(user, "次へ");
      await pressButton(user, "寄り道ルートを作る");

      // 探索中 → 地図。どちらも見出しへフォーカスが移る。
      expectHeadingFocused("ルートを探しています");
      await screen.findByRole("heading", { level: 1, name: "寄り道ルート" }, { timeout: LOADING_TIMEOUT_MS });
      expectHeadingFocused("寄り道ルート");
      expectNamedControls();
      expect(screen.queryByRole("navigation", { name: "画面の切り替え" })).not.toBeInTheDocument();

      // 1 地点目は「見つけた」を Space で押す。
      await pressButton(user, "見つけた", " ");
      expect(screen.getByRole("img", { name: "3 地点のうち 1 地点を達成" })).toBeInTheDocument();

      // 2 地点目は記録画面で写真とメモを残す。
      await pressButton(user, "記録する");
      expectHeadingFocused(/./);
      expectNamedControls();
      await pressButton(user, "地図に戻る");
      expectHeadingFocused("寄り道ルート");
      await pressButton(user, "記録する");
      await pressButton(user, "タップして撮影");
      expect(screen.getByRole("img", { name: "撮影した写真（見本）" })).toBeInTheDocument();
      await tabTo(user, screen.getByRole("textbox", { name: "ひとことメモ" }));
      await user.keyboard("路地に猫がいた");
      await pressButton(user, "記録して次へ");
      expectHeadingFocused("寄り道ルート");
      expect(screen.getByRole("img", { name: "3 地点のうち 2 地点を達成" })).toBeInTheDocument();

      // 3 地点目で思い出カードへ。
      await pressButton(user, "見つけた");
      expectHeadingFocused("今日の思い出カード");
      expectNamedControls();
      expect(screen.getByText("路地に猫がいた", { exact: false })).toBeInTheDocument();
      await pressButton(user, "シェアする");
      expect(screen.getByRole("status")).toHaveTextContent("見本：共有リンクは実際にはコピーされません");

      // ともだちの寄り道へ行って、戻るボタンで思い出カードに戻る。
      await pressButton(user, "ともだちの寄り道を見る");
      expectHeadingFocused("みんなの寄り道");
      expectNamedControls();
      const like = within(screen.getByRole("list", { name: "友だちの寄り道ログ" })).getAllByRole("button", { pressed: false })[0];
      await tabTo(user, like);
      await user.keyboard(" ");
      expect(like).toHaveAttribute("aria-pressed", "true");
      await pressButton(user, "思い出カードに戻る");
      expectHeadingFocused("今日の思い出カード");

      // 下のタブもキーボードで切り替えられ、切り替えるたびに見出しへフォーカスが移る。
      const nav = screen.getByRole("navigation", { name: "画面の切り替え" });
      await tabTo(user, within(nav).getByRole("button", { name: "アルバム" }));
      await user.keyboard("{Enter}");
      expectHeadingFocused("寄り道アルバム");
      expect(within(nav).getByRole("button", { name: "アルバム" })).toHaveAttribute("aria-current", "page");
      expectNamedControls();

      // 今日の寄り道（いちばん上）を開いて、戻る。
      await pressButton(user, /上野公園の思い出を開く/);
      expectHeadingFocused(/の思い出$/);
      expectNamedControls();
      await pressButton(user, "アルバムに戻る");
      expectHeadingFocused("寄り道アルバム");

      await pressButton(user, "ハンコ帳");
      expectHeadingFocused("ハンコ帳");
      expectNamedControls();

      await pressButton(user, "ともだち");
      expectHeadingFocused("みんなの寄り道");
      // タブから開いたときは「思い出カードに戻る」は出ない。
      expect(screen.queryByRole("button", { name: "思い出カードに戻る" })).not.toBeInTheDocument();

      await pressButton(user, "さがす");
      expectHeadingFocused("今日の思い出カード");
      await pressButton(user, "もう一度歩く");
      expectHeadingFocused("最短じゃない道で、まだ知らない街へ");
    },
    LOADING_TIMEOUT_MS * 3,
  );

  it("案内はスキップでき、Shift+Tab で前の要素へ戻れる", async () => {
    const user = userEvent.setup();
    render(<WalkApp onboarding />);
    const skip = screen.getByRole("button", { name: "スキップ" });
    const next = screen.getByRole("button", { name: "次へ" });
    await tabTo(user, next);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(skip);
    await user.keyboard("{Enter}");
    expectHeadingFocused("最短じゃない道で、まだ知らない街へ");
  });

  it("地図画面の「入力に戻る」を Enter で押すと入力画面の見出しへフォーカスが戻る", async () => {
    const user = userEvent.setup();
    render(<WalkApp initial={{ ...initialWalk, screen: Screen.Route, dest: "上野公園" }} />);
    await pressButton(user, "入力に戻る");
    expectHeadingFocused("最短じゃない道で、まだ知らない街へ");
  });

  it("行き先が空のまま Enter を押しても進まず、ボタンは押せないことが伝わる", async () => {
    const user = userEvent.setup();
    render(<WalkApp />);
    await tabTo(user, screen.getByRole("textbox", { name: "行き先" }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("progressbar", { name: "質問の進み具合" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("気分は矢印キーで行き来しても次の質問へ飛ばず、選んだものが残る", async () => {
    const user = userEvent.setup();
    render(<WalkApp initial={{ ...initialWalk, dest: "上野公園" }} />);
    await pressButton(user, "次へ");
    const progress = screen.getByRole("progressbar", { name: "質問の進み具合" });
    await tabTo(user, screen.getByRole("radio", { name: /静けさ優先/ }));
    await user.keyboard("{ArrowDown}");
    const retro = screen.getByRole("radio", { name: /レトロ/ });
    expect(retro).toHaveFocus();
    expect(retro).toBeChecked();
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /静けさ優先/ })).toBeChecked();
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    // 決めたら「次へ」で進み、答えのチップに矢印で選んだ気分が出る。
    await pressButton(user, "次へ");
    expect(progress).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("button", { name: "気分：静けさ優先（答え直す）" })).toBeInTheDocument();
  });

  it("ポインターで気分を選ぶと、これまでどおりすぐ次の質問へ進む", async () => {
    const user = userEvent.setup();
    render(<WalkApp initial={{ ...initialWalk, dest: "上野公園" }} />);
    await pressButton(user, "次へ");
    await user.click(screen.getByRole("radio", { name: /レトロ/ }));
    expect(screen.getByRole("progressbar", { name: "質問の進み具合" })).toHaveAttribute("aria-valuenow", "3");
  });

  it("案内の何枚目かは 1 つの画像の名前で伝わる", () => {
    render(<WalkApp onboarding />);
    expect(screen.getByRole("img", { name: "3 枚中 1 枚目" })).toBeInTheDocument();
  });
});
