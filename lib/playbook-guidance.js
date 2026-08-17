/** Reusable methodology approved from the ASCO 2025 working example. */
export const ASCO_APPROVED_PLAYBOOK = [
  "Preserve raw source values. Normalise labels only in derived analysis fields and retain the original evidence for traceability.",
  "Infer a missing value only when the supplied context directly supports it; otherwise retain the gap and route it for human review.",
  "Cluster repeated or templated records for signal magnitude, while retaining each original record and never inflating counts.",
  "Exclude unverified clinical metrics or claims from conclusions until a traceable primary source validates them.",
  "Map every decision-ready signal to a decision question and cite exact source document, locator, and excerpt evidence.",
  "Use confidence to describe independent source convergence, not statistical significance or volume alone.",
  "Prioritise P3 for immediate execution, P2 for near-term planning, and P1 for monitoring; each priority needs an action and suggested owner.",
];

export function formatPlaybookGuidance(rules) {
  if (rules.length === 0) return "";
  return ["Approved Atrix playbook — apply these guardrails without inventing facts:", ...rules.map((rule, index) => `${index + 1}. ${rule}`)].join("\n");
}
