import { describe, expect, it, vi } from "vitest";

import { GET as getCompetitor, PATCH, DELETE } from "../app/api/competitors/[id]/route";
import { GET, POST } from "../app/api/competitors/route";
import { createSessionCookie } from "../lib/session";
import { resetMvpStore } from "../lib/mvp-store";

async function sessionCookie() {
  vi.stubEnv("SESSION_SECRET", "test-secret");
  return createSessionCookie({ userId: "single-user", email: "demo@lensmor.local" });
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
