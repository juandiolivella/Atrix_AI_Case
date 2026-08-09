# Enrichment Editing and Prioritization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real inline editing to enrichment suggestions and a Step 4 priority review.

**Architecture:** Store user-edited suggestion copy and edit-open state locally. Extend the screen state to `prioritize`, and render priority cards from the established ASCO insight data; mirror both flows in static Vercel JavaScript.

**Tech Stack:** React/TypeScript, CSS, static HTML/JavaScript, Node test runner.

---

### Task 1: Add the failing contract

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] Assert `Save changes`, `Prioritize insights`, and `P3 — Critical / Immediate`.
- [ ] Run `npm test`; expect failure.

### Task 2: Build React editing and Step 4

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Implement textarea Save / Cancel editing for each enrichment suggestion.
- [ ] Gate the Step 4 transition until all enrichment cards are reviewed.
- [ ] Render P3/P2/P1 priority cards with action and evidence.
- [ ] Run `npm test`; expect success.

### Task 3: Mirror Vercel static UI and verify

**Files:**
- Modify: `vercel-static/index.html`
- Modify: `scripts/build-vercel.mjs`

- [ ] Add inline edit and priority-review behavior to static JS.
- [ ] Run full test, lint, build and Vercel static validation.
