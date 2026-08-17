import assert from "node:assert/strict";
import test from "node:test";

import {
  DataQualityOutputError,
  buildDataQualityInput,
  isOpenAIConfigured,
  parseDataQualityIssues,
} from "../lib/data-quality.ts";

const issue = {
  id: "asset-aliases",
  severity: "high",
  title: "Asset naming variants",
  sourceDocuments: ["Meeting notes.xlsx"],
  affectedRecords: 4,
  whatFound: "Four labels name the same asset.",
  suggestedCorrection: "Normalize to OVT-209.",
  confidence: "high",
  evidence: [{ documentId: "doc-1", fileName: "Meeting notes.xlsx", locator: "Sheet 1, rows 2-5", excerpt: "OVT209, OVT 209" }],
};

test("builds traceable, bounded source input", () => {
  const input = buildDataQualityInput([{ documentId: "doc-1", fileName: "notes.xlsx", locator: "Sheet 1", text: "Observed value" }]);

  assert.match(input, /documentId: doc-1/);
  assert.match(input, /fileName: notes\.xlsx/);
  assert.match(input, /Observed value/);
});

test("parses only validated data-quality issues", () => {
  assert.deepEqual(parseDataQualityIssues(JSON.stringify({ issues: [issue] })), [issue]);
  assert.throws(() => parseDataQualityIssues(JSON.stringify({ issues: [{ ...issue, evidence: [] }] })), DataQualityOutputError);
  assert.throws(() => parseDataQualityIssues("not json"), DataQualityOutputError);
});

test("requires a nonempty OpenAI API key", () => {
  assert.equal(isOpenAIConfigured(""), false);
  assert.equal(isOpenAIConfigured("  "), false);
  assert.equal(isOpenAIConfigured("sk-example"), true);
});
