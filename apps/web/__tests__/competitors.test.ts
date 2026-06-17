import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getCompetitor, PATCH, DELETE } from "../app/api/competitors/[id]/route";
import { GET, POST } from "../app/api/competitors/route";
import { GET as getReport } from "../app/api/reports/[id]/route";
import { POST as createTask } from "../app/api/tasks/route";
import { GET as listReports } from "../app/api/reports/route";
import { createSessionCookie } from "../lib/session";
import { resetMvpStore } from "../lib/mvp-store";
import { rotateMockPages } from "../lib/mock-pages";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function sessionCookie() {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
}

function createLiteLLMResponse(index: number) {
  const longText = `第 ${index} 次采集发现竞品正在调整定价、CTA、客户证明和安全合规表达。`.repeat(20);
  return Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: `Acme AI 第 ${index} 次网站变化提醒`,
            priority: index % 2 === 0 ? "urgent" : "medium",
            changedAt: new Date(Date.now() + index).toISOString(),
            changeSummary: [longText, longText, longText, longText, longText],
            strategicIntent: longText,
            recommendedActions: [longText, longText, longText, longText, longText],
          }),
        },
      },
    ],
  });
}

describe("competitors API", () => {
  it("creates, lists, updates, and deletes competitors owned by the current user", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();

    const created = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          name: "Acme AI",
          mainDomain: "acme-ai.mock",
          links: [{ label: "Pricing", url: "https://acme-ai.mock/pricing" }],
        }),
      }),
    );
    const createdBody = (await created.json()) as { id: string; status: string };

    expect(created.status).toBe(201);
    expect(createdBody.status).toBe("monitoring");

    const listed = await GET(new Request("http://localhost/api/competitors", { headers: { cookie } }));
    const listBody = (await listed.json()) as { competitors: unknown[] };
    expect(listBody.competitors).toHaveLength(1);

    const patched = await PATCH(
      new Request(`http://localhost/api/competitors/${createdBody.id}`, {
        method: "PATCH",
        headers: { cookie },
        body: JSON.stringify({ status: "paused" }),
      }),
      { params: { id: createdBody.id } },
    );
    expect(patched.status).toBe(200);

    const fetched = await getCompetitor(
      new Request(`http://localhost/api/competitors/${createdBody.id}`, { headers: { cookie } }),
      { params: { id: createdBody.id } },
    );
    expect(((await fetched.json()) as { status: string }).status).toBe("paused");

    const deleted = await DELETE(
      new Request(`http://localhost/api/competitors/${createdBody.id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
      { params: { id: createdBody.id } },
    );
    expect(deleted.status).toBe(204);
  });

  it("hydrates competitors from the persistence cookie after memory resets", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();

    const created = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({
          name: "Acme AI",
          mainDomain: "acme-ai.mock",
          links: [{ label: "Pricing", url: "https://acme-ai.mock/pricing" }],
        }),
      }),
    );
    const createdBody = (await created.json()) as { id: string };
    const persistedCookie = created.headers.get("set-cookie");
    resetMvpStore();

    const fetched = await getCompetitor(
      new Request(`http://localhost/api/competitors/${createdBody.id}`, {
        headers: { cookie: `${cookie}; ${persistedCookie ?? ""}` },
      }),
      { params: { id: createdBody.id } },
    );

    expect(fetched.status).toBe(200);
    expect(((await fetched.json()) as { name: string }).name).toBe("Acme AI");
  });

  it("runs a task without fetching the local mock page route over HTTP", async () => {
    resetMvpStore();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.test");
    vi.stubEnv("LITELLM_API_KEY", "test-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).not.toContain("/mock-pages/");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Acme AI 网站变化提醒",
                priority: "medium",
                changedAt: new Date().toISOString(),
                changeSummary: ["价格表达发生变化。", "主 CTA 发生变化。", "客户证明发生变化。"],
                strategicIntent:
                  "竞品正在同步调整定价表达、转化入口和信任证明，可能希望提升高意向线索转化，并加强面向产品与市场团队的价值叙事。",
                recommendedActions: ["复核自有定价页。", "检查主 CTA。", "持续观察后续页面变化。"],
              }),
            },
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const cookie = await sessionCookie();

    const created = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ name: "Acme AI", mainDomain: "acme-ai.mock", links: [] }),
      }),
    );
    const createdBody = (await created.json()) as { id: string };
    const response = await createTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ competitorId: createdBody.id, triggerType: "manual" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("hydrates generated reports from the persistence cookie after memory resets", async () => {
    resetMvpStore();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.test");
    vi.stubEnv("LITELLM_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Acme AI 网站变化提醒",
                  priority: "medium",
                  changedAt: new Date().toISOString(),
                  changeSummary: ["价格表达发生变化。", "主 CTA 发生变化。", "客户证明发生变化。"],
                  strategicIntent:
                    "竞品正在同步调整定价表达、转化入口和信任证明，可能希望提升高意向线索转化，并加强面向产品与市场团队的价值叙事。",
                  recommendedActions: ["复核自有定价页。", "检查主 CTA。", "持续观察后续页面变化。"],
                }),
              },
            },
          ],
        }),
      ),
    );
    const cookie = await sessionCookie();

    const created = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ name: "Acme AI", mainDomain: "acme-ai.mock", links: [] }),
      }),
    );
    const createdBody = (await created.json()) as { id: string };
    const taskResponse = await createTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { cookie: `${cookie}; ${created.headers.get("set-cookie") ?? ""}` },
        body: JSON.stringify({ competitorId: createdBody.id, triggerType: "manual" }),
      }),
    );
    const taskBody = (await taskResponse.json()) as { report?: { id: string } };
    const persistedCookies = taskResponse.headers.getSetCookie().join("; ");
    resetMvpStore();

    const reportResponse = await getReport(
      new Request(`http://localhost/api/reports/${taskBody.report?.id}`, {
        headers: { cookie: `${cookie}; ${persistedCookies}` },
      }),
      { params: { id: taskBody.report?.id ?? "" } },
    );

    expect(reportResponse.status).toBe(200);
    expect(((await reportResponse.json()) as { title: string }).title).toBe("Acme AI 网站变化提醒");
  });

  it("keeps automatic collection reports within the cookie limit after an existing manual report", async () => {
    resetMvpStore();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.test");
    vi.stubEnv("LITELLM_API_KEY", "test-key");
    let requestCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        requestCount += 1;
        return createLiteLLMResponse(requestCount);
      }),
    );
    const cookie = await sessionCookie();

    const created = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ name: "Acme AI", mainDomain: "acme-ai.mock", links: [] }),
      }),
    );
    const createdBody = (await created.json()) as { id: string };
    const firstTaskResponse = await createTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { cookie: `${cookie}; ${created.headers.get("set-cookie") ?? ""}` },
        body: JSON.stringify({ competitorId: createdBody.id, triggerType: "manual" }),
      }),
    );
    rotateMockPages();
    const secondTaskResponse = await createTask(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { cookie: `${cookie}; ${firstTaskResponse.headers.getSetCookie().join("; ")}` },
        body: JSON.stringify({ competitorId: createdBody.id, triggerType: "scheduled" }),
      }),
    );
    const reportsCookie = secondTaskResponse.headers
      .getSetCookie()
      .find((item) => item.startsWith("lensmor_reports="));
    resetMvpStore();

    const listed = await listReports(
      new Request("http://localhost/api/reports", {
        headers: { cookie: `${cookie}; ${secondTaskResponse.headers.getSetCookie().join("; ")}` },
      }),
    );
    const listBody = (await listed.json()) as { reports: Array<{ title: string }> };

    expect(reportsCookie?.split(";")[0]?.length).toBeLessThanOrEqual(4096);
    expect(listBody.reports[0]?.title).toBe("Acme AI 第 2 次网站变化提醒");
  });

  it("rejects more than 10 associated links", async () => {
    resetMvpStore();
    const cookie = await sessionCookie();
    const links = Array.from({ length: 11 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://acme-ai.mock/${index}`,
    }));

    const response = await POST(
      new Request("http://localhost/api/competitors", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ name: "Acme AI", mainDomain: "acme-ai.mock", links }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
