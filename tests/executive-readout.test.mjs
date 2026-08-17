import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { buildExecutiveReadoutDeck, executiveReadoutFilename } from "../lib/executive-readout.ts";

const insights = [
  {
    id: "insight-ild",
    priority: "P3",
    title: "Turn ILD monitoring into a field differentiator",
    rationale: "The signal affects near-term field execution.",
    action: "Publish an ILD monitoring pocket card.",
    owner: "Medical Affairs",
    confidence: "high",
    sourceSignalIds: ["signal-ild"],
    evidence: [{ documentId: "doc-1", fileName: "MSL Meeting Notes.xlsx", locator: "Sheet 1 · Row 12", excerpt: "HCP requested ILD monitoring guidance." }],
  },
];

test("builds a generic Atrix executive-readout PowerPoint from traceable priorities", async () => {
  const deck = await buildExecutiveReadoutDeck({ runName: "ASCO 2026 Field Intelligence", runId: "run-123", insights });

  assert.ok(Buffer.isBuffer(deck));
  assert.deepEqual([...deck.subarray(0, 2)], [0x50, 0x4b], "PPTX output must be a ZIP package");
  assert.ok(deck.byteLength > 2_000);
  assert.equal(executiveReadoutFilename("ASCO 2026 Field Intelligence"), "asco-2026-field-intelligence-executive-readout.pptx");
});

test("defines a Node executive-readout route that persists a deck artifact and supports status reads", async () => {
  const routeUrl = new URL("../app/api/runs/[runId]/stages/executive-readout/route.ts", import.meta.url);
  await assert.doesNotReject(access(routeUrl));
  const route = await readFile(routeUrl, "utf8");

  assert.match(route, /export const runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /export\s+async\s+function\s+GET\s*\(/);
  assert.match(route, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(route, /type:\s*["']deck["']/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation/);
});
