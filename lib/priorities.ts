import OpenAI from "openai";

import type { EnrichmentEvidence, EnrichmentSignal } from "./enrichment";

export type PriorityLevel = "P3" | "P2" | "P1";
export type PrioritizedInsight = {
  id: string;
  priority: PriorityLevel;
  title: string;
  rationale: string;
  action: string;
  owner: string;
  confidence: "high" | "medium" | "low";
  sourceSignalIds: string[];
  evidence: EnrichmentEvidence[];
};

type ResponsesClient = Pick<OpenAI, "responses">;

const schema = {
  type: "object", additionalProperties: false, required: ["insights"], properties: {
    insights: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "priority", "title", "rationale", "action", "owner", "confidence", "sourceSignalIds", "evidence"],
      properties: {
        id: { type: "string" }, priority: { type: "string", enum: ["P3", "P2", "P1"] }, title: { type: "string" },
        rationale: { type: "string" }, action: { type: "string" }, owner: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] }, sourceSignalIds: { type: "array", items: { type: "string" } },
        evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["documentId", "fileName", "locator", "excerpt"], properties: { documentId: { type: "string" }, fileName: { type: "string" }, locator: { type: "string" }, excerpt: { type: "string" } } } },
      },
    } },
  },
} as const;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isEvidence = (value: unknown): value is EnrichmentEvidence => Boolean(value) && typeof value === "object" && nonEmpty((value as EnrichmentEvidence).documentId) && nonEmpty((value as EnrichmentEvidence).fileName) && nonEmpty((value as EnrichmentEvidence).locator) && nonEmpty((value as EnrichmentEvidence).excerpt);

function isInsight(value: unknown): value is PrioritizedInsight {
  if (!value || typeof value !== "object") return false;
  const insight = value as Partial<PrioritizedInsight>;
  return nonEmpty(insight.id) && ["P3", "P2", "P1"].includes(insight.priority ?? "") && nonEmpty(insight.title) && nonEmpty(insight.rationale) && nonEmpty(insight.action) && nonEmpty(insight.owner)
    && ["high", "medium", "low"].includes(insight.confidence ?? "") && Array.isArray(insight.sourceSignalIds) && insight.sourceSignalIds.length > 0 && insight.sourceSignalIds.every(nonEmpty)
    && Array.isArray(insight.evidence) && insight.evidence.length > 0 && insight.evidence.every(isEvidence);
}

export function parsePrioritizedInsights(text: string, signals: EnrichmentSignal[]): PrioritizedInsight[] {
  let candidate: unknown;
  try { candidate = JSON.parse(text); } catch { throw new Error("OpenAI returned invalid JSON for priorities."); }
  const insights = candidate && typeof candidate === "object" && "insights" in candidate ? (candidate as { insights: unknown }).insights : null;
  if (!Array.isArray(insights) || insights.some((insight) => !isInsight(insight))) throw new Error("OpenAI returned an invalid priorities response.");
  const parsedInsights = insights as PrioritizedInsight[];
  const signalIds = new Set(signals.map((signal) => signal.id));
  for (const insight of parsedInsights) {
    if (insight.sourceSignalIds.some((id) => !signalIds.has(id))) throw new Error("OpenAI returned an insight that references an unknown enrichment signal.");
  }
  return parsedInsights;
}

export function buildPrioritiesInput(signals: EnrichmentSignal[]): string {
  return signals.slice(0, 20).map((signal, index) => [
    `SIGNAL ${index + 1}`,
    `id: ${signal.id}`,
    `title: ${signal.title}`,
    `decisionQuestion: ${signal.decisionQuestion}`,
    `confidence: ${signal.confidence}`,
    `summary: ${signal.summary}`,
    "evidence:",
    ...signal.evidence.map((evidence) => `- documentId: ${evidence.documentId}; fileName: ${evidence.fileName}; locator: ${evidence.locator}; excerpt: ${evidence.excerpt}`),
  ].join("\n")).join("\n\n---\n\n");
}

export async function analyzePriorities(signals: EnrichmentSignal[], client: ResponsesClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })): Promise<PrioritizedInsight[]> {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions: "You are Atrix AI's prioritization analyst. Rank decision-ready insights derived from enrichment signals. P3 is critical/immediate: direct impact on near-term execution, act in days. P2 is important/near-term: strategy or cross-functional planning, act in weeks. P1 is monitor/lower priority: valuable signal but not urgent. Every insight must name a concrete action and a suggested functional owner; owners are inferred, not confirmed. Keep confidence aligned to source convergence. Cite only exact evidence supplied in the signals and use their exact signal ids. Do not invent facts. Return no more than 8 insights ordered P3, P2, P1.",
    input: buildPrioritiesInput(signals),
    text: { format: { type: "json_schema", name: "prioritized_insights", strict: true, schema } },
  });
  return parsePrioritizedInsights(response.output_text, signals);
}
