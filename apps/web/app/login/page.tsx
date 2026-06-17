import { LoginPageClient } from "./login-page-client";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

function getSafeNextPath(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/onboarding";
  }

  if (nextPath.startsWith("/api/")) {
    return "/onboarding";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = getSafeNextPath((await searchParams).next);

  return <LoginPageClient nextPath={nextPath} />;
}
