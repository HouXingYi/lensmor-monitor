import { requireSession } from "../../../lib/api-auth";
import { createCompetitor, saveProductProfile } from "../../../lib/mvp-store";

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
    return Response.json({ error: "Role is required" }, { status: 400 });
  }

  if (!hasRequiredProductFields(body.product)) {
    return Response.json({ error: "Product information is incomplete" }, { status: 400 });
  }

  if (!URL.canParse(body.product.url)) {
    return Response.json({ error: "Product URL is invalid" }, { status: 400 });
  }

  if (!body.competitors || body.competitors.length === 0) {
    return Response.json({ error: "At least one competitor is required" }, { status: 400 });
  }

  const invalidCompetitor = body.competitors.find((competitor) => !competitor.name || !competitor.mainDomain);
  if (invalidCompetitor) {
    return Response.json({ error: "Competitor name and domain are required" }, { status: 400 });
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

  return Response.json({ profile, competitors });
}
