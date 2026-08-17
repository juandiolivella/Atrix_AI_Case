import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parsePrioritizedInsights } from "../lib/priorities.ts";

const enrichmentSignals = [{
  id: "signal-ild",
  title: "ILD safety differentiation",
  decisionQuestion: "How should the field position ILD monitoring?",
  summary: "Monitoring interest is corroborated across sources.",
  confidence: "high",
  sourceDocuments: ["MSL Meeting Notes.xlsx", "Field Notes.docx"],
  evidence: [{ documentId: "doc-1", fileName: "MSL Meeting Notes.xlsx", locator: "Sheet 1 · Row 12", excerpt: "HCP requested ILD monitoring guidance." }],
}];

test("parses ranked, traceable insights with action and owner", () => {
  const insights = parsePrioritizedInsights(JSON.stringify({ insights: [{
    id: "insight-ild", priority: "P3", title: "Turn ILD monitoring into a field differentiator",
    rationale: "The signal is high confidence and affects near-term field execution.",
    action: "Publish an ILD monitoring pocket card.", owner: "Medical Affairs",
    confidence: "high", sourceSignalIds: ["signal-ild"],
    evidence: [{ documentId: "doc-1", fileName: "MSL Meeting Notes.xlsx", locator: "Sheet 1 · Row 12", excerpt: "HCP requested ILD monitoring guidance." }],
  }] }), enrichmentSignals);

  assert.equal(insights[0].priority, "P3");
  assert.equal(insights[0].owner, "Medical Affairs");
});

test("rejects priorities that cite an unknown enrichment signal", () => {
  assert.throws(() => parsePrioritizedInsights(JSON.stringify({ insights: [{
    id: "insight-unknown", priority: "P1", title: "Unlinked insight", rationale: "Not linked.", action: "Monitor.", owner: "Strategy", confidence: "low",
    sourceSignalIds: ["signal-missing"], evidence: [{ documentId: "doc-1", fileName: "MSL Meeting Notes.xlsx", locator: "Sheet 1 · Row 12", excerpt: "HCP requested ILD monitoring guidance." }],
  }] }), enrichmentSignals), /unknown enrichment signal/i);
});

test("defines a Node priority-stage route that persists the 04 audit", async () => {
  const route = await readFile(new URL("../app/api/runs/[runId]/stages/priorities/route.ts", import.meta.url), "utf8");
  assert.match(route, /export const runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /export\s+async\s+function\s+GET\s*\(/);
  assert.match(route, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(route, /04-priorities\.md/);
  assert.match(route, /workflowStages/);
});

test("defines a priority-review route that records an individual insight decision", async () => {
  const route = await readFile(new URL("../app/api/runs/[runId]/stages/priorities/decisions/route.ts", import.meta.url), "utf8");
  assert.match(route, /export const runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /export\s+async\s+function\s+GET\s*\(/);
  assert.match(route, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(route, /reviewDecisions/);
  assert.match(route, /04-priorities\.md/);
  assert.match(route, /insightId/);
});

test("workspace exposes individual review actions for prioritized insights", async () => {
  const page = await readFile(new URL("../app/workspace/page.tsx", import.meta.url), "utf8");
  assert.match(page, /stages\/priorities\/decisions/);
  assert.match(page, /Approve insight/);
  assert.match(page, /Reject insight/);
});
