"use client";

import { Alert, Button, Card, Checkbox, Col, Form, Input, Radio, Row, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roles = [
  "产品营销经理",
  "产品经理",
  "市场经理",
  "创始人",
  "投资人",
  "其他",
];

const recommendedCompetitors = [
  { id: "acme-ai", name: "Acme AI", mainDomain: "acme-ai.mock" },
  { id: "nova-stack", name: "Nova Stack", mainDomain: "nova-stack.mock" },
  { id: "orbit-crm", name: "Orbit CRM", mainDomain: "orbit-crm.mock" },
];

interface ProductFormState {
  name: string;
  url: string;
  oneLineDescription: string;
  targetAudience: string;
  coreSellingPoints: string;
  competitiveEdge: string;
  strategicGoal: string;
}

interface ManualCompetitor {
  name: string;
  mainDomain: string;
}

const initialProduct: ProductFormState = {
  name: "Lensmor",
  url: "https://lensmor.local",
  oneLineDescription: "AI 竞品监控工作台",
  targetAudience: "产品和市场团队",
  coreSellingPoints: "自动化监控、结构化报告、反馈闭环",
  competitiveEdge: "把竞品变化转化为可行动情报",
  strategicGoal: "验证 MVP，并持续监控高价值竞品动作",
};

function trimProduct(product: ProductFormState): ProductFormState {
  return {
    name: product.name.trim(),
    url: product.url.trim(),
    oneLineDescription: product.oneLineDescription.trim(),
    targetAudience: product.targetAudience.trim(),
    coreSellingPoints: product.coreSellingPoints.trim(),
    competitiveEdge: product.competitiveEdge.trim(),
    strategicGoal: product.strategicGoal.trim(),
  };
}

function isCompleteProduct(product: ProductFormState): boolean {
  return Object.values(product).every((value) => value.length > 0);
}

function hasValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function OnboardingForm() {
  const router = useRouter();
  const [role, setRole] = useState("产品经理");
  const [product, setProduct] = useState<ProductFormState>(initialProduct);
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>(["acme-ai"]);
  const [manualCompetitors, setManualCompetitors] = useState<ManualCompetitor[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualDomain, setManualDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateProductField(field: keyof ProductFormState, value: string) {
    setProduct((current) => ({ ...current, [field]: value }));
  }

  function addManualCompetitor() {
    const name = manualName.trim();
    const mainDomain = manualDomain.trim();

    if (!name || !mainDomain) {
      setError("手动添加竞品时，名称和主域名都必填。");
      return;
    }

    setManualCompetitors((current) => [...current, { name, mainDomain }]);
    setManualName("");
    setManualDomain("");
    setError(null);
  }

  function removeManualCompetitor(index: number) {
    setManualCompetitors((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit() {
    setError(null);

    const nextProduct = trimProduct(product);
    const competitors = [
      ...recommendedCompetitors
        .filter((competitor) => selectedCompetitorIds.includes(competitor.id))
        .map(({ name, mainDomain }) => ({ name, mainDomain })),
      ...manualCompetitors,
    ];

    if (!role) {
      setError("请选择一个角色。");
      return;
    }

    if (!isCompleteProduct(nextProduct)) {
      setError("请完整填写所有产品信息。");
      return;
    }

    if (!hasValidUrl(nextProduct.url)) {
      setError("请输入有效的产品 URL，需要包含 http:// 或 https://。");
      return;
    }

    if (competitors.length === 0) {
      setError("请选择或添加至少一个竞品。");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        product: nextProduct,
        competitors,
      }),
    });
    setSubmitting(false);

    if (response.status === 401) {
      router.replace("/login?next=/onboarding");
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "设置失败，请检查表单后重试。");
      return;
    }

    router.replace("/competitors");
    router.refresh();
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Card title="第 1 步，共 3 步：选择你的角色">
          <Radio.Group buttonStyle="solid" onChange={(event) => setRole(event.target.value as string)} value={role}>
            <Space wrap>
              {roles.map((option) => (
                <Radio.Button key={option} value={option}>
                  {option}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </Card>

        <Card title="第 2 步，共 3 步：填写自有产品信息">
          <Row gutter={16}>
            <Col md={12} xs={24}>
              <Form.Item label="产品名称" required>
                <Input onChange={(event) => updateProductField("name", event.target.value)} value={product.name} />
              </Form.Item>
            </Col>
            <Col md={12} xs={24}>
              <Form.Item label="产品 URL" required>
                <Input onChange={(event) => updateProductField("url", event.target.value)} type="url" value={product.url} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="一句话描述" required>
                <Input
                  onChange={(event) => updateProductField("oneLineDescription", event.target.value)}
                  value={product.oneLineDescription}
                />
              </Form.Item>
            </Col>
            <Col md={12} xs={24}>
              <Form.Item label="目标用户" required>
                <Input
                  onChange={(event) => updateProductField("targetAudience", event.target.value)}
                  value={product.targetAudience}
                />
              </Form.Item>
            </Col>
            <Col md={12} xs={24}>
              <Form.Item label="核心卖点" required>
                <Input
                  onChange={(event) => updateProductField("coreSellingPoints", event.target.value)}
                  value={product.coreSellingPoints}
                />
              </Form.Item>
            </Col>
            <Col md={12} xs={24}>
              <Form.Item label="竞争优势" required>
                <Input
                  onChange={(event) => updateProductField("competitiveEdge", event.target.value)}
                  value={product.competitiveEdge}
                />
              </Form.Item>
            </Col>
            <Col md={12} xs={24}>
              <Form.Item label="战略目标" required>
                <Input
                  onChange={(event) => updateProductField("strategicGoal", event.target.value)}
                  value={product.strategicGoal}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="第 3 步，共 3 步：导入竞品">
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Checkbox.Group
              onChange={(values) => setSelectedCompetitorIds(values.map(String))}
              value={selectedCompetitorIds}
            >
              <Row gutter={[12, 12]}>
                {recommendedCompetitors.map((competitor) => (
                  <Col md={8} xs={24} key={competitor.id}>
                    <Checkbox value={competitor.id}>
                      <Space orientation="vertical" size={0}>
                        <Typography.Text strong>{competitor.name}</Typography.Text>
                        <Typography.Text type="secondary">{competitor.mainDomain}</Typography.Text>
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>

            <Card size="small" title="手动添加">
              <Row align="bottom" gutter={12}>
                <Col md={10} xs={24}>
                  <Form.Item label="名称">
                    <Input onChange={(event) => setManualName(event.target.value)} value={manualName} />
                  </Form.Item>
                </Col>
                <Col md={10} xs={24}>
                  <Form.Item label="主域名">
                    <Input onChange={(event) => setManualDomain(event.target.value)} value={manualDomain} />
                  </Form.Item>
                </Col>
                <Col md={4} xs={24}>
                  <Button block onClick={addManualCompetitor}>
                    添加
                  </Button>
                </Col>
              </Row>
              {manualCompetitors.length > 0 ? (
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  {manualCompetitors.map((competitor, index) => (
                    <Card key={`${competitor.name}-${competitor.mainDomain}`} size="small">
                      <Space align="start" className="split-row">
                        <Space orientation="vertical" size={4}>
                          <Typography.Text strong>{competitor.name}</Typography.Text>
                          <Typography.Text type="secondary">{competitor.mainDomain}</Typography.Text>
                        </Space>
                        <Button danger onClick={() => removeManualCompetitor(index)} type="link">
                          移除
                        </Button>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : null}
            </Card>
          </Space>
        </Card>

        {error ? <Alert title={error} showIcon type="error" /> : null}

        <div className="form-actions">
          <Button htmlType="submit" loading={submitting} size="large" type="primary">
            完成设置
          </Button>
        </div>
      </Space>
    </Form>
  );
}
