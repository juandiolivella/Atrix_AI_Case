# Data Quality Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the second human-reviewed data-quality stage, with individual approval decisions for the ASCO 2025 example findings.

**Architecture:** Keep the existing single-page client app and add a local two-stage state transition from upload to review. Define the sample findings as data, derive their review state in the client, and mirror the user-facing flow in the Vercel static deployment bridge.

**Tech Stack:** React/TypeScript, CSS, Node test runner, static HTML/JavaScript for Vercel.

## Global Constraints

- Maintain Atrix visual language and English product copy.
- Use six-file Orivus ASCO 2025 content only as an example profile; no filename-specific coupling in the approval state.
- Keep file and decision data in the active browser session only.
- Every issue has only **Approve** or **Keep raw value** as mutually exclusive decisions.
- Update both the React application and `vercel-static/index.html`.

---

### Task 1: Add a regression test for the data-quality stage

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: the server-rendered React page.
- Produces: a regression check for the Data Quality UI contract.

- [ ] **Step 1: Write the failing test**

Add assertions that the rendered response contains `Review data quality`, `Asset naming variants`, `Approve`, and `Keep raw value`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the page does not yet render the issue name or decision controls.

- [ ] **Step 3: Commit**

Commit the red test together with Task 2 after it passes.

### Task 2: Implement the React two-stage review workflow

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `UploadedFile[]`, the static ASCO finding objects, and an optional per-issue decision.
- Produces: an upload-to-review transition and cards with `Approve`/`Keep raw value` state.

- [ ] **Step 1: Implement minimal state and findings data**

Add a `screen` state (`"upload" | "quality"`), an issue-decision map, and five ASCO finding objects. Expose a Continue button only after at least one file is present.

- [ ] **Step 2: Render the review surface**

Render the active run context, review progress summary, five issue cards, source/severity/confidence metadata, and the two mutually exclusive decision buttons per card.

- [ ] **Step 3: Style the review surface**

Extend the existing CSS for the completed/active rail states, review summary, cards, decision controls, and responsive layout.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: add data quality review workflow"
```

### Task 3: Mirror the workflow in the Vercel static build

**Files:**
- Modify: `vercel-static/index.html`
- Modify: `scripts/build-vercel.mjs`

**Interfaces:**
- Consumes: the same six example-file labels and five review findings used in the React flow.
- Produces: a static browser implementation where choices update review progress without persistence.

- [ ] **Step 1: Extend the static markup and client JavaScript**

Add the two screens, the Continue transition, individual decision buttons, and in-memory decision state. Preserve the existing upload/drop and session-only behavior.

- [ ] **Step 2: Add static build contract validation**

Make `build:vercel` verify that the static output contains `Review data quality`, `Asset naming variants`, `Approve`, and `Keep raw value`.

- [ ] **Step 3: Run static build verification**

Run: `npm run build:vercel`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add vercel-static/index.html scripts/build-vercel.mjs
git commit -m "feat: add static data quality review"
```

### Task 4: Verify and publish

**Files:**
- No production-file changes expected.

**Interfaces:**
- Consumes: completed React and static implementation.
- Produces: a verified main branch and Vercel production deployment.

- [ ] **Step 1: Run full local verification**

Run: `npm test && npm run lint && npm run build && npm run build:vercel`

Expected: all commands exit zero.

- [ ] **Step 2: Publish main**

Run: `git push github main`

- [ ] **Step 3: Deploy and verify Vercel**

Run: `vercel --prod --yes` and confirm the production response includes `Review data quality`.
