import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const schemaPath = new URL("../db/schema.ts", import.meta.url);
const connectorPath = new URL("../db/index.ts", import.meta.url);

test("persistence schema defines every workflow record", async () => {
  const schema = await readFile(schemaPath, "utf8");

  for (const table of [
    "workflowRuns",
    "workflowDocuments",
    "sourceBlocks",
    "workflowStages",
    "reviewDecisions",
    "workflowArtifacts",
    "playbookRules",
  ]) {
    assert.match(schema, new RegExp(`export const ${table}\\b`));
  }
});

test("database connector is lazy and requires a Neon connection string only when used", async () => {
  const connector = await readFile(connectorPath, "utf8");

  assert.match(connector, /export function getDb\(/);
  assert.match(connector, /DATABASE_URL/);
  assert.doesNotMatch(connector, /from "cloudflare:workers"/);
  assert.doesNotMatch(connector, /export const db\s*=/);
  assert.doesNotMatch(connector, /^const database = drizzle/m);
});
