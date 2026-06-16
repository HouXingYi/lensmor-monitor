import { LoginForm } from "./login-form";

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

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="login-kicker">竞品情报 MVP</div>
        <h1>在竞品动作变成风险之前，先一步发现它。</h1>
        <p>
          Lensmor Monitor 会把模拟竞品网站变化整理成结构化分析报告，
          帮助产品团队快速判断发生了什么、为什么重要，以及下一步怎么做。
        </p>
      </section>

      <section className="login-card-wrap" aria-label="登录表单">
        <div className="login-card">
          <h2>欢迎回来</h2>
          <p>登录后进入你的竞品监控工作台。</p>
          <LoginForm nextPath={nextPath} />
          <div className="login-hint">
            本地演示账号：
            <br />
            <code>demo@lensmor.local</code> / <code>change-me</code>
          </div>
        </div>
      </section>
    </main>
  );
}
