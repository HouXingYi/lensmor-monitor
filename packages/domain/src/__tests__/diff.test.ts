import { describe, expect, it } from "vitest";

import { analyzeScenarioDiff, shouldGenerateReport, type DiffScenario } from "../diff";

const baseScenario: DiffScenario = {
  id: "cta-change",
  competitor: "acme-ai",
  page: "pricing",
  beforeSnapshot: "001-baseline.html",
  afterSnapshot: "002-cta-change.html",
  sourceUrl: "https://acme-ai.mock/pricing",
  expectedDiff: [],
  expectedReportHints: {
    summaryMustInclude: ["CTA"],
    intentCandidates: ["conversion"],
    actionCandidates: ["review own CTA"],
  },
};

describe("mock competitor diff", () => {
  it("recognizes explainable changes across core MVP categories", () => {
    const scenario: DiffScenario = {
      ...baseScenario,
      expectedDiff: [
        { type: "copy", before: "Start free", after: "Start your trial", explainable: true },
        { type: "pricing", before: "$29", after: "$39", explainable: true },
        { type: "feature", before: "Basic alerts", after: "AI alerts", explainable: true },
        { type: "layout", before: "Single column", after: "Comparison table", explainable: true },
        { type: "cta", before: "Learn more", after: "Book demo", explainable: true },
      ],
    };

    const result = analyzeScenarioDiff(scenario);

    expect(result.explainableChanges).toHaveLength(5);
    expect(result.changeTypes).toEqual(["copy", "pricing", "feature", "layout", "cta"]);
    expect(shouldGenerateReport(result)).toBe(true);
  });

  it("does not generate reports for noise-only changes", () => {
    const result = analyzeScenarioDiff({
      ...baseScenario,
      id: "footer-year-noise",
      expectedDiff: [{ type: "noise", before: "2025", after: "2026", explainable: false }],
    });

    expect(result.explainableChanges).toHaveLength(0);
    expect(shouldGenerateReport(result)).toBe(false);
  });
});
