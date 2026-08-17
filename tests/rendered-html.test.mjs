import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
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

test("server-renders the Atrix Congress Intelligence Workspace entry screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Atrix Congress Intelligence Workspace<\/title>/i);
  assert.match(html, /Choose your workspace/i);
  assert.match(html, /Explore demo/i);
  assert.match(html, /Start functional workflow/i);
});

test("routes visitors from Screen 0 to the demo or functional workspace", async () => {
  const [landing, demo, workspace] = await Promise.all([
    render("/"),
    render("/demo"),
    render("/workspace"),
  ]);

  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /Choose your workspace/i);
  assert.match(await render("/").then((response) => response.text()), /href="\/demo"/);
  assert.match(await render("/").then((response) => response.text()), /href="\/workspace"/);

  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /Bring your congress intelligence together/);

  assert.equal(workspace.status, 200);
  assert.match(await workspace.text(), /Start a functional workflow/i);
});

test("removes the temporary starter surface", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.match(page, /Raw asset labels/i);
  assert.match(page, /Applied normalized value/i);
  assert.match(layout, /Atrix Congress Intelligence Workspace/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("defines six real Orivus example-file assets", async () => {
  const page = await readFile(new URL("../app/demo/page.tsx", import.meta.url), "utf8");

  assert.match(page, /\/examples\/orivus-asco-2025\/Orivus_KITs_KIQs_ASCO_2025\.pptx/);
  assert.match(page, /\/examples\/orivus-asco-2025\/Orivus_MSL_Meeting_Notes_2025\.xlsx/);
  assert.match(page, /Loading example case/);
  assert.match(page, /new File\(/);
});

test("approved deck download does not block the action tracker transition", async () => {
  const staticPage = await readFile(new URL("../vercel-static/index.html", import.meta.url), "utf8");

  assert.doesNotMatch(staticPage, /to-tracker[^]*stopImmediatePropagation\(\)/);
  assert.match(staticPage, /openActionTracker/);
});

test("one-click runs route directly to the executive handoff", async () => {
  const staticPage = await readFile(new URL("../vercel-static/index.html", import.meta.url), "utf8");

  assert.match(staticPage, /selectedMode/);
  assert.match(staticPage, /openOneClickDeck/);
  assert.match(staticPage, /approved using workflow history/);
  assert.match(staticPage, /selectedMode==='one-click'\?openOneClickDeck\(\):openDataQualityReview\(\)/);
});
