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

function validateLinks(links: CompetitorLink[]): string | null {
  if (links.length > 10) return "每个竞品最多只能添加 10 条关联链接。";
  const invalid = links.find((link) => !link.label || !link.url || !URL.canParse(link.url));
  return invalid ? "关联链接需要名称和有效 URL。" : null;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const competitor = getCompetitor(session.userId, await getId(context));
  if (!competitor) {
    return Response.json({ error: "竞品不存在。" }, { status: 404 });
  }

  return Response.json(competitor);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  if (body.status && !isValidStatus(body.status)) {
    return Response.json({ error: "竞品状态无效。" }, { status: 400 });
  }
  if (body.name !== undefined && body.name.trim() === "") {
    return Response.json({ error: "竞品名称必填。" }, { status: 400 });
  }
  if (body.mainDomain !== undefined && body.mainDomain.trim() === "") {
    return Response.json({ error: "主域名必填。" }, { status: 400 });
  }
  if (body.links) {
    const linkError = validateLinks(body.links);
    if (linkError) {
      return Response.json({ error: linkError }, { status: 400 });
    }
  }

  try {
    const competitor = updateCompetitor(session.userId, await getId(context), {
      ...body,
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.mainDomain ? { mainDomain: body.mainDomain.trim() } : {}),
    });
    if (!competitor) {
      return Response.json({ error: "竞品不存在。" }, { status: 404 });
    }
    return Response.json(competitor);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "竞品信息无效。" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const deleted = deleteCompetitor(session.userId, await getId(context));
  if (!deleted) {
    return Response.json({ error: "竞品不存在。" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
