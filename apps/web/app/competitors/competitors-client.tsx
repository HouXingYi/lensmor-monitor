"use client";

import { Alert, Button, Card, Col, Empty, Form, Input, Modal, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { type CompetitorLink, type CompetitorRecord } from "../../lib/mvp-store";

const monitorIntervalMs = 60_000;

interface MockCompetitorPreset {
  id: string;
  name: string;
  mainDomain: string;
  description: string;
  links: CompetitorLink[];
}

const mockCompetitorPresets: MockCompetitorPreset[] = [
  {
    id: "acme-pricing",
    name: "Acme AI",
    mainDomain: "acme-ai.mock",
    description: "定价页：CTA、价格和页脚噪音变化",
    links: [{ label: "Pricing", url: "https://acme-ai.mock/pricing" }],
  },
  {
    id: "acme-product",
    name: "Acme AI Product",
    mainDomain: "acme-ai-product.mock",
    description: "产品页：新功能发布变化",
    links: [{ label: "Product", url: "https://acme-ai.mock/product" }],
  },
  {
    id: "nova-home",
    name: "Nova Stack",
    mainDomain: "nova-stack.mock",
    description: "首页：布局和首屏文案变化",
    links: [{ label: "Home", url: "https://nova-stack.mock" }],
  },
];

const statusLabels: Record<CompetitorRecord["status"], string> = {
  monitoring: "监控中",
  paused: "已暂停",
  collecting: "采集中",
};

const statusColors: Record<CompetitorRecord["status"], string> = {
  monitoring: "green",
  paused: "default",
  collecting: "blue",
};

export function CompetitorsClient({ initialCompetitors }: { initialCompetitors: CompetitorRecord[] }) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [name, setName] = useState("");
  const [mainDomain, setMainDomain] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monitorMessage, setMonitorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const scheduledInFlightRef = useRef(false);

  async function createCompetitor() {
    setError(null);

    const payload = {
      name: name.trim(),
      mainDomain: mainDomain.trim(),
      links:
        mockCompetitorPresets.find((preset) => preset.id === selectedPresetId)?.links ??
        ([] satisfies CompetitorLink[]),
    };

    if (!payload.name || !payload.mainDomain) {
      setError("竞品名称和主域名都必填。");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "创建竞品失败。");
      return;
    }

    const created = (await response.json()) as CompetitorRecord;
    setCompetitors((current) => [created, ...current]);
    setName("");
    setMainDomain("");
    setSelectedPresetId(null);
    router.refresh();
  }

  function applyPreset(preset: MockCompetitorPreset) {
    setName(preset.name);
    setMainDomain(preset.mainDomain);
    setSelectedPresetId(preset.id);
    setPresetModalOpen(false);
    setError(null);
  }

  async function updateStatus(competitor: CompetitorRecord) {
    const nextStatus = competitor.status === "paused" ? "monitoring" : "paused";
    const response = await fetch(`/api/competitors/${competitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "更新竞品失败。");
      return;
    }

    const updated = (await response.json()) as CompetitorRecord;
    setCompetitors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    router.refresh();
  }

  async function deleteCompetitor(competitorId: string) {
    const response = await fetch(`/api/competitors/${competitorId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "删除竞品失败。");
      return;
    }

    setCompetitors((current) => current.filter((competitor) => competitor.id !== competitorId));
    router.refresh();
  }

  useEffect(() => {
    if (!competitors.some((competitor) => competitor.status === "monitoring")) return;

    const intervalId = window.setInterval(() => {
      if (scheduledInFlightRef.current) return;
      scheduledInFlightRef.current = true;
      fetch("/api/tasks/scheduled", { method: "POST" })
        .then(async (response) => {
          const body = (await response.json().catch(() => ({}))) as { checked?: number; skipped?: number; error?: string };
          if (!response.ok) {
            throw new Error(body.error ?? "定时监控失败。");
          }
          setMonitorMessage(`定时监控完成：采集 ${body.checked ?? 0} 个，跳过 ${body.skipped ?? 0} 个。`);
          router.refresh();
        })
        .catch((error: unknown) => {
          setMonitorMessage(error instanceof Error ? error.message : "定时监控失败。");
        })
        .finally(() => {
          scheduledInFlightRef.current = false;
        });
    }, monitorIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [competitors, router]);

  return (
    <Row gutter={[16, 16]}>
      <Col lg={16} xs={24}>
        <Card
          extra={
            <Link href="/inbox">
              <Button>打开收件箱</Button>
            </Link>
          }
          title={
            <Space orientation="vertical" size={0}>
              <Typography.Text type="secondary">竞品</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0 }}>
                监控工作台
              </Typography.Title>
              <Typography.Text type="secondary">监控中竞品会每 {monitorIntervalMs / 1000} 秒自动采集一次页面。</Typography.Text>
            </Space>
          }
        >
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            {monitorMessage ? <Alert title={monitorMessage} showIcon type="success" /> : null}
            {competitors.length > 0 ? (
              <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                {competitors.map((competitor) => (
                  <Card key={competitor.id} size="small">
                    <Space align="start" className="split-row">
                      <Space orientation="vertical" size={4}>
                        <Space>
                          <Link href={`/competitors/${competitor.id}`}>{competitor.name}</Link>
                          <Tag color={statusColors[competitor.status]}>{statusLabels[competitor.status]}</Tag>
                        </Space>
                        <Typography.Text type="secondary">{competitor.mainDomain}</Typography.Text>
                      </Space>
                      <Space wrap>
                        <Link href={`/competitors/${competitor.id}`}>查看详情</Link>
                        <Button onClick={() => updateStatus(competitor)} size="small">
                          {competitor.status === "paused" ? "恢复" : "暂停"}
                        </Button>
                        <Button danger onClick={() => deleteCompetitor(competitor.id)} size="small">
                          删除
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                ))}
              </Space>
            ) : (
              <Empty description="还没有竞品，添加至少一个竞品后即可开始监控网站变化。" />
            )}
          </Space>
        </Card>
      </Col>

      <Col lg={8} xs={24}>
        <Card
          extra={<Button onClick={() => setPresetModalOpen(true)}>选择竞品</Button>}
          title="添加竞品"
        >
          <Form layout="vertical" onFinish={createCompetitor}>
            <Form.Item label="名称" required>
              <Input
                onChange={(event) => {
                  setName(event.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder="Orbit CRM"
                value={name}
              />
            </Form.Item>
            <Form.Item label="主域名" required>
              <Input
                onChange={(event) => {
                  setMainDomain(event.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder="orbit-crm.mock"
                value={mainDomain}
              />
            </Form.Item>
            {error ? <Alert title={error} showIcon style={{ marginBottom: 16 }} type="error" /> : null}
            <Button block htmlType="submit" loading={submitting} type="primary">
              + 添加竞品
            </Button>
          </Form>
        </Card>
      </Col>

      <Modal
        footer={null}
        onCancel={() => setPresetModalOpen(false)}
        open={presetModalOpen}
        title="选择一个竞品"
      >
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          {mockCompetitorPresets.map((preset) => (
            <Card key={preset.id} size="small">
              <Space align="start" className="split-row">
                <Space orientation="vertical" size={4}>
                  <Typography.Text strong>{preset.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {preset.mainDomain} · {preset.description}
                  </Typography.Text>
                </Space>
                <Button onClick={() => applyPreset(preset)} type={selectedPresetId === preset.id ? "primary" : "default"}>
                  选择并填入
                </Button>
              </Space>
            </Card>
          ))}
        </Space>
      </Modal>
    </Row>
  );
}
