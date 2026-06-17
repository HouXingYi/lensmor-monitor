import { type DiffChangeType, type DiffScenario, type ExpectedDiff } from "@lensmor/domain";

export const MOCK_PAGE_REFRESH_INTERVAL_MS = 30_000;
export const MONITOR_INTERVAL_MS = 60_000;

export interface MockPageTarget {
  site: string;
  page: string;
}

export interface MockPageSnapshot extends MockPageTarget {
  snapshotId: string;
  sourceUrl: string;
  html: string;
  expectedDiff: ExpectedDiff[];
  updatedAt: string;
}

export interface CollectedMockSnapshot extends MockPageTarget {
  snapshotId: string;
  sourceUrl: string;
  expectedDiff: ExpectedDiff[];
  collectedAt: string;
}

interface MockPageContent {
  title: string;
  eyebrow: string;
  headline: string;
  subheading: string;
  primaryCta: string;
  secondaryCta: string;
  price: string;
  feature: string;
  audience: string;
  proof: string;
  integration: string;
  security: string;
  enterprise: string;
  promotion: string;
  layout: string;
  footer: string;
}

interface MockPageVariant {
  snapshotId: string;
  signature: string;
  content: MockPageContent;
  expectedDiff: ExpectedDiff[];
}

interface MockChangeTemplate {
  id: string;
  type: DiffChangeType;
  field: keyof MockPageContent;
  selector: string;
  options: string[];
  explainable: boolean;
}

interface MockPageDefinition extends MockPageTarget {
  sourceUrl: string;
  baseline: MockPageContent;
  changes: MockChangeTemplate[];
  noise: MockChangeTemplate[];
}

interface MockPageRuntime {
  pages: Map<string, MockPageSnapshot>;
  signatures: Map<string, string>;
  lastRotatedAt: number;
  timer?: ReturnType<typeof globalThis.setInterval>;
}

declare global {
  var __lensmorMockPageRuntime: MockPageRuntime | undefined;
}

const definitions: MockPageDefinition[] = [
  {
    site: "acme-ai",
    page: "pricing",
    sourceUrl: "https://acme-ai.mock/pricing",
    baseline: {
      title: "Acme AI Pricing",
      eyebrow: "Pricing update",
      headline: "Flexible AI research plans for growing product teams",
      subheading: "Monitor competitors, summarize changes, and route insights into your planning rhythm.",
      primaryCta: "Start free",
      secondaryCta: "Compare plans",
      price: "Starter $49/mo with 3 monitored competitors",
      feature: "Weekly AI summaries and keyword alerts",
      audience: "Built for product managers validating market movement",
      proof: "Trusted by 120 product teams",
      integration: "Export reports to Slack",
      security: "Standard workspace permissions",
      enterprise: "Enterprise plan available on request",
      promotion: "No launch promotion",
      layout: "Single-column pricing hero",
      footer: "Copyright 2025",
    },
    changes: [
      {
        id: "pricing-team-tier",
        type: "pricing",
        field: "price",
        selector: "[data-monitor-id='starter-price']",
        options: [
          "Starter $79/mo with 10 monitored competitors and daily refresh",
          "Team $99/mo adds unlimited battlecards and priority alerts",
          "Starter $59/mo now includes 5 tracked competitors",
        ],
        explainable: true,
      },
      {
        id: "cta-demo",
        type: "cta",
        field: "primaryCta",
        selector: "[data-monitor-id='primary-cta']",
        options: ["Book demo", "Talk to sales", "Get a custom walkthrough"],
        explainable: true,
      },
      {
        id: "copy-roi",
        type: "copy",
        field: "headline",
        selector: "[data-monitor-id='hero-copy']",
        options: [
          "Turn competitor moves into roadmap decisions within 24 hours",
          "Know which competitor changes deserve your product team's attention",
          "AI market monitoring for teams defending their category position",
        ],
        explainable: true,
      },
      {
        id: "audience-enterprise",
        type: "audience",
        field: "audience",
        selector: "[data-monitor-id='target-audience']",
        options: [
          "Built for enterprise PMM and strategy teams coordinating launches",
          "Designed for sales-led SaaS teams tracking category rivals",
          "Focused on product leaders managing multi-market expansion",
        ],
        explainable: true,
      },
      {
        id: "proof-expansion",
        type: "proof",
        field: "proof",
        selector: "[data-monitor-id='customer-proof']",
        options: [
          "Trusted by 320 product and growth teams",
          "Teams report 41% faster competitive response cycles",
          "Featured by category leaders in AI productivity and CRM",
        ],
        explainable: true,
      },
      {
        id: "integration-crm",
        type: "integration",
        field: "integration",
        selector: "[data-monitor-id='integration-list']",
        options: [
          "Sync reports to Slack, HubSpot, and Salesforce",
          "Push priority changes into Notion, Linear, and Salesforce",
          "New webhook API routes competitor changes into CRM workflows",
        ],
        explainable: true,
      },
      {
        id: "security-sso",
        type: "security",
        field: "security",
        selector: "[data-monitor-id='security-note']",
        options: [
          "SOC 2 controls, SSO, and audit logs are now included for Team plans",
          "Advanced permissions and audit exports added for regulated teams",
          "Private workspace mode added for confidential competitive programs",
        ],
        explainable: true,
      },
      {
        id: "promotion-limited",
        type: "promotion",
        field: "promotion",
        selector: "[data-monitor-id='promo-banner']",
        options: [
          "Launch offer: annual plans include 2 months free until Friday",
          "Limited beta bundle adds onboarding support for new Team accounts",
          "Q3 migration discount available for teams replacing manual research",
        ],
        explainable: true,
      },
    ],
    noise: [
      {
        id: "footer-year",
        type: "noise",
        field: "footer",
        selector: "[data-monitor-id='footer-year']",
        options: ["Copyright 2026", "Copyright 2026 Acme AI"],
        explainable: false,
      },
      {
        id: "eyebrow-copy",
        type: "noise",
        field: "eyebrow",
        selector: "[data-monitor-id='page-eyebrow']",
        options: ["Pricing refreshed", "Plans refreshed"],
        explainable: false,
      },
    ],
  },
  {
    site: "acme-ai",
    page: "product",
    sourceUrl: "https://acme-ai.mock/product",
    baseline: {
      title: "Acme AI Product",
      eyebrow: "Product workspace",
      headline: "Automated research workspace for product teams",
      subheading: "Capture competitor movement and convert raw page changes into product-ready briefs.",
      primaryCta: "Explore product",
      secondaryCta: "View examples",
      price: "Available on all paid plans",
      feature: "AI summaries for tracked competitor pages",
      audience: "Built for product managers and founders",
      proof: "Used across product discovery rituals",
      integration: "Connects with Slack",
      security: "Role-based workspace access",
      enterprise: "Enterprise onboarding available",
      promotion: "New workspace templates included",
      layout: "Feature cards below a centered hero",
      footer: "Last updated May 2026",
    },
    changes: [
      {
        id: "feature-battlecard",
        type: "feature",
        field: "feature",
        selector: "[data-monitor-id='feature-list']",
        options: [
          "New AI battlecard generator turns competitor changes into sales enablement notes",
          "Launch radar now clusters product, pricing, and positioning changes into themes",
          "Roadmap signal scoring highlights competitor moves likely to affect retention",
        ],
        explainable: true,
      },
      {
        id: "copy-workflow",
        type: "copy",
        field: "subheading",
        selector: "[data-monitor-id='hero-copy']",
        options: [
          "Capture competitor movement, assign strategic meaning, and brief GTM teams from one feed.",
          "Move from raw web changes to decision-ready product intelligence before weekly planning.",
          "Give every PM a live view of competitor positioning, launches, and pricing shifts.",
        ],
        explainable: true,
      },
      {
        id: "layout-proof",
        type: "layout",
        field: "layout",
        selector: "[data-monitor-id='hero-layout']",
        options: [
          "Two-column hero with product screenshots and customer proof above the fold",
          "Tabbed workflow demo moved above feature cards",
          "Comparison-style product tour added before the CTA section",
        ],
        explainable: true,
      },
      {
        id: "cta-trial",
        type: "cta",
        field: "primaryCta",
        selector: "[data-monitor-id='primary-cta']",
        options: ["Generate a sample report", "Try the battlecard workflow", "Start monitoring competitors"],
        explainable: true,
      },
      {
        id: "integration-productivity",
        type: "integration",
        field: "integration",
        selector: "[data-monitor-id='integration-list']",
        options: [
          "Exports now support Slack, Notion, Linear, and email digests",
          "New API lets teams pipe competitor events into internal dashboards",
          "Native Jira and Productboard handoffs added for roadmap triage",
        ],
        explainable: true,
      },
      {
        id: "enterprise-controls",
        type: "enterprise",
        field: "enterprise",
        selector: "[data-monitor-id='enterprise-note']",
        options: [
          "Enterprise plan now highlights managed onboarding and quarterly strategy reviews",
          "New enterprise controls include workspace policies and team-level report routing",
          "Dedicated analyst review is now positioned for strategic accounts",
        ],
        explainable: true,
      },
      {
        id: "security-governance",
        type: "security",
        field: "security",
        selector: "[data-monitor-id='security-note']",
        options: [
          "Governance update adds SSO, audit logs, and private competitor groups",
          "New data controls emphasize confidential tracking for enterprise research teams",
          "Admin approval flows now protect sensitive competitor watchlists",
        ],
        explainable: true,
      },
    ],
    noise: [
      {
        id: "footer-date",
        type: "noise",
        field: "footer",
        selector: "[data-monitor-id='footer-date']",
        options: ["Last updated June 2026", "Last reviewed this week"],
        explainable: false,
      },
    ],
  },
  {
    site: "nova-stack",
    page: "home",
    sourceUrl: "https://nova-stack.mock",
    baseline: {
      title: "Nova Stack",
      eyebrow: "Launch workspace",
      headline: "Build launches with one connected workspace",
      subheading: "Coordinate plans, assets, and customer feedback across every launch milestone.",
      primaryCta: "Start planning",
      secondaryCta: "See templates",
      price: "Free workspace for small launch teams",
      feature: "Shared calendar, asset tracker, and launch checklist",
      audience: "Built for lean product marketing teams",
      proof: "500 launches coordinated",
      integration: "Connects to Slack and Google Drive",
      security: "Basic workspace permissions",
      enterprise: "Scale plan for multi-team launch operations",
      promotion: "Template gallery included",
      layout: "Single-column hero with checklist preview",
      footer: "Updated in 2026",
    },
    changes: [
      {
        id: "layout-two-column",
        type: "layout",
        field: "layout",
        selector: "[data-monitor-id='hero-layout']",
        options: [
          "Two-column hero with customer proof and launch metrics above the fold",
          "Interactive launch board moved into the first viewport",
          "Homepage now opens with a side-by-side workflow comparison",
        ],
        explainable: true,
      },
      {
        id: "copy-ai-monitoring",
        type: "copy",
        field: "headline",
        selector: "[data-monitor-id='hero-copy']",
        options: [
          "Move faster with AI market monitoring built into launch planning",
          "Connect launch execution with real-time competitor and customer signals",
          "Plan launches around the market moves your team can act on",
        ],
        explainable: true,
      },
      {
        id: "feature-intelligence",
        type: "feature",
        field: "feature",
        selector: "[data-monitor-id='feature-list']",
        options: [
          "New market signal board tracks competitor announcements beside launch tasks",
          "AI launch assistant drafts positioning updates from customer and competitor signals",
          "Risk dashboard flags launch blockers, competitor moves, and missing assets",
        ],
        explainable: true,
      },
      {
        id: "audience-platform",
        type: "audience",
        field: "audience",
        selector: "[data-monitor-id='target-audience']",
        options: [
          "Now positioned for growth teams running multi-channel launches",
          "Expanded messaging targets product, PMM, and revenue operations teams",
          "New copy speaks to platform teams coordinating several product lines",
        ],
        explainable: true,
      },
      {
        id: "proof-enterprise",
        type: "proof",
        field: "proof",
        selector: "[data-monitor-id='customer-proof']",
        options: [
          "1,200 launches coordinated across B2B SaaS teams",
          "Customer proof now claims 32% faster launch readiness reviews",
          "Homepage adds logos from enterprise collaboration and analytics brands",
        ],
        explainable: true,
      },
      {
        id: "cta-demo",
        type: "cta",
        field: "primaryCta",
        selector: "[data-monitor-id='primary-cta']",
        options: ["Book a launch audit", "Run a launch readiness check", "See Nova Stack in action"],
        explainable: true,
      },
      {
        id: "promotion-template",
        type: "promotion",
        field: "promotion",
        selector: "[data-monitor-id='promo-banner']",
        options: [
          "New Q3 launch kit includes 25 templates for product marketing teams",
          "Limited rollout: migration support included for annual Scale plans",
          "Launch readiness benchmark report offered to demo requests this month",
        ],
        explainable: true,
      },
    ],
    noise: [
      {
        id: "footer-copy",
        type: "noise",
        field: "footer",
        selector: "[data-monitor-id='footer-date']",
        options: ["Updated this week", "Updated in June 2026"],
        explainable: false,
      },
      {
        id: "eyebrow-copy",
        type: "noise",
        field: "eyebrow",
        selector: "[data-monitor-id='page-eyebrow']",
        options: ["Launch workspace refreshed", "Launch ops workspace"],
        explainable: false,
      },
    ],
  },
];

function pageKey(target: MockPageTarget): string {
  return `${target.site}/${target.page}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

function shuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function selectOption(template: MockChangeTemplate): string {
  return template.options[randomInt(0, template.options.length - 1)] ?? template.options[0] ?? "";
}

function applyTemplate(content: MockPageContent, template: MockChangeTemplate): ExpectedDiff {
  const before = content[template.field];
  const after = selectOption(template);
  content[template.field] = after;

  return {
    type: template.type,
    selector: template.selector,
    before,
    after,
    explainable: template.explainable,
  };
}

function createDynamicVariant(definition: MockPageDefinition, previousSignature?: string): MockPageVariant {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const content = { ...definition.baseline };
    const explainableCount = randomInt(2, Math.min(5, definition.changes.length));
    const noiseCount = definition.noise.length > 0 ? randomInt(0, Math.min(2, definition.noise.length)) : 0;
    const selectedChanges = shuffle(definition.changes).slice(0, explainableCount);
    const selectedNoise = shuffle(definition.noise).slice(0, noiseCount);
    const expectedDiff = [...selectedChanges, ...selectedNoise].map((template) => applyTemplate(content, template));
    const signature = selectedChanges
      .map((template) => `${template.id}:${content[template.field]}`)
      .sort()
      .join("|");

    if (signature === previousSignature && attempt < 4) continue;

    const primaryType = selectedChanges[0]?.type ?? "copy";
    const snapshotId = `${definition.page}-${primaryType}-${Date.now().toString(36)}-${randomCode()}`;
    return {
      snapshotId,
      signature,
      content,
      expectedDiff,
    };
  }

  const content = { ...definition.baseline };
  const selectedChanges = definition.changes.slice(0, 2);
  const expectedDiff = selectedChanges.map((template) => applyTemplate(content, template));
  return {
    snapshotId: `${definition.page}-fallback-${Date.now().toString(36)}-${randomCode()}`,
    signature: selectedChanges.map((template) => template.id).join("|"),
    content,
    expectedDiff,
  };
}

function serializeForScript(snapshot: Omit<MockPageSnapshot, "html">): string {
  return JSON.stringify(snapshot).replaceAll("<", "\\u003c");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(definition: MockPageDefinition, variant: MockPageVariant, updatedAt: string): string {
  const snapshotData: Omit<MockPageSnapshot, "html"> = {
    site: definition.site,
    page: definition.page,
    snapshotId: variant.snapshotId,
    sourceUrl: definition.sourceUrl,
    expectedDiff: variant.expectedDiff,
    updatedAt,
  };
  const content = variant.content;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(content.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #f8fafc; }
      main { max-width: 1040px; margin: 0 auto; padding: 40px 24px; }
      section { margin-top: 24px; padding: 24px; border: 1px solid #dbe3ef; background: #ffffff; border-radius: 8px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e0f2fe; color: #075985; }
      .hero { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr); gap: 24px; align-items: center; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
      .button { padding: 10px 14px; border-radius: 6px; border: 1px solid #2563eb; }
      .primary { background: #2563eb; color: #ffffff; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      small { color: #64748b; }
      @media (max-width: 720px) { .hero, .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main data-monitor-id="mock-page" data-snapshot-id="${variant.snapshotId}">
      <span class="badge" data-monitor-id="page-eyebrow">${escapeHtml(content.eyebrow)}</span>
      <section class="hero" data-monitor-id="hero-layout">
        <div>
          <h1 data-monitor-id="page-title">${escapeHtml(content.title)}</h1>
          <h2 data-monitor-id="hero-copy">${escapeHtml(content.headline)}</h2>
          <p data-monitor-id="page-body">${escapeHtml(content.subheading)}</p>
          <p data-monitor-id="target-audience">${escapeHtml(content.audience)}</p>
          <div class="actions">
            <span class="button primary" data-monitor-id="primary-cta">${escapeHtml(content.primaryCta)}</span>
            <span class="button" data-monitor-id="secondary-cta">${escapeHtml(content.secondaryCta)}</span>
          </div>
        </div>
        <div>
          <strong data-monitor-id="customer-proof">${escapeHtml(content.proof)}</strong>
          <p data-monitor-id="promo-banner">${escapeHtml(content.promotion)}</p>
        </div>
      </section>
      <section class="grid">
        <p data-monitor-id="starter-price">${escapeHtml(content.price)}</p>
        <p data-monitor-id="feature-list">${escapeHtml(content.feature)}</p>
        <p data-monitor-id="integration-list">${escapeHtml(content.integration)}</p>
        <p data-monitor-id="security-note">${escapeHtml(content.security)}</p>
      </section>
      <section>
        <p data-monitor-id="enterprise-note">${escapeHtml(content.enterprise)}</p>
        <p>${escapeHtml(content.layout)}</p>
        <small data-monitor-id="updated-at">Updated at ${updatedAt}</small>
        <small data-monitor-id="footer-year"> · ${escapeHtml(content.footer)}</small>
        <small data-monitor-id="footer-date"> · ${escapeHtml(content.footer)}</small>
      </section>
    </main>
    <script id="lensmor-mock-page-data" type="application/json">${serializeForScript(snapshotData)}</script>
  </body>
</html>`;
}

function createSnapshot(
  definition: MockPageDefinition,
  variant: MockPageVariant,
  runtime?: MockPageRuntime,
): MockPageSnapshot {
  const updatedAt = new Date().toISOString();
  const html = renderHtml(definition, variant, updatedAt);
  const key = pageKey(definition);

  if (runtime) {
    runtime.signatures.set(key, variant.signature);
  }

  return {
    site: definition.site,
    page: definition.page,
    snapshotId: variant.snapshotId,
    sourceUrl: definition.sourceUrl,
    html,
    expectedDiff: variant.expectedDiff,
    updatedAt,
  };
}

function createRuntime(): MockPageRuntime {
  const pages = new Map<string, MockPageSnapshot>();
  const signatures = new Map<string, string>();
  const nextRuntime: MockPageRuntime = { pages, signatures, lastRotatedAt: Date.now() };

  for (const definition of definitions) {
    pages.set(pageKey(definition), createSnapshot(definition, createDynamicVariant(definition), nextRuntime));
  }
  return nextRuntime;
}

const runtime = globalThis.__lensmorMockPageRuntime ?? (globalThis.__lensmorMockPageRuntime = createRuntime());

export function rotateMockPages(): void {
  for (const definition of definitions) {
    const key = pageKey(definition);
    runtime.pages.set(key, createSnapshot(definition, createDynamicVariant(definition, runtime.signatures.get(key)), runtime));
  }
  runtime.lastRotatedAt = Date.now();
}

export function ensureMockPageTicker(): void {
  if (runtime.timer) return;
  runtime.timer = globalThis.setInterval(rotateMockPages, MOCK_PAGE_REFRESH_INTERVAL_MS);
}

function ensureFreshMockPages(): void {
  if (Date.now() - runtime.lastRotatedAt >= MOCK_PAGE_REFRESH_INTERVAL_MS) {
    rotateMockPages();
  }
}

export function getMockPageSnapshot(site: string, page: string): MockPageSnapshot | undefined {
  ensureMockPageTicker();
  ensureFreshMockPages();
  return runtime.pages.get(pageKey({ site, page }));
}

function hashText(value: string): number {
  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

export function selectMockPageTarget(mainDomain: string): MockPageTarget {
  const normalized = mainDomain.toLowerCase();
  if (normalized.includes("nova")) return { site: "nova-stack", page: "home" };
  if (normalized.includes("acme") && normalized.includes("product")) return { site: "acme-ai", page: "product" };
  if (normalized.includes("acme")) return { site: "acme-ai", page: "pricing" };

  return definitions[hashText(normalized) % definitions.length] ?? { site: "acme-ai", page: "pricing" };
}

export function toCollectedMockSnapshot(snapshot: MockPageSnapshot): CollectedMockSnapshot {
  return {
    site: snapshot.site,
    page: snapshot.page,
    snapshotId: snapshot.snapshotId,
    sourceUrl: snapshot.sourceUrl,
    expectedDiff: snapshot.expectedDiff,
    collectedAt: new Date().toISOString(),
  };
}

export function buildDiffScenarioFromMockPage(
  snapshot: MockPageSnapshot,
  previous?: CollectedMockSnapshot,
): DiffScenario {
  const hasChanged = !previous || previous.snapshotId !== snapshot.snapshotId;
  return {
    id: `${snapshot.site}-${snapshot.page}-${snapshot.snapshotId}`,
    competitor: snapshot.site,
    page: snapshot.page,
    beforeSnapshot: previous?.snapshotId ?? "baseline",
    afterSnapshot: snapshot.snapshotId,
    sourceUrl: snapshot.sourceUrl,
    expectedDiff: hasChanged ? snapshot.expectedDiff : [],
    expectedReportHints: {
      summaryMustInclude: snapshot.expectedDiff.map((change) => change.after),
      intentCandidates: ["monitor current mock page changes", "prioritize larger positioning shifts"],
      actionCandidates: [
        "review competitor positioning and conversion changes",
        "compare own roadmap, pricing, and messaging response options",
      ],
    },
  };
}

export async function fetchMockPageSnapshot(_origin: string, target: MockPageTarget): Promise<MockPageSnapshot> {
  const snapshot = getMockPageSnapshot(target.site, target.page);
  if (!snapshot) {
    throw new Error(`Mock page not found: ${target.site}/${target.page}`);
  }
  return snapshot;
}
