import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasCompletedOnboarding, readSessionFromCookieHeader } from "./session";

export async function requirePageSession() {
  const cookieStore = await cookies();
  const session = await readSessionFromCookieHeader(cookieStore.toString());

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function hasCompletedOnboardingForPage(): Promise<boolean> {
  const cookieStore = await cookies();
  return hasCompletedOnboarding(cookieStore.toString());
}
