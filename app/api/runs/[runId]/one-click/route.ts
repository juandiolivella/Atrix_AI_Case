import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { reviewDecisions, workflowRuns } from "@/db/schema";
import { POST as dataQualityPost } from "../stages/data-quality/route";
import { POST as enrichmentPost } from "../stages/enrichment/route";
import { POST as prioritiesPost } from "../stages/priorities/route";
import { POST as actionTrackerPost } from "../stages/action-tracker/route";
import { POST as executiveReadoutPost } from "../stages/executive-readout/route";

export const runtime = "nodejs";
type Context = { params: Promise<{ runId: string }> };
const error = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
const requestFor = (body?: unknown) => new Request("https://atrix.local/one-click", { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
const subjectId = (runId: string, stage: string, id: string) => {
  const hash = createHash("sha256").update(`${runId}:${stage}:${id}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

async function jsonOrThrow(response: Response, stage: string) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message ?? `${stage} failed.`;
    throw new Error(message);
  }
  return response.json();
}

export async function POST(_: Request, context: Context) {
  const { runId } = await context.params;
  const routeContext = { params: Promise.resolve({ runId }) };
  try {
    const db = getDb();
    const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
    if (!run) return error(404, "RUN_NOT_FOUND", "The requested workflow run does not exist.");
    if (run.mode !== "one_click") return error(409, "ONE_CLICK_REQUIRED", "Create this run in One Click mode to auto-approve workflow decisions.");

    const quality = await jsonOrThrow(await dataQualityPost(requestFor(), routeContext), "Data Quality");
    const issues = quality.stage?.output?.issues ?? [];
    for (const issue of issues) await db.insert(reviewDecisions).values({ runId, subjectType: "issue", subjectId: subjectId(runId, "data_quality", issue.id), choice: "auto_approve", editedValue: { stage: "data_quality", issueId: issue.id }, isAutomatic: true });

    const enrichment = await jsonOrThrow(await enrichmentPost(requestFor(), routeContext), "Enrichment");
    const signals = enrichment.stage?.output?.signals ?? [];
    for (const signal of signals) await db.insert(reviewDecisions).values({ runId, subjectType: "insight", subjectId: subjectId(runId, "enrichment", signal.id), choice: "auto_approve", editedValue: { stage: "enrichment", signalId: signal.id }, isAutomatic: true });

    const priorities = await jsonOrThrow(await prioritiesPost(requestFor(), routeContext), "Priorities");
    const insights = priorities.stage?.output?.insights ?? [];
    for (const insight of insights) await db.insert(reviewDecisions).values({ runId, subjectType: "insight", subjectId: subjectId(runId, "priorities", insight.id), choice: "auto_approve", editedValue: { stage: "priorities", insightId: insight.id }, isAutomatic: true });

    await jsonOrThrow(await actionTrackerPost(requestFor(), routeContext), "Action Tracker");
    const deck = await executiveReadoutPost(requestFor(), routeContext);
    if (!deck.ok) await jsonOrThrow(deck, "Executive Readout");
    return new Response(deck.body, { status: 201, headers: { "Content-Type": deck.headers.get("Content-Type") ?? "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": deck.headers.get("Content-Disposition") ?? `attachment; filename="${runId}-executive-readout.pptx"`, "X-Atrix-One-Click": "all suggestions automatically approved; review sources and decisions in workspace" } });
  } catch (caught) { return error(500, "ONE_CLICK_FAILED", caught instanceof Error ? caught.message : "One Click workflow could not be completed."); }
}
