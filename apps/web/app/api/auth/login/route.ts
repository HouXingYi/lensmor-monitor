import {
  createSessionCookie,
  createSingleUserPrincipal,
  validateCredentials,
} from "../../../../lib/session";

export const runtime = "nodejs";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const email = body.email ?? "";
  const password = body.password ?? "";

  if (!validateCredentials(email, password)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookie = await createSessionCookie(createSingleUserPrincipal(email));

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": cookie,
      },
    },
  );
}
