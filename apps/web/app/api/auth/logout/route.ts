import { clearSessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}
