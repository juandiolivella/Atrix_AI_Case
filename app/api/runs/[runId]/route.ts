import { getWorkflowRunById } from "@/db/workflow-runs";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  if (!isUuid(runId)) {
    return Response.json({ error: "run id must be a UUID." }, { status: 400 });
  }

  try {
    const run = await getWorkflowRunById(runId);
    if (!run) {
      return Response.json({ error: "Run not found." }, { status: 404 });
    }
    return Response.json({ run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("DATABASE_URL") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
