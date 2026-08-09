# Upload Workflow Design

## Goal

Replace the current report-run overview with the first usable workflow screen: session-only file intake and a choice between reviewed and one-click processing.

## User flow

1. The user opens the workspace and sees an upload-first screen.
2. They drag files onto the drop area or use the file picker. Any file extension is accepted; selected files remain in browser memory only.
3. Each selected file appears in a queue with name, detected extension, byte size, and a remove action.
4. The optional `Load Orivus ASCO 2025 example` action adds the six case input filenames as demo records; no case file is copied to browser storage.
5. The user selects a workflow mode. `Human in the loop` is selected by default and describes review at every stage. `One click` is available but not selected and describes automatic approval through deck generation.
6. `Start guided review` remains disabled until one or more files are present. In human-review mode, it advances the user to the data-quality stage and preserves session state during navigation.

## Interface

- The upload screen uses the existing Atrix system: deep navy `#161C4D`, navy `#1E2761`, orange `#E85B45`, quiet off-white canvas, editorial serif headings, clean sans-serif data labels.
- The primary viewport contains a workflow-progress rail, a large file drop target, an upload queue, and two mode cards.
- Human in the loop is visually primary through a selected outline, check indicator, and orange action button. One click is visibly available but secondary.
- An explicit session notice states that files are processed for the current session and are not retained.

## State and behavior

- `selectedFiles` is an in-memory array with `{ id, name, type, size, source }` objects.
- Browser `File` objects are kept only for direct user selection; example-case records use the same display shape without file content.
- A file input supports keyboard activation and the drop target prevents browser navigation on drag/drop.
- Duplicate file names are allowed because different files may share a name; every queue item receives a unique id.
- Readability failure is represented at file-add time only when the browser cannot produce a usable file object. It is displayed inline with retry/remove actions.
- No D1, R2, browser local storage, authentication, upload endpoint, or durable file storage is used for this screen.

## Validation

- Add rendered-HTML assertions for the upload heading, both workflow modes, and the disabled guided-review action before any files are selected.
- Keep the existing production build and lint checks green.

## Scope boundary

This screen starts the human-reviewed journey and renders queue/mode interactions locally. Actual AI extraction and source-content parsing remain the next workflow step.
