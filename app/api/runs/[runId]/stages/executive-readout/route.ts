import { put } from "@vercel/blob";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { workflowArtifacts, workflowRuns, workflowStages } from "@/db/schema";
import { buildExecutiveReadoutDeck, executiveReadoutFilename } from "@/lib/executive-readout";
import type { PrioritizedInsight } from "@/lib/priorities";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ runId: string }> };
type PrioritiesOutput = { insights?: PrioritizedInsight[] };
const DECK_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function getInsights(output: unknown): PrioritizedInsight[] | null {
  if (!output || typeof output !== "object" || !("insights" in output)) return null;
  const insights = (output as PrioritiesOutput).insights;
  if (!Array.isArray(insights) || insights.length === 0) return null;
  return insights.every((insight) => insight && typeof insight.id === "string" && typeof insight.title === "string" && Array.isArray(insight.evidence))
    ? insights
    : null;
}

export async function GET(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  try {
    const db = getDb();
    const [stage, artifact] = await Promise.all([
      db.select().from(workflowStages).where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "executive_readout"))).limit(1),
      db.select({ id: workflowArtifacts.id, filename: workflowArtifacts.filename, createdAt: workflowArtifacts.createdAt, metadata: workflowArtifacts.metadata })
        .from(workflowArtifacts).where(and(eq(workflowArtifacts.runId, runId), eq(workflowArtifacts.type, "deck"))).orderBy(desc(workflowArtifacts.createdAt)).limit(1),
    ]);
    if (!stage[0]) return error(404, "EXECUTIVE_READOUT_NOT_FOUND", "The executive readout has not been generated for this workflow yet.");
    return NextResponse.json({ stage: stage[0], artifact: artifact[0] ?? null });
  } catch (caught) {
    return error(500, "EXECUTIVE_READOUT_STATUS_FAILED", caught instanceof Error ? caught.message : "Unable to read executive readout status.");
  }
}

export async function POST(_: Request, context: RouteContext) {
  const { runId } = await context.params;
  const db = getDb();
  let stageId: string | undefined;
  try {
    const [run] = await db.select({ id: workflowRuns.id, name: workflowRuns.name }).from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return error(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");

    const [priorities] = await db.select({ outputJson: workflowStages.outputJson }).from(workflowStages)
      .where(and(eq(workflowStages.runId, runId), eq(workflowStages.type, "priorities"))).limit(1);
    const insights = getInsights(priorities?.outputJson);
    if (!insights) return error(409, "PRIORITIES_REQUIRED", "Run Prioritize Insights before generating the executive readout.");

    const [stage] = await db.insert(workflowStages).values({ runId, type: "executive_readout", status: "running", startedAt: new Date(), completedAt: null, errorMessage: null })
      .onConflictDoUpdate({ target: [workflowStages.runId, workflowStages.type], set: { status: "running", startedAt: new Date(), completedAt: null, errorMessage: null } }).returning({ id: workflowStages.id });
    stageId = stage.id;
    const filename = executiveReadoutFilename(run.name);
    const deck = await buildExecutiveReadoutDeck({ runId, runName: run.name, insights });
    const blobKey = `runs/${runId}/05-executive-readout.pptx`;
    const blob = await put(blobKey, deck, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: DECK_CONTENT_TYPE });
    const sourceCount = new Set(insights.flatMap((insight) => insight.evidence.map((evidence) => evidence.fileName))).size;
    const output = { generatedAt: new Date().toISOString(), filename, insightCount: insights.length, sourceCount };
    await db.update(workflowStages).set({ status: "completed", outputJson: output, completedAt: new Date(), errorMessage: null }).where(eq(workflowStages.id, stageId));
    await db.insert(workflowArtifacts).values({ runId, stageId, type: "deck", filename, blobKey: blob.pathname, contentType: DECK_CONTENT_TYPE, metadata: { byteSize: deck.byteLength, insightCount: insights.length, sourceCount } })
      .onConflictDoUpdate({ target: workflowArtifacts.blobKey, set: { stageId, filename, metadata: { byteSize: deck.byteLength, insightCount: insights.length, sourceCount } } });

    return new Response(new Uint8Array(deck), { status: 201, headers: {
      "Content-Type": DECK_CONTENT_TYPE,
      "Content-Length": String(deck.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    } });
  } catch (caught) {
    if (stageId) await db.update(workflowStages).set({ status: "failed", completedAt: new Date(), errorMessage: caught instanceof Error ? caught.message : "Executive readout generation failed." }).where(eq(workflowStages.id, stageId)).catch(() => undefined);
    return error(500, "EXECUTIVE_READOUT_FAILED", caught instanceof Error ? caught.message : "Executive readout generation failed.");
  }
}
