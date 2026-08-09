import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Atrix Congress Intelligence Workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Atrix Congress Intelligence Workspace<\/title>/i);
  assert.match(html, /Bring your congress intelligence together/);
  assert.match(html, /Human in the loop/);
  assert.match(html, /One click/);
  assert.match(html, /Files stay in this browser session/);
  assert.match(html, /Upload information/);
  assert.match(html, /Review data quality/);
  assert.match(html, /Enrich evidence/);
  assert.match(html, /Prioritize insights/);
  assert.match(html, /Generate presentation/);
  assert.match(html, /Asset naming variants/);
  assert.match(html, /Approve/);
  assert.match(html, /Keep raw value/);
  assert.match(html, /Structured evidence map/i);
  assert.match(html, /Accept suggestion/);
  assert.match(html, /View evidence/);
  assert.doesNotMatch(html, /Evidence explorer|Priority workspace|Deck handoff|Start guided review/);
});

test("removes the temporary starter surface", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(page, /Raw asset labels/i);
  assert.match(page, /Applied normalized value/i);
  assert.match(layout, /Atrix Congress Intelligence Workspace/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
