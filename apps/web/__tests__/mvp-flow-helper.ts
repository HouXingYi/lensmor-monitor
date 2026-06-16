import { POST as completeOnboarding } from "../app/api/onboarding/route";
import { POST as createTask } from "../app/api/tasks/route";
import { GET as getReport } from "../app/api/reports/[id]/route";
import { POST as createFeedback } from "../app/api/reports/[id]/feedback/route";
import { createReport, getProductProfile, listCompetitors, resetMvpStore } from "../lib/mvp-store";
import { createSessionCookie } from "../lib/session";
import { createMockLiteLLMClient, runCollectionTask } from "@lensmor/worker";

export interface MvpFlowResult {
  onboardingCompleted: boolean;
  competitorCreated: boolean;
  taskCompleted: boolean;
  reportCreated: boolean;
  reportRead: boolean;
  feedbackSaved: boolean;
}

export async function runMvpFlow(): Promise<MvpFlowResult> {
  process.env.SESSION_SECRET = "test-secret";
  resetMvpStore();

  const cookie = await createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
  const onboarding = await completeOnboarding(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        role: "Product Manager",
        product: {
          name: "Lensmor",
          url: "https://lensmor.local",
          oneLineDescription: "AI competitor monitoring",
          targetAudience: "Product teams",
          coreSellingPoints: "Automated monitoring",
          competitiveEdge: "Actionable reports",
          strategicGoal: "Validate MVP",
        },
        competitors: [{ name: "Acme AI", mainDomain: "acme-ai.mock" }],
      }),
    }),
  );

  const competitor = listCompetitors("single-user")[0];
  if (!competitor) {
    throw new Error("Expected onboarding to create a competitor");
  }

  const taskResponse = await createTask(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ competitorId: competitor.id, triggerType: "manual" }),
    }),
  );
  const runnerResult = await runCollectionTask({
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

  if (!runnerResult.report) {
    throw new Error("Expected worker to create a report");
  }

  const report = createReport("single-user", runnerResult.report);
  const detail = await getReport(
    new Request(`http://localhost/api/reports/${report.id}`, { headers: { cookie } }),
    { params: { id: report.id } },
  );
  const detailBody = (await detail.json()) as { read: boolean };
  const feedback = await createFeedback(
    new Request(`http://localhost/api/reports/${report.id}/feedback`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ type: "useful" }),
    }),
    { params: { id: report.id } },
  );

  return {
    onboardingCompleted: onboarding.status === 200 && Boolean(getProductProfile("single-user")),
    competitorCreated: Boolean(competitor),
    taskCompleted: taskResponse.status === 202 && runnerResult.task.status === "completed",
    reportCreated: Boolean(report.id),
    reportRead: detail.status === 200 && detailBody.read,
    feedbackSaved: feedback.status === 201,
  };
}
