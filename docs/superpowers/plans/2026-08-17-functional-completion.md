# Functional Workflow Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the persistent workflow with priority review, action tracking, One Click, and real PDF extraction.

**Architecture:** Extend existing stage and decision patterns. The action tracker and PDF extractor are independent; the One Click API composes completed stage interfaces after they land.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle/Neon, Vercel Blob, OpenAI structured output, pdfjs-dist, Node tests.

**Spec:** `docs/superpowers/specs/2026-08-17-functional-completion-design.md`

## Global Constraints

- Work only on `feat/functional-workflow`; do not merge `main` or production.
- Start each behavior with a failing test and verify red before implementation.
- Persist source-traceable output and private Markdown artifacts.

---

### Task 1: Extract PDF source blocks

**Files:** `lib/documents/extraction.ts`, `tests/document-extraction.test.mjs`, `package.json`

- [ ] Add a failing test asserting a two-page PDF creates page-located text blocks.
- [ ] Add `pdfjs-dist` and minimal server extraction implementation.
- [ ] Run the focused test green and commit.

### Task 2: Persist priority review decisions

**Files:** `app/api/runs/[runId]/stages/priorities/decisions/route.ts`, `lib/priorities.ts`, `tests/priorities.test.mjs`, `app/workspace/page.tsx`

- [ ] Add a failing test for a latest per-insight priority decision and Markdown refresh.
- [ ] Implement the endpoint and UI review state.
- [ ] Run focused tests green and commit.

### Task 3: Generate and export Action Tracker

**Files:** `lib/action-tracker.ts`, `app/api/runs/[runId]/stages/action-tracker/route.ts`, `tests/action-tracker.test.mjs`, `app/workspace/page.tsx`

- [ ] Add failing tests for structured tracker output and CSV export.
- [ ] Implement stage persistence, Markdown artifact, CSV download, and dashboard UI.
- [ ] Run focused tests green and commit.

### Task 4: Orchestrate One Click

**Files:** `lib/one-click.ts`, `app/api/runs/[runId]/one-click/route.ts`, `tests/one-click.test.mjs`, `app/workspace/page.tsx`

- [ ] Add a failing test for stage order and automatic decision audit records.
- [ ] Implement shared stage orchestration and the UI disclaimer/download flow.
- [ ] Run full tests, lint, build, deploy a preview, and smoke-test the run.
