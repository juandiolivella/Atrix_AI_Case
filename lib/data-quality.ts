import OpenAI from "openai";

import {
  type DataQualityIssue,
  validateDataQualityIssues,
} from "./analysis-audit.js";
import { formatPlaybookGuidance } from "./playbook-guidance.js";

export type SourceBlockForAnalysis = {
  documentId: string;
  fileName: string;
  locator: string;
  text: string;
};

type ResponsesClient = Pick<OpenAI, "responses">;

const DATA_QUALITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issues"],
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "severity",
          "title",
          "sourceDocuments",
          "affectedRecords",
          "whatFound",
          "suggestedCorrection",
          "confidence",
          "evidence",
        ],
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          sourceDocuments: { type: "array", items: { type: "string" } },
          affectedRecords: { type: "integer", minimum: 0 },
          whatFound: { type: "string" },
          suggestedCorrection: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["documentId", "fileName", "locator", "excerpt"],
              properties: {
                documentId: { type: "string" },
                fileName: { type: "string" },
                locator: { type: "string" },
                excerpt: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const MAX_BLOCKS = 80;
const MAX_CHARACTERS_PER_BLOCK = 1_500;

export class DataQualityOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataQualityOutputError";
  }
}

export function isOpenAIConfigured(apiKey = process.env.OPENAI_API_KEY): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function buildDataQualityInput(blocks: SourceBlockForAnalysis[]): string {
  return blocks
    .slice(0, MAX_BLOCKS)
    .map(
      (block, index) =>
        [
          `SOURCE BLOCK ${index + 1}`,
          `documentId: ${block.documentId}`,
          `fileName: ${block.fileName}`,
          `locator: ${block.locator}`,
          "text:",
          block.text.slice(0, MAX_CHARACTERS_PER_BLOCK),
        ].join("\n"),
    )
    .join("\n\n---\n\n");
}

export function parseDataQualityIssues(outputText: string): DataQualityIssue[] {
  let candidate: unknown;

  try {
    candidate = JSON.parse(outputText);
  } catch {
    throw new DataQualityOutputError("OpenAI returned invalid JSON for data quality.");
  }

  const issues = candidate && typeof candidate === "object" && "issues" in candidate
    ? (candidate as { issues: unknown }).issues
    : undefined;
  const validation = validateDataQualityIssues(issues);

  if (!validation.success) {
    throw new DataQualityOutputError(
      `OpenAI returned an invalid data-quality response: ${validation.errors.join(" ")}`,
    );
  }

  return validation.data;
}

export async function analyzeDataQuality(
  blocks: SourceBlockForAnalysis[],
  client: ResponsesClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  playbookRules: readonly string[] = [],
): Promise<DataQualityIssue[]> {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions: [
      "You are Atrix AI's data-quality analyst.",
      "Identify only observable data-quality issues: missing values, conflicting values, naming variants, duplicated/template records, malformed fields, and unsupported inferences.",
      "Every issue needs one or more evidence references copied from the supplied source blocks.",
      "Use exact documentId, fileName, and locator values from the source blocks.",
      "Do not invent facts, identifiers, evidence, or record counts. If evidence is weak, set confidence to low.",
      "Return no more than 10 material issues, ordered high to low severity.",
      formatPlaybookGuidance(playbookRules),
    ].join(" "),
    input: buildDataQualityInput(blocks),
    text: {
      format: {
        type: "json_schema",
        name: "data_quality_issues",
        strict: true,
        schema: DATA_QUALITY_SCHEMA,
      },
    },
  });

  return parseDataQualityIssues(response.output_text);
}
