"use client";

import { Button, Card, Form, Input, Select, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface InboxFilterCompetitor {
  id: string;
  name: string;
}

interface InboxFiltersProps {
  competitors: InboxFilterCompetitor[];
  initialValues: {
    competitorId?: string;
    priority?: string;
    from?: string;
    to?: string;
  };
}

export function InboxFilters({ competitors, initialValues }: InboxFiltersProps) {
  const router = useRouter();
  const [competitorId, setCompetitorId] = useState(initialValues.competitorId ?? "");
  const [priority, setPriority] = useState(initialValues.priority ?? "");
  const [from, setFrom] = useState(initialValues.from ?? "");
  const [to, setTo] = useState(initialValues.to ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (competitorId) params.set("competitorId", competitorId);
    if (priority) params.set("priority", priority);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(params.size > 0 ? `/inbox?${params.toString()}` : "/inbox");
  }

  function resetFilters() {
    setCompetitorId("");
    setPriority("");
    setFrom("");
    setTo("");
    router.push("/inbox");
  }

  return (
    <Card title="筛选条件">
      <Form layout="vertical" onFinish={applyFilters}>
        <Form.Item label="竞品">
          <Select
            onChange={setCompetitorId}
            options={[
              { label: "全部竞品", value: "" },
              ...competitors.map((competitor) => ({ label: competitor.name, value: competitor.id })),
            ]}
            value={competitorId}
          />
        </Form.Item>
        <Form.Item label="优先级">
          <Select
            onChange={setPriority}
            options={[
              { label: "全部优先级", value: "" },
              { label: "紧急", value: "urgent" },
              { label: "中等", value: "medium" },
              { label: "低", value: "low" },
            ]}
            value={priority}
          />
        </Form.Item>
        <Form.Item label="开始日期">
          <Input onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
        </Form.Item>
        <Form.Item label="结束日期">
          <Input onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </Form.Item>
        <Space style={{ width: "100%" }}>
          <Button htmlType="submit" type="primary">
            应用筛选
          </Button>
          <Button onClick={resetFilters}>重置</Button>
        </Space>
      </Form>
    </Card>
  );
}
