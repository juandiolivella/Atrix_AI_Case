import OpenAI from "openai";

import type { SourceBlockForAnalysis } from "./data-quality";

export type EnrichmentEvidence = { documentId: string; fileName: string; locator: string; excerpt: string };
export type EnrichmentSignal = {
  id: string;
  title: string;
  decisionQuestion: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  sourceDocuments: string[];
  evidence: EnrichmentEvidence[];
};

const schema = {
  type: "object", additionalProperties: false, required: ["signals"], properties: {
    signals: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "title", "decisionQuestion", "summary", "confidence", "sourceDocuments", "evidence"],
      properties: {
        id: { type: "string" }, title: { type: "string" }, decisionQuestion: { type: "string" }, summary: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] }, sourceDocuments: { type: "array", items: { type: "string" } },
        evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["documentId", "fileName", "locator", "excerpt"], properties: { documentId: { type: "string" }, fileName: { type: "string" }, locator: { type: "string" }, excerpt: { type: "string" } } } },
      },
    } },
  },
} as const;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function parseEnrichmentSignals(text: string): EnrichmentSignal[] {
  let candidate: unknown;
  try { candidate = JSON.parse(text); } catch { throw new Error("OpenAI returned invalid JSON for enrichment."); }
  const signals = candidate && typeof candidate === "object" && "signals" in candidate ? (candidate as { signals: unknown }).signals : null;
  if (!Array.isArray(signals) || signals.some((signal) => !isSignal(signal))) throw new Error("OpenAI returned an invalid enrichment response.");
  return signals;
}

function isSignal(value: unknown): value is EnrichmentSignal {
  if (!value || typeof value !== "object") return false;
  const signal = value as Partial<EnrichmentSignal>;
  return nonEmpty(signal.id) && nonEmpty(signal.title) && nonEmpty(signal.decisionQuestion) && nonEmpty(signal.summary)
    && ["high", "medium", "low"].includes(signal.confidence ?? "")
    && Array.isArray(signal.sourceDocuments) && signal.sourceDocuments.length > 0 && signal.sourceDocuments.every(nonEmpty)
    && Array.isArray(signal.evidence) && signal.evidence.length > 0 && signal.evidence.every((evidence) => evidence && nonEmpty(evidence.documentId) && nonEmpty(evidence.fileName) && nonEmpty(evidence.locator) && nonEmpty(evidence.excerpt));
}

export async function analyzeEnrichment(blocks: SourceBlockForAnalysis[]): Promise<EnrichmentSignal[]> {
  const source = blocks.slice(0, 80).map((block, index) => `SOURCE ${index + 1}\ndocumentId: ${block.documentId}\nfileName: ${block.fileName}\nlocator: ${block.locator}\ntext: ${block.text.slice(0, 1500)}`).join("\n\n---\n\n");
  const response = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).responses.create({
    model: "gpt-4.1-mini",
    instructions: "You are Atrix AI's evidence enrichment analyst. Cluster recurring, decision-relevant evidence into no more than 8 signals. Each signal must suggest one decision question, state only what the provided sources support, assign confidence based on source convergence, and cite exact evidence references from the inputs. Do not invent facts.",
    input: source,
    text: { format: { type: "json_schema", name: "enrichment_signals", strict: true, schema } },
  });
  return parseEnrichmentSignals(response.output_text);
}
