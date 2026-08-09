# Data Quality Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add severity ordering and interactive evidence previews to the data quality review.

**Architecture:** Extend the issue data with optional evidence rows and render cards from a severity-sorted view. A local expanded-card state controls evidence visibility and the existing decision state determines the displayed before/after result; Vercel static mirrors it.

**Tech Stack:** React/TypeScript, CSS, static HTML/JavaScript, Node test runner.

---

### Task 1: Add the failing UI contract test

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] Add assertions for `View evidence`, `Raw asset label`, and `Applied normalized value`.
- [ ] Run `npm test`; expect failure because the evidence UI is absent.

### Task 2: Add evidence state and severity-sorted cards

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] Add severity ranking, evidence data, and expanded-card state.
- [ ] Render a table for Asset naming variants and outcome-aware before/after labels.
- [ ] Run `npm test`; expect success.

### Task 3: Mirror and verify the Vercel static interface

**Files:**
- Modify: `vercel-static/index.html`
- Modify: `scripts/build-vercel.mjs`

- [ ] Add the evidence UI and severity ordering to the static page.
- [ ] Validate the static contract in `build:vercel`.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run build:vercel`.
