import { put } from "@vercel/blob";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createDataQualityAuditMarkdown, type DataQualityIssue } from "@/lib/analysis-audit";
import {
  analyzeDataQuality,
  isOpenAIConfigured,
  type SourceBlockForAnalysis,
} from "@/lib/data-quality";
import { getDb } from "@/db";
import {
  sourceBlocks,
  workflowArtifacts,
  workflowDocuments,
  workflowRuns,
  workflowStages,
} from "@/db/schema";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ runId: string }> };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getSourceBlocks(runId: string): Promise<SourceBlockForAnalysis[]> {
  const db = getDb();
  const rows = await db
    .select({
      documentId: workflowDocuments.id,
      fileName: workflowDocuments.filename,
      locator: sourceBlocks.locator,
      text: sourceBlocks.text,
    })
    .from(sourceBlocks)
    .innerJoin(workflowDocuments, eq(sourceBlocks.documentId, workflowDocuments.id))
    .where(eq(workflowDocuments.runId, runId))
    .orderBy(asc(workflowDocuments.createdAt), asc(sourceBlocks.ordinal));

  return rows;
}

async function writeStageMarkdown(
  runId: string,
  stageId: string,
  issues: DataQualityIssue[],
) {
  const markdown = createDataQualityAuditMarkdown({
    runId,
    createdAt: new Date().toISOString(),
    issues,
    decisions: [],
  });
  const blobKey = `runs/${runId}/02-data-quality.md`;
  const blob = await put(blobKey, markdown, {
    access: "private",
    addRandomSuffix: false,
    contentType: "text/markdown; charset=utf-8",
  });

  const db = getDb();
  await db
    .insert(workflowArtifacts)
    .values({
      runId,
      stageId,
      type: "stage_markdown",
      filename: "02-data-quality.md",
      blobKey: blob.pathname,
      contentType: "text/markdown; charset=utf-8",
      metadata: { url: blob.url, issueCount: issues.length },
    })
    .onConflictDoUpdate({
      target: workflowArtifacts.blobKey,
      set: {
        stageId,
        metadata: { url: blob.url, issueCount: issues.length },
      },
    });
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;

  try {
    const db = getDb();
    const [stage] = await db
      .select()
      .from(workflowStages)
      .where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "data_quality")))
      .limit(1);

    if (!stage) {
      return errorResponse(404, "DATA_QUALITY_STAGE_NOT_FOUND", "Data Quality has not run for this workflow yet.");
    }

    return NextResponse.json({ stage });
  } catch (error) {
    return errorResponse(500, "DATA_QUALITY_STATUS_FAILED", error instanceof Error ? error.message : "Unable to read Data Quality status.");
  }
}

export async function POST(_: Request, context: RouteContext) {
  if (!isOpenAIConfigured()) {
    return errorResponse(
      503,
      "OPENAI_NOT_CONFIGURED",
      "OPENAI_API_KEY is required to run Data Quality. Add it to the Vercel project environment and redeploy.",
    );
  }

  const { runId } = await context.params;

  try {
    const db = getDb();
    const [run] = await db.select({ id: workflowRuns.id }).from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return errorResponse(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");

    const [stage] = await db
      .insert(workflowStages)
      .values({ runId, type: "data_quality", status: "running", startedAt: new Date(), errorMessage: null })
      .onConflictDoUpdate({
        target: [workflowStages.runId, workflowStages.type],
        set: { status: "running", startedAt: new Date(), completedAt: null, errorMessage: null },
      })
      .returning();

    const blocks = await getSourceBlocks(runId);
    if (blocks.length === 0) {
      await db.update(workflowStages).set({ status: "failed", errorMessage: "No extracted source blocks are available.", completedAt: new Date() }).where(eq(workflowStages.id, stage.id));
      return errorResponse(409, "NO_EXTRACTED_CONTENT", "Upload and extract at least one supported document before running Data Quality.");
    }

    const issues = await analyzeDataQuality(blocks);
    const outputJson = { issues, generatedAt: new Date().toISOString(), sourceBlockCount: blocks.length };

    await db
      .update(workflowStages)
      .set({ status: "awaiting_review", outputJson, completedAt: new Date(), errorMessage: null })
      .where(eq(workflowStages.id, stage.id));

    await writeStageMarkdown(runId, stage.id, issues);

    return NextResponse.json({ stage: { id: stage.id, status: "awaiting_review", output: outputJson } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data Quality failed unexpectedly.";
    try {
      const db = getDb();
      await db
        .update(workflowStages)
        .set({ status: "failed", errorMessage: message, completedAt: new Date() })
        .where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "data_quality")));
    } catch {
      // Return the original analysis error even if persistence is also unavailable.
    }
    return errorResponse(500, "DATA_QUALITY_FAILED", message);
  }
}
