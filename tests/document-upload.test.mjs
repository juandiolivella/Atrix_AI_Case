import assert from "node:assert/strict";
import test from "node:test";

import { uploadDocuments } from "../lib/documents/upload.ts";

test("uploadDocuments stores a CSV privately and persists traceable source blocks", async () => {
  const calls = { put: [], documents: [], blocks: [] };
  const result = await uploadDocuments({
    runId: "11111111-1111-4111-8111-111111111111",
    files: [new File(["asset,hcp\nOVT-209,Dr. Martinez\n"], "meeting-notes.csv", { type: "text/csv" })],
    createDocumentId: () => "22222222-2222-4222-8222-222222222222",
    storage: {
      put: async (key, body, options) => calls.put.push({ key, body, options }),
    },
    persistence: {
      insertDocument: async (document) => calls.documents.push(document),
      updateDocument: async (id, patch) => calls.documents.push({ id, ...patch }),
      insertSourceBlocks: async (blocks) => calls.blocks.push(...blocks),
    },
  });

  assert.deepEqual(result, [{
    id: "22222222-2222-4222-8222-222222222222",
    filename: "meeting-notes.csv",
    status: "extracted",
    sourceBlockCount: 1,
    message: "Extracted 1 traceable CSV source block.",
  }]);
  assert.equal(calls.put.length, 1);
  assert.equal(calls.put[0].key, "runs/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222/meeting-notes.csv");
  assert.deepEqual(calls.put[0].options, { access: "private", contentType: "text/csv" });
  assert.equal(calls.documents[0].status, "extracting");
  assert.equal(calls.documents[1].status, "extracted");
  assert.deepEqual(calls.blocks, [{
    documentId: "22222222-2222-4222-8222-222222222222",
    locator: "{\"row\":2}",
    ordinal: 1,
    text: "asset: OVT-209\nhcp: Dr. Martinez",
    metadata: { kind: "table-row" },
  }]);
});

test("uploadDocuments rejects unsupported files before storing any blobs", async () => {
  let wasStored = false;

  await assert.rejects(
    uploadDocuments({
      runId: "11111111-1111-4111-8111-111111111111",
      files: [new File(["plain text"], "notes.txt", { type: "text/plain" })],
      storage: { put: async () => { wasStored = true; } },
      persistence: {
        insertDocument: async () => undefined,
        updateDocument: async () => undefined,
        insertSourceBlocks: async () => undefined,
      },
    }),
    /Unsupported file format: .txt/,
  );

  assert.equal(wasStored, false);
});
