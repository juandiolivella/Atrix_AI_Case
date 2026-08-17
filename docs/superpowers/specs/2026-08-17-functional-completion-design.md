# Functional Workflow Completion Design

## Goal

Complete the persistent Atrix workflow with reviewable priorities, a traceable action tracker, an automated One Click path, and real PDF source extraction.

## Constraints

- Work only on `feat/functional-workflow`; do not merge `main` or deploy production.
- Persist every generated stage and human decision in Neon; write a Markdown artifact per stage to private Blob.
- Source evidence must remain traceable to its document and locator.
- One Click must state that assumptions were automatically approved using approved historical rules and remain reviewable in the workspace.

## Design

### Priority review

The existing `priorities` stage remains the authoritative generated output. A decision endpoint stores the latest `approve`, `edit`, or `reject` decision per priority insight in `review_decisions`, and rewrites `04-priorities.md` to include the review status. The UI exposes individual actions and a visible selected state.

### Action Tracker

`action_tracker` consumes approved/generated priorities and produces structured work items: `id`, `title`, `description`, `priority`, `owner`, `deadline`, `status`, `sourceInsightIds`, and `evidence`. Its API persists the stage, writes `06-action-tracker.md`, and can return a CSV export. The workspace renders a dashboard-style table with status controls and download action.

### One Click

One Click is an orchestration endpoint. It executes data quality, enrichment, priorities, action tracker, and executive readout in order, records automatic approval decisions with `isAutomatic: true`, and returns the deck response only after all required stages succeed. It deliberately uses the same stage functions as human review, so artifacts and audit history match. The UI starts a One Click run, displays its disclaimer, and downloads the completed deck.

### PDF extraction

Install `pdfjs-dist` and extract text page-by-page server-side. Each non-empty page becomes a `SourceBlock` with `locator.page`; malformed/password-protected PDFs fail safely with a user-readable message. Existing DOCX, PPTX, XLSX, and CSV behavior remains unchanged.

## Error handling and testing

Each route validates run ownership/existence and prerequisite stage output, returns clear HTTP errors, and never marks a stage completed on failure. Unit tests cover PDF blocks, priority review persistence, tracker output/CSV, and One Click sequencing. A final smoke test runs the production-like preview path without promoting it.
