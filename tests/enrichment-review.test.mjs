import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { createEnrichmentAuditMarkdown } from "../lib/analysis-audit.js";

const root = new URL("../", import.meta.url);
const decisionRoute = new URL("app/api/runs/[runId]/stages/enrichment/decisions/route.ts", root);

const signal = {
  id: "signal-001",
  title: "ILD safety differentiation",
  decisionQuestion: "Should the field team prioritise ILD monitoring materials?",
  summary: "Multiple sources cite ILD monitoring as a key differentiator.",
  confidence: "high",
  sourceDocuments: ["MSL Meeting Notes.xlsx"],
  evidence: [{
    documentId: "a1c3ec64-6311-4a74-9eb6-731e33084cf5",
    fileName: "MSL Meeting Notes.xlsx",
    locator: "Sheet 1 · Row 4",
    excerpt: "HCP requested ILD monitoring protocol.",
  }],
};

test("creates an enrichment audit with the latest review decision", () => {
  const markdown = createEnrichmentAuditMarkdown({
    runId: "e162cff0-0176-4105-a6e7-edf1ce684f71",
    createdAt: "2026-08-17T12:00:00.000Z",
    signals: [signal],
    decisions: [{ signalId: "signal-001", status: "approved", decidedAt: "2026-08-17T12:30:00.000Z" }],
  });

  assert.match(markdown, /# 03 · Enrichment audit/);
  assert.match(markdown, /\*\*Decision:\*\* Approved/);
  assert.match(markdown, /MSL Meeting Notes\.xlsx/);
});

test("persists enrichment reviews as insight decisions and updates the audit", async () => {
  await assert.doesNotReject(access(decisionRoute));
  const route = await readFile(decisionRoute, "utf8");

  assert.match(route, /reviewDecisions/);
  assert.match(route, /subjectType:\s*["']insight["']/);
  assert.match(route, /createEnrichmentAuditMarkdown/);
  assert.match(route, /allowOverwrite:\s*true/);
  assert.match(route, /signalId/);
  assert.match(route, /SIGNAL_NOT_FOUND/);
});
