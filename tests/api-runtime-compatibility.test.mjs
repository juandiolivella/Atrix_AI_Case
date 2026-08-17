import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

const apiRoot = new URL("../app/api/runs/", import.meta.url);

async function routeSource(...segments) {
  return readFile(new URL(segments.join("/"), apiRoot), "utf8");
}

test("workflow APIs use a single runId dynamic segment and Node.js runtime", async () => {
  await assert.doesNotReject(access(new URL("[runId]/route.ts", apiRoot)));
  await assert.rejects(access(new URL("[id]/route.ts", apiRoot)));

  const routeSources = await Promise.all([
    routeSource("route.ts"),
    routeSource("[runId]/route.ts"),
    routeSource("[runId]/documents/route.ts"),
    routeSource("[runId]/stages/data-quality/route.ts"),
  ]);

  for (const source of routeSources) {
    assert.match(source, /export const runtime\s*=\s*["']nodejs["']/);
  }
});
