# Holistic Review — Round 2

## Issues

**[IMPORTANT]** Mutation file inventory is inaccurate — lists nonexistent commands and misses real ones

The plan's "Mutation File Inventory" (Phase 2) lists 36 files but several entries don't exist and others are missing. Specifically:

- **Listed but don't exist**: `epic/plan`, `epic/refine-plan`, `epic/implement`, `epic/refine-implementation`, `slice/refine-implementation`, `quest/explore`, `decision/supersede`
- **Exist but not listed**: `epic/define-slices`, `epic/refine-slices`, `epic/refine-architecture`, `epic/activate`, `epic/abandon`, `slice/abandon`, `quest/abandon`
- **Submit files incomplete**: `submit-slices`, `submit-refine-architecture`, `submit-refine-slices` are in the codebase but not listed in the plan's submit inventory

Actual count: 37 total (25 begin + 8 submit + 3 complete + 1 rollup). With rollup excluded, 36 files are wired — not 35 as the confirmed goal states and not 36 as the inventory claims.

The confirmed goal says "35 mutation files wired (36 minus rollup exclusion)" but the actual count is 36 wired (37 minus rollup). The plan should enumerate the correct files. The fitness test (Phase 1 Task 3) will catch this at implementation time, but the plan's inventory should be accurate to guide the implementer.

Fix: Replace the entire inventory with the verified list:
- **begin (25)**: epic/{create, explore, define-architecture, refine-architecture, define-slices, refine-slices, activate, abandon, add-verification, update-verification}, slice/{create, plan, refine-plan, implement, abandon}, quest/{create, plan, refine-plan, implement, abandon}, task/{create, convert, drop}, decision/{create, update}
- **submit (8)**: submit-{explore, architecture, refine-architecture, plan, refinement, implementation, slices, refine-slices}
- **complete (3)**: epic/complete, slice/complete, quest/complete
- **Excluded (1)**: learning/rollup

Update the confirmed goal count from 35 to 36.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Edge case list references nonexistent command files

Phase 2's edge cases reference `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts` handling "both slice and quest." This is correct in principle (submit handles both entity types via the `target` parameter), but the file references should be accurate. The plan should also note that `submit-refine-architecture` and `submit-refine-slices` are epic-only and `submit-slices` is epic-only, so there's no dual-entity concern for those three.

The `decision/supersede` case doesn't exist — `decision/update.ts` handles supersession (grep confirms `supersede` logic lives in `decision/update.ts`). Remove the nonexistent reference.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `computeNextCommands` signature should accept `Target` directly

Phase 1 Task 1.4 defines the function as `computeNextCommands(target: { type: Target["type"]; name: string }, newStatus: string, parentEpic?: string)`. But `Target` is a discriminated union where decisions use `id` (not `name`) and slices carry `epic` (not `parentEpic`). The custom `{ type, name }` shape loses type safety and requires callers to manually extract fields.

Since the RPC layer already has the `Target` object and the `newStatus` string (from the result), accepting `Target` directly and extracting `name`/`id`/`epic` internally would be cleaner and avoid the impedance mismatch.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 E2E lifecycle references `epic:refine-implementation` which doesn't exist

Phase 3 mentions testing through `epic:implement` and `epic:refine-implementation` lifecycle. The actual epic lifecycle after exploration goes through `define-architecture` → `submit-architecture` → `define-slices` → `submit-slices` → `activate`. The E2E test script should follow the real epic lifecycle.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No explicit handling of `abandon` commands in nextCommands design

The plan doesn't mention how `abandon` commands (epic/abandon, slice/abandon, quest/abandon) appear in nextCommands. These are valid transitions from many statuses (they're "escape hatches"). The `commandToEvent` mapping needs entries for abandon commands, and the derivation logic will naturally include them for any status that has an abandon transition. Worth explicitly noting this in the plan since abandon is available from most non-terminal statuses.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness test location uses `tests/fitness/` but plan says `tests/fitness/command-metadata-coverage.test.ts`

This is consistent with existing fitness tests (confirmed via glob). No issue — just noting the path is correct.

Resolution: N/A (not an issue)

## Score: 8/10

The plan has been substantially improved from Round 1. All critical issues (C1: derived registry, C2: RPC-layer integration) have been properly addressed. The three-phase structure is logical and well-ordered. Expected Behavior sections are concrete and falsifiable. Documentation tasks are included. The fitness test design is thorough with forward, reverse, and reachability checks.

The main gap is the inaccurate mutation file inventory — the plan lists commands that don't exist in the codebase and misses ones that do. This would confuse the implementer and the confirmed goal's count (35) is off by one. Fixing the inventory and updating the count to 36 would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
