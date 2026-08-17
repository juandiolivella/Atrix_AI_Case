import OpenAI from "openai";

import type { EnrichmentEvidence } from "./enrichment";
import type { PrioritizedInsight } from "./priorities";

export type ActionStatus = "not_started" | "in_progress" | "blocked" | "done";
export type ActionItem = { id: string; title: string; description: string; priority: "P3" | "P2" | "P1"; owner: string; deadline: string; status: ActionStatus; sourceInsightIds: string[]; evidence: EnrichmentEvidence[] };
type ResponsesClient = Pick<OpenAI, "responses">;

const isString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
function isItem(value: unknown): value is ActionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ActionItem>;
  return isString(item.id) && isString(item.title) && isString(item.description) && ["P3", "P2", "P1"].includes(item.priority ?? "") && isString(item.owner) && isString(item.deadline) && ["not_started", "in_progress", "blocked", "done"].includes(item.status ?? "") && Array.isArray(item.sourceInsightIds) && item.sourceInsightIds.every(isString) && Array.isArray(item.evidence);
}

export function parseActionItems(text: string, insights: PrioritizedInsight[]): ActionItem[] {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("OpenAI returned invalid JSON for action tracking."); }
  const items = parsed && typeof parsed === "object" && "items" in parsed ? (parsed as { items?: unknown }).items : null;
  if (!Array.isArray(items) || items.some((item) => !isItem(item))) throw new Error("OpenAI returned an invalid action tracker response.");
  const parsedItems = items as ActionItem[];
  const ids = new Set(insights.map((insight) => insight.id));
  if (parsedItems.some((item) => item.sourceInsightIds.some((id: string) => !ids.has(id)))) throw new Error("OpenAI returned an action item that references an unknown priority insight.");
  return parsedItems;
}

export function toTrackerCsv(items: ActionItem[]) {
  const quote = (value: string) => /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
  return ["To Do,Description,Priority,Owner,Deadline,Status,Source insights", ...items.map((item) => [item.title, item.description, item.priority, item.owner, item.deadline, item.status, item.sourceInsightIds.join("; ")].map(quote).join(","))].join("\n");
}

const actionTrackerSchema = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: {
    items: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["id", "title", "description", "priority", "owner", "deadline", "status", "sourceInsightIds", "evidence"],
      properties: {
        id: { type: "string" }, title: { type: "string" }, description: { type: "string" },
        priority: { type: "string", enum: ["P3", "P2", "P1"] }, owner: { type: "string" }, deadline: { type: "string" },
        status: { type: "string", enum: ["not_started", "in_progress", "blocked", "done"] },
        sourceInsightIds: { type: "array", items: { type: "string" } },
        evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["documentId", "fileName", "locator", "excerpt"], properties: { documentId: { type: "string" }, fileName: { type: "string" }, locator: { type: "string" }, excerpt: { type: "string" } } } },
      },
    } },
  },
} as const;

export async function analyzeActionItems(insights: PrioritizedInsight[], client: ResponsesClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })): Promise<ActionItem[]> {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions: "You are Atrix AI's action tracker. Convert prioritized insights into concise, executable work items. Keep owners as suggested/inferred, use deadline wording based on P3/P2/P1, set status to not_started, and cite only the supplied insight IDs and evidence. Do not invent facts.",
    input: JSON.stringify({ insights }),
    text: { format: { type: "json_schema", name: "action_tracker", strict: true, schema: actionTrackerSchema } },
  });
  return parseActionItems(response.output_text, insights);
}
