import { requireSession } from "../../../../lib/api-auth";
import { hydrateMvpStateFromCookie } from "../../../../lib/mvp-persistence";
import { getReport, isReportRead, markReportRead } from "../../../../lib/mvp-store";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;
  hydrateMvpStateFromCookie(session.userId, request.headers.get("cookie"));

  const { id } = await context.params;
  const report = getReport(session.userId, id);
  if (!report) {
    return Response.json({ error: "报告不存在。" }, { status: 404 });
  }

  markReportRead(session.userId, id);

  return Response.json({
    ...report,
    read: isReportRead(session.userId, id),
  });
}
