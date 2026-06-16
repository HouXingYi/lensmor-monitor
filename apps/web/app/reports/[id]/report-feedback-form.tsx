"use client";

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
    <section className="panel feedback-panel">
      <span className="eyebrow">反馈</span>
      <h2>这份报告有帮助吗？</h2>
      <p className="muted-text">
        你的反馈会帮助系统判断哪些竞品变化更值得进入高价值情报。
      </p>

      <div className="feedback-actions">
        <button disabled={Boolean(submitting)} onClick={() => submitFeedback("useful")} type="button">
          {submitting === "useful" ? "保存中..." : "有帮助"}
        </button>
        <button disabled={Boolean(submitting)} onClick={() => submitFeedback("not_important")} type="button">
          {submitting === "not_important" ? "保存中..." : "不重要"}
        </button>
      </div>

      <div className="wrong-feedback">
        <label>
          <span>错误原因</span>
          <select onChange={(event) => setWrongReason(event.target.value as WrongReason | "")} value={wrongReason}>
            <option value="">请选择原因</option>
            {wrongReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>
        <button disabled={Boolean(submitting)} onClick={() => submitFeedback("wrong")} type="button">
          {submitting === "wrong" ? "保存中..." : "错误"}
        </button>
      </div>

      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="onboarding-error">{error}</div> : null}
    </section>
  );
}
