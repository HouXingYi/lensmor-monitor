import { requireSession } from "../../../lib/api-auth";
import { createCompetitor, saveProductProfile } from "../../../lib/mvp-store";
import { createOnboardingCookie } from "../../../lib/session";

export const runtime = "nodejs";

interface OnboardingBody {
  role?: string;
  product?: {
    name?: string;
    url?: string;
    oneLineDescription?: string;
    targetAudience?: string;
    coreSellingPoints?: string;
    competitiveEdge?: string;
    strategicGoal?: string;
  };
  competitors?: Array<{
    name?: string;
    mainDomain?: string;
    logoUrl?: string;
  }>;
}

function hasRequiredProductFields(product: OnboardingBody["product"]): product is Required<NonNullable<OnboardingBody["product"]>> {
  return Boolean(
    product?.name &&
      product.url &&
      product.oneLineDescription &&
      product.targetAudience &&
      product.coreSellingPoints &&
      product.competitiveEdge &&
      product.strategicGoal,
  );
}

export async function POST(request: Request): Promise<Response> {
  const { session, response } = await requireSession(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as OnboardingBody;

  if (!body.role) {
    return Response.json({ error: "请选择角色。" }, { status: 400 });
  }

  if (!hasRequiredProductFields(body.product)) {
    return Response.json({ error: "产品信息不完整。" }, { status: 400 });
  }

  if (!URL.canParse(body.product.url)) {
    return Response.json({ error: "产品 URL 无效。" }, { status: 400 });
  }

  if (!body.competitors || body.competitors.length === 0) {
    return Response.json({ error: "请至少添加一个竞品。" }, { status: 400 });
  }

  const invalidCompetitor = body.competitors.find((competitor) => !competitor.name || !competitor.mainDomain);
  if (invalidCompetitor) {
    return Response.json({ error: "竞品名称和主域名都必填。" }, { status: 400 });
  }

  const profile = saveProductProfile({
    ownerId: session.userId,
    role: body.role,
    product: body.product,
  });
  const competitors = body.competitors.map((competitor) =>
    createCompetitor(session.userId, {
      name: competitor.name ?? "",
      mainDomain: competitor.mainDomain ?? "",
      ...(competitor.logoUrl ? { logoUrl: competitor.logoUrl } : {}),
      links: [],
    }),
  );

  return Response.json(
    { profile, competitors },
    {
      headers: {
        "Set-Cookie": createOnboardingCookie(),
      },
    },
  );
}
