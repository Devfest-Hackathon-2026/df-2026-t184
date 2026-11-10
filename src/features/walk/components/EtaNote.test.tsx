import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { eta } from "../flow";
import { ETA_SAMPLE_NOTE, EtaNote } from "./EtaNote";

describe("EtaNote", () => {
  it("所要時間が固定の見本値で、経路から計算していないことを画面で知らせる", () => {
    render(<EtaNote budget={20} />);
    const { total, extra } = eta(20);
    expect(screen.getByText(`約${total}分`)).toBeInTheDocument();
    expect(screen.getByText(`最短より${extra}分長い寄り道`)).toBeInTheDocument();
    expect(screen.getByText(ETA_SAMPLE_NOTE)).toBeInTheDocument();
    expect(ETA_SAMPLE_NOTE).toMatch(/見本/);
  });
});
