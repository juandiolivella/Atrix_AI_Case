import assert from "node:assert/strict";
import test from "node:test";

import { parseEnrichmentSignals } from "../lib/enrichment.ts";

test("parses traceable enrichment signals", () => {
  const signals = parseEnrichmentSignals(JSON.stringify({ signals: [{
    id: "signal-001", title: "ILD monitoring", decisionQuestion: "How should teams position ILD monitoring?", summary: "Repeated monitoring interest.", confidence: "high", sourceDocuments: ["doc-1"], evidence: [{ documentId: "doc-1", fileName: "notes.csv", locator: '{"row":2}', excerpt: "ILD monitoring requested" }],
  }] }));
  assert.equal(signals[0].id, "signal-001");
  assert.equal(signals[0].confidence, "high");
});

test("rejects enrichment signals without traceable evidence", () => {
  assert.throws(() => parseEnrichmentSignals(JSON.stringify({ signals: [{ id: "signal-001" }] })), /invalid enrichment response/i);
});
