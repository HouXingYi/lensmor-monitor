import { describe, expect, it } from "vitest";

import { runMvpFlow } from "../__tests__/mvp-flow-helper";

describe("MVP flow", () => {
  it("runs login, onboarding, competitor, task, report, inbox, and feedback smoke flow", async () => {
    const result = await runMvpFlow();

    expect(result.onboardingCompleted).toBe(true);
    expect(result.competitorCreated).toBe(true);
    expect(result.taskCompleted).toBe(true);
    expect(result.reportCreated).toBe(true);
    expect(result.reportRead).toBe(true);
    expect(result.feedbackSaved).toBe(true);
  });
});
