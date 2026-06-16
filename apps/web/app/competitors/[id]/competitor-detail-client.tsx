"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { type CompetitorLink, type CompetitorRecord, type ReportRecord, type TaskRecord } from "../../../lib/mvp-store";

const statusLabels: Record<CompetitorRecord["status"], string> = {
  monitoring: "监控中",
  paused: "已暂停",
  collecting: "采集中",
};

const taskStatusLabels: Record<TaskRecord["status"], string> = {
  queued: "排队中",
  collecting: "采集中",
  diffing: "分析差异中",
  analyzing: "生成报告中",
  completed: "已完成",
  failed: "失败",
};

const priorityLabels: Record<ReportRecord["priority"], string> = {
  urgent: "紧急",
  medium: "中等",
  low: "低",
};

export function CompetitorDetailClient({
  initialCompetitor,
  initialReports,
  initialTask,
}: {
  initialCompetitor: CompetitorRecord;
  initialReports: ReportRecord[];
  initialTask?: TaskRecord;
}) {
  const router = useRouter();
  const [competitor, setCompetitor] = useState(initialCompetitor);
  const [reports, setReports] = useState(initialReports);
  const [latestTask, setLatestTask] = useState<TaskRecord | undefined>(initialTask);
  const [name, setName] = useState(initialCompetitor.name);
  const [mainDomain, setMainDomain] = useState(initialCompetitor.mainDomain);
  const [links, setLinks] = useState<CompetitorLink[]>(initialCompetitor.links);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function addLink() {
    const label = linkLabel.trim();
    const url = linkUrl.trim();

    if (!label || !url) {
      setError("关联链接需要填写名称和 URL。");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("关联链接 URL 需要包含 http:// 或 https://。");
      return;
    }

    if (links.length >= 10) {
      setError("每个竞品最多只能添加 10 条关联链接。");
      return;
    }

    setLinks((current) => [...current, { label, url }]);
    setLinkLabel("");
    setLinkUrl("");
    setError(null);
  }

  async function saveCompetitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    setSaving(true);
    const response = await fetch(`/api/competitors/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        mainDomain: mainDomain.trim(),
        links,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "保存竞品失败。");
      return;
    }

    const updated = (await response.json()) as CompetitorRecord;
    setCompetitor(updated);
    setMessage("竞品已保存。");
    router.refresh();
  }

  async function toggleStatus() {
    setError(null);
    setMessage(null);
    const nextStatus = competitor.status === "paused" ? "monitoring" : "paused";
    const response = await fetch(`/api/competitors/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "更新状态失败。");
      return;
    }

    const updated = (await response.json()) as CompetitorRecord;
    setCompetitor(updated);
    setMessage(nextStatus === "paused" ? "监控已暂停。" : "监控已恢复。");
    router.refresh();
  }

  async function manualRefresh() {
    setError(null);
    setMessage(null);
    setRefreshing(true);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitorId: competitor.id, triggerType: "manual" }),
    });
    setRefreshing(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "手动刷新失败。");
      return;
    }

    const body = (await response.json()) as { task: TaskRecord; report?: ReportRecord };
    setLatestTask(body.task);
    if (body.report) {
      setReports((current) => [body.report as ReportRecord, ...current]);
      setMessage("手动刷新已完成，并生成了一份报告。");
    } else {
      setMessage("手动刷新已完成，本次没有值得生成报告的变化。");
    }
    router.refresh();
  }

  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">竞品详情</span>
            <h1>{competitor.name}</h1>
            <p>{competitor.mainDomain}</p>
          </div>
          <span className={`status-pill status-${competitor.status}`}>{statusLabels[competitor.status]}</span>
        </div>

        <div className="toolbar">
          <button className="secondary-button" onClick={toggleStatus} type="button">
            {competitor.status === "paused" ? "恢复监控" : "暂停监控"}
          </button>
          <button className="login-button" disabled={refreshing || competitor.status === "paused"} onClick={manualRefresh} type="button">
            {refreshing ? "刷新中..." : "手动刷新"}
          </button>
        </div>

        {latestTask ? (
          <div className={`task-banner task-${latestTask.status}`}>
            <strong>最新任务：{taskStatusLabels[latestTask.status]}</strong>
            <span>
              {latestTask.failureReason ??
                (latestTask.reportId ? `已生成报告：${latestTask.reportId}` : "未生成报告。")}
            </span>
          </div>
        ) : (
          <div className="task-banner">
            <strong>暂无采集任务</strong>
            <span>点击手动刷新，生成第一份分析报告。</span>
          </div>
        )}

        {message ? <div className="success-message">{message}</div> : null}
        {error ? <div className="onboarding-error">{error}</div> : null}

        <form className="stack-form" onSubmit={saveCompetitor}>
          <label>
            <span>名称</span>
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            <span>主域名</span>
            <input onChange={(event) => setMainDomain(event.target.value)} required value={mainDomain} />
          </label>

          <div className="link-editor">
            <h2>关联链接</h2>
            {links.length > 0 ? (
              <ul className="manual-list">
                {links.map((link, index) => (
                  <li key={`${link.label}-${link.url}`}>
                    <span>
                      {link.label} <small>{link.url}</small>
                    </span>
                    <button onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">暂无链接。可以添加价格页、产品页或更新日志页用于追踪。</p>
            )}
            <div className="manual-row">
              <label>
                <span>名称</span>
                <input onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} />
              </label>
              <label>
                <span>URL</span>
                <input onChange={(event) => setLinkUrl(event.target.value)} value={linkUrl} />
              </label>
              <button className="secondary-button" onClick={addLink} type="button">
                添加链接
              </button>
            </div>
          </div>

          <button className="login-button" disabled={saving} type="submit">
            {saving ? "保存中..." : "保存竞品"}
          </button>
        </form>
      </section>

      <aside className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">最新情报</span>
            <h2>报告</h2>
          </div>
          <Link className="secondary-link" href={`/inbox?competitorId=${competitor.id}`}>
            筛选收件箱
          </Link>
        </div>

        {reports.length > 0 ? (
          <div className="report-list">
            {reports.map((report) => (
              <Link className="report-card" href={`/reports/${report.id}`} key={report.id}>
                <span className={`priority priority-${report.priority}`}>{priorityLabels[report.priority]}</span>
                <strong>{report.title}</strong>
                <small>{new Date(report.createdAt).toLocaleString("zh-CN")}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>暂无报告</h2>
            <p>执行一次手动刷新，采集模拟变化并生成第一份报告。</p>
          </div>
        )}
      </aside>
    </div>
  );
}
