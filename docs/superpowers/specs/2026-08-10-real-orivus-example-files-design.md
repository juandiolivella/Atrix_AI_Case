# Real Orivus example files design

## Goal

Make the first-screen “Load example case” control attach the actual six Orivus
ASCO 2025 case files to the browser-session upload queue.

## Scope

Copy these existing case files to a public, read-only app bundle:

1. Summer MBA intern take-home instructions
2. Orivus KITs/KIQs deck
3. Orivus MSL meeting notes workbook
4. Orivus ASCO field notes
5. Orivus OVT209 training deck
6. Legacy ASCO executive-summary deck

On click, fetch all six assets, create browser `File` objects from their blobs,
and add them to the existing `uploadedFiles` queue with source `example`.

## Constraints

- The user-uploaded files remain session-only and unchanged.
- The Orivus example bundle is only fetched when the user chooses the example.
- Loading state and fetch failures are visible and do not clear existing files.
- Existing quality-review copy continues to refer to the Orivus ASCO 2025
  example case.

## Verification

- The app build succeeds.
- Clicking “Load example case” renders exactly six queued files with the
  source label “Example case.”
- Each queued example item has a real `File` object and its matching filename.
