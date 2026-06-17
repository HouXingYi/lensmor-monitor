"use client";

import { Alert, Button, Card, Form, Select, Space, Typography } from "antd";
import { useState } from "react";

import { type FeedbackType, type WrongReason } from "../../../lib/mvp-store";

const wrongReasons: Array<{ value: WrongReason; label: string }> = [
  { value: "information_inaccurate", label: "信息不准确" },
  { value: "content_irrelevant", label: "内容不相关" },
  { value: "data_outdated", label: "数据已过期" },
  { value: "duplicate_information", label: "信息重复" },
  { value: "strategic_intent_wrong", label: "战略意图判断错误" },
  { value: "missing_key_change", label: "遗漏关键变化" },
  { value: "too_noisy", label: "噪音太多" },
  { value: "source_data_inaccurate", label: "来源数据不准确" },
];

export function ReportFeedbackForm({ reportId }: { reportId: string }) {
  const [wrongReason, setWrongReason] = useState<WrongReason | "">("");
  const [submitting, setSubmitting] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback(type: FeedbackType) {
    setError(null);
    setMessage(null);

    if (type === "wrong" && !wrongReason) {
      setError("提交“错误”反馈前，请先选择原因。");
      return;
    }

    setSubmitting(type);
    const response = await fetch(`/api/reports/${reportId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ...(type === "wrong" ? { wrongReason } : {}),
      }),
    });
    setSubmitting(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "提交反馈失败。");
      return;
    }

    setMessage("反馈已保存，感谢你帮助优化报告闭环。");
  }

  return (
    <Card title="反馈">
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          这份报告有帮助吗？
        </Typography.Title>
        <Typography.Text type="secondary">
          你的反馈会帮助系统判断哪些竞品变化更值得进入高价值情报。
        </Typography.Text>

        <Space wrap>
          <Button loading={submitting === "useful"} onClick={() => submitFeedback("useful")}>
            有帮助
          </Button>
          <Button loading={submitting === "not_important"} onClick={() => submitFeedback("not_important")}>
            不重要
          </Button>
        </Space>

        <Form layout="vertical" onFinish={() => submitFeedback("wrong")}>
          <Form.Item label="错误原因">
            <Select
              onChange={(value) => setWrongReason(value as WrongReason | "")}
              options={[{ label: "请选择原因", value: "" }, ...wrongReasons]}
              value={wrongReason}
            />
          </Form.Item>
          <Button danger htmlType="submit" loading={submitting === "wrong"}>
            错误
          </Button>
        </Form>

        {message ? <Alert message={message} showIcon type="success" /> : null}
        {error ? <Alert message={error} showIcon type="error" /> : null}
      </Space>
    </Card>
  );
}
