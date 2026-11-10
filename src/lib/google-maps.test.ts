import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthWindow = Window & { gm_authFailure?: () => void };

// 「一度失敗したことを覚える」状態がテストどうしで残らないよう、毎回読み込み直す。
let onMapsAuthFailure: typeof import("./google-maps").onMapsAuthFailure;
beforeEach(async () => {
  vi.resetModules();
  ({ onMapsAuthFailure } = await import("./google-maps"));
});

afterEach(() => {
  delete (window as AuthWindow).gm_authFailure;
});

describe("onMapsAuthFailure", () => {
  it("Google Maps がキーの認証失敗を知らせると、登録した全員に伝える", () => {
    const first = vi.fn();
    const second = vi.fn();
    onMapsAuthFailure(first);
    onMapsAuthFailure(second);

    (window as AuthWindow).gm_authFailure?.();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("登録を解除したら、もう呼ばれない", () => {
    const listener = vi.fn();
    const off = onMapsAuthFailure(listener);
    off();

    (window as AuthWindow).gm_authFailure?.();

    expect(listener).not.toHaveBeenCalled();
  });

  it("登録より前に認証失敗が起きていたら、登録した時点ですぐ伝える", () => {
    onMapsAuthFailure(() => {});
    (window as AuthWindow).gm_authFailure?.();

    const late = vi.fn();
    onMapsAuthFailure(late);

    expect(late).toHaveBeenCalledOnce();
  });
});
