import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workflowMode = pgEnum("workflow_mode", [
  "human_in_the_loop",
  "one_click",
]);

export const runStatus = pgEnum("run_status", [
  "draft",
  "uploading",
  "extracting",
  "reviewing",
  "processing",
  "completed",
  "failed",
]);

export const documentStatus = pgEnum("document_status", [
  "uploaded",
  "extracting",
  "extracted",
  "failed",
]);

export const stageType = pgEnum("stage_type", [
  "intake",
  "data_quality",
  "enrichment",
  "priorities",
  "executive_readout",
  "action_tracker",
]);

export const stageStatus = pgEnum("stage_status", [
  "pending",
  "running",
  "awaiting_review",
  "completed",
  "failed",
]);

export const decisionSubjectType = pgEnum("decision_subject_type", [
  "document",
  "issue",
  "insight",
  "todo",
  "playbook_rule",
]);

export const decisionChoice = pgEnum("decision_choice", [
  "approve",
  "keep_raw",
  "edit",
  "reject",
  "auto_approve",
]);

export const artifactType = pgEnum("artifact_type", [
  "stage_markdown",
  "deck",
  "tracker_export",
]);

export const playbookRuleStatus = pgEnum("playbook_rule_status", [
  "pending",
  "approved",
  "retired",
]);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    mode: workflowMode("mode").notNull(),
    status: runStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workflow_runs_created_at_idx").on(table.createdAt)],
);

export const workflowDocuments = pgTable(
  "workflow_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    blobKey: text("blob_key").notNull(),
    filename: varchar("filename", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    status: documentStatus("status").notNull().default("uploaded"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflow_documents_run_id_idx").on(table.runId),
    uniqueIndex("workflow_documents_blob_key_idx").on(table.blobKey),
  ],
);

export const sourceBlocks = pgTable(
  "source_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => workflowDocuments.id, { onDelete: "cascade" }),
    locator: varchar("locator", { length: 255 }).notNull(),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    tableJson: jsonb("table_json").$type<unknown>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("source_blocks_document_id_idx").on(table.documentId),
    uniqueIndex("source_blocks_document_ordinal_idx").on(table.documentId, table.ordinal),
  ],
);

export const workflowStages = pgTable(
  "workflow_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    type: stageType("type").notNull(),
    status: stageStatus("status").notNull().default("pending"),
    inputVersion: integer("input_version").notNull().default(1),
    outputJson: jsonb("output_json").$type<unknown>(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workflow_stages_run_type_idx").on(table.runId, table.type),
    index("workflow_stages_run_id_idx").on(table.runId),
  ],
);

export const reviewDecisions = pgTable(
  "review_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    subjectType: decisionSubjectType("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    choice: decisionChoice("choice").notNull(),
    rationale: text("rationale"),
    editedValue: jsonb("edited_value").$type<unknown>(),
    isAutomatic: boolean("is_automatic").notNull().default(false),
    playbookRuleId: uuid("playbook_rule_id").references(() => playbookRules.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("review_decisions_run_id_idx").on(table.runId),
    index("review_decisions_subject_idx").on(table.subjectType, table.subjectId),
  ],
);

export const workflowArtifacts = pgTable(
  "workflow_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").references(() => workflowStages.id, { onDelete: "set null" }),
    type: artifactType("type").notNull(),
    filename: varchar("filename", { length: 512 }).notNull(),
    blobKey: text("blob_key").notNull(),
    contentType: varchar("content_type", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workflow_artifacts_run_id_idx").on(table.runId),
    uniqueIndex("workflow_artifacts_blob_key_idx").on(table.blobKey),
  ],
);

export const playbookRules = pgTable(
  "playbook_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 128 }).notNull(),
    rule: text("rule").notNull(),
    status: playbookRuleStatus("status").notNull().default("pending"),
    evidenceCount: integer("evidence_count").notNull().default(0),
    sourceRunId: uuid("source_run_id").references(() => workflowRuns.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("playbook_rules_status_idx").on(table.status),
    index("playbook_rules_source_run_idx").on(table.sourceRunId),
  ],
);

export const workflowRunsRelations = relations(workflowRuns, ({ many }) => ({
  documents: many(workflowDocuments),
  stages: many(workflowStages),
  decisions: many(reviewDecisions),
  artifacts: many(workflowArtifacts),
  proposedPlaybookRules: many(playbookRules),
}));

export const workflowDocumentsRelations = relations(workflowDocuments, ({ one, many }) => ({
  run: one(workflowRuns, {
    fields: [workflowDocuments.runId],
    references: [workflowRuns.id],
  }),
  sourceBlocks: many(sourceBlocks),
}));

export const sourceBlocksRelations = relations(sourceBlocks, ({ one }) => ({
  document: one(workflowDocuments, {
    fields: [sourceBlocks.documentId],
    references: [workflowDocuments.id],
  }),
}));

export const workflowStagesRelations = relations(workflowStages, ({ one, many }) => ({
  run: one(workflowRuns, {
    fields: [workflowStages.runId],
    references: [workflowRuns.id],
  }),
  artifacts: many(workflowArtifacts),
}));

export const reviewDecisionsRelations = relations(reviewDecisions, ({ one }) => ({
  run: one(workflowRuns, {
    fields: [reviewDecisions.runId],
    references: [workflowRuns.id],
  }),
  playbookRule: one(playbookRules, {
    fields: [reviewDecisions.playbookRuleId],
    references: [playbookRules.id],
  }),
}));

export const workflowArtifactsRelations = relations(workflowArtifacts, ({ one }) => ({
  run: one(workflowRuns, {
    fields: [workflowArtifacts.runId],
    references: [workflowRuns.id],
  }),
  stage: one(workflowStages, {
    fields: [workflowArtifacts.stageId],
    references: [workflowStages.id],
  }),
}));

export const playbookRulesRelations = relations(playbookRules, ({ one, many }) => ({
  sourceRun: one(workflowRuns, {
    fields: [playbookRules.sourceRunId],
    references: [workflowRuns.id],
  }),
  decisions: many(reviewDecisions),
}));
