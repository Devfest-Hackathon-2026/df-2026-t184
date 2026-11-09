import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { moodById, SAMPLE_FEED } from "../content";
import { FeedCard } from "./FeedCard";

const POST = SAMPLE_FEED[0];

afterEach(() => cleanup());

describe("FeedCard", () => {
  it("寄り道ルートを写真ではなく、番号付きの地点名で見せる", () => {
    render(<FeedCard post={POST} />);
    const route = screen.getByRole("region", { name: `${POST.dest}への寄り道ルート` });
    const stops = Array.from(route.querySelectorAll("ol > li"));
    expect(stops).toHaveLength(3);
    expect(stops.map((stop) => stop.textContent?.trim())).toEqual(moodById(POST.moodId).quests.map((quest, index) => `${index + 1}${quest.checkpoint}`));
    expect(screen.queryByRole("img", { name: /地点目の写真（見本）/ })).not.toBeInTheDocument();
    expect(screen.getByText(`+${POST.extraMinutes}分`)).toBeInTheDocument();
  });

  it("名前・時刻・ひとことを出し、共有とコメントのボタンを並べる", () => {
    render(<FeedCard post={POST} />);
    expect(screen.getByText(POST.author)).toBeInTheDocument();
    expect(screen.getByText(POST.time)).toBeInTheDocument();
    expect(screen.getByText(POST.excerpt)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${POST.author}の寄り道を共有` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `コメント ${POST.comments}件` })).toBeInTheDocument();
  });

  it("いいねを押すと数が 1 増え、もう一度押すと戻る", async () => {
    render(<FeedCard post={POST} />);
    const like = screen.getByRole("button", { name: /いいね/ });
    expect(like).toHaveAttribute("aria-pressed", "false");
    expect(like).toHaveTextContent(String(POST.likes));

    await userEvent.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(like).toHaveTextContent(String(POST.likes + 1));

    await userEvent.click(like);
    expect(like).toHaveAttribute("aria-pressed", "false");
    expect(like).toHaveTextContent(String(POST.likes));
  });
});
