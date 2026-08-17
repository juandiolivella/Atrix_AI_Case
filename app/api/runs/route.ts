import {
  createWorkflowRun,
  listWorkflowRuns,
  type WorkflowMode,
} from "@/db/workflow-runs";

export const runtime = "nodejs";

const MAX_RUN_NAME_LENGTH = 255;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const status = message.includes("DATABASE_URL") ? 503 : 500;
  return Response.json({ error: message }, { status });
}

function parseCreateRunPayload(payload: unknown):
  | { success: true; value: { name: string; mode: WorkflowMode } }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "A JSON object is required." };
  }

  const { name, mode } = payload as { name?: unknown; mode?: unknown };
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    return { success: false, error: "name is required." };
  }
  if (normalizedName.length > MAX_RUN_NAME_LENGTH) {
    return {
      success: false,
      error: `name must be ${MAX_RUN_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (mode !== "human_in_the_loop" && mode !== "one_click") {
    return {
      success: false,
      error: "mode must be human_in_the_loop or one_click.",
    };
  }

  return { success: true, value: { name: normalizedName, mode } };
}

export async function GET() {
  try {
    const runs = await listWorkflowRuns();
    return Response.json({ runs });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseCreateRunPayload(payload);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const run = await createWorkflowRun(parsed.value);
    return Response.json({ run }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
