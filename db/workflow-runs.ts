import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { workflowDocuments, workflowRuns, workflowStages } from "./schema";

export const WORKFLOW_STAGE_TYPES = [
  "intake",
  "data_quality",
  "enrichment",
  "priorities",
  "executive_readout",
  "action_tracker",
] as const;

export type WorkflowMode = "human_in_the_loop" | "one_click";

export type CreateWorkflowRunInput = {
  name: string;
  mode: WorkflowMode;
};

type Database = ReturnType<typeof getDb>;

/**
 * Creates a durable workflow run and its six deterministic stage records.
 * A run is usable immediately after this succeeds: uploads and processing
 * can safely attach to its id without having to infer missing stages.
 */
export async function createWorkflowRun(
  input: CreateWorkflowRunInput,
  database: Database = getDb(),
) {
  return database.transaction(async (tx) => {
    const [run] = await tx
      .insert(workflowRuns)
      .values({ name: input.name, mode: input.mode })
      .returning();

    const stages = await tx
      .insert(workflowStages)
      .values(WORKFLOW_STAGE_TYPES.map((type) => ({ runId: run.id, type })))
      .returning();

    return { ...run, documents: [], stages };
  });
}

export async function listWorkflowRuns(database: Database = getDb()) {
  return database
    .select()
    .from(workflowRuns)
    .orderBy(desc(workflowRuns.createdAt), desc(workflowRuns.id));
}

/**
 * Returns only records owned by a run so that every downstream view can be
 * rendered from one traceable, persisted resource.
 */
export async function getWorkflowRunById(
  runId: string,
  database: Database = getDb(),
) {
  const [run] = await database
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, runId))
    .limit(1);

  if (!run) {
    return null;
  }

  const [documents, stages] = await Promise.all([
    database
      .select()
      .from(workflowDocuments)
      .where(eq(workflowDocuments.runId, runId))
      .orderBy(desc(workflowDocuments.createdAt), desc(workflowDocuments.id)),
    database
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.runId, runId))
      .orderBy(workflowStages.createdAt),
  ]);

  return { ...run, documents, stages };
}
