import { clearOnboardingCookie, clearSessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie());
  headers.append("Set-Cookie", clearOnboardingCookie());

  return Response.json({ ok: true }, { headers });
}
