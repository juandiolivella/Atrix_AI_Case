import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

async function exists(relativePath) {
  await access(new URL(relativePath, root));
}

test("configures Vercel to deploy the Next.js application instead of the static demo", async () => {
  const [packageJson, vercelJson] = await Promise.all([
    read("package.json"),
    read("vercel.json"),
  ]);
  const packageConfig = JSON.parse(packageJson);
  const vercelConfig = JSON.parse(vercelJson);

  assert.match(packageConfig.scripts.build, /^next build/);
  assert.equal(packageConfig.scripts.dev, "next dev");
  assert.ok(packageConfig.dependencies.next, "Next.js must be a runtime dependency");
  assert.equal(vercelConfig.framework, "nextjs");
  assert.equal(vercelConfig.outputDirectory, undefined);
});

test("serves Screen 0 as the root route with explicit demo and functional-workflow choices", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /Functional workflow/i);
  assert.match(page, /Explore demo/i);
  assert.match(page, /href:\s*["']\/demo["']/);
  assert.match(page, /href:\s*["']\/workspace["']/);
});

test("defines Node.js API routes for every persisted functional-workflow stage", async () => {
  const routes = [
    "app/api/runs/route.ts",
    "app/api/runs/[runId]/documents/route.ts",
    "app/api/runs/[runId]/stages/data-quality/route.ts",
    "app/api/runs/[runId]/stages/enrichment/route.ts",
    "app/api/runs/[runId]/stages/executive-readout/route.ts",
  ];

  await Promise.all(routes.map(exists));

  for (const route of routes) {
    const source = await read(route);
    assert.match(source, /export const runtime\s*=\s*["']nodejs["']/);
    assert.match(source, /export\s+async\s+function\s+GET\s*\(/);
    assert.match(source, /export\s+async\s+function\s+POST\s*\(/);
  }
});

test("keeps the approved Insights Deck available from Next public assets", async () => {
  const [publicDeck, legacyDeck] = await Promise.all([
    stat(new URL("public/20260909 - Insights Deck VF.pptx", root)),
    stat(new URL("vercel-static/20260909 - Insights Deck VF.pptx", root)),
  ]);

  assert.ok(publicDeck.isFile());
  assert.ok(publicDeck.size > 0);
  assert.ok(legacyDeck.isFile());
});

test("connects the functional workspace to persistent uploads and Data Quality", async () => {
  const page = await read("app/workspace/page.tsx");

  assert.match(page, /["']use client["']/);
  assert.match(page, /fetch\(["']\/api\/runs["']/);
  assert.match(page, /\/api\/runs\/\$\{activeRun\.id\}\/documents/);
  assert.match(page, /\.csv,\.docx,\.pptx,\.xlsx,\.pdf/);
  assert.match(page, /\/api\/runs\/\$\{run\.id\}\/stages\/data-quality/);
  assert.match(page, /Run Data Quality/);
  assert.match(page, /Data Quality results/);
  assert.match(page, /\/stages\/enrichment/);
  assert.match(page, /Run Enrichment/);
  assert.match(page, /\/stages\/priorities/);
  assert.match(page, /Prioritize Insights/);
  assert.match(page, /Generate Executive Readout/);
  assert.match(page, /executive-readout/);
  assert.match(page, /Creating run|Uploading/);
  assert.match(page, /Run created|Upload complete/);
});
