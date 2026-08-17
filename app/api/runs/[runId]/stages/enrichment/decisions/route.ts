import { put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { reviewDecisions, workflowArtifacts, workflowStages } from "@/db/schema";
import { createEnrichmentAuditMarkdown } from "@/lib/analysis-audit";
import { isEnrichmentSignal, type EnrichmentSignal } from "@/lib/enrichment";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ runId: string }> };
type ReviewChoice = "approve" | "edit";
type StoredDecision = { signalId: string; choice: ReviewChoice; createdAt: Date };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function deterministicSignalSubjectId(runId: string, signalId: string) {
  const hash = createHash("sha256").update(`${runId}:${signalId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getSignals(outputJson: unknown): EnrichmentSignal[] | null {
  if (!outputJson || typeof outputJson !== "object" || !("signals" in outputJson)) return null;
  const signals = (outputJson as { signals: unknown }).signals;
  return Array.isArray(signals) && signals.every(isEnrichmentSignal) ? signals : null;
}

async function getLatestDecisions(runId: string): Promise<StoredDecision[]> {
  const db = getDb();
  const rows = await db
    .select({ choice: reviewDecisions.choice, editedValue: reviewDecisions.editedValue, createdAt: reviewDecisions.createdAt })
    .from(reviewDecisions)
    .where(and(eq(reviewDecisions.runId, runId), eq(reviewDecisions.subjectType, "insight")))
    .orderBy(desc(reviewDecisions.createdAt), desc(reviewDecisions.id));

  const latest = new Map<string, StoredDecision>();
  for (const row of rows) {
    const signalId = row.editedValue && typeof row.editedValue === "object" && "signalId" in row.editedValue
      ? (row.editedValue as { signalId?: unknown }).signalId
      : null;
    if (typeof signalId !== "string" || latest.has(signalId)) continue;
    if (row.choice !== "approve" && row.choice !== "edit") continue;
    latest.set(signalId, { signalId, choice: row.choice, createdAt: row.createdAt });
  }
  return [...latest.values()];
}

async function writeUpdatedAudit(runId: string, stageId: string, signals: EnrichmentSignal[], decisions: StoredDecision[]) {
  const markdown = createEnrichmentAuditMarkdown({
    runId,
    createdAt: new Date().toISOString(),
    signals,
    decisions: decisions.map((decision) => ({
      signalId: decision.signalId,
      status: decision.choice === "approve" ? "approved" : "edited",
      decidedAt: decision.createdAt.toISOString(),
    })),
  });
  const blobKey = `runs/${runId}/03-enrichment.md`;
  const blob = await put(blobKey, markdown, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/markdown; charset=utf-8",
  });

  const db = getDb();
  await db
    .insert(workflowArtifacts)
    .values({
      runId,
      stageId,
      type: "stage_markdown",
      filename: "03-enrichment.md",
      blobKey: blob.pathname,
      contentType: "text/markdown; charset=utf-8",
      metadata: { url: blob.url, signalCount: signals.length, decisionCount: decisions.length },
    })
    .onConflictDoUpdate({
      target: workflowArtifacts.blobKey,
      set: { stageId, metadata: { url: blob.url, signalCount: signals.length, decisionCount: decisions.length } },
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
  let body: { signalId?: unknown; choice?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  if (typeof body.signalId !== "string" || (body.choice !== "approve" && body.choice !== "edit")) {
    return errorResponse(400, "INVALID_DECISION", "signalId and a choice of approve or edit are required.");
  }

  try {
    const db = getDb();
    const [stage] = await db
      .select()
      .from(workflowStages)
      .where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "enrichment")))
      .limit(1);
    const signals = stage ? getSignals(stage.outputJson) : null;
    if (!stage || !signals) return errorResponse(409, "ENRICHMENT_NOT_READY", "Run Enrichment before reviewing its suggestions.");
    if (!signals.some((signal) => signal.id === body.signalId)) return errorResponse(404, "SIGNAL_NOT_FOUND", "The requested signal does not belong to this run.");

    const [decision] = await db
      .insert(reviewDecisions)
      .values({
        runId,
        subjectType: "insight",
        subjectId: deterministicSignalSubjectId(runId, body.signalId),
        choice: body.choice,
        editedValue: { signalId: body.signalId },
      })
      .returning();
    const decisions = await getLatestDecisions(runId);
    await writeUpdatedAudit(runId, stage.id, signals, decisions);
    return NextResponse.json({ decision, decisions }, { status: 201 });
  } catch (error) {
    return errorResponse(500, "DECISION_SAVE_FAILED", error instanceof Error ? error.message : "Unable to save the decision.");
  }
}
