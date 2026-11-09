import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SAMPLE_FEED } from "../content";
import { FeedScreen } from "./FeedScreen";

afterEach(() => cleanup());

describe("FeedScreen", () => {
  it("walk journal の見出しと友だちの寄り道ログを表示する", () => {
    render(<FeedScreen />);
    expect(screen.getByRole("heading", { name: "みんなの寄り道" })).toBeInTheDocument();
    expect(screen.getByText("WALK JOURNAL")).toBeInTheDocument();
    expect(screen.getByText("友だちが見つけた、いつもの道の小さな発見")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "友だちの寄り道ログ" }).querySelectorAll(":scope > li")).toHaveLength(SAMPLE_FEED.length);
  });
});
