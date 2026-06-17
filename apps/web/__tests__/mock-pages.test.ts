import { describe, expect, it } from "vitest";

import {
  buildDiffScenarioFromMockPage,
  getMockPageSnapshot,
  rotateMockPages,
  toCollectedMockSnapshot,
  type MockPageTarget,
} from "../lib/mock-pages";

const targets: MockPageTarget[] = [
  { site: "acme-ai", page: "pricing" },
  { site: "acme-ai", page: "product" },
  { site: "nova-stack", page: "home" },
];

function mustGetSnapshot(target: MockPageTarget) {
  const snapshot = getMockPageSnapshot(target.site, target.page);
  if (!snapshot) throw new Error(`Missing mock snapshot for ${target.site}/${target.page}`);
  return snapshot;
}

function explainableSignature(snapshot: ReturnType<typeof mustGetSnapshot>): string {
  return snapshot.expectedDiff
    .filter((change) => change.explainable)
    .map((change) => `${change.type}:${change.selector ?? ""}:${change.after}`)
    .sort()
    .join("|");
}

describe("dynamic mock pages", () => {
  it("generates larger explainable change sets for every mock target", () => {
    for (const target of targets) {
      const snapshot = mustGetSnapshot(target);
      const explainableChanges = snapshot.expectedDiff.filter((change) => change.explainable);

      expect(explainableChanges.length).toBeGreaterThanOrEqual(2);
      expect(explainableChanges.length).toBeLessThanOrEqual(5);
      expect(snapshot.html).toContain('data-monitor-id="hero-layout"');
      expect(snapshot.html).toContain('id="lensmor-mock-page-data"');
    }
  });

  it("rotates each target without repeating the previous snapshot or change signature", () => {
    const previous = new Map<string, { snapshotId: string; signature: string }>();

    for (const target of targets) {
      const snapshot = mustGetSnapshot(target);
      previous.set(`${target.site}/${target.page}`, {
        snapshotId: snapshot.snapshotId,
        signature: explainableSignature(snapshot),
      });
    }

    rotateMockPages();

    for (const target of targets) {
      const key = `${target.site}/${target.page}`;
      const snapshot = mustGetSnapshot(target);
      const before = previous.get(key);

      expect(snapshot.snapshotId).not.toBe(before?.snapshotId);
      expect(explainableSignature(snapshot)).not.toBe(before?.signature);
    }
  });

  it("builds empty diffs for unchanged snapshots and full diffs after rotation", () => {
    const target = targets[0]!;
    const current = mustGetSnapshot(target);
    const unchangedScenario = buildDiffScenarioFromMockPage(current, toCollectedMockSnapshot(current));

    expect(unchangedScenario.expectedDiff).toHaveLength(0);

    rotateMockPages();

    const next = mustGetSnapshot(target);
    const changedScenario = buildDiffScenarioFromMockPage(next, toCollectedMockSnapshot(current));

    expect(changedScenario.afterSnapshot).toBe(next.snapshotId);
    expect(changedScenario.beforeSnapshot).toBe(current.snapshotId);
    expect(changedScenario.expectedDiff).toEqual(next.expectedDiff);
  });
});
