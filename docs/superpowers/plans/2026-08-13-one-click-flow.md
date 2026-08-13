# One-click workflow implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route One click runs directly from upload to the executive handoff while retaining the existing Human in the loop path.

**Architecture:** The static Vercel page owns the current workflow state. A `selectedMode` value will be set by the two existing mode controls. The upload continuation handler will route One click runs through a small `openOneClickDeck` function that updates workflow state and shows the deck; Human in the loop will retain the present data-quality route.

**Tech Stack:** Static HTML, CSS and vanilla JavaScript; Node test runner; Vercel static build.

## Global Constraints

- One click approvals are session-only and use the workflow-history disclaimer.
- Human in the loop behaviour must remain unchanged.
- The supplied Insights Deck VF remains the downloaded file.

---

### Task 1: Test the one-click route

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `vercel-static/index.html`.
- Produces: a regression test requiring `selectedMode`, `openOneClickDeck`, the workflow-history disclaimer, and the deck route.

- [ ] **Step 1: Write the failing test**

```js
test("one-click runs route directly to the executive handoff", async () => {
  const staticPage = await readFile(new URL("../vercel-static/index.html", import.meta.url), "utf8");

  assert.match(staticPage, /selectedMode/);
  assert.match(staticPage, /openOneClickDeck/);
  assert.match(staticPage, /approved using workflow history/);
  assert.match(staticPage, /selectedMode==='one-click'\?openOneClickDeck\(\):openDataQualityReview\(\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the static page does not yet define the One click route.

- [ ] **Step 3: Commit the red test only after the minimal implementation is ready**

The test and implementation will be committed together in Task 2 to avoid leaving a broken branch state.

### Task 2: Implement the one-click route

**Files:**
- Modify: `vercel-static/index.html:14-22, 51-72`
- Modify: `tests/rendered-html.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `selectedMode` with values `human` or `one-click`.
- Produces: `openDataQualityReview()` and `openOneClickDeck()` used by the upload continuation handler.

- [ ] **Step 1: Add explicit workflow state and route helpers**

```js
let selectedMode='human';
const openDataQualityReview=()=>{ /* existing Step 2 transition */ };
const openOneClickDeck=()=>{ /* complete Steps 1–4, display deck */ };
next.onclick=()=>selectedMode==='one-click'?openOneClickDeck():openDataQualityReview();
```

- [ ] **Step 2: Add the executive-handoff disclosure**

```html
<div class="one-click-disclaimer" hidden>
  <b>One-click run.</b> All suggestions were approved using workflow history.
  You can review source material directly in the platform at any time.
</div>
```

- [ ] **Step 3: Mark auto-approved workflow stages**

```js
s.forEach((step,index)=>{
  step.className=index<4?'complete':index===4?'active':'upcoming';
  step.querySelector('span').textContent=index<4?'✓':String(index+1).padStart(2,'0');
  step.querySelector('small').textContent=index<4?'Auto-approved':index===4?'Ready to download':'Upcoming';
});
```

- [ ] **Step 4: Run tests to verify the behaviour**

Run: `npm test && npm run lint && npm run build:vercel && git diff --check`

Expected: all tests pass, lint/build complete and no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add vercel-static/index.html tests/rendered-html.test.mjs
git commit -m "feat: add one-click workflow"
```
