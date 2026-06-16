import { redirect } from "next/navigation";

import { hasCompletedOnboardingForPage, requirePageSession } from "../lib/page-session";

export default async function HomePage() {
  await requirePageSession();
  redirect((await hasCompletedOnboardingForPage()) ? "/competitors" : "/onboarding");
}
