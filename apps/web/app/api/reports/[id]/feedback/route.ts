import { requireSession } from "../../../../../lib/api-auth";
import { createFeedback, type FeedbackType, type WrongReason } from "../../../../../lib/mvp-store";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

interface FeedbackBody {
  type?: string;
  wrongReason?: WrongReason;
}

function parseFeedbackType(type: string | undefined): FeedbackType | null {
  if (type === "useful" || type === "wrong" || type === "not_important") return type;
  return null;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as FeedbackBody;
  const type = parseFeedbackType(body.type);
  if (!type) {
    return Response.json({ error: "Invalid feedback type" }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const feedback = createFeedback(session.userId, id, {
      type,
      ...(body.wrongReason ? { wrongReason: body.wrongReason } : {}),
    });
    return Response.json(feedback, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid feedback" }, { status: 400 });
  }
}
