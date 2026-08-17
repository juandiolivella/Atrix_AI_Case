# Functional Workflow MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a persistent no-login Functional Workspace that processes real documents through an auditable data-quality stage while preserving the ASCO demo.

**Architecture:** The current static demo becomes an isolated route. A React Functional Workspace consumes server APIs backed by Postgres and private Blob storage. Extraction creates normalized source blocks; the analysis stage produces validated structured issues and stage Markdown artifacts.

**Tech Stack:** Next/Vinext, TypeScript, Drizzle ORM, Neon Postgres, Vercel Blob, OpenAI API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-17-functional-workflow-design.md`

## Global Constraints

- The ASCO demo remains unchanged and independent.
- Original documents, run data, and artifacts are persistent and private.
- API secrets are server-only Vercel environment variables.
- MVP accepts PDF, DOCX, PPTX, XLSX, and CSV; one bad file cannot block a run.
- Every AI issue must cite source-block identifiers belonging to the run.

---

### Task 1: Product entry and shared workflow types

**Files:**
- Create: `app/page.tsx`, `app/demo/page.tsx`, `app/workspace/page.tsx`
- Create: `lib/workflow/types.ts`
- Modify: `app/globals.css`
- Test: `tests/functional-workflow.test.mjs`

**Interfaces:**
- Produces `WorkflowMode`, `RunStatus`, `StageType`, and a Screen 0 route contract.

- [ ] Write a failing rendering test requiring `Explore demo` and `Start functional workflow` links.
- [ ] Implement Screen 0 and move the current demo to `/demo` without changing its content.
- [ ] Add `/workspace` as the Functional Workspace entry.
- [ ] Run `npm test` and commit `feat: add functional workspace entry`.

### Task 2: Persistent run and artifact schema

**Files:**
- Modify: `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`
- Create: `lib/workflow/repository.ts`, `app/api/runs/route.ts`, `app/api/runs/[runId]/route.ts`
- Test: `tests/workflow-repository.test.mjs`

**Interfaces:**
- Produces `createRun({ name, mode })`, `getRun(runId)`, and `createArtifact(runId, type, markdown)`.

- [ ] Write failing tests for run creation and independent artifact ownership.
- [ ] Define Drizzle tables for runs, documents, source blocks, stages, decisions, artifacts, and playbook rules.
- [ ] Implement typed repository methods and POST/GET run APIs.
- [ ] Run migrations against Neon, execute tests, and commit `feat: persist workflow runs`.

### Task 3: Private document upload and extraction

**Files:**
- Create: `app/api/runs/[runId]/documents/route.ts`, `lib/workflow/extract.ts`, `lib/workflow/blob.ts`
- Modify: `app/workspace/page.tsx`
- Test: `tests/extract.test.mjs`, `tests/documents-api.test.mjs`

**Interfaces:**
- Produces `extractDocument(document): SourceBlock[]` and a document status of `uploaded`, `extracted`, or `failed`.

- [ ] Write failing tests for supported MIME validation and CSV extraction into source blocks.
- [ ] Implement Blob upload, document persistence, and extraction for CSV plus a clear “queued for extraction” contract for PDF/DOCX/PPTX/XLSX.
- [ ] Add worker-backed format extractors for PDF/DOCX/PPTX/XLSX before production enablement.
- [ ] Run API/extractor tests and commit `feat: persist uploaded documents`.

### Task 4: Data-quality analysis, decisions, and audit Markdown

**Files:**
- Create: `app/api/runs/[runId]/stages/data-quality/route.ts`, `app/api/runs/[runId]/decisions/route.ts`, `lib/workflow/analyse.ts`, `lib/workflow/audit-markdown.ts`
- Modify: `app/workspace/page.tsx`
- Test: `tests/data-quality.test.mjs`, `tests/audit-markdown.test.mjs`

**Interfaces:**
- Produces validated `DataQualityIssue[]`, review decisions, `01-intake.md`, and `02-data-quality.md` artifacts.

- [ ] Write failing tests rejecting evidence references outside the active run.
- [ ] Implement OpenAI structured-output request, validation, source-reference checks, and stage status transitions.
- [ ] Persist approval decisions and regenerate stage Markdown on each decision.
- [ ] Render Step 2 from API data with source evidence links.
- [ ] Run full test/lint/build suite and commit `feat: analyse data quality with audit trail`.

### Task 5: Progression model for Steps 3–6 and playbook foundation

**Files:**
- Create: `app/api/playbook-rules/route.ts`, `lib/workflow/playbook.ts`
- Modify: `app/workspace/page.tsx`
- Test: `tests/playbook.test.mjs`

**Interfaces:**
- Produces a pending/approved playbook rule lifecycle and a One click decision record.

- [ ] Write failing tests showing pending rules do not apply automatically.
- [ ] Implement approved-rule lookup and automatic-decision recording.
- [ ] Add placeholder read-only Stage 3–6 states driven by persisted stage status; do not use demo data.
- [ ] Run all verification and commit `feat: establish reusable playbook rules`.

### Task 6: Configure and verify production

**Files:**
- Create: `.env.example`, `README.md` environment section
- Test: deployed Vercel workflow smoke test

- [ ] Document required `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `OPENAI_API_KEY` server-side variables.
- [ ] Add a startup health check that reports missing configuration without exposing secrets.
- [ ] Apply migrations, configure Vercel variables, deploy, and validate create-run → upload → extract → data-quality → artifact download.
- [ ] Commit `docs: document functional workflow deployment`.
