import { requireSession } from "../../../lib/api-auth";
import { executeCollectionForCompetitor } from "../../../lib/task-execution";
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
    return Response.json({ error: "缺少竞品 ID。" }, { status: 400 });
  }

  const competitor = getCompetitor(session.userId, body.competitorId);
  if (!competitor) {
    return Response.json({ error: "竞品不存在。" }, { status: 404 });
  }

  if (competitor.status === "paused") {
    return Response.json({ error: "请先恢复竞品监控，再执行刷新。" }, { status: 409 });
  }

  const result = await executeCollectionForCompetitor({
    ownerId: session.userId,
    competitor,
    triggerType: body.triggerType ?? "manual",
    origin: new URL(request.url).origin,
  });

  return Response.json(result, { status: 202 });
}
