import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { workflowArtifacts, workflowRuns, workflowStages } from "@/db/schema";
import { isOpenAIConfigured } from "@/lib/data-quality";
import { analyzePriorities, type PrioritizedInsight } from "@/lib/priorities";
import type { EnrichmentSignal } from "@/lib/enrichment";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ runId: string }> };
type EnrichmentOutput = { signals?: EnrichmentSignal[] };
const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

function markdown(runId: string, insights: PrioritizedInsight[]) {
  return ["# 04 · Prioritized insights", "", `- **Run:** ${runId}`, `- **Generated:** ${new Date().toISOString()}`, `- **Insights:** ${insights.length}`, "", ...insights.flatMap((insight, index) => [
    `## ${index + 1}. [${insight.priority}] ${insight.title}`, "", `- **Confidence:** ${insight.confidence}`, `- **Rationale:** ${insight.rationale}`, `- **Action:** ${insight.action}`, `- **Suggested owner:** ${insight.owner} *(inferred)*`, `- **Source signals:** ${insight.sourceSignalIds.join(", ")}`, "", "### Evidence", "", "| File | Locator | Excerpt |", "| --- | --- | --- |", ...insight.evidence.map((evidence) => `| ${evidence.fileName.replaceAll("|", "\\|")} | ${evidence.locator.replaceAll("|", "\\|")} | ${evidence.excerpt.replaceAll("|", "\\|").replaceAll("\n", " ")} |`), "",
  ])].join("\n");
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  try {
    const db = getDb();
    const [stage] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "priorities"))).limit(1);
    return stage ? NextResponse.json({ stage }) : error(404, "PRIORITIES_NOT_FOUND", "Priorities have not run for this workflow yet.");
  } catch (caught) {
    return error(500, "PRIORITIES_STATUS_FAILED", caught instanceof Error ? caught.message : "Unable to read priorities status.");
  }
}

export async function POST(_: Request, context: RouteContext) {
  if (!isOpenAIConfigured()) return error(503, "OPENAI_NOT_CONFIGURED", "OPENAI_API_KEY is required to prioritize insights.");
  const { runId } = await context.params;
  try {
    const db = getDb();
    const [run] = await db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return error(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");
    const [enrichment] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "enrichment"))).limit(1);
    const signals = (enrichment?.outputJson as EnrichmentOutput | null)?.signals;
    if (!enrichment || !Array.isArray(signals) || signals.length === 0) return error(409, "ENRICHMENT_REQUIRED", "Run evidence enrichment before prioritizing insights.");
    const [stage] = await db.insert(workflowStages).values({ runId, type: "priorities", status: "running", startedAt: new Date(), errorMessage: null })
      .onConflictDoUpdate({ target: [workflowStages.runId, workflowStages.type], set: { status: "running", startedAt: new Date(), completedAt: null, errorMessage: null } }).returning();
    const insights = await analyzePriorities(signals);
    const output = { insights, generatedAt: new Date().toISOString(), sourceSignalCount: signals.length };
    await db.update(workflowStages).set({ status: "awaiting_review", outputJson: output, completedAt: new Date(), errorMessage: null }).where(eq(workflowStages.id, stage.id));
    const blobKey = `runs/${runId}/04-priorities.md`;
    const blob = await put(blobKey, markdown(runId, insights), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/markdown; charset=utf-8" });
    await db.insert(workflowArtifacts).values({ runId, stageId: stage.id, type: "stage_markdown", filename: "04-priorities.md", blobKey: blob.pathname, contentType: "text/markdown; charset=utf-8", metadata: { url: blob.url, insightCount: insights.length } }).onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId: stage.id, metadata: { url: blob.url, insightCount: insights.length } } });
    return NextResponse.json({ stage: { id: stage.id, status: "awaiting_review", output } }, { status: 201 });
  } catch (caught) {
    return error(500, "PRIORITIES_FAILED", caught instanceof Error ? caught.message : "Insight prioritization failed.");
  }
}
