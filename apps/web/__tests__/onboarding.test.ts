import { describe, expect, it, vi } from "vitest";

import { POST as completeOnboarding } from "../app/api/onboarding/route";
import { createSessionCookie, hasCompletedOnboarding } from "../lib/session";
import { getProductProfile, listCompetitors, resetMvpStore } from "../lib/mvp-store";

async function sessionCookie() {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
}

describe("onboarding API", () => {
  it("saves role, product context, and at least one mock competitor", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();

    const response = await completeOnboarding(
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

    expect(response.status).toBe(200);
    expect(hasCompletedOnboarding(response.headers.get("set-cookie"))).toBe(true);
    expect(getProductProfile("single-user")?.role).toBe("Product Manager");
    expect(listCompetitors("single-user")).toHaveLength(1);
    expect(listCompetitors("single-user")[0]?.status).toBe("monitoring");
  });

  it("rejects onboarding without competitors", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();

    const response = await completeOnboarding(
      new Request("http://localhost/api/onboarding", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          role: "Founder",
          product: {
            name: "Lensmor",
            url: "https://lensmor.local",
            oneLineDescription: "AI competitor monitoring",
            targetAudience: "Founders",
            coreSellingPoints: "Automated monitoring",
            competitiveEdge: "Actionable reports",
            strategicGoal: "Launch",
          },
          competitors: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
