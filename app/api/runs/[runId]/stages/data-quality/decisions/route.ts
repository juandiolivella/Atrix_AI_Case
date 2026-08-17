import { put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { getDb } from "@/db";
import { reviewDecisions, workflowArtifacts, workflowStages } from "@/db/schema";
import {
  createDataQualityAuditMarkdown,
  DataQualityIssueSchema,
  type DataQualityIssue,
} from "@/lib/analysis-audit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ runId: string }> };
type ReviewChoice = "approve" | "keep_raw";

type StoredDecision = {
  issueId: string;
  choice: ReviewChoice;
  createdAt: Date;
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function deterministicIssueSubjectId(runId: string, issueId: string) {
  const hash = createHash("sha256").update(`${runId}:${issueId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getIssues(outputJson: unknown): DataQualityIssue[] | null {
  if (!outputJson || typeof outputJson !== "object" || !("issues" in outputJson)) return null;
  const parsed = DataQualityIssueSchema.safeParse((outputJson as { issues: unknown }).issues);
  return parsed.success ? parsed.data : null;
}

async function getLatestDecisions(runId: string): Promise<StoredDecision[]> {
  const db = getDb();
  const rows = await db
    .select({ choice: reviewDecisions.choice, editedValue: reviewDecisions.editedValue, createdAt: reviewDecisions.createdAt })
    .from(reviewDecisions)
    .where(and(eq(reviewDecisions.runId, runId), eq(reviewDecisions.subjectType, "issue")))
    .orderBy(desc(reviewDecisions.createdAt), desc(reviewDecisions.id));

  const latest = new Map<string, StoredDecision>();
  for (const row of rows) {
    const issueId = row.editedValue && typeof row.editedValue === "object" && "issueId" in row.editedValue
      ? (row.editedValue as { issueId?: unknown }).issueId
      : null;
    if (typeof issueId !== "string" || latest.has(issueId)) continue;
    if (row.choice !== "approve" && row.choice !== "keep_raw") continue;
    latest.set(issueId, { issueId, choice: row.choice, createdAt: row.createdAt });
  }
  return [...latest.values()];
}

async function writeUpdatedAudit(runId: string, stageId: string, issues: DataQualityIssue[], decisions: StoredDecision[]) {
  const markdown = createDataQualityAuditMarkdown({
    runId,
    createdAt: new Date().toISOString(),
    issues,
    decisions: decisions.map((decision) => ({
      issueId: decision.issueId,
      status: decision.choice === "approve" ? "approved" : "kept_raw",
      decidedAt: decision.createdAt.toISOString(),
    })),
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
      metadata: { url: blob.url, issueCount: issues.length, decisionCount: decisions.length },
    })
    .onConflictDoUpdate({
      target: workflowArtifacts.blobKey,
      set: { stageId, metadata: { url: blob.url, issueCount: issues.length, decisionCount: decisions.length } },
    });
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  try {
    return NextResponse.json({ decisions: await getLatestDecisions(runId) });
  } catch (error) {
    return errorResponse(500, "DECISIONS_READ_FAILED", error instanceof Error ? error.message : "Unable to load decisions.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { runId } = await context.params;
  let body: { issueId?: unknown; choice?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  if (typeof body.issueId !== "string" || (body.choice !== "approve" && body.choice !== "keep_raw")) {
    return errorResponse(400, "INVALID_DECISION", "issueId and a choice of approve or keep_raw are required.");
  }

  try {
    const db = getDb();
    const [stage] = await db
      .select()
      .from(workflowStages)
      .where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "data_quality")))
      .limit(1);
    const issues = stage ? getIssues(stage.outputJson) : null;
    if (!stage || !issues) return errorResponse(409, "DATA_QUALITY_NOT_READY", "Run Data Quality before reviewing its suggestions.");
    if (!issues.some((issue) => issue.id === body.issueId)) return errorResponse(404, "ISSUE_NOT_FOUND", "The requested issue does not belong to this run.");

    const [decision] = await db
      .insert(reviewDecisions)
      .values({
        runId,
        subjectType: "issue",
        subjectId: deterministicIssueSubjectId(runId, body.issueId),
        choice: body.choice,
        editedValue: { issueId: body.issueId },
      })
      .returning();
    const decisions = await getLatestDecisions(runId);
    await writeUpdatedAudit(runId, stage.id, issues, decisions);
    return NextResponse.json({ decision, decisions }, { status: 201 });
  } catch (error) {
    return errorResponse(500, "DECISION_SAVE_FAILED", error instanceof Error ? error.message : "Unable to save the decision.");
  }
}
