import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { playbookRules } from "@/db/schema";
import { ASCO_APPROVED_PLAYBOOK } from "./playbook-guidance.js";

export function playbookFromRequest(request: Request) {
  const encoded = request.headers.get("x-atrix-playbook");
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch { return []; }
}

export async function approvedPlaybookRules() {
  const db = getDb();
  const existing = await db.select().from(playbookRules).where(eq(playbookRules.status, "approved"));
  if (existing.length > 0) return existing;
  return db.insert(playbookRules).values(ASCO_APPROVED_PLAYBOOK.map((rule, index) => ({
    category: index < 4 ? "data_quality" : index < 6 ? "evidence" : "prioritization",
    rule,
    status: "approved" as const,
    evidenceCount: 1,
    approvedAt: new Date(),
  }))).returning();
}
