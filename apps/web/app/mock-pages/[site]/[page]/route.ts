import { getMockPageSnapshot } from "../../../../lib/mock-pages";

export const runtime = "nodejs";

interface RouteContext {
  params: { site: string; page: string } | Promise<{ site: string; page: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { site, page } = await context.params;
  const snapshot = getMockPageSnapshot(site, page);
  if (!snapshot) {
    return Response.json({ error: "Mock page not found." }, { status: 404 });
  }

  return new Response(snapshot.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Lensmor-Mock-Snapshot": snapshot.snapshotId,
      "X-Lensmor-Mock-Updated-At": snapshot.updatedAt,
    },
  });
}
