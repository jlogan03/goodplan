# Software Architecture Review — Phase 06: Submit Commands + E2E Integration

## Summary

Phase 06 implements all `submit-*` sub-agent commands and wires them into the CLI. The layer boundary discipline is clean, schema validation is correctly placed at the CLI boundary, and the RPC routing is correct. One important bug exists and a few minor issues worth noting.

---

## Findings

### Critical (1)

**`submit-plan` RPC call is missing `await`**

`submit-plan.ts` line 45:

```ts
const result = submit(projectDir, "plan", target, { phase: "plan" });
```

`submit()` in `src/core/rpc/submit.ts` is synchronous (returns `SubmitResult`, not `Promise<SubmitResult>`), so this is not a runtime bug today. However, the surrounding `async run()` context and the parallel `submit-refinement.ts` (which also calls sync `submit()`) are fine. On closer inspection this is actually not a bug — `submit()` is synchronous. Downgrading.

**Re-evaluation: No critical issues found.**

---

### Important (2)

**`submit-plan`: sentinel status values leak into JSON output**

When the target is a slice or quest, `resolveStatuses()` in `submit.ts` returns `{ previousStatus: "pre-submit", newStatus: "post-submit" }` as a documented placeholder pending slices 04-05. These sentinel strings are emitted directly in the `--json` output consumed by orchestrators. A sub-agent calling `submit-plan --slice s1 --json` will receive `"previousStatus": "pre-submit"` with `"advanced": true` — semantically misleading since the entity did not advance (the state machine rejected, as tested in `submit-commands.test.ts` line 388-395). The test verifies the call *throws*, meaning the sentinel path is never actually reached for valid entities either. The placeholder comment is accurate, but the sentinel values are dead code today and could confuse future callers. Should be documented or guarded more explicitly.

**`submit-plan` test coverage does not reach the success path**

Tests for `submit-plan`, `submit-refinement`, and `submit-implementation` (lines 373-428) cover only the validation/error paths. There is no success-path test because slice/quest entities are not yet in the state machine. The comment on line 369-371 acknowledges this. This is an acceptable deferral given the sequencing dependency, but it means Phase 06's E2E claim in the phase title is partially incomplete — the epic lifecycle is fully E2E tested (the final `describe` block is solid), but the slice/quest submit paths have no positive-case coverage.

---

### Minor (3)

**Redundant `setup() {}` stubs on every command**

All four commands (`submit-plan`, `submit-refinement`, `submit-explore`, `submit-refine-slices`) include `setup() {}`. citty does not require this — it is noise. Consistent across all commands, so not a style inconsistency, but unnecessary.

**`submitPlanCommand`: `result.entity` type assumption in human output**

Line 50 of `submit-plan.ts`:

```ts
output(`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`, args);
```

The `--quiet` branch is entirely absent (only `--json` and default are handled). `submit-refinement.ts` and `submit-refine-slices.ts` follow the same pattern. The architecture spec defines `--quiet` as "minimal output (e.g., just the entity name or status)". The `else if (!args.quiet)` correctly suppresses output in quiet mode, but there is no affirmative quiet output path — `--quiet` produces no output at all rather than minimal output. Consistent across all submit commands; minor UX gap.

**`captureStdout` helper in test leaks across concurrent subtests if `restore()` is not called on failure**

The `captureStdout` pattern (lines 31-38) requires the caller to call `restore()` manually. If a `runSubmit*` call throws before `restore()` is called, stdout remains mocked for subsequent tests. The `afterEach` does call `vi.restoreAllMocks()`, which would recover it, but the pattern is fragile. A `try/finally` in each test or a `using` disposable would be safer.

---

## Registration Check

All 8 submit commands are registered flat (no nesting) in `main.ts` lines 55-63:

```
"submit-plan", "submit-refinement", "submit-implementation",
"submit-explore", "submit-architecture", "submit-slices",
"submit-refine-architecture", "submit-refine-slices"
```

This matches the commands-api spec exactly. No namespace violation.

---

## RPC Routing Check

| Command | RPC phase arg | Expected event | Correct |
|---|---|---|---|
| `submit-plan` | `"plan"` | `COMPLETE_PLAN` / `COMPLETE_QUEST_PLAN` | Yes |
| `submit-refinement` | `"refinement"` | `COMPLETE_REFINEMENT_ROUND` / `COMPLETE_QUEST_REFINEMENT_ROUND` | Yes |
| `submit-explore` | `"explore"` | `COMPLETE_EXPLORE` | Yes |
| `submit-refine-slices` | `"refine-slices"` | `COMPLETE_REFINE_SLICES` | Yes |

All routes are correct. The `phase` / `content.phase` consistency guard in `submit.ts` is a good internal safety net.

---

## --override Flag

Handled correctly in both `submit-refinement` and `submit-refine-slices`:
- CLI arg `override: boolean, default: false`
- `WorkflowOptions` is set only when `args.override` is truthy (line 49 of `submit-refinement.ts`)
- `spreadOverride()` in `submit.ts` avoids emitting `override: undefined` (respecting `exactOptionalPropertyTypes`)
- Tests cover: high scores advance, low scores hold, override forces advance

---

## Schema Validation

- Mutual exclusion of `--slice`/`--quest` enforced via Zod `.refine()` — correct
- Scores required for refinement commands, absent for no-stdin commands — correct
- Epic required for explore/architecture/slices commands — correct
- All schemas export inferred types — correct

---

## Layer Boundaries

Commands do not contain business logic. All mutations route through `submit()` (RPC layer). No direct state machine or data layer calls from command files. Clean.

---

## Score

**8/10**

- Critical: 0
- Important: 2
- Minor: 3
