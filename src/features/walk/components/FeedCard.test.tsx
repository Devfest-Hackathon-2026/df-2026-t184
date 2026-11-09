import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {  } from "@/components/sticker";

import { SAMPLE_FEED } from "../content";
import { FeedCard } from "./FeedCard";

const POST = SAMPLE_FEED[0];

describe("FeedCard", () => {
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
