# CLI Review — Round 4

## Issues

**[IMPORTANT]** `phase2Architecture` state assertion uses non-existent command `epic:status`

The Round 3 fix added a pre-skill state assertion to `phase2Architecture()`. The plan now reads:

> "verify `goodplanJson(["epic:status", "--epic", "core-provider", "--json"])` returns status `defining-architecture`"

There is no `epic:status` command in the CLI. The command tree (`src/commands/main.ts`) includes `epic:show` but not `epic:status`. Calling `goodplan epic:status` will exit non-zero with a "command not found" error, causing `phase2Architecture` to abort before the skill runs.

The fix introduced in Round 3 to resolve the "missing pre-skill state check" issue inadvertently referenced a phantom command. The correct call is `goodplanJson(["epic:show", "--epic", "core-provider", "--json"])`, which is what the existing `epicStatus()` helper already uses.

Resolution: DIRECTLY_ACTIONABLE

Change the Step 2 task for `phase2Architecture()` to use `["epic:show", "--epic", "core-provider", "--json"]` (not `"epic:status"`). The existing `epicStatus()` helper already wraps this correctly — the task should call `epicStatus()` or reference `epic:show` explicitly.

---

**[IMPORTANT]** `phase2Slices()` missing required `epic:define-slices` and `epic:refine-slices` CLI transition calls

The same pattern fixed for `phase2Architecture()` in Round 3 (missing `epic:define-architecture` CLI call before the skill) is present but unfixed in `phase2Slices()`. The transition table requires:

- `architecture-refined → epic:define-slices → defining-slices` (before `/create-slices` skill)
- `slices-defined → epic:refine-slices → refining-slices` (before `/refine-slices` skill)

The existing harness `phase2Slices()` (lines 256–278) calls `runSkill("create-slices", ...)` and `runSkill("refine-slices", ...)` directly with no preceding CLI transition calls. The plan's Step 2 task for `phase2Slices()` does not add these calls — it only says "Run `/create-slices` + `/refine-slices`, verify slices created via `goodplan slice:list --epic core-provider --json`."

Without `epic:define-slices` preceding the skill, the `/create-slices` skill will attempt to write slices when the epic is still in `architecture-refined` state, causing `submit-slices` to fail (transition `architecture-refined → COMPLETE_SLICING` is not in the transition table — only `defining-slices → COMPLETE_SLICING` is valid).

This same gap also exists in Phase 4's `runPhase4()` equivalent — it must run `epic:define-slices --epic llm-judge` before `/create-slices` and `epic:refine-slices --epic llm-judge` before `/refine-slices`.

Resolution: DIRECTLY_ACTIONABLE

Add to the Step 2 `phase2Slices()` task:
1. Before calling `/create-slices`: run `goodplan epic:define-slices --epic core-provider --json`, assert exit 0, verify epic status is `defining-slices`.
2. After `/create-slices` and `submit-slices` complete: run `goodplan epic:refine-slices --epic core-provider --json`, assert exit 0, then run `/refine-slices`.

Add the same pattern (with `--epic llm-judge`) to the Step 4 Phase 4 task.

---

**[MINOR]** Round 3 fixes all correctly applied — confirming closure

The following Round 3 IMPORTANT/MINOR issues were verified as correctly resolved in the current plan:

- `logFriction()` signature: Step 1 now unifies to `(severity, source, message)`, Step 4 uses the new signature, existing call sites are flagged for update. Fixed.
- `phase2Architecture` pre-skill state assertion: Fix attempted (though the command name is wrong — see IMPORTANT above). The intent is correct.
- `slice:list --epic` filter: Step 2 task says "all `slice:list` calls must include `--epic <name>`"; Step 4 uses `--epic llm-judge`. Fixed.
- `goodplan()` catch block type guard: Step 1 now specifies exact `instanceof Error && 'status' in err` with correct cast and comment. Fixed.
- `phase2SliceCycle` full rewrite: Step 2 now explicitly says "Full rewrite" with 10-step sequence. Fixed.
- `phase2EpicComplete` verificationResults in prompt: Step 2 now says to pass the payload in the skill prompt. Fixed.
- `goodplan init --name` flag: Confirmed valid — `src/commands/global/init.ts` defines `name` as an optional string arg. Closed.

Resolution: N/A (informational)

---

## Score: 9/10

The plan is in strong shape. All Round 3 issues were addressed in good faith. Two issues remain: the `epic:status` phantom command introduced by the Round 3 fix (straightforward fix — change to `epic:show`) and the missing `epic:define-slices`/`epic:refine-slices` CLI transition calls in `phase2Slices()` (same pattern as the Round 3 architecture fix, applied to the slices phase). Both are DIRECTLY_ACTIONABLE and small. With these two fixes, the plan fully specifies all required CLI transitions and the harness will exercise the complete state machine path without hitting invalid-transition errors.

To reach 9+: fix the `epic:status` → `epic:show` command name and add the two missing `epic:define-slices`/`epic:refine-slices` transition calls in `phase2Slices()` (and the Phase 4 equivalent).

## Summary
- Critical: 0
- Important: 2
- Minor: 1
