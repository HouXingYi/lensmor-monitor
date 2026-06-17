"use client";

import { Alert, Button, Card, Col, Empty, Form, Input, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { type CompetitorLink, type CompetitorRecord, type ReportRecord, type TaskRecord } from "../../../lib/mvp-store";

const monitorIntervalMs = 60_000;

function getSecondsUntil(timestamp: number | null): number | null {
  if (!timestamp) return null;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

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

const statusColors: Record<CompetitorRecord["status"], string> = {
  monitoring: "green",
  paused: "default",
  collecting: "blue",
};

const taskStatusColors: Record<TaskRecord["status"], string> = {
  queued: "blue",
  collecting: "blue",
  diffing: "blue",
  analyzing: "blue",
  completed: "green",
  failed: "red",
};

const priorityColors: Record<ReportRecord["priority"], string> = {
  urgent: "red",
  medium: "blue",
  low: "default",
};

interface CollectionResponse {
  task: TaskRecord;
  report?: ReportRecord;
  llmTrace?: {
    input?: unknown;
    prompt?: {
      systemPrompt: string;
      userPrompt: string;
    };
    output?: unknown;
    error?: string;
    skippedReason?: string;
  };
}

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
  const [scheduledRunning, setScheduledRunning] = useState(false);
  const [lastScheduledAt, setLastScheduledAt] = useState<string | null>(null);
  const [secondsUntilNextRun, setSecondsUntilNextRun] = useState<number | null>(null);
  const scheduledInFlightRef = useRef(false);

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

  async function saveCompetitor() {
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

  function printLLMTrace(body: CollectionResponse) {
    console.groupCollapsed("[Lensmor Monitor] 手动刷新 liteLLM 输入/输出");
    console.log("liteLLM system prompt", body.llmTrace?.prompt?.systemPrompt ?? "liteLLM 未构造 system prompt");
    console.log("liteLLM user prompt", body.llmTrace?.prompt?.userPrompt ?? "liteLLM 未构造 user prompt");
    console.log("liteLLM input", body.llmTrace?.input ?? body.llmTrace?.skippedReason ?? "liteLLM 未被调用");
    console.log("liteLLM output", body.llmTrace?.output ?? body.llmTrace?.error ?? "无输出");
    console.groupEnd();
  }

  function applyTaskResult(body: CollectionResponse, successMessage: string) {
    setLatestTask(body.task);
    if (body.report) {
      setReports((current) => [body.report as ReportRecord, ...current]);
      setMessage(successMessage);
    } else {
      setMessage("采集已完成，本次没有值得生成报告的变化。");
    }
    router.refresh();
  }

  async function runCollection(triggerType: "manual" | "scheduled") {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitorId: competitor.id, triggerType }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? (triggerType === "manual" ? "手动刷新失败。" : "定时监控失败。"));
    }

    return (await response.json()) as CollectionResponse;
  }

  async function manualRefresh() {
    setError(null);
    setMessage(null);
    setRefreshing(true);

    try {
      const body = await runCollection("manual");
      printLLMTrace(body);
      applyTaskResult(body, "手动刷新已完成，并生成了一份报告。");
    } catch (error) {
      setError(error instanceof Error ? error.message : "手动刷新失败。");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (competitor.status !== "monitoring") {
      setSecondsUntilNextRun(null);
      return;
    }

    let nextRunAt = Date.now() + monitorIntervalMs;
    setSecondsUntilNextRun(getSecondsUntil(nextRunAt));

    const countdownId = window.setInterval(() => {
      setSecondsUntilNextRun(getSecondsUntil(nextRunAt));
    }, 1000);

    const intervalId = window.setInterval(() => {
      if (scheduledInFlightRef.current) return;
      scheduledInFlightRef.current = true;
      nextRunAt = Date.now() + monitorIntervalMs;
      setSecondsUntilNextRun(getSecondsUntil(nextRunAt));
      setScheduledRunning(true);
      runCollection("scheduled")
        .then((body) => {
          applyTaskResult(body, "定时监控已完成，并生成了一份报告。");
          setLastScheduledAt(new Date().toISOString());
        })
        .catch((error: unknown) => {
          setError(error instanceof Error ? error.message : "定时监控失败。");
        })
        .finally(() => {
          scheduledInFlightRef.current = false;
          setScheduledRunning(false);
        });
    }, monitorIntervalMs);

    return () => {
      window.clearInterval(countdownId);
      window.clearInterval(intervalId);
    };
  }, [competitor.id, competitor.status]);

  return (
    <Row gutter={[16, 16]}>
      <Col lg={16} xs={24}>
        <Card>
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Link href="/competitors">
              <Button>← 返回竞品列表</Button>
            </Link>

            <Space align="start" className="split-row">
              <Space orientation="vertical" size={0}>
                <Typography.Text type="secondary">竞品详情</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {competitor.name}
                </Typography.Title>
                <Typography.Text type="secondary">{competitor.mainDomain}</Typography.Text>
              </Space>
              <Tag color={statusColors[competitor.status]}>{statusLabels[competitor.status]}</Tag>
            </Space>

            <Space wrap>
              <Button onClick={toggleStatus}>{competitor.status === "paused" ? "恢复监控" : "暂停监控"}</Button>
              <Button disabled={competitor.status === "paused"} loading={refreshing} onClick={manualRefresh} type="primary">
                手动刷新
              </Button>
            </Space>

            <Typography.Text type="secondary">
              {competitor.status === "paused"
                ? "定时监控已暂停。"
                : `定时监控每 ${monitorIntervalMs / 1000} 秒采集一次 mock 页面。${
                    scheduledRunning
                      ? "本轮采集中..."
                      : lastScheduledAt
                        ? `上次采集：${new Date(lastScheduledAt).toLocaleString("zh-CN")}。`
                        : ""
                  }${
                    !scheduledRunning && secondsUntilNextRun !== null
                      ? `下次采集约 ${secondsUntilNextRun} 秒后。`
                      : ""
                  }`}
            </Typography.Text>

            {latestTask ? (
              <Alert
                description={
                  latestTask.failureReason ??
                  (latestTask.reportId ? `已生成报告：${latestTask.reportId}` : "未生成报告。")
                }
                title={<><Tag color={taskStatusColors[latestTask.status]}>{taskStatusLabels[latestTask.status]}</Tag> 最新任务</>}
                showIcon
                type={latestTask.status === "failed" ? "error" : latestTask.status === "completed" ? "success" : "info"}
              />
            ) : (
              <Alert description="点击手动刷新，生成第一份分析报告。" title="暂无采集任务" showIcon type="info" />
            )}

            {message ? <Alert title={message} showIcon type="success" /> : null}
            {error ? <Alert title={error} showIcon type="error" /> : null}

            <Form layout="vertical" onFinish={saveCompetitor}>
              <Row gutter={16}>
                <Col md={12} xs={24}>
                  <Form.Item label="名称" required>
                    <Input onChange={(event) => setName(event.target.value)} value={name} />
                  </Form.Item>
                </Col>
                <Col md={12} xs={24}>
                  <Form.Item label="主域名" required>
                    <Input onChange={(event) => setMainDomain(event.target.value)} value={mainDomain} />
                  </Form.Item>
                </Col>
              </Row>

              <Card size="small" title="关联链接">
                <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                  {links.length > 0 ? (
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      {links.map((link, index) => (
                        <Card key={`${link.label}-${link.url}`} size="small">
                          <Space align="start" className="split-row">
                            <Space orientation="vertical" size={4}>
                              <Typography.Text strong>{link.label}</Typography.Text>
                              <Typography.Text type="secondary">{link.url}</Typography.Text>
                            </Space>
                            <Button
                              danger
                              onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              type="link"
                            >
                              移除
                            </Button>
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  ) : (
                    <Empty description="暂无链接，可以添加价格页、产品页或更新日志页用于追踪。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                  <Row align="bottom" gutter={12}>
                    <Col md={10} xs={24}>
                      <Form.Item label="名称">
                        <Input onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} />
                      </Form.Item>
                    </Col>
                    <Col md={10} xs={24}>
                      <Form.Item label="URL">
                        <Input onChange={(event) => setLinkUrl(event.target.value)} value={linkUrl} />
                      </Form.Item>
                    </Col>
                    <Col md={4} xs={24}>
                      <Button block onClick={addLink}>
                        添加链接
                      </Button>
                    </Col>
                  </Row>
                </Space>
              </Card>

              <div className="form-actions">
                <Button htmlType="submit" loading={saving} type="primary">
                  保存竞品
                </Button>
              </div>
            </Form>
          </Space>
        </Card>
      </Col>

      <Col lg={8} xs={24}>
        <Card
          extra={
            <Link href={`/inbox?competitorId=${competitor.id}`}>
              <Button>筛选收件箱</Button>
            </Link>
          }
          title="最新情报"
        >
          {reports.length > 0 ? (
            <Space orientation="vertical" size="small" style={{ width: "100%" }}>
              {reports.map((report) => (
                <Card key={report.id} size="small">
                  <Space orientation="vertical" size={4}>
                    <Tag color={priorityColors[report.priority]}>{priorityLabels[report.priority]}</Tag>
                    <Link href={`/reports/${report.id}`}>{report.title}</Link>
                    <Typography.Text type="secondary">{new Date(report.createdAt).toLocaleString("zh-CN")}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="执行一次手动刷新，采集模拟变化并生成第一份报告。" />
          )}
        </Card>
      </Col>
    </Row>
  );
}
