import { describe, expect, it, vi } from "vitest";

import { GET as getReport } from "../app/api/reports/[id]/route";
import { GET } from "../app/api/reports/route";
import { createReport, createCompetitor, resetMvpStore } from "../lib/mvp-store";
import { createSessionCookie } from "../lib/session";

async function sessionCookie() {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
}

function seedReports() {
  const acme = createCompetitor("single-user", {
    name: "Acme AI",
    mainDomain: "acme-ai.mock",
    links: [],
  });
  const nova = createCompetitor("single-user", {
    name: "Nova Stack",
    mainDomain: "nova-stack.mock",
    links: [],
  });
  const acmeReport = createReport("single-user", {
    competitorId: acme.id,
    title: "Acme pricing CTA changed",
    priority: "medium",
    changedAt: "2026-06-16T08:00:00.000Z",
    sourceUrl: "https://acme-ai.mock/pricing",
    changeSummary: ["CTA changed"],
    strategicIntent: "Sales-led conversion",
    recommendedActions: ["Review own CTA"],
  });
  createReport("single-user", {
    competitorId: nova.id,
    title: "Nova homepage copy changed",
    priority: "low",
    changedAt: "2026-06-15T08:00:00.000Z",
    sourceUrl: "https://nova-stack.mock",
    changeSummary: ["Copy changed"],
    strategicIntent: "AI positioning",
    recommendedActions: ["Review hero message"],
  });
  return { acme, acmeReport };
}

describe("inbox reports API", () => {
  it("filters reports by competitor, priority, and date range", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();
    const { acme } = seedReports();

    const response = await GET(
      new Request(
        `http://localhost/api/reports?competitorId=${acme.id}&priority=medium&from=2026-06-16&to=2026-06-16`,
        { headers: { cookie } },
      ),
    );
    const body = (await response.json()) as { reports: Array<{ title: string }> };

    expect(response.status).toBe(200);
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]?.title).toBe("Acme pricing CTA changed");
  });

  it("marks a report as read when opening details", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();
    const { acmeReport } = seedReports();

    const response = await getReport(
      new Request(`http://localhost/api/reports/${acmeReport.id}`, { headers: { cookie } }),
      { params: { id: acmeReport.id } },
    );
    const body = (await response.json()) as { read: boolean; title: string };

    expect(response.status).toBe(200);
    expect(body.title).toBe("Acme pricing CTA changed");
    expect(body.read).toBe(true);
  });
});
