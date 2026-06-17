import { getMockPageSnapshot } from "../../../../lib/mock-pages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MockPageRouteContext {
  params: Promise<{
    site: string;
    page: string;
  }>;
}

export async function GET(_request: Request, context: MockPageRouteContext): Promise<Response> {
  const { site, page } = await context.params;
  const snapshot = getMockPageSnapshot(site, page);

  if (!snapshot) {
    return new Response("Mock page not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
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
