# Atrix Intake UI Refresh Design

## Goal

Refresh the Step 1 upload screen to follow the visual language of the Atrix AI website and make the five-step workflow legible without exposing unfinished stages.

## Visual direction

- Use a white utility header, vivid Atrix-purple accents, dark near-black workspace panels, soft lavender surfaces, rounded controls, and clean sans-serif typography with restrained serif italics only for editorial emphasis.
- Remove the former navy/orange presentation styling from the upload interface.
- Remove decorative uppercase/eyebrow section labels that create visual noise or look underlined.

## Workflow rail

- Add a non-interactive left rail with five steps: Upload information, Review data quality, Enrich evidence, Prioritize insights, and Generate presentation.
- Upload information is the only active step. The remaining steps are muted and labelled as upcoming.
- The rail is visual context only. It does not navigate or imply that unfinished stages are available.

## Intake behavior

- Preserve all session-only file selection, drag/drop, example-case loading, file removal, and workflow-mode selection behavior.
- Keep the post-upload continuation action hidden until the next stage is built.

## Validation

- Rendered HTML must include all five workflow labels, only one active visible state, and no legacy dashboard labels.
- Production build and lint remain clean.
