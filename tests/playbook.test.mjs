import assert from "node:assert/strict";
import test from "node:test";

import { ASCO_APPROVED_PLAYBOOK, formatPlaybookGuidance } from "../lib/playbook-guidance.js";

test("uses reusable analytical guardrails distilled from the approved ASCO case", () => {
  assert.ok(ASCO_APPROVED_PLAYBOOK.length >= 6);
  assert.match(ASCO_APPROVED_PLAYBOOK.join(" "), /raw source/i);
  assert.match(ASCO_APPROVED_PLAYBOOK.join(" "), /unverified/i);
  assert.match(ASCO_APPROVED_PLAYBOOK.join(" "), /P3/i);
});

test("formats approved rules as constrained instructions for One Click analysis", () => {
  const guidance = formatPlaybookGuidance(["Retain raw source values.", "Exclude unverified metrics."]);
  assert.match(guidance, /Approved Atrix playbook/);
  assert.match(guidance, /Retain raw source values/);
});
