import { requireSession } from "../../../lib/api-auth";
import { createCompetitor, listCompetitors, type CompetitorLink } from "../../../lib/mvp-store";

export const runtime = "nodejs";

interface CompetitorBody {
  name?: string;
  mainDomain?: string;
  logoUrl?: string;
  links?: CompetitorLink[];
}

function validateLinks(links: CompetitorLink[]): string | null {
  if (links.length > 10) return "每个竞品最多只能添加 10 条关联链接。";
  const invalid = links.find((link) => !link.label || !link.url || !URL.canParse(link.url));
  return invalid ? "关联链接需要名称和有效 URL。" : null;
}

export async function GET(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  return Response.json({ competitors: listCompetitors(session.userId) });
}

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as CompetitorBody;
  if (!body.name || !body.mainDomain) {
    return Response.json({ error: "竞品名称和主域名都必填。" }, { status: 400 });
  }

  const links = body.links ?? [];
  const linkError = validateLinks(links);
  if (linkError) {
    return Response.json({ error: linkError }, { status: 400 });
  }

  const competitor = createCompetitor(session.userId, {
    name: body.name,
    mainDomain: body.mainDomain,
    ...(body.logoUrl ? { logoUrl: body.logoUrl } : {}),
    links,
  });

  return Response.json(competitor, { status: 201 });
}
