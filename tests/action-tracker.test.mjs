import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseActionItems, toTrackerCsv } from "../lib/action-tracker.ts";

const insights = [{ id: "insight-ild", priority: "P3", title: "ILD safety differentiation", rationale: "High-confidence signal.", action: "Publish a monitoring pocket card.", owner: "Medical Affairs", confidence: "high", sourceSignalIds: ["signal-ild"], evidence: [{ documentId: "doc-1", fileName: "notes.csv", locator: "Row 2", excerpt: "Requested ILD guidance." }] }];

test("parses traceable action items generated from prioritized insights", () => {
  const items = parseActionItems(JSON.stringify({ items: [{ id: "todo-ild", title: "Publish ILD monitoring pocket card", description: "Create and distribute field material.", priority: "P3", owner: "Medical Affairs", deadline: "Within days", status: "not_started", sourceInsightIds: ["insight-ild"], evidence: insights[0].evidence }] }), insights);
  assert.equal(items[0].owner, "Medical Affairs");
  assert.deepEqual(items[0].sourceInsightIds, ["insight-ild"]);
});

test("exports action items as a spreadsheet-safe tracker CSV", () => {
  const csv = toTrackerCsv([{ id: "todo-ild", title: "Publish, ILD pocket card", description: "Create material", priority: "P3", owner: "Medical Affairs", deadline: "Within days", status: "not_started", sourceInsightIds: ["insight-ild"], evidence: [] }]);
  assert.match(csv, /"Publish, ILD pocket card"/);
  assert.match(csv, /Priority,Owner,Deadline,Status/);
});

test("defines a Node action-tracker route with markdown and CSV export", async () => {
  const route = await readFile(new URL("../app/api/runs/[runId]/stages/action-tracker/route.ts", import.meta.url), "utf8");
  assert.match(route, /export const runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /06-action-tracker\.md/);
  assert.match(route, /tracker_export/);
});

test("workspace renders the action tracker and exposes its CSV download", async () => {
  const page = await readFile(new URL("../app/workspace/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Generate Action Tracker/);
  assert.match(page, /Download tracker CSV/);
  assert.match(page, /stages\/action-tracker/);
});
