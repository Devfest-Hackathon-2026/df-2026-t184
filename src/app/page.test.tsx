import { existsSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import Home from "./page";

beforeEach(() => {
  redirectMock.mockReset();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  });
});

describe("/ ページ（入口）", () => {
  it("/ を開くと /walk の体験へ移る", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT:/walk");
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/walk");
  });

  it("旧 YorimichiApp はルートから外しただけで、ファイルは残っている", () => {
    const legacy = path.join(process.cwd(), "src/components/YorimichiApp.tsx");
    expect(existsSync(legacy)).toBe(true);
  });
});
