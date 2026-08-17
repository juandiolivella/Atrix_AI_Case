CREATE TYPE "public"."artifact_type" AS ENUM('stage_markdown', 'deck', 'tracker_export');--> statement-breakpoint
CREATE TYPE "public"."decision_choice" AS ENUM('approve', 'keep_raw', 'edit', 'reject', 'auto_approve');--> statement-breakpoint
CREATE TYPE "public"."decision_subject_type" AS ENUM('document', 'issue', 'insight', 'todo', 'playbook_rule');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'extracting', 'extracted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."playbook_rule_status" AS ENUM('pending', 'approved', 'retired');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('draft', 'uploading', 'extracting', 'reviewing', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'running', 'awaiting_review', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('intake', 'data_quality', 'enrichment', 'priorities', 'executive_readout', 'action_tracker');--> statement-breakpoint
CREATE TYPE "public"."workflow_mode" AS ENUM('human_in_the_loop', 'one_click');--> statement-breakpoint
CREATE TABLE "playbook_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(128) NOT NULL,
	"rule" text NOT NULL,
	"status" "playbook_rule_status" DEFAULT 'pending' NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"source_run_id" uuid,
	"approved_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"subject_type" "decision_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"choice" "decision_choice" NOT NULL,
	"rationale" text,
	"edited_value" jsonb,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"playbook_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"locator" varchar(255) NOT NULL,
	"ordinal" integer NOT NULL,
	"text" text NOT NULL,
	"table_json" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"stage_id" uuid,
	"type" "artifact_type" NOT NULL,
	"filename" varchar(512) NOT NULL,
	"blob_key" text NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"blob_key" text NOT NULL,
	"filename" varchar(512) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"byte_size" integer NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"mode" "workflow_mode" NOT NULL,
	"status" "run_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"type" "stage_type" NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"input_version" integer DEFAULT 1 NOT NULL,
	"output_json" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playbook_rules" ADD CONSTRAINT "playbook_rules_source_run_id_workflow_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_playbook_rule_id_playbook_rules_id_fk" FOREIGN KEY ("playbook_rule_id") REFERENCES "public"."playbook_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_blocks" ADD CONSTRAINT "source_blocks_document_id_workflow_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."workflow_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_artifacts" ADD CONSTRAINT "workflow_artifacts_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_artifacts" ADD CONSTRAINT "workflow_artifacts_stage_id_workflow_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."workflow_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_documents" ADD CONSTRAINT "workflow_documents_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_rules_status_idx" ON "playbook_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "playbook_rules_source_run_idx" ON "playbook_rules" USING btree ("source_run_id");--> statement-breakpoint
CREATE INDEX "review_decisions_run_id_idx" ON "review_decisions" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "review_decisions_subject_idx" ON "review_decisions" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "source_blocks_document_id_idx" ON "source_blocks" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_blocks_document_ordinal_idx" ON "source_blocks" USING btree ("document_id","ordinal");--> statement-breakpoint
CREATE INDEX "workflow_artifacts_run_id_idx" ON "workflow_artifacts" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_artifacts_blob_key_idx" ON "workflow_artifacts" USING btree ("blob_key");--> statement-breakpoint
CREATE INDEX "workflow_documents_run_id_idx" ON "workflow_documents" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_documents_blob_key_idx" ON "workflow_documents" USING btree ("blob_key");--> statement-breakpoint
CREATE INDEX "workflow_runs_created_at_idx" ON "workflow_runs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_stages_run_type_idx" ON "workflow_stages" USING btree ("run_id","type");--> statement-breakpoint
CREATE INDEX "workflow_stages_run_id_idx" ON "workflow_stages" USING btree ("run_id");