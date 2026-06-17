"use client";

import { Button, Card, Descriptions, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { type ReactNode } from "react";

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

function ReportInsightCard({
  children,
  title,
  tone,
}: {
  children: ReactNode;
  title: string;
  tone: "change" | "strategy" | "action";
}) {
  return (
    <Card
      className={`report-insight-card report-insight-card-${tone}`}
      size="small"
      title={
        <span className="report-insight-title">
          <span aria-hidden className="report-insight-marker" />
          {title}
        </span>
      }
    >
      {children}
    </Card>
  );
}

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

          <ReportInsightCard title="发生了什么变化" tone="change">
            <ul className="report-insight-list">
              {Array.from(report.changeSummary).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportInsightCard>

          <ReportInsightCard title="战略意图" tone="strategy">
            <Typography.Paragraph className="report-insight-paragraph">{report.strategicIntent}</Typography.Paragraph>
          </ReportInsightCard>

          <ReportInsightCard title="建议行动" tone="action">
            <ul className="report-insight-list">
              {Array.from(report.recommendedActions).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportInsightCard>

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
