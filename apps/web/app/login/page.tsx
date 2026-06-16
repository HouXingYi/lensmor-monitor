import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

function getSafeNextPath(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  if (nextPath.startsWith("/api/")) {
    return "/";
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = getSafeNextPath((await searchParams).next);

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="login-kicker">Competitor Intelligence MVP</div>
        <h1>Track competitor moves before they become surprises.</h1>
        <p>
          Lensmor Monitor turns mock website changes into structured Analysis Reports,
          so product teams can review what changed, why it matters, and what to do next.
        </p>
      </section>

      <section className="login-card-wrap" aria-label="Sign in form">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to open your monitoring workspace.</p>
          <LoginForm nextPath={nextPath} />
          <div className="login-hint">
            Local demo account:
            <br />
            <code>demo@lensmor.local</code> / <code>change-me</code>
          </div>
        </div>
      </section>
    </main>
  );
}
