"use client";

import { Button, Card, Descriptions, List, Space, Tag, Typography } from "antd";
import Link from "next/link";

import { type ReportRecord } from "../../../lib/mvp-store";
import { ReportFeedbackForm } from "./report-feedback-form";

interface ReportDetailClientProps {
  report: ReportRecord;
  competitor?: {
    id: string;
    name: string;
  };
}

const priorityLabels = {
  urgent: "紧急",
  medium: "中等",
  low: "低",
} as const;

const priorityColors = {
  urgent: "red",
  medium: "blue",
  low: "default",
} as const;

export function ReportDetailClient({ report, competitor }: ReportDetailClientProps) {
  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Space align="start" className="split-row">
            <Space orientation="vertical" size={4}>
              <Typography.Text type="secondary">分析报告</Typography.Text>
              <Typography.Title level={2} style={{ margin: 0 }}>
                {report.title}
              </Typography.Title>
              <Typography.Text type="secondary">{competitor ? competitor.name : "未知竞品"}</Typography.Text>
            </Space>
            <Tag color={priorityColors[report.priority]}>{priorityLabels[report.priority]}</Tag>
          </Space>

          <Descriptions
            bordered
            column={{ md: 2, xs: 1 }}
            items={[
              {
                key: "changedAt",
                label: "变化时间",
                children: new Date(report.changedAt).toLocaleString("zh-CN"),
              },
              {
                key: "source",
                label: "来源",
                children: (
                  <a href={report.sourceUrl} rel="noreferrer" target="_blank">
                    {report.sourceUrl}
                  </a>
                ),
              },
            ]}
          />

          <Card size="small" title="发生了什么变化">
            <List dataSource={Array.from(report.changeSummary)} renderItem={(item) => <List.Item>{item}</List.Item>} />
          </Card>

          <Card size="small" title="战略意图">
            <Typography.Paragraph>{report.strategicIntent}</Typography.Paragraph>
          </Card>

          <Card size="small" title="建议行动">
            <List dataSource={Array.from(report.recommendedActions)} renderItem={(item) => <List.Item>{item}</List.Item>} />
          </Card>

          <Space>
            <Link href="/inbox">
              <Button>返回收件箱</Button>
            </Link>
            {competitor ? (
              <Link href={`/competitors/${competitor.id}`}>
                <Button>打开竞品</Button>
              </Link>
            ) : null}
          </Space>
        </Space>
      </Card>
      <ReportFeedbackForm reportId={report.id} />
    </Space>
  );
}
