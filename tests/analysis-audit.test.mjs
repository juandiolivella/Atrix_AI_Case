import assert from "node:assert/strict";
import test from "node:test";

import {
  createIntakeAuditMarkdown,
  createDataQualityAuditMarkdown,
  validateDataQualityIssues,
} from "../lib/analysis-audit.js";

const issue = {
  id: "issue-asset-aliases",
  severity: "high",
  title: "Asset naming variants",
  sourceDocuments: ["MSL Meeting Notes.xlsx"],
  affectedRecords: 12,
  whatFound: "Four labels identify the same asset.",
  suggestedCorrection: "Normalize all labels to OVT-209.",
  confidence: "high",
  evidence: [
    {
      documentId: "doc-msl-notes",
      fileName: "MSL Meeting Notes.xlsx",
      locator: "Sheet 1 · rows 4–15",
      excerpt: "OVT209, OVT 209, OVT-209, and O-209",
    },
  ],
};

test("validates a traceable data-quality issue", () => {
  assert.deepEqual(validateDataQualityIssues([issue]), {
    success: true,
    data: [issue],
  });
});

test("rejects issues without source evidence", () => {
  const result = validateDataQualityIssues([{ ...issue, evidence: [] }]);

  assert.equal(result.success, false);
  assert.match(result.errors.join(" "), /evidence/i);
});

test("creates an intake audit markdown with persisted-document traceability", () => {
  const markdown = createIntakeAuditMarkdown({
    runId: "run-2026-08-17",
    createdAt: "2026-08-17T10:00:00.000Z",
    documents: [
      {
        id: "doc-msl-notes",
        fileName: "MSL Meeting Notes.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: 2048,
        storageKey: "runs/run-2026-08-17/doc-msl-notes.xlsx",
        extractionStatus: "complete",
        extractedBlockCount: 104,
      },
    ],
  });

  assert.match(markdown, /^# 01 · Intake audit/m);
  assert.match(markdown, /run-2026-08-17/);
  assert.match(markdown, /MSL Meeting Notes\.xlsx/);
  assert.match(markdown, /104/);
  assert.match(markdown, /runs\/run-2026-08-17\/doc-msl-notes\.xlsx/);
});

test("creates a data-quality audit markdown with decisions and source locators", () => {
  const markdown = createDataQualityAuditMarkdown({
    runId: "run-2026-08-17",
    createdAt: "2026-08-17T10:05:00.000Z",
    issues: [issue],
    decisions: [
      {
        issueId: "issue-asset-aliases",
        status: "approved",
        decidedAt: "2026-08-17T10:06:00.000Z",
        rationale: "The labels clearly refer to the same asset.",
      },
    ],
  });

  assert.match(markdown, /^# 02 · Data quality audit/m);
  assert.match(markdown, /Asset naming variants/);
  assert.match(markdown, /High/);
  assert.match(markdown, /Approved/);
  assert.match(markdown, /Sheet 1 · rows 4–15/);
  assert.match(markdown, /The labels clearly refer to the same asset\./);
});
