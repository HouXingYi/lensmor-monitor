"use client";

import { Space, Typography } from "antd";

import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="page-shell">
      <Space className="page-heading" orientation="vertical" size={8}>
        <Typography.Text className="page-kicker">工作台初始化</Typography.Text>
        <Typography.Title level={1}>设置 Lensmor Monitor</Typography.Title>
        <Typography.Paragraph type="secondary">
          填写你的角色、自有产品信息，并至少导入一个模拟竞品，
          让监控工作台能够生成更贴近业务语境的情报。
        </Typography.Paragraph>
      </Space>
      <OnboardingForm />
    </main>
  );
}
