# Upload Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the session-only upload screen with human-reviewed and one-click workflow choices.

**Architecture:** Replace the initial report-run overview with a dedicated upload-first view. Use React state to retain browser-selected `File` objects only for the current session and render demo records for the Orivus example. Keep the existing data-quality workspace as the destination of the guided action.

**Tech Stack:** React 19, TypeScript, CSS, Vinext/Sites, Node test runner.

## Global Constraints

- Accept files of any type and keep them only in browser memory for the current session.
- Human in the loop is selected by default; One click is visibly available but secondary.
- Preserve the approved Atrix navy/orange visual system and accessible keyboard interactions.
- No backend, authentication, D1/R2, browser storage, or persistence is introduced.

---

### Task 1: Add the failing rendered-upload contract

**Files:**
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: server-rendered root HTML.
- Produces: assertions for upload-first content, workflow cards, and disabled review action.

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /Bring your congress intelligence together/)
assert.match(html, /Human in the loop/)
assert.match(html, /One click/)
assert.match(html, /Start guided review/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the report-run view has no upload workflow.

- [ ] **Step 3: Commit the test-only change**

Run: `git add tests/rendered-html.test.mjs && git commit -m "test: define upload workflow contract"`

### Task 2: Implement temporary file intake and workflow selection

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: browser `FileList` from the hidden picker or drop target.
- Produces: `uploadedFiles`, `workflowMode`, `addFiles(files)`, `removeFile(id)`, and a human-review continuation action.

- [ ] **Step 1: Write minimal implementation**

Create an upload-first root view, a hidden multi-file input, drag/drop handlers, file queue, example-case loader, mode cards, session notice, and a disabled-until-files `Start guided review` button.

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test && npm run lint`

Expected: all tests and lint PASS.

- [ ] **Step 3: Commit the feature**

Run: `git add app/page.tsx app/globals.css package.json package-lock.json && git commit -m "feat: add session upload workflow"`

### Task 3: Publish the validated screen

**Files:**
- Modify: no source files unless build output identifies a defect.

**Interfaces:**
- Consumes: validated source on `main`.
- Produces: a published version of the existing public site.

- [ ] **Step 1: Create the production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Push and deploy**

Push the exact validated commit to the existing Sites repository, package the existing `dist` output, save one site version, and deploy it to the existing public site.

- [ ] **Step 3: Confirm deployment status**

Poll the deployment until it reports `succeeded`, then return the existing public URL.

## Self-Review

- Spec coverage: Task 2 covers universal input, session-only state, example loading, workflow mode choice, and guided continuation. Task 1 verifies the critical entry content; Task 3 publishes it.
- Placeholder scan: no unfinished placeholders or undefined implementation APIs.
- Type consistency: file records have `id`, `name`, `type`, `size`, and `source` in all UI operations.
