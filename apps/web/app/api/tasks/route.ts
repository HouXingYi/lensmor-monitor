import { requireSession } from "../../../lib/api-auth";
import { executeCollectionForCompetitor } from "../../../lib/task-execution";
import {
  createCompetitorsCookie,
  createReportsCookie,
  createTasksCookie,
  hydrateMvpStateFromCookie,
} from "../../../lib/mvp-persistence";
import { getCompetitor } from "../../../lib/mvp-store";

export const runtime = "nodejs";

interface TaskBody {
  competitorId?: string;
  triggerType?: "manual" | "scheduled";
}

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;
  hydrateMvpStateFromCookie(session.userId, request.headers.get("cookie"));

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

  try {
    const result = await executeCollectionForCompetitor({
      ownerId: session.userId,
      competitor,
      triggerType: body.triggerType ?? "manual",
      origin: new URL(request.url).origin,
    });

    if (result.task.status === "failed") {
      const failedResponse = Response.json(
        {
          ...result,
          error: result.task.failureReason ?? "任务执行失败。",
        },
        { status: 502 },
      );
      failedResponse.headers.append("Set-Cookie", createCompetitorsCookie(session.userId));
      failedResponse.headers.append("Set-Cookie", createReportsCookie(session.userId));
      failedResponse.headers.append("Set-Cookie", createTasksCookie(session.userId));
      return failedResponse;
    }

    const taskResponse = Response.json(result, { status: 202 });
    taskResponse.headers.append("Set-Cookie", createCompetitorsCookie(session.userId));
    taskResponse.headers.append("Set-Cookie", createReportsCookie(session.userId));
    taskResponse.headers.append("Set-Cookie", createTasksCookie(session.userId));
    return taskResponse;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "任务执行失败。" },
      { status: 500 },
    );
  }
}
