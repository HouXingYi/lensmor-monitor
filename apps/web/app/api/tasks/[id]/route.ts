import { requireSession } from "../../../../lib/api-auth";
import { hydrateMvpStateFromCookie } from "../../../../lib/mvp-persistence";
import { getTask } from "../../../../lib/mvp-store";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;
  hydrateMvpStateFromCookie(session.userId, request.headers.get("cookie"));

  const { id } = await context.params;
  const task = getTask(session.userId, id);
  if (!task) {
    return Response.json({ error: "任务不存在。" }, { status: 404 });
  }

  return Response.json(task);
}
