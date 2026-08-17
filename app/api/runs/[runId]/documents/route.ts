import { put } from "@vercel/blob";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { sourceBlocks, workflowDocuments, workflowRuns } from "@/db/schema";
import { uploadDocuments } from "@/lib/documents/upload";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const db = getDb();
  const run = await findRun(runId);

  if (!run) {
    return Response.json({ error: "Run not found." }, { status: 404 });
  }

  const documents = await db
    .select({
      id: workflowDocuments.id,
      filename: workflowDocuments.filename,
      mimeType: workflowDocuments.mimeType,
      byteSize: workflowDocuments.byteSize,
      status: workflowDocuments.status,
      errorMessage: workflowDocuments.errorMessage,
      metadata: workflowDocuments.metadata,
      createdAt: workflowDocuments.createdAt,
      updatedAt: workflowDocuments.updatedAt,
    })
    .from(workflowDocuments)
    .where(eq(workflowDocuments.runId, runId))
    .orderBy(asc(workflowDocuments.createdAt));

  return Response.json({ documents });
}

export async function POST(request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const formData = await request.formData();
  const files = formData.getAll("files").filter(isFile);

  if (files.length === 0) {
    return Response.json(
      { error: "Upload at least one file using the 'files' field." },
      { status: 400 },
    );
  }

  const db = getDb();
  const run = await findRun(runId);
  if (!run) {
    return Response.json({ error: "Run not found." }, { status: 404 });
  }

  try {
    const documents = await uploadDocuments({
      runId,
      files,
      storage: { put },
      persistence: {
        insertDocument: (document) => db.insert(workflowDocuments).values(document),
        updateDocument: (id, patch) => db
          .update(workflowDocuments)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(workflowDocuments.id, id)),
        insertSourceBlocks: (blocks) => db.insert(sourceBlocks).values(blocks),
      },
    });

    return Response.json({ documents }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document upload failed.";
    const status = message.startsWith("Unsupported file format") || message === "At least one file is required."
      ? 400
      : 500;
    return Response.json({ error: message }, { status });
  }
}

async function findRun(runId: string) {
  const db = getDb();
  const [run] = await db
    .select({ id: workflowRuns.id })
    .from(workflowRuns)
    .where(and(eq(workflowRuns.id, runId)))
    .limit(1);
  return run;
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string" && value instanceof File;
}
