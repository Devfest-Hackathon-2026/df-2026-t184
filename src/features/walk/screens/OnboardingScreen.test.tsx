import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingScreen } from "./OnboardingScreen";

vi.mock("@/lib/google-maps", () => ({ MAPS_API_KEY: "test-key" }));
vi.mock("@/components/RouteMap", () => ({
  default: ({ onError, fixed }: { onError: () => void; fixed?: { checkpoints: unknown[] } }) => (
    <div role="application" aria-label="寄り道ルートの地図" data-checkpoints={fixed?.checkpoints.length}>
      <button type="button" onClick={onError}>
        地図の失敗
      </button>
    </div>
  ),
}));

afterEach(() => cleanup());

const HAND_DRAWN = /寄り道ルート$/;

describe("はじめての案内の地図", () => {
  it("本番の地図を使うときは、上野〜谷中の決まった寄り道ルートを Google マップで見せる", () => {
    render(<OnboardingScreen onDone={() => {}} realMap />);
    const map = screen.getByRole("application", { name: "寄り道ルートの地図" });
    expect(map).toHaveAttribute("data-checkpoints", "3");
    expect(screen.queryByRole("img", { name: HAND_DRAWN })).not.toBeInTheDocument();
  });

  it("Google マップが失敗したら、手描きの地図に戻す", () => {
    render(<OnboardingScreen onDone={() => {}} realMap />);
    fireEvent.click(screen.getByRole("button", { name: "地図の失敗" }));
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: HAND_DRAWN })).toBeInTheDocument();
  });

  it("見本データで動くときは、手描きの地図を見せる", () => {
    render(<OnboardingScreen onDone={() => {}} />);
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: HAND_DRAWN })).toBeInTheDocument();
  });

  it("まだない混雑回避の機能を、案内で約束しない", () => {
    render(<OnboardingScreen onDone={() => {}} realMap />);
    expect(screen.queryByText(/人の多い通り/)).not.toBeInTheDocument();
  });
});
