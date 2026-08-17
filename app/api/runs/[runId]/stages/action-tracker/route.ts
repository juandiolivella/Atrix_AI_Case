import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { workflowArtifacts, workflowRuns, workflowStages } from "@/db/schema";
import { analyzeActionItems, toTrackerCsv, type ActionItem } from "@/lib/action-tracker";
import { isOpenAIConfigured } from "@/lib/data-quality";
import type { PrioritizedInsight } from "@/lib/priorities";

export const runtime = "nodejs";
type Context = { params: Promise<{ runId: string }> };
const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
const getItems = (output: unknown) => output && typeof output === "object" && Array.isArray((output as { items?: unknown }).items) ? (output as { items: ActionItem[] }).items : [];
const getInsights = (output: unknown) => output && typeof output === "object" && Array.isArray((output as { insights?: unknown }).insights) ? (output as { insights: PrioritizedInsight[] }).insights : [];

function markdown(runId: string, items: ActionItem[]) { return ["# 06 · Action tracker", "", `- **Run:** ${runId}`, "", "| To Do | Priority | Owner | Deadline | Status |", "| --- | --- | --- | --- | --- |", ...items.map((item) => `| ${item.title.replaceAll("|", "\\|")} | ${item.priority} | ${item.owner.replaceAll("|", "\\|")} | ${item.deadline} | ${item.status} |`)].join("\n"); }

export async function GET(request: Request, context: Context) {
  const { runId } = await context.params;
  try {
    const db = getDb(); const [stage] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "action_tracker"))).limit(1);
    if (!stage?.outputJson) return error(404, "ACTION_TRACKER_NOT_FOUND", "Action Tracker has not run for this workflow yet.");
    const items = getItems(stage.outputJson);
    if (new URL(request.url).searchParams.get("format") === "csv") return new Response(toTrackerCsv(items), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${runId}-action-tracker.csv"` } });
    return NextResponse.json({ stage });
  } catch (caught) { return error(500, "ACTION_TRACKER_READ_FAILED", caught instanceof Error ? caught.message : "Unable to read action tracker."); }
}

export async function POST(_: Request, context: Context) {
  if (!isOpenAIConfigured()) return error(503, "OPENAI_NOT_CONFIGURED", "OPENAI_API_KEY is required to generate the action tracker.");
  const { runId } = await context.params;
  try {
    const db = getDb(); const [run] = await db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return error(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");
    const [priorities] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "priorities"))).limit(1);
    const insights = getInsights(priorities?.outputJson);
    if (insights.length === 0) return error(409, "PRIORITIES_REQUIRED", "Run Prioritize Insights before generating an Action Tracker.");
    const [stage] = await db.insert(workflowStages).values({ runId, type: "action_tracker", status: "running", startedAt: new Date(), errorMessage: null }).onConflictDoUpdate({ target: [workflowStages.runId, workflowStages.type], set: { status: "running", startedAt: new Date(), completedAt: null, errorMessage: null } }).returning();
    const items = await analyzeActionItems(insights); const output = { items, generatedAt: new Date().toISOString() };
    await db.update(workflowStages).set({ status: "completed", outputJson: output, completedAt: new Date(), errorMessage: null }).where(eq(workflowStages.id, stage.id));
    const blob = await put(`runs/${runId}/06-action-tracker.md`, markdown(runId, items), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/markdown; charset=utf-8" });
    await db.insert(workflowArtifacts).values({ runId, stageId: stage.id, type: "stage_markdown", filename: "06-action-tracker.md", blobKey: blob.pathname, contentType: "text/markdown; charset=utf-8", metadata: { url: blob.url, itemCount: items.length } }).onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId: stage.id, metadata: { url: blob.url, itemCount: items.length } } });
    const csv = await put(`runs/${runId}/06-action-tracker.csv`, toTrackerCsv(items), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/csv; charset=utf-8" });
    await db.insert(workflowArtifacts).values({ runId, stageId: stage.id, type: "tracker_export", filename: "06-action-tracker.csv", blobKey: csv.pathname, contentType: "text/csv; charset=utf-8", metadata: { url: csv.url, itemCount: items.length } }).onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId: stage.id, metadata: { url: csv.url, itemCount: items.length } } });
    return NextResponse.json({ stage: { id: stage.id, status: "completed", output } }, { status: 201 });
  } catch (caught) { return error(500, "ACTION_TRACKER_FAILED", caught instanceof Error ? caught.message : "Action Tracker could not be generated."); }
}
