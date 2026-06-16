import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <div className="login-kicker">工作台初始化</div>
        <h1>设置 Lensmor Monitor</h1>
        <p>
          填写你的角色、自有产品信息，并至少导入一个模拟竞品，
          让监控工作台能够生成更贴近业务语境的情报。
        </p>
      </header>
      <OnboardingForm />
    </main>
  );
}
