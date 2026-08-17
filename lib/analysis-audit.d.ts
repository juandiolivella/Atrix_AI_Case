export type IssueSeverity = "high" | "medium" | "low";
export type IssueConfidence = "high" | "medium" | "low";
export type DataQualityDecisionStatus = "approved" | "kept_raw" | "edited" | "pending";

export interface EvidenceReference {
  documentId: string;
  fileName: string;
  locator: string;
  excerpt: string;
}

export interface DataQualityIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  sourceDocuments: string[];
  affectedRecords: number;
  whatFound: string;
  suggestedCorrection: string;
  confidence: IssueConfidence;
  evidence: EvidenceReference[];
}

export interface DataQualityDecision {
  issueId: string;
  status: DataQualityDecisionStatus;
  decidedAt: string;
  rationale?: string;
}

export interface IntakeDocumentAudit {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  extractionStatus: string;
  extractedBlockCount: number;
}

export function validateDataQualityIssues(candidate: unknown):
  | { success: true; data: DataQualityIssue[] }
  | { success: false; errors: string[] };

export const DataQualityIssueSchema: {
  safeParse: typeof validateDataQualityIssues;
};

export const DataQualityDecisionStatuses: ReadonlySet<DataQualityDecisionStatus>;

export function createIntakeAuditMarkdown(input: {
  runId: string;
  createdAt: string;
  documents: IntakeDocumentAudit[];
}): string;

export function createDataQualityAuditMarkdown(input: {
  runId: string;
  createdAt: string;
  issues: DataQualityIssue[];
  decisions: DataQualityDecision[];
}): string;
