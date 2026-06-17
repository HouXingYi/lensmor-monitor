"use client";

import { Alert, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("demo@lensmor.local");
  const [password, setPassword] = useState("change-me");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("账号或密码不正确，请检查后重试。");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="邮箱" required>
        <Input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          size="large"
          type="email"
          value={email}
        />
      </Form.Item>
      <Form.Item label="密码" required>
        <Input.Password
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          size="large"
          value={password}
        />
      </Form.Item>
      {error ? <Alert title={error} showIcon style={{ marginBottom: 16 }} type="error" /> : null}
      <Button block htmlType="submit" loading={submitting} size="large" type="primary">
        登录
      </Button>
    </Form>
  );
}
