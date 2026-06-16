import { requireSession } from "../../../../lib/api-auth";

export const runtime = "nodejs";

interface RouteContext {
  params: { id: string } | Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { response } = await requireSession(request);
  if (response) return response;

  const { id } = await context.params;

  return Response.json({
    id,
    status: "queued",
  });
}
