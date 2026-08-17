const SEVERITIES = new Set(["high", "medium", "low"]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const DECISION_STATUSES = new Set(["approved", "kept_raw", "edited", "pending"]);

/**
 * @typedef {{ documentId: string, fileName: string, locator: string, excerpt: string }} EvidenceReference
 * @typedef {{ id: string, severity: "high" | "medium" | "low", title: string, sourceDocuments: string[], affectedRecords: number, whatFound: string, suggestedCorrection: string, confidence: "high" | "medium" | "low", evidence: EvidenceReference[] }} DataQualityIssue
 * @typedef {{ issueId: string, status: "approved" | "kept_raw" | "edited" | "pending", decidedAt: string, rationale?: string }} DataQualityDecision
 */

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function titleCase(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Performs dependency-free runtime validation before AI output is persisted.
 * @param {unknown} candidate
 * @returns {{ success: true, data: DataQualityIssue[] } | { success: false, errors: string[] }}
 */
export function validateDataQualityIssues(candidate) {
  /** @type {string[]} */
  const errors = [];

  if (!Array.isArray(candidate)) {
    return { success: false, errors: ["Data-quality issues must be an array."] };
  }

  candidate.forEach((issue, issueIndex) => {
    const prefix = `Issue ${issueIndex + 1}`;
    if (!issue || typeof issue !== "object") {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    if (!hasText(issue.id)) errors.push(`${prefix} requires an id.`);
    if (!SEVERITIES.has(issue.severity)) errors.push(`${prefix} requires a high, medium, or low severity.`);
    if (!hasText(issue.title)) errors.push(`${prefix} requires a title.`);
    if (!Array.isArray(issue.sourceDocuments) || issue.sourceDocuments.length === 0 || !issue.sourceDocuments.every(hasText)) {
      errors.push(`${prefix} requires at least one source document.`);
    }
    if (!Number.isInteger(issue.affectedRecords) || issue.affectedRecords < 0) {
      errors.push(`${prefix} requires a non-negative whole number of affected records.`);
    }
    if (!hasText(issue.whatFound)) errors.push(`${prefix} requires a whatFound description.`);
    if (!hasText(issue.suggestedCorrection)) errors.push(`${prefix} requires a suggested correction.`);
    if (!CONFIDENCE_LEVELS.has(issue.confidence)) {
      errors.push(`${prefix} requires a high, medium, or low confidence level.`);
    }
    if (!Array.isArray(issue.evidence) || issue.evidence.length === 0) {
      errors.push(`${prefix} requires at least one evidence reference.`);
      return;
    }

    issue.evidence.forEach((evidence, evidenceIndex) => {
      const evidencePrefix = `${prefix} evidence ${evidenceIndex + 1}`;
      if (!evidence || typeof evidence !== "object") {
        errors.push(`${evidencePrefix} must be an object.`);
        return;
      }
      for (const field of ["documentId", "fileName", "locator", "excerpt"]) {
        if (!hasText(evidence[field])) errors.push(`${evidencePrefix} requires ${field}.`);
      }
    });
  });

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, data: /** @type {DataQualityIssue[]} */ (candidate) };
}

/**
 * @param {{ runId: string, createdAt: string, documents: Array<{ id: string, fileName: string, mimeType: string, sizeBytes: number, storageKey: string, extractionStatus: string, extractedBlockCount: number }> }} input
 */
export function createIntakeAuditMarkdown(input) {
  const documentRows = input.documents.map((document) => [
    document.fileName,
    document.mimeType,
    formatBytes(document.sizeBytes),
    document.extractionStatus,
    document.extractedBlockCount,
    `\`${document.storageKey}\``,
  ].map(markdownCell).join(" | "));

  return [
    "# 01 · Intake audit",
    "",
    `- **Run:** ${input.runId}`,
    `- **Created:** ${input.createdAt}`,
    `- **Documents received:** ${input.documents.length}`,
    "",
    "## Persisted documents",
    "",
    "| File | Type | Size | Extraction | Extracted blocks | Private storage key |",
    "| --- | --- | ---: | --- | ---: | --- |",
    ...documentRows.map((row) => `| ${row} |`),
    "",
    "## Audit note",
    "",
    "Original files are retained privately. The extracted block count is the traceability boundary used by downstream workflow stages.",
    "",
  ].join("\n");
}

/**
 * @param {{ runId: string, createdAt: string, issues: DataQualityIssue[], decisions: DataQualityDecision[] }} input
 */
export function createDataQualityAuditMarkdown(input) {
  const validation = validateDataQualityIssues(input.issues);
  if (!validation.success) {
    throw new TypeError(`Cannot create a data-quality audit: ${validation.errors.join(" ")}`);
  }

  const decisionsByIssue = new Map(input.decisions.map((decision) => [decision.issueId, decision]));
  const issueSections = input.issues.flatMap((issue, index) => {
    const decision = decisionsByIssue.get(issue.id);
    const decisionStatus = decision ? titleCase(decision.status) : "Pending";
    const evidenceRows = issue.evidence.map((evidence) => [
      evidence.fileName,
      evidence.locator,
      evidence.excerpt,
    ].map(markdownCell).join(" | "));

    return [
      `## ${index + 1}. ${issue.title}`,
      "",
      `- **Severity:** ${titleCase(issue.severity)}`,
      `- **Confidence:** ${titleCase(issue.confidence)}`,
      `- **Affected records:** ${issue.affectedRecords}`,
      `- **Source documents:** ${issue.sourceDocuments.map(markdownCell).join(", ")}`,
      `- **Decision:** ${decisionStatus}${decision ? ` (${decision.decidedAt})` : ""}`,
      `- **What Atrix found:** ${issue.whatFound}`,
      `- **Suggested correction:** ${issue.suggestedCorrection}`,
      ...(decision?.rationale ? [`- **Decision rationale:** ${decision.rationale}`] : []),
      "",
      "### Evidence",
      "",
      "| File | Locator | Source excerpt |",
      "| --- | --- | --- |",
      ...evidenceRows.map((row) => `| ${row} |`),
      "",
    ];
  });

  return [
    "# 02 · Data quality audit",
    "",
    `- **Run:** ${input.runId}`,
    `- **Created:** ${input.createdAt}`,
    `- **Issues assessed:** ${input.issues.length}`,
    "",
    ...issueSections,
  ].join("\n");
}

export const DataQualityIssueSchema = {
  safeParse: validateDataQualityIssues,
};

export const DataQualityDecisionStatuses = DECISION_STATUSES;
