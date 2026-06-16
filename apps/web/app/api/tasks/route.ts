import { createQueuedTask } from "@lensmor/domain";

import { requireSession } from "../../../lib/api-auth";
import { getCompetitor } from "../../../lib/mvp-store";

export const runtime = "nodejs";

interface TaskBody {
  competitorId?: string;
  triggerType?: "manual" | "scheduled";
}

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as TaskBody;
  if (!body.competitorId) {
    return Response.json({ error: "competitorId is required" }, { status: 400 });
  }

  const competitor = getCompetitor(session.userId, body.competitorId);
  if (!competitor) {
    return Response.json({ error: "Competitor not found" }, { status: 404 });
  }

  if (competitor.status === "paused") {
    return Response.json({ error: "Resume competitor monitoring before refreshing" }, { status: 409 });
  }

  const task = createQueuedTask(competitor.id, body.triggerType ?? "manual");

  return Response.json({ task }, { status: 202 });
}
