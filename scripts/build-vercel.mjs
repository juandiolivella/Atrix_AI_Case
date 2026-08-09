import { access, readFile } from "node:fs/promises";

const pageUrl = new URL("../vercel-static/index.html", import.meta.url);
await access(pageUrl);
const page = await readFile(pageUrl, "utf8");

for (const requiredText of ["Review data quality", "Asset naming variants", "Approve", "Keep raw value", "View evidence", "Raw asset label", "Applied normalized value", "Structured evidence map", "Accept suggestion", "Save changes", "P3 — Critical / Immediate"]) {
  if (!page.toLowerCase().includes(requiredText.toLowerCase())) throw new Error(`Vercel static page is missing: ${requiredText}`);
}

console.log("Vercel static data quality build ready.");
