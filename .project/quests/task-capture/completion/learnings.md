# Learnings — task-capture

## Cross-entity handlers need shared builder helpers from the start

CONVERT_TASK inlines quest/epic creation in a single handler (no recursive reduce per INV-003). During review, duplicate entity shapes were flagged — extracting `buildInitialQuestJson`/`buildInitialEpicJson` to helpers.ts fixed it and benefited existing handlers (`quest-create.ts`, `epic-create.ts`). Future plans for cross-entity operations should include builder extraction as an explicit task, not leave it for review to catch.

## Additive changes to shared schemas need producer audit tasks in plans

Adding optional `title` to `overviewItemSchema` was backward-compatible but required conditional spread (`...(title ? { title } : {})`) in every handler that creates overview entries — missed in the original plan, caught by reviewers in round 2. With `exactOptionalPropertyTypes`, any additive optional field on a shared schema needs an explicit plan task: "audit all producers of X and add conditional spread."

## CLI input pattern decisions (flags vs stdin) must be explicit in plans

The plan left `task:drop` input as "reads stdin" — reviewers flagged this as CRITICAL since simple scalars use flags (matching `quest:abandon`). The fix was straightforward but burned a refinement iteration. Plans referencing CLI commands should explicitly state the input pattern ("follows X command's flag pattern") rather than defaulting to stdin.
