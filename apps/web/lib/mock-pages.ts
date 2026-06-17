import { type DiffScenario, type ExpectedDiff } from "@lensmor/domain";

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

interface MockPageVariant {
  snapshotId: string;
  title: string;
  body: string;
  expectedDiff: ExpectedDiff[];
}

interface MockPageDefinition extends MockPageTarget {
  sourceUrl: string;
  baseline: MockPageVariant;
  variants: MockPageVariant[];
}

interface MockPageRuntime {
  pages: Map<string, MockPageSnapshot>;
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
      snapshotId: "baseline",
      title: "Acme AI Pricing",
      body: "Starter $49/mo. Start free. For growing product teams.",
      expectedDiff: [],
    },
    variants: [
      {
        snapshotId: "cta-change",
        title: "Acme AI Pricing",
        body: "Starter $49/mo. Book demo. For teams that need sales-led onboarding.",
        expectedDiff: [
          {
            type: "cta",
            selector: "[data-monitor-id='primary-cta']",
            before: "Start free",
            after: "Book demo",
            explainable: true,
          },
        ],
      },
      {
        snapshotId: "price-change",
        title: "Acme AI Pricing",
        body: "Starter $59/mo. Start free. Advanced workspace controls included.",
        expectedDiff: [
          {
            type: "pricing",
            selector: "[data-monitor-id='starter-price']",
            before: "$49/mo",
            after: "$59/mo",
            explainable: true,
          },
        ],
      },
      {
        snapshotId: "footer-noise",
        title: "Acme AI Pricing",
        body: "Starter $49/mo. Start free. Copyright 2026.",
        expectedDiff: [
          {
            type: "noise",
            selector: "[data-monitor-id='footer-year']",
            before: "2025",
            after: "2026",
            explainable: false,
          },
        ],
      },
    ],
  },
  {
    site: "acme-ai",
    page: "product",
    sourceUrl: "https://acme-ai.mock/product",
    baseline: {
      snapshotId: "baseline",
      title: "Acme AI Product",
      body: "Automated research workspace for product teams.",
      expectedDiff: [],
    },
    variants: [
      {
        snapshotId: "feature-launch",
        title: "Acme AI Product",
        body: "Automated research workspace with a new AI battlecard generator.",
        expectedDiff: [
          {
            type: "feature",
            selector: "[data-monitor-id='feature-list']",
            before: "Automated research workspace",
            after: "AI battlecard generator",
            explainable: true,
          },
        ],
      },
    ],
  },
  {
    site: "nova-stack",
    page: "home",
    sourceUrl: "https://nova-stack.mock",
    baseline: {
      snapshotId: "baseline",
      title: "Nova Stack",
      body: "Hero. Build launches with one connected workspace.",
      expectedDiff: [],
    },
    variants: [
      {
        snapshotId: "layout-change",
        title: "Nova Stack",
        body: "Two-column hero with customer proof above the fold.",
        expectedDiff: [
          {
            type: "layout",
            selector: "[data-monitor-id='hero-layout']",
            before: "Single-column hero",
            after: "Two-column hero with proof",
            explainable: true,
          },
        ],
      },
      {
        snapshotId: "copy-change",
        title: "Nova Stack",
        body: "Move faster with AI market monitoring.",
        expectedDiff: [
          {
            type: "copy",
            selector: "[data-monitor-id='hero-copy']",
            before: "Hero",
            after: "Move faster with AI market monitoring",
            explainable: true,
          },
        ],
      },
    ],
  },
];

function pageKey(target: MockPageTarget): string {
  return `${target.site}/${target.page}`;
}

function selectRandomVariant(definition: MockPageDefinition, previousSnapshotId?: string): MockPageVariant {
  const candidates = definition.variants.length > 0 ? definition.variants : [definition.baseline];
  if (candidates.length === 1) return candidates[0] ?? definition.baseline;

  const withoutPrevious = candidates.filter((variant) => variant.snapshotId !== previousSnapshotId);
  const pool = withoutPrevious.length > 0 ? withoutPrevious : candidates;
  return pool[Math.floor(Math.random() * pool.length)] ?? definition.baseline;
}

function serializeForScript(snapshot: Omit<MockPageSnapshot, "html">): string {
  return JSON.stringify(snapshot).replaceAll("<", "\\u003c");
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

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${variant.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
      main { max-width: 720px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; }
    </style>
  </head>
  <body>
    <main data-monitor-id="mock-page" data-snapshot-id="${variant.snapshotId}">
      <span class="badge">${definition.site}/${definition.page}</span>
      <h1 data-monitor-id="page-title">${variant.title}</h1>
      <p data-monitor-id="page-body">${variant.body}</p>
      <small data-monitor-id="updated-at">Updated at ${updatedAt}</small>
    </main>
    <script id="lensmor-mock-page-data" type="application/json">${serializeForScript(snapshotData)}</script>
  </body>
</html>`;
}

function createSnapshot(definition: MockPageDefinition, variant: MockPageVariant): MockPageSnapshot {
  const updatedAt = new Date().toISOString();
  const html = renderHtml(definition, variant, updatedAt);

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
  for (const definition of definitions) {
    pages.set(pageKey(definition), createSnapshot(definition, selectRandomVariant(definition)));
  }
  return { pages };
}

const runtime = globalThis.__lensmorMockPageRuntime ?? (globalThis.__lensmorMockPageRuntime = createRuntime());

function rotateMockPages(): void {
  for (const definition of definitions) {
    const current = runtime.pages.get(pageKey(definition));
    runtime.pages.set(pageKey(definition), createSnapshot(definition, selectRandomVariant(definition, current?.snapshotId)));
  }
}

export function ensureMockPageTicker(): void {
  if (runtime.timer) return;
  runtime.timer = globalThis.setInterval(rotateMockPages, MOCK_PAGE_REFRESH_INTERVAL_MS);
}

export function getMockPageSnapshot(site: string, page: string): MockPageSnapshot | undefined {
  ensureMockPageTicker();
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
      intentCandidates: ["monitor current mock page changes"],
      actionCandidates: ["review competitor positioning and conversion changes"],
    },
  };
}

export async function fetchMockPageSnapshot(origin: string, target: MockPageTarget): Promise<MockPageSnapshot> {
  if (process.env.NODE_ENV === "test") {
    const snapshot = getMockPageSnapshot(target.site, target.page);
    if (!snapshot) throw new Error("Mock page not found");
    return snapshot;
  }

  const url = new URL(`/mock-pages/${target.site}/${target.page}`, origin);
  const response = await fetch(url, { headers: { Accept: "text/html" }, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Mock page fetch failed with ${response.status}`);
  }

  const html = await response.text();
  const match = /<script id="lensmor-mock-page-data" type="application\/json">(?<json>.*?)<\/script>/s.exec(html);
  const json = match?.groups?.json;
  if (!json) {
    throw new Error("Mock page metadata is missing");
  }

  const snapshot = JSON.parse(json) as Omit<MockPageSnapshot, "html">;
  return {
    ...snapshot,
    html,
  };
}
