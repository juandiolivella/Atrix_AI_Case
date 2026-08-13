# One-click workflow design

## Goal

Allow a trusted, repeatable run to skip the three human-review stages and land
on the executive handoff screen, where the approved deck can be downloaded.

## User flow

1. The user chooses **One click** on the upload screen and loads files.
2. Selecting **Continue to data quality** records the selected mode.
3. In one-click mode, Atrix automatically approves the data-quality and
   enrichment suggestions, marks Steps 1–4 as complete and labelled
   `Auto-approved`, and opens Step 5 — Generate presentation.
4. Step 5 shows a disclaimer that approvals used workflow history and that
   source material remains reviewable in the platform.
5. Downloading the supplied Insights Deck VF opens Step 6 — Action Tracker.

## Boundaries

- The existing Human in the loop path remains unchanged.
- The existing example deck remains the downloaded document for this demo.
- All decisions remain session-only; no files or approval state are persisted.

## Verification

Automated static-page tests will verify that one-click mode routes to the deck,
marks review stages as auto-approved, and preserves the download-to-tracker
transition. Existing tests, linting and static Vercel build must also pass.
