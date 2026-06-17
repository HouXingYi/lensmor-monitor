import { requireSession } from "../../../../lib/api-auth";
import {
  createCompetitorsCookie,
  createReportsCookie,
  createTasksCookie,
  hydrateMvpStateFromCookie,
} from "../../../../lib/mvp-persistence";
import { listCompetitors } from "../../../../lib/mvp-store";
import { executeCollectionForCompetitor } from "../../../../lib/task-execution";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;
  hydrateMvpStateFromCookie(session.userId, request.headers.get("cookie"));

  const origin = new URL(request.url).origin;
  const competitors = listCompetitors(session.userId);
  const monitoringCompetitors = competitors.filter((competitor) => competitor.status === "monitoring");
  const results = await Promise.all(
    monitoringCompetitors.map((competitor) =>
      executeCollectionForCompetitor({
        ownerId: session.userId,
        competitor,
        triggerType: "scheduled",
        origin,
      }),
    ),
  );

  const scheduledResponse = Response.json(
    {
      checked: monitoringCompetitors.length,
      skipped: competitors.length - monitoringCompetitors.length,
      results,
    },
    { status: 202 },
  );
  scheduledResponse.headers.append("Set-Cookie", createCompetitorsCookie(session.userId));
  scheduledResponse.headers.append("Set-Cookie", createReportsCookie(session.userId));
  scheduledResponse.headers.append("Set-Cookie", createTasksCookie(session.userId));
  return scheduledResponse;
}
