import { describe, expect, it } from "vitest";

import { createMockLiteLLMClient } from "../litellm-client";
import { runCollectionTask, shouldCreateScheduledTask, type RunnerCompetitor } from "../task-runner";

const competitor: RunnerCompetitor = {
  id: "competitor-1",
  ownerId: "single-user",
  name: "Acme AI",
  status: "monitoring",
};

describe("task runner", () => {
  it("generates an Analysis Report for explainable changes", async () => {
    const result = await runCollectionTask({
      competitor,
      triggerType: "manual",
      scenario: {
        id: "cta-change",
        competitor: "acme-ai",
        page: "pricing",
        beforeSnapshot: "001-baseline.html",
        afterSnapshot: "002-cta-change.html",
        sourceUrl: "https://acme-ai.mock/pricing",
        expectedDiff: [
          {
            type: "cta",
            selector: "[data-monitor-id='primary-cta']",
            before: "Start free",
            after: "Book demo",
            explainable: true,
          },
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
        ],
        expectedReportHints: {
          summaryMustInclude: ["CTA"],
          intentCandidates: ["sales-led"],
          actionCandidates: ["review CTA"],
        },
      },
      litellm: createMockLiteLLMClient(),
    });

    expect(result.task.status).toBe("completed");
    expect(result.report?.title).toContain("Acme AI");
    expect(result.report?.changeSummary.length).toBeGreaterThanOrEqual(3);
    expect(result.report?.recommendedActions.length).toBeGreaterThanOrEqual(3);
    expect(result.report?.strategicIntent.length).toBeGreaterThan(80);
  });

  it("fails the task without creating an empty report when AI generation fails", async () => {
    const result = await runCollectionTask({
      competitor,
      triggerType: "manual",
      scenario: {
        id: "cta-change",
        competitor: "acme-ai",
        page: "pricing",
        beforeSnapshot: "001-baseline.html",
        afterSnapshot: "002-cta-change.html",
        sourceUrl: "https://acme-ai.mock/pricing",
        expectedDiff: [{ type: "cta", before: "Start free", after: "Book demo", explainable: true }],
        expectedReportHints: {
          summaryMustInclude: ["CTA"],
          intentCandidates: ["sales-led"],
          actionCandidates: ["review CTA"],
        },
      },
      litellm: createMockLiteLLMClient({ fail: true }),
    });

    expect(result.task.status).toBe("failed");
    expect(result.report).toBeUndefined();
    expect(result.task.failureReason).toContain("liteLLM");
  });

  it("skips scheduled tasks for paused competitors", () => {
    expect(shouldCreateScheduledTask({ ...competitor, status: "paused" })).toBe(false);
    expect(shouldCreateScheduledTask(competitor)).toBe(true);
  });
});
