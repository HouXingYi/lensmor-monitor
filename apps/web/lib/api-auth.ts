import { readSessionFromCookieHeader } from "./session";

export async function requireSession(request: Request) {
  const session = await readSessionFromCookieHeader(request.headers.get("cookie"));

  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "Authentication required" }, { status: 401 }),
    } as const;
  }

  return { session, response: null } as const;
}
