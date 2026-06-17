"use client";

import { Card, Col, Row, Space, Typography } from "antd";

import { LoginForm } from "./login-form";

export function LoginPageClient({ nextPath }: { nextPath: string }) {
  return (
    <main className="auth-page">
      <Row align="middle" className="auth-row" gutter={[32, 32]}>
        <Col lg={14} xs={24}>
          <Space orientation="vertical" size="large">
            <Typography.Text className="page-kicker">竞品情报 MVP</Typography.Text>
            <Typography.Title className="hero-title">在竞品动作变成风险之前，先一步发现它。</Typography.Title>
            <Typography.Paragraph className="hero-subtitle">
              Lensmor Monitor 会把模拟竞品网站变化整理成结构化分析报告，
              帮助产品团队快速判断发生了什么、为什么重要，以及下一步怎么做。
            </Typography.Paragraph>
          </Space>
        </Col>
        <Col lg={10} xs={24}>
          <Card className="auth-card" title="欢迎回来" variant="borderless">
            <Typography.Paragraph type="secondary">登录后进入你的竞品监控工作台。</Typography.Paragraph>
            <LoginForm nextPath={nextPath} />
            <div className="login-hint">
              本地演示账号：
              <br />
              <code>demo@lensmor.local</code> / <code>change-me</code>
            </div>
          </Card>
        </Col>
      </Row>
    </main>
  );
}
