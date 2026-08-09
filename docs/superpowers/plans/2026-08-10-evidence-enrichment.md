# Evidence Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the human-reviewed evidence enrichment stage after approved data-quality corrections.

**Architecture:** Extend the existing single-page state machine with an `enrich` screen and local enrichment-decision map. Render representative structured ASCO evidence and repeatable enrichment suggestions from data; mirror the same state and copy in Vercel static HTML.

**Tech Stack:** React/TypeScript, CSS, static HTML/JavaScript, Node test runner.

---

### Task 1: Add a failing enrichment UI contract

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] Assert that `Enrich evidence`, `Structured evidence map`, and `Accept suggestion` are rendered.
- [ ] Run `npm test`; expect failure before implementation.

### Task 2: Implement the React enrichment stage

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Add the enrichment screen and complete Step 1/2 rail states.
- [ ] Add structured ASCO evidence cards and local accept/edit controls.
- [ ] Add a transition from data quality assuming all five corrections are approved.
- [ ] Run `npm test`; expect success.

### Task 3: Mirror and verify static Vercel deployment

**Files:**
- Modify: `vercel-static/index.html`
- Modify: `scripts/build-vercel.mjs`

- [ ] Add the same Step 3 surface and interactions in browser JavaScript.
- [ ] Validate static content with `npm run build:vercel`.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run build:vercel`.
