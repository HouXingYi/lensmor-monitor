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
        expectedDiff: [{ type: "cta", before: "Start free", after: "Book demo", explainable: true }],
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
