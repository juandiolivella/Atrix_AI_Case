import { access } from "node:fs/promises";

await access(new URL("../vercel-static/index.html", import.meta.url));
console.log("Vercel static intake build ready.");
