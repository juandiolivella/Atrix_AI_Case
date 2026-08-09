# Data Quality Review Design

## Purpose

Add the second, human-in-the-loop stage of the Atrix Congress Intelligence workflow. It lets a user validate each AI-proposed correction before that decision can influence later workflow stages.

## Scope

The initial screen is populated with the six-file Orivus ASCO 2025 example case and its five established findings. The visual and state model must not be coupled to those filenames so a future run can present findings generated from any set of uploaded files.

## Experience

- The left workflow rail marks **Upload information** as complete and **Review data quality** as active.
- The main area identifies the active run (Orivus ASCO 2025, six files) and explains that analysis can run on any uploaded files in a future session.
- A summary shows five detected issues and a live reviewed count.
- Each issue is a review card containing source, severity, the raw/contextual problem, the proposed AI resolution, and a confidence label.
- Every card provides exactly two mutually exclusive decisions: **Approve** and **Keep raw value**. Selecting either marks that issue reviewed; selecting the other changes the decision.
- Decisions exist only in browser memory for the active session. No user files or review outcomes are persisted.

## ASCO 2025 findings

1. Asset naming variants: normalize four OVT-209 labels while retaining raw source values.
2. Missing therapeutic area: infer NSCLC only when the note context supports it; otherwise retain it for review.
3. Repeated/templated notes: cluster 19 records across six templates without deleting the source records or inflating signal counts.
4. HCP location conflicts: route three conflicting entities to manual entity validation.
5. Unverified clinical metrics: route claims and legacy-report numbers to Medical Affairs fact-checking.

## Reuse boundary

The UI owns only the presentation and per-session approval state. A later analysis layer can supply the same issue-card shape after inspecting new uploads; the human-review UI should not need to change.

## Validation

- Server-rendered output exposes the review-stage title and case-specific issue names.
- Existing intake rendering checks remain green.
- The static Vercel build includes the same new review surface and client-side approval actions.
