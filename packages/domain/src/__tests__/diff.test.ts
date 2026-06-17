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
    expect(result.promptFacts).toEqual([
      'copy: changed from "Start free" to "Start your trial"',
      'pricing: changed from "$29" to "$39"',
      'feature: changed from "Basic alerts" to "AI alerts"',
      'layout: changed from "Single column" to "Comparison table"',
      'cta: changed from "Learn more" to "Book demo"',
    ]);
    expect(shouldGenerateReport(result)).toBe(true);
  });

  it("includes selectors in prompt facts and filters noise out of LLM input", () => {
    const result = analyzeScenarioDiff({
      ...baseScenario,
      expectedDiff: [
        {
          type: "pricing",
          selector: "[data-monitor-id='starter-price']",
          before: "$49/mo",
          after: "$79/mo with daily refresh",
          explainable: true,
        },
        {
          type: "security",
          selector: "[data-monitor-id='security-note']",
          before: "Standard workspace permissions",
          after: "SSO and audit logs included",
          explainable: true,
        },
        {
          type: "noise",
          selector: "[data-monitor-id='footer-year']",
          before: "2025",
          after: "2026",
          explainable: false,
        },
      ],
    });

    expect(result.explainableChanges).toHaveLength(2);
    expect(result.noiseChanges).toHaveLength(1);
    expect(result.promptFacts).toEqual([
      'pricing [data-monitor-id=\'starter-price\']: changed from "$49/mo" to "$79/mo with daily refresh"',
      'security [data-monitor-id=\'security-note\']: changed from "Standard workspace permissions" to "SSO and audit logs included"',
    ]);
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
