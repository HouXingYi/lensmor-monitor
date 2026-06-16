import { requireSession } from "../../../../lib/api-auth";
import {
  deleteCompetitor,
  getCompetitor,
  updateCompetitor,
  type CompetitorLink,
  type CompetitorStatus,
} from "../../../../lib/mvp-store";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

interface PatchBody {
  name?: string;
  mainDomain?: string;
  logoUrl?: string;
  status?: CompetitorStatus;
  links?: CompetitorLink[];
}

async function getId(context: RouteContext): Promise<string> {
  return (await context.params).id;
}

function isValidStatus(status: string): status is CompetitorStatus {
  return status === "monitoring" || status === "paused" || status === "collecting";
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const competitor = getCompetitor(session.userId, await getId(context));
  if (!competitor) {
    return Response.json({ error: "Competitor not found" }, { status: 404 });
  }

  return Response.json(competitor);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  if (body.status && !isValidStatus(body.status)) {
    return Response.json({ error: "Invalid competitor status" }, { status: 400 });
  }

  try {
    const competitor = updateCompetitor(session.userId, await getId(context), body);
    if (!competitor) {
      return Response.json({ error: "Competitor not found" }, { status: 404 });
    }
    return Response.json(competitor);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid competitor" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const deleted = deleteCompetitor(session.userId, await getId(context));
  if (!deleted) {
    return Response.json({ error: "Competitor not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
