import { put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { reviewDecisions, workflowArtifacts, workflowStages } from "@/db/schema";
import type { PrioritizedInsight } from "@/lib/priorities";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ runId: string }> };
type ReviewChoice = "approve" | "edit" | "reject";
type StoredDecision = { insightId: string; choice: ReviewChoice; createdAt: Date };

const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

function subjectId(runId: string, insightId: string) {
  const hash = createHash("sha256").update(`priorities:${runId}:${insightId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getInsights(outputJson: unknown): PrioritizedInsight[] | null {
  if (!outputJson || typeof outputJson !== "object" || !("insights" in outputJson)) return null;
  const insights = (outputJson as { insights?: unknown }).insights;
  return Array.isArray(insights) ? insights as PrioritizedInsight[] : null;
}

async function latestDecisions(runId: string): Promise<StoredDecision[]> {
  const db = getDb();
  const rows = await db.select({ choice: reviewDecisions.choice, editedValue: reviewDecisions.editedValue, createdAt: reviewDecisions.createdAt, id: reviewDecisions.id })
    .from(reviewDecisions).where(and(eq(reviewDecisions.runId, runId), eq(reviewDecisions.subjectType, "insight")))
    .orderBy(desc(reviewDecisions.createdAt), desc(reviewDecisions.id));
  const latest = new Map<string, StoredDecision>();
  for (const row of rows) {
    const value = row.editedValue as { stage?: unknown; insightId?: unknown } | null;
    if (value?.stage !== "priorities" || typeof value.insightId !== "string" || latest.has(value.insightId)) continue;
    if (row.choice === "approve" || row.choice === "edit" || row.choice === "reject") latest.set(value.insightId, { insightId: value.insightId, choice: row.choice, createdAt: row.createdAt });
  }
  return [...latest.values()];
}

async function refreshAudit(runId: string, stageId: string, insights: PrioritizedInsight[], decisions: StoredDecision[]) {
  const byInsight = new Map(decisions.map((decision) => [decision.insightId, decision]));
  const markdown = ["# 04 · Prioritized insights", "", `- **Run:** ${runId}`, `- **Updated:** ${new Date().toISOString()}`, "", ...insights.flatMap((insight, index) => {
    const decision = byInsight.get(insight.id);
    return [`## ${index + 1}. [${insight.priority}] ${insight.title}`, "", `- **Review:** ${decision ? decision.choice : "pending"}`, `- **Action:** ${insight.action}`, `- **Suggested owner:** ${insight.owner} *(inferred)*`, `- **Confidence:** ${insight.confidence}`, ""];
  })].join("\n");
  const blob = await put(`runs/${runId}/04-priorities.md`, markdown, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/markdown; charset=utf-8" });
  const db = getDb();
  await db.insert(workflowArtifacts).values({ runId, stageId, type: "stage_markdown", filename: "04-priorities.md", blobKey: blob.pathname, contentType: "text/markdown; charset=utf-8", metadata: { url: blob.url, insightCount: insights.length, decisionCount: decisions.length } })
    .onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId, metadata: { url: blob.url, insightCount: insights.length, decisionCount: decisions.length } } });
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  try { return NextResponse.json({ decisions: await latestDecisions(runId) }); }
  catch (caught) { return error(500, "PRIORITY_DECISIONS_READ_FAILED", caught instanceof Error ? caught.message : "Unable to read priority decisions."); }
}

export async function POST(request: Request, context: RouteContext) {
  const { runId } = await context.params;
  let body: { insightId?: unknown; choice?: unknown };
  try { body = await request.json(); } catch { return error(400, "INVALID_JSON", "Request body must be valid JSON."); }
  if (typeof body.insightId !== "string" || !["approve", "edit", "reject"].includes(String(body.choice))) return error(400, "INVALID_DECISION", "insightId and an approve, edit, or reject choice are required.");
  try {
    const db = getDb();
    const [stage] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "priorities"))).limit(1);
    const insights = stage ? getInsights(stage.outputJson) : null;
    if (!stage || !insights) return error(409, "PRIORITIES_NOT_READY", "Run Prioritize Insights before reviewing priorities.");
    if (!insights.some((insight) => insight.id === body.insightId)) return error(404, "INSIGHT_NOT_FOUND", "The requested insight does not belong to this run.");
    const [decision] = await db.insert(reviewDecisions).values({ runId, subjectType: "insight", subjectId: subjectId(runId, body.insightId), choice: body.choice as ReviewChoice, editedValue: { stage: "priorities", insightId: body.insightId } }).returning();
    const decisions = await latestDecisions(runId);
    await refreshAudit(runId, stage.id, insights, decisions);
    return NextResponse.json({ decision, decisions }, { status: 201 });
  } catch (caught) { return error(500, "PRIORITY_DECISION_SAVE_FAILED", caught instanceof Error ? caught.message : "Unable to save priority decision."); }
}
