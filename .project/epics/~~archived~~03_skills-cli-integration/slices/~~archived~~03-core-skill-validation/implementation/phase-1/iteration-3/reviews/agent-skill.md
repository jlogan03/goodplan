# Review: agent-skill

Phase: Phase 1: create-epic Migration
Iteration: 3
Reviewer: agent-skill

---

## Issues

**[IMPORTANT]** `DATA_NO_PROJECT` routes to Mode A but exit code 1 means "stop" per error handling rules

Step 1 correctly states that `exit code 1 = internal/unexpected error (present to user and stop)`. Step 2 then routes `DATA_NO_PROJECT` (which fires on exit 1) to Mode A instead of stopping:

> **Fails with `DATA_NO_PROJECT`** → Mode A (fresh project).

This is contradictory. The error handling summary in Step 1 tells the agent to stop on exit 1. Step 2 tells it to proceed to Mode A on the same exit code. An agent trying to reconcile these instructions may either stop when it shouldn't (blocking new project creation entirely) or discard the error-handling rule it just read.

`DATA_NO_PROJECT` is a well-defined, expected condition — not an internal error. The fix is to add an exception clause in Step 2 that explicitly overrides the Step 1 general guidance:

```
- **Exit 1 with `DATA_NO_PROJECT`** → Mode A (fresh project). This is the expected "no project yet" signal — not an unexpected error.
- **Exit 1 with any other error** → present to user and stop.
```

Alternatively, annotate the Step 1 summary to note that `DATA_NO_PROJECT` is an expected exit-1 condition handled explicitly in Step 2.

File: `skills/create-epic/SKILL.md`:30,39
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 8 `status === "created"` field mismatch carries forward from iteration 2

Iteration 2 flagged that `epic:create` returns `newStatus`, not `status`. Step 8 now uses `epic:show` (not `epic:create`) — so this may be fine. The `show --json` response shape in `cli-interaction.md` section 7 shows a flat object with a `status` field (e.g. `"status": "plan-refined"`). If `epic:show` mirrors the same shape, checking `status === "created"` is correct.

However the spec is not 100% explicit that `epic:show` returns a flat `status` field. If the field name is wrong, the check silently passes (the field is absent and the comparison returns false, or the agent misinterprets). This was flagged as CODEBASE_EXPLORATION in iteration 2 and should be confirmed.

File: `skills/create-epic/SKILL.md`:115
Resolution: CODEBASE_EXPLORATION

Research: Check the `epic:show --json` response shape in the CLI source or architecture docs to confirm it returns a flat `status` field. Likely location: `.project/architecture/data-model.md` or the CLI source under `src/commands/epic/`. The slice 02 enrichment added `artifacts` but the base entity fields should be visible in the data layer API.

---

**[MINOR]** Step 3b expertise calibration drops `AskUserQuestion` tool signal — not resolved

The iteration-2 review flagged (as MINOR/CODEBASE_EXPLORATION) that Step 3b says `ask:` rather than explicitly naming `AskUserQuestion`. The current file still has the same shortened form at line 73:

> "If uncovered domains exist, ask: 'This project involves [X] and [Y] — how familiar are you with those areas?'"

This is only a concern if `expertise-tracking.md` does not itself specify the tool. The resolution was to check that file. It was marked CODEBASE_EXPLORATION and is still unresolved.

File: `skills/create-epic/SKILL.md`:73
Resolution: CODEBASE_EXPLORATION

Research: Read `~/.claude/skills/_shared/references/expertise-tracking.md` and check whether it specifies `AskUserQuestion` for the calibration question. If yes, the omission in SKILL.md is harmless. If no, the tool name should be restored.

---

## Resolved from Iteration 2

**[IMPORTANT] Exit code summary** — FIXED. Step 1 now correctly states `exit code 1 = internal/unexpected error`, `exit code 2 = validation/usage error`, `exit code 3 = state machine error`. The exit codes are no longer swapped.

**[IMPORTANT] Wrap-up early-exit wording** — FIXED. Line 64 now reads "proceed immediately without completing the remaining coverage areas." The permission to skip remaining checklist items is explicit and unambiguous.

---

## Score: 8.5/10

The two IMPORTANT fixes from iteration 2 are correctly applied. The exit code table is now accurate; the early-exit wording restores the load-bearing signal. The skill is clean, well within 200 lines, uses CLI-only patterns throughout, and the Mode A/B routing on `DATA_NO_PROJECT` is the right design — it just needs to be reconciled with the Step 1 error-handling rule that says exit 1 = stop. That contradiction is the main remaining issue holding this below 9.

To reach 9+: clarify in Step 2 that `DATA_NO_PROJECT` is an expected exit-1 condition that Mode A handles (not an unexpected internal error), and confirm the `epic:show` `status` field name.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
