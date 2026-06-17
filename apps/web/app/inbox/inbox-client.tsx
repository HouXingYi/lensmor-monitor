"use client";

import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";

import { type ReportPriority } from "@lensmor/domain";

import { type ReportRecord } from "../../lib/mvp-store";
import { InboxFilters } from "./inbox-filters";

interface InboxClientCompetitor {
  id: string;
  name: string;
}

interface InboxClientReport extends ReportRecord {
  competitorName: string;
  read: boolean;
}

interface InboxClientProps {
  competitors: InboxClientCompetitor[];
  reports: InboxClientReport[];
  initialFilters: {
    competitorId?: string;
    priority?: string;
    from?: string;
    to?: string;
  };
}

const priorityLabels: Record<ReportPriority, string> = {
  urgent: "紧急",
  medium: "中等",
  low: "低",
};

const priorityColors: Record<ReportPriority, string> = {
  urgent: "red",
  medium: "blue",
  low: "default",
};

export function InboxClient({ competitors, reports, initialFilters }: InboxClientProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col lg={16} xs={24}>
        <Card
          extra={
            <Link href="/competitors">
              <Button>竞品</Button>
            </Link>
          }
          title={
            <Space orientation="vertical" size={0}>
              <Typography.Text type="secondary">情报收件箱</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0 }}>
                分析报告
              </Typography.Title>
              <Typography.Text type="secondary">按竞品、优先级和日期范围筛选报告。</Typography.Text>
            </Space>
          }
        >
          {reports.length > 0 ? (
            <Space orientation="vertical" size="small" style={{ width: "100%" }}>
              {reports.map((report) => (
                <Card key={report.id} size="small">
                  <Space orientation="vertical" size={6}>
                    <Space wrap>
                      <Tag color={priorityColors[report.priority]}>{priorityLabels[report.priority]}</Tag>
                      <Tag>{report.competitorName}</Tag>
                      <Tag color={report.read ? "default" : "gold"}>{report.read ? "已读" : "未读"}</Tag>
                    </Space>
                    <Link href={`/reports/${report.id}`}>{report.title}</Link>
                    <Typography.Text type="secondary">{report.strategicIntent}</Typography.Text>
                    <Typography.Text type="secondary">{new Date(report.createdAt).toLocaleString("zh-CN")}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="可以从竞品详情页执行手动刷新，或清空筛选条件查看全部报告。">
              <Link href="/inbox">
                <Button>清空筛选</Button>
              </Link>
            </Empty>
          )}
        </Card>
      </Col>

      <Col lg={8} xs={24}>
        <InboxFilters competitors={competitors} initialValues={initialFilters} />
      </Col>
    </Row>
  );
}
