# TUI and CLI Review: Task Capture Plan (Round 3)

## Issues

**[MINOR]** `task:list` JSON output includes `filter` field diverging from all other list commands without documenting the precedent in schema registration

The plan acknowledges the divergence ("intentional divergence from `quest:list` which returns only `{ items }`") and gives a sound reason (tasks filter by default so consumers need to know which filter is active). However, the `schema.ts` registration for `task:list` (Phase 2) is not mentioned as needing any update to document this difference. The `registerCommand()` call for `task:list` should have a description that mentions the `--all` flag and the `filter` field in JSON output, so `goodplan schema --command task:list --json` communicates this behavior to skill authors. Existing list commands describe themselves as "List all X" — `task:list` should say something like "List tasks. Defaults to open tasks only; use --all to include converted/dropped. JSON includes filter field."

Additionally, the `task:list` `registerCommand()` entry needs to include `all` in its `args` record (like `slice:list` includes `epic` as an optional arg). Without this, `goodplan schema --json` won't show the `--all` flag, violating INV-006.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 verification should run JSON output checks as the primary verification method

Phase 2 verification says "Full CLI cycle works: create a task, list it, show it, drop it. Create another, convert to quest, verify quest exists via `quest:show`." The Expected Behavior section does specify JSON output shapes for each command, but the Verification section describes a manual human-readable flow. Since the primary consumers are LLM skills using `--json`, the verification section should explicitly state: run the cycle with `--json` flags and verify output shapes match Expected Behavior. This is the most direct verification for CLI commands per evaluation criteria #8.

Resolution: DIRECTLY_ACTIONABLE

No issues found.

## Score: 9/10

All round-2 issues were cleanly resolved. `task:convert` now uses the all-flags pattern consistent with `quest:abandon`. `BeginPhase` names follow the entity-specific `"create-task"` / `"drop-task"` / `"convert-task"` convention. `task:list` human output uses the established indented line format. `task:show` enumerates all displayed fields including description and context. The two remaining minors are: (1) the `--all` flag needs to appear in the schema registration for INV-006 compliance, and (2) the verification section should explicitly call out `--json` verification.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
