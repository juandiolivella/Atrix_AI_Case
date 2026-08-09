# Enrichment Editing and Prioritization Design

## Purpose

Make Step 3 edits real and add the next human-in-the-loop priority review stage.

## Experience

- **Edit** expands an inline textarea prefilled with the suggestion detail and provides Save / Cancel. Saving replaces the displayed suggestion text and records the card as reviewed.
- When all three enrichment cards have been accepted or saved, **Continue to prioritize insights** becomes available.
- Step 4 ranks the established ASCO 2025 insights as P3 Critical/Immediate, P2 Important/Near-term, and P1 Monitor/Lower priority. Each priority card exposes the evidence, business implication and next action.
- All edits and approvals remain in browser-session memory.

## Validation

React and the Vercel static version expose `Save changes`, `Prioritize insights`, and the P3/P2/P1 priority content. Existing checks stay green.
