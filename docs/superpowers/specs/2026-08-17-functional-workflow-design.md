# Functional Workflow MVP Design

## Goal

Add a persistent, no-login Functional Workspace alongside the existing ASCO demo.
It accepts real documents, processes them into traceable evidence, supports human
review or One click, and keeps audit Markdown plus approved reusable rules.

## Product entry

Screen 0 is the only public landing state.

- **Explore demo** enters the existing ASCO demo with no behavioural changes.
- **Start functional workflow** creates a persistent run and opens its upload
  screen.

There is a single shared Atrix workspace in this MVP. Runs are separate and no
user or client identity is modelled yet.

## Platform architecture

The Next/Vinext application provides the frontend and API routes. Vercel Blob
stores private originals, extracted Markdown and generated artefacts. Postgres
(Neon through Vercel) stores run metadata and normalized workflow state. The
OpenAI API returns structured JSON for classification, evidence and issues.

Processing is async by run stage. A request creates work, persists its status,
and the client polls that stage. A stage may be retried without re-uploading an
original file. Failure in one file does not block processing of the other files.

## Persistent model

| Record | Key fields | Purpose |
| --- | --- | --- |
| `runs` | id, name, mode, status, createdAt | workflow container |
| `documents` | id, runId, blobKey, filename, mimeType, status | original file and processing state |
| `source_blocks` | id, documentId, locator, text, tableJson | page/slide/sheet-level evidence |
| `stages` | id, runId, type, status, inputVersion, outputJson | retryable execution checkpoint |
| `review_decisions` | id, runId, subjectType, subjectId, choice, rationale | human/auto approval history |
| `artifacts` | id, runId, type, blobKey | stage Markdown, deck and export links |
| `playbook_rules` | id, category, rule, status, evidenceCount | globally reusable, user-approved rules |

Every issue, insight and To Do stores source-block references. A generated
artifact records the rule versions and decisions used to create it.

## Functional flow

1. User creates a run, selects Human in the loop or One click, and uploads
   PDF, DOCX, PPTX, XLSX or CSV files.
2. Files are persisted, validated, and extracted into `source_blocks`.
3. The data-quality stage asks OpenAI for structured issues with supporting
   blocks and confidence. It writes `01-intake.md` and `02-data-quality.md`.
4. Human mode pauses for decisions. One click applies only approved playbook
   rules and records each automatic decision.
5. Enrichment, prioritization, deck and tracker stages consume approved state.
   Each writes a run Markdown artifact: `03-enrichment.md`,
   `04-priorities.md`, `05-executive-readout.md`, and `06-action-tracker.md`.
6. A reviewer may promote a recurring approved decision into a pending
   playbook rule. Only an explicit approval makes it active for later runs.

## APIs

| Route | Method | Responsibility |
| --- | --- | --- |
| `/api/runs` | POST, GET | create and list persistent runs |
| `/api/runs/:id/documents` | POST, GET | upload metadata and list documents |
| `/api/runs/:id/stages/:stage` | POST, GET | start/retry and poll a stage |
| `/api/runs/:id/decisions` | POST | persist review or auto decision |
| `/api/runs/:id/artifacts` | GET | list signed artifact links |
| `/api/playbook-rules` | GET, POST, PATCH | inspect and approve reusable rules |

## Structured IA contract

The first real stage returns only JSON matching this shape:

```ts
type DataQualityIssue = {
  title: string;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  suggestedCorrection: string;
  evidence: Array<{ sourceBlockId: string; locator: string; excerpt: string }>;
};
```

The server validates the JSON, rejects evidence that does not belong to the
run, and changes unsupported outputs to `needs_review`.

## Scope and safeguards

- The demo retains its static assets and remains independent from the
  Functional Workspace.
- MVP file support is PDF, DOCX, PPTX, XLSX and CSV. Unsupported/corrupt files
  are recorded with an actionable error while valid files continue.
- Original files and artifacts are private. No login means anyone with the
  app URL has access to the shared workspace; production access control is a
  required phase before client use.
- OpenAI API keys, database credentials and Blob tokens stay server-side in
  Vercel environment variables.
- Files and generated artifacts are retained until an admin deletes the run;
  deletion and tenant isolation are explicitly out of MVP scope.

## Delivery slices

1. Screen 0, persistent run model and real document upload.
2. Extractors plus source-block browser and run audit Markdown.
3. Data-quality analysis and approval persistence.
4. Enrichment, priorities, deck and tracker driven by persisted data.
5. Playbook rule proposal/approval and One click policy application.

The first implementation milestone delivers slices 1–3 end-to-end. The data
model and routes are designed for slices 4–5 without a rewrite.
