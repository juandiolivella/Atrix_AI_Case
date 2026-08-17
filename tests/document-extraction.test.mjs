import assert from "node:assert/strict";
import test from "node:test";

import {
  extractDocument,
  validateDocumentFormat,
} from "../lib/documents/extraction.ts";

test("extractDocument creates traceable source blocks from CSV rows", async () => {
  const result = await extractDocument({
    documentId: "meeting-notes",
    filename: "meeting-notes.csv",
    content: "asset,hcp,note\nOVT-209,Dr. Martinez,ILD protocol requested\n",
  });

  assert.equal(result.status, "completed");
  assert.equal(result.sourceBlocks.length, 1);
  assert.deepEqual(result.sourceBlocks[0], {
    id: "meeting-notes:row-2",
    documentId: "meeting-notes",
    kind: "table-row",
    locator: { row: 2 },
    text: "asset: OVT-209\nhcp: Dr. Martinez\nnote: ILD protocol requested",
  });
});

test("supported formats without an extractor are queued instead of discarded", async () => {
  const result = await extractDocument({
    documentId: "field-notes",
    filename: "field-notes.docx",
    content: new Uint8Array([1, 2, 3]),
  });

  assert.equal(result.status, "queued");
  assert.equal(result.format, "docx");
  assert.equal(result.sourceBlocks.length, 0);
  assert.match(result.message, /extractor is not available/i);
});

test("unknown formats fail validation with a clear reason", () => {
  assert.deepEqual(validateDocumentFormat("notes.txt"), {
    ok: false,
    reason: "Unsupported file format: .txt. Supported formats are CSV, PDF, DOCX, PPTX, and XLSX.",
  });
});
