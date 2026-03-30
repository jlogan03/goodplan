# Phase 1 Review: Registry & Core Function

**Reviewer**: Generalist
**Score**: 8/10

## Summary

Solid implementation of the derived `commandMappings` registry, `computeNextCommands()` function, and bidirectional fitness tests. The code correctly derives command availability from transition tables, handles wildcard expansion, `(same)` resolution, and `(error)` filtering. Types, exports, and test coverage are thorough. A few deviations from the plan and one minor correctness concern.

## Critical Issues

None.

## Important Issues

### IMP-1: Unknown status behavior deviates from plan spec

**File**: `src/core/rpc/next-commands.ts` (line 590-628), `tests/unit/rpc/next-commands.test.ts` (line 51-59)

The plan explicitly states: "Test unknown status with valid entity type -- returns empty `{ entity: [], other: [] }` (graceful degradation)."

The implementation returns `{ entity: [showCommand], other: [creationCommands] }` for unknown statuses because: (a) the read command is always appended, and (b) unknown statuses are not in `TERMINAL_STATUSES` so the "other" section is populated. The test was updated to match the implementation rather than the plan.

This is arguably better UX (always showing the read command and cross-entity creation options), but it is a deliberate plan deviation. If a consumer depends on `{ entity: [], other: [] }` as the "nothing available" signal, this breaks that contract.

**Recommendation**: Either update the plan to reflect this improved behavior, or add a guard that returns `{ entity: [], other: [] }` when `newStatus` is not found in any transition table. The current behavior risks suggesting creation commands for statuses that don't exist.

### IMP-2: `commandMappings` comment says "keyed by toStatus" but implementation keys by fromStatus

**File**: `src/core/rpc/next-commands.ts` (line 422)

The JSDoc comment says `Map<entityType, Map<fromStatus, CommandMetadataEntry[]>>` which is correct for the implementation. However the plan (task 3) describes "keyed by `(entityType, toStatus)`" and "Group by `(entityType, to)`". The implementation correctly keys by `fromStatus` because `computeNextCommands(target, newStatus)` receives the status the entity just arrived at, and available commands are those whose transitions have `from === newStatus`. This is functionally correct but the plan text is misleading. No code change needed -- this is a plan-wording issue, not a code bug.

## Minor Issues

### MIN-1: `decision` Target type assertion needed in unit test

**File**: `tests/unit/rpc/next-commands.test.ts` (line 89)

The test uses `{ type: "decision", id: "DEC-001" } as Target` which requires a type assertion because `Target` is a discriminated union. This is noted in the plan as expected, so it's fine. However, the `{ type: "project" } as Target` on line 97 does the same -- consider adding a brief comment explaining why the assertion is needed (Target discriminated union doesn't include these shapes directly).

### MIN-2: `slice:create` test assertion is indirect

**File**: `tests/unit/rpc/next-commands.test.ts` (lines 124-133)

The test "slice:create appears after epic activation" only asserts that `epic:create` is NOT in the other section. It does not directly assert that `slice:create` IS absent from the other section (which is correct -- you wouldn't suggest creating a slice as an "other" command when looking at an epic). The test title is misleading -- it suggests testing that `slice:create` appears somewhere, but it only tests exclusion of `epic:create`. Consider renaming or adding a positive assertion.

### MIN-3: Missing `decision:create` from CREATION_COMMANDS

**File**: `src/core/rpc/next-commands.ts` (lines 555-563)

The `CREATION_COMMANDS` array includes `epic:create`, `quest:create`, and `task:create` but not `decision:create`. The plan says "Curated creation commands from other entity types" so this may be intentional (decisions are less commonly created ad-hoc), but it's worth noting. If a user just completed a task, seeing `decision:create` as an option could be useful.

### MIN-4: Fitness test forward check could miss edge cases in command name derivation

**File**: `tests/fitness/command-metadata-coverage.test.ts` (lines 99-134)

The forward check derives command names from file paths using string manipulation (`commands/epic/create.ts` -> `epic:create`). If a command file's path doesn't follow the `{namespace}/{action}.ts` convention, it would be silently skipped (the `continue` on line 121). This is fragile but acceptable given the current codebase structure. The test does assert `mutationFiles.length > 0` which catches total failure.

## Completeness Check

| Plan Task | Status | Notes |
|---|---|---|
| Export `decisionTransitions` from `decision.ts` | Done | Correct shape, all 6 entries match plan |
| Export `taskLifecycleTransitions` from `task-lifecycle.ts` | Done | Correct: DROP_TASK + CONVERT_TASK |
| Refactor `epicVerifyTransitions` export in `epic-verify.ts` | Done | Already existed, cleaned up type annotation |
| Create `next-commands.ts` with types | Done | All three types present |
| `commandToEvent` mapping with `as const satisfies` | Done | Correct compile-time validation |
| Derived `commandMappings` at module init | Done | Handles wildcards, (same), (error) |
| `computeNextCommands()` pure function | Done | Correct entity/other separation |
| Unit tests | Done | 12 test cases covering plan scenarios |
| Fitness test (bidirectional + reachability) | Done | Forward, reverse, reachability, error-key, drift checks |
| Export `PRE_ACTIVATED_STATUSES` from `epic-verify.ts` | Done | Used in wildcard expansion |

All Phase 1 tasks are complete. Build passes (1659 tests, 0 failures). No lint errors.
