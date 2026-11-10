import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TerrainCompare from "./TerrainCompare";

// 既定は地図キーなし（Maps の読み込み失敗）。テストごとに差し替えられるようにする
const maps = vi.hoisted(() => ({ load: () => Promise.reject(new Error("no key")) as Promise<void> }));
vi.mock("@/lib/google-maps", () => ({
  loadGoogleMaps: () => maps.load(),
}));

const GRID_FILES: Record<string, string> = {
  "/terrain/ueno-yanaka.elevation.json": "public/terrain/ueno-yanaka.elevation.json",
  "/terrain/ueno-yanaka.shade.json": "public/terrain/ueno-yanaka.shade.json",
};

describe("TerrainCompare の出典表記", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", (url: string) => {
      const file = GRID_FILES[url];
      if (!file) return Promise.reject(new Error(`unexpected fetch: ${url}`));
      const body = readFileSync(join(process.cwd(), file), "utf8");
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("国土地理院の標高タイルを加工したことと出典リンクを示す（PDL1.0 の出典記載例に合わせる）", async () => {
    render(<TerrainCompare />);
    expect(await screen.findByText(/地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "国土地理院" });
    expect(link).toHaveAttribute("href", "https://maps.gsi.go.jp/development/ichiran.html");
    expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument();
  });

  test("地図キーなしでも直線で評価したことを知らせる", async () => {
    render(<TerrainCompare />);
    expect(await screen.findByText(/直線で評価しています/)).toBeInTheDocument();
  });

  // F09: /walk から来た人に、折りたたみを開かなくても対象・推定値・不明区間が分かるようにする
  test("固定デモ経路であること・推定値で現地未検証であること・/walk への戻りが折りたたみなしで見える", () => {
    render(<TerrainCompare />);
    expect(screen.getByRole("heading", { name: /上野公園〜谷中〜鶯谷/ })).toBeInTheDocument();
    expect(screen.getByText(/出発地・寄り道先・到着地は固定/)).toBeInTheDocument();
    expect(screen.getByText(/推定値で、現地では確かめていません/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← 寄り道コンパスの画面に戻る" })).toHaveAttribute("href", "/walk");
  });

  test("評価できなかった区間を「不明区間」として表に出す", async () => {
    render(<TerrainCompare />);
    expect(await screen.findByText("不明区間（標高）")).toBeInTheDocument();
    expect(screen.getByText("不明区間（日陰）")).toBeInTheDocument();
    expect(screen.getByText(/0 としては扱っていません/)).toBeInTheDocument();
  });
});

describe("TerrainCompare の失敗時", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    maps.load = () => Promise.reject(new Error("no key"));
  });

  test("地形データが 404 なら、HTML を読ませずに読み込めなかったことと HTTP の状態を出す", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("<!DOCTYPE html><html></html>") }),
    );
    render(<TerrainCompare />);
    expect(await screen.findByText(/地形データを読み込めませんでした（HTTP 404）/)).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument();
  });

  test("Routes API が応答しなくても、待つ時間を過ぎたら直線で評価して表を出す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", (url: string) => {
      const body = readFileSync(join(process.cwd(), GRID_FILES[url]), "utf8");
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });
    });
    maps.load = () => Promise.resolve();
    vi.stubGlobal("google", {
      maps: {
        importLibrary: () => Promise.resolve({ Route: { computeRoutes: () => new Promise(() => {}) } }),
      },
    });
    render(<TerrainCompare />);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await screen.findByText(/直線で評価しています/)).toBeInTheDocument();
  });
});
