import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines a Node One Click orchestration route with automatic decision records", async () => {
  const route = await readFile(new URL("../app/api/runs/[runId]/one-click/route.ts", import.meta.url), "utf8");
  assert.match(route, /export const runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /dataQualityPost/);
  assert.match(route, /enrichmentPost/);
  assert.match(route, /prioritiesPost/);
  assert.match(route, /actionTrackerPost/);
  assert.match(route, /executiveReadoutPost/);
  assert.match(route, /auto_approve/);
});

test("workspace exposes the One Click automatic-run disclaimer", async () => {
  const page = await readFile(new URL("../app/workspace/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Run One Click workflow/);
  assert.match(page, /automatically approved/);
  assert.match(page, /\/one-click/);
});
