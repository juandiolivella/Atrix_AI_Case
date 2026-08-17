import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("configures Vercel to deploy the Next.js application instead of the static demo", async () => {
  const [packageJson, vercelJson] = await Promise.all([
    read("package.json"),
    read("vercel.json"),
  ]);
  const packageConfig = JSON.parse(packageJson);
  const vercelConfig = JSON.parse(vercelJson);

  assert.equal(packageConfig.scripts.build, "next build --webpack");
  assert.equal(packageConfig.scripts.dev, "next dev");
  assert.ok(packageConfig.dependencies.next, "Next.js must be a runtime dependency");
  assert.equal(vercelConfig.framework, "nextjs");
  assert.equal(vercelConfig.outputDirectory, undefined);
});
