# Atrix Intake UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Step 1-only upload screen to the Atrix AI visual language and add a five-step non-interactive progress rail.

**Architecture:** Keep the existing local file-intake state and replace only presentation structure and styles. A static workflow rail provides context while incomplete stages stay unavailable.

**Tech Stack:** React 19, TypeScript, CSS, Vinext/Sites, Node test runner.

## Global Constraints

- Preserve all current session-only upload behavior.
- Use the Atrix AI reference: white, purple, near-black, lavender, rounded controls, and quiet text hierarchy.
- Keep only Step 1 functional and hide continuation until Step 2 exists.

---

### Task 1: Define the new UI contract

**Files:**
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: server-rendered HTML.
- Produces: assertions for all five workflow labels and absence of legacy dashboard content.

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /Upload information/)
assert.match(html, /Review data quality/)
assert.match(html, /Enrich evidence/)
assert.match(html, /Prioritize insights/)
assert.match(html, /Generate presentation/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because the workflow rail is not present.

### Task 2: Implement the Atrix visual refresh

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `uploadedFiles`, `workflowMode`, and input handlers.
- Produces: static five-step rail, rebranded upload screen, and preserved local interactions.

- [ ] **Step 1: Add the workflow rail and visual classes**

Render the five labels with the first step active and four muted upcoming states. Remove legacy upload-screen eyebrow labels that look underlined.

- [ ] **Step 2: Apply the new brand styling**

Replace the old palette with white, Atrix purple, near-black, lavender, rounded cards, and clean input hierarchy.

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint`

Expected: PASS.

### Task 3: Integrate and publish

**Files:**
- Modify: no source files unless validation detects a defect.

**Interfaces:**
- Consumes: a validated feature branch.
- Produces: a published update to the existing public URL.

- [ ] **Step 1: Merge verified work into main**

Merge the feature branch locally and re-run `npm test`.

- [ ] **Step 2: Publish**

Push the exact validated commit to the existing source repository, package the production build, save a version, and deploy it publicly.

## Self-Review

- The plan retains the real-upload behavior, adds exactly five visual steps, removes the unwanted legacy styles, and leaves future stages unavailable.
