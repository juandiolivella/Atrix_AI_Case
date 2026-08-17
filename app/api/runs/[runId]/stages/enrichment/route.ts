import { put } from "@vercel/blob";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { sourceBlocks, workflowArtifacts, workflowDocuments, workflowRuns, workflowStages } from "@/db/schema";
import { isOpenAIConfigured, type SourceBlockForAnalysis } from "@/lib/data-quality";
import { analyzeEnrichment } from "@/lib/enrichment";
import { playbookFromRequest } from "@/lib/playbook";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ runId: string }> };
const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

async function blocksForRun(runId: string): Promise<SourceBlockForAnalysis[]> {
  const db = getDb();
  return db.select({ documentId: workflowDocuments.id, fileName: workflowDocuments.filename, locator: sourceBlocks.locator, text: sourceBlocks.text })
    .from(sourceBlocks).innerJoin(workflowDocuments, eq(sourceBlocks.documentId, workflowDocuments.id))
    .where(eq(workflowDocuments.runId, runId)).orderBy(asc(workflowDocuments.createdAt), asc(sourceBlocks.ordinal));
}

function markdown(runId: string, signals: Awaited<ReturnType<typeof analyzeEnrichment>>) {
  return ["# 03 · Enrichment", "", `- **Run:** ${runId}`, `- **Generated:** ${new Date().toISOString()}`, `- **Signals:** ${signals.length}`, "", ...signals.flatMap((signal, index) => [
    `## ${index + 1}. ${signal.title}`, "", `- **Decision question:** ${signal.decisionQuestion}`, `- **Confidence:** ${signal.confidence}`, `- **Summary:** ${signal.summary}`, "", "### Evidence", "", "| File | Locator | Excerpt |", "| --- | --- | --- |", ...signal.evidence.map((evidence) => `| ${evidence.fileName.replaceAll("|", "\\|")} | ${evidence.locator.replaceAll("|", "\\|")} | ${evidence.excerpt.replaceAll("|", "\\|").replaceAll("\n", " ")} |`), "",
  ])].join("\n");
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  try {
    const db = getDb();
    const [stage] = await db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "enrichment"))).limit(1);
    return stage ? NextResponse.json({ stage }) : error(404, "ENRICHMENT_NOT_FOUND", "Enrichment has not run for this workflow yet.");
  } catch (caught) {
    return error(500, "ENRICHMENT_STATUS_FAILED", caught instanceof Error ? caught.message : "Unable to read enrichment status.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!isOpenAIConfigured()) return error(503, "OPENAI_NOT_CONFIGURED", "OPENAI_API_KEY is required to enrich evidence.");
  const { runId } = await context.params;
  try {
    const db = getDb();
    const [run] = await db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return error(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");
    const [stage] = await db.insert(workflowStages).values({ runId, type: "enrichment", status: "running", startedAt: new Date(), errorMessage: null })
      .onConflictDoUpdate({ target: [workflowStages.runId, workflowStages.type], set: { status: "running", startedAt: new Date(), completedAt: null, errorMessage: null } }).returning();
    const blocks = await blocksForRun(runId);
    if (!blocks.length) return error(409, "NO_EXTRACTED_CONTENT", "Upload and extract a supported document before enrichment.");
    const signals = await analyzeEnrichment(blocks, playbookFromRequest(request));
    const output = { signals, generatedAt: new Date().toISOString(), sourceBlockCount: blocks.length };
    await db.update(workflowStages).set({ status: "awaiting_review", outputJson: output, completedAt: new Date(), errorMessage: null }).where(eq(workflowStages.id, stage.id));
    const blobKey = `runs/${runId}/03-enrichment.md`;
    const blob = await put(blobKey, markdown(runId, signals), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/markdown; charset=utf-8" });
    await db.insert(workflowArtifacts).values({ runId, stageId: stage.id, type: "stage_markdown", filename: "03-enrichment.md", blobKey: blob.pathname, contentType: "text/markdown; charset=utf-8", metadata: { url: blob.url, signalCount: signals.length } }).onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId: stage.id, metadata: { url: blob.url, signalCount: signals.length } } });
    return NextResponse.json({ stage: { id: stage.id, status: "awaiting_review", output } }, { status: 201 });
  } catch (caught) {
    return error(500, "ENRICHMENT_FAILED", caught instanceof Error ? caught.message : "Evidence enrichment failed.");
  }
}
