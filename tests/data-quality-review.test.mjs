import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const decisionRoute = new URL("app/api/runs/[runId]/stages/data-quality/decisions/route.ts", root);
const workspace = new URL("app/workspace/page.tsx", root);

test("persists individual data-quality review choices and rewrites the audit", async () => {
  await assert.doesNotReject(access(decisionRoute));
  const route = await readFile(decisionRoute, "utf8");

  assert.match(route, /reviewDecisions/);
  assert.match(route, /createDataQualityAuditMarkdown/);
  assert.match(route, /allowOverwrite:\s*true/);
  assert.match(route, /"approve"/);
  assert.match(route, /"keep_raw"/);
});

test("functional workspace gives each issue Approve and Keep raw value actions", async () => {
  const page = await readFile(workspace, "utf8");

  assert.match(page, /\/stages\/data-quality\/decisions/);
  assert.match(page, />Approve</);
  assert.match(page, />Keep raw value</);
  assert.match(page, /Suggestion approved/);
  assert.match(page, /Raw value retained/);
});
