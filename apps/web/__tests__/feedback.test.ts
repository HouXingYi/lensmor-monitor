import { describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/reports/[id]/feedback/route";
import { createCompetitor, createReport, listFeedback, resetMvpStore } from "../lib/mvp-store";
import { createSessionCookie } from "../lib/session";

async function sessionCookie() {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
}

function seedReport() {
  const competitor = createCompetitor("single-user", {
    name: "Acme AI",
    mainDomain: "acme-ai.mock",
    links: [],
  });
  return createReport("single-user", {
    competitorId: competitor.id,
    title: "Acme pricing CTA changed",
    priority: "medium",
    changedAt: "2026-06-16T08:00:00.000Z",
    sourceUrl: "https://acme-ai.mock/pricing",
    changeSummary: ["CTA changed"],
    strategicIntent: "Sales-led conversion",
    recommendedActions: ["Review own CTA"],
  });
}

describe("report feedback API", () => {
  it("saves useful and not important feedback", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();
    const report = seedReport();

    const useful = await POST(
      new Request(`http://localhost/api/reports/${report.id}/feedback`, {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ type: "useful" }),
      }),
      { params: { id: report.id } },
    );
    const notImportant = await POST(
      new Request(`http://localhost/api/reports/${report.id}/feedback`, {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ type: "not_important" }),
      }),
      { params: { id: report.id } },
    );

    expect(useful.status).toBe(201);
    expect(notImportant.status).toBe(201);
    expect(listFeedback("single-user", report.id)).toHaveLength(2);
  });

  it("requires a wrong reason for wrong feedback", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();
    const report = seedReport();

    const missingReason = await POST(
      new Request(`http://localhost/api/reports/${report.id}/feedback`, {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ type: "wrong" }),
      }),
      { params: { id: report.id } },
    );
    const withReason = await POST(
      new Request(`http://localhost/api/reports/${report.id}/feedback`, {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ type: "wrong", wrongReason: "information_inaccurate" }),
      }),
      { params: { id: report.id } },
    );

    expect(missingReason.status).toBe(400);
    expect(withReason.status).toBe(201);
  });
});
