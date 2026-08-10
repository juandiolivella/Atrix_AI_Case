# Real Orivus Example Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the first-screen example-case button add six genuine Orivus ASCO 2025 files to the upload queue.

**Architecture:** Copy the six immutable source artifacts to `public/examples/orivus-asco-2025/`. Update the client-side loader to fetch each static asset, turn its bytes into a `File`, and append it to the existing queue only after all six requests succeed.

**Tech Stack:** Next.js client component, browser Fetch API and File API, static public assets, Node test runner.

## Global Constraints

- User-uploaded files remain session-only and unchanged.
- The Orivus files are fetched only after the user selects the example.
- Loading and failures are visible and do not remove the current queue.
- The queue receives exactly six real `File` objects labeled as the example case.

---

### Task 1: Bundle the six case assets

**Files:**
- Create: `public/examples/orivus-asco-2025/*`
- Source: the six root-level Orivus ASCO 2025 artifacts.

**Consumes:** Existing source artifacts.

**Produces:** Six immutable static app assets with predictable paths.

- [ ] Copy each source artifact to the public example directory using its current filename.
- [ ] Confirm the public folder contains six files and their SHA-256 hashes match their sources.

### Task 2: Load actual files from the example control

**Files:**
- Modify: `app/page.tsx`
- Test: `tests/rendered-html.test.mjs`

**Consumes:** The six public paths from Task 1.

**Produces:** An asynchronous `loadExample` handler and visible loading/error feedback.

- [ ] Add a failing assertion that the page includes the six static example paths and the loading state copy.
- [ ] Run `node --test tests/rendered-html.test.mjs` and confirm the new assertion fails.
- [ ] Represent each example as `{ name, path }`; on click, fetch all six paths, check `response.ok`, create `File` objects, and only then append the resulting files with source `example`.
- [ ] Disable the example button during loading and show a concise error if any fetch fails.
- [ ] Run the focused Node test and confirm it passes.

### Task 3: Build verification

**Files:**
- Verify: `app/page.tsx`
- Verify: `public/examples/orivus-asco-2025/*`

**Consumes:** Completed static assets and loader.

**Produces:** A production-buildable application with a genuine example case.

- [ ] Run `npm run build` from `webapp`.
- [ ] Confirm the production output contains all six static assets.
- [ ] Confirm no existing user-upload behavior or quality-review flow is modified.
