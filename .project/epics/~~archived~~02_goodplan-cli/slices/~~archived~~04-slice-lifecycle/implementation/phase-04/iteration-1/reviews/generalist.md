# Generalist Review: Phase 4 — Slice CLI Commands

**Score: 9/10**

## Summary

All 8 slice commands implemented and registered. Code follows established epic command patterns precisely. Schemas validate at the boundary per INV-005. Read-only commands bypass RPC per architecture. Tests cover all commands, output modes, validation errors, and a full lifecycle walkthrough. Build passes, 485 tests pass, biome clean.

## Critical Issues (0)

None.

## Important Issues (1)

1. **`slice:complete` quiet mode does nothing** — The `slice:complete` command checks `!args.quiet` to suppress human output, but when `--quiet` is passed it produces zero output (same as other commands). However, the plan specifies `--quiet` should produce "minimal output" (e.g., just the entity name or status) per commands-api.md. Currently `--quiet` produces *nothing* across all commands (both epic and slice). This is a pre-existing gap inherited from epic commands, not a regression in this phase, but worth noting since it affects all 8 new commands.

## Minor Issues (3)

1. **`slice:list` `completed` field null-check uses `!== null`** — Line 54 of `list.ts` checks `item.completed !== null`. With `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, this is correct for the schema where `completed` is `string | null`. Fine as-is, but the Overview type import is absent — the code uses `Overview` from the type import but only for the `getJson` generic parameter. If the overview schema evolves to make `completed` optional instead of nullable, this would silently break. Low risk.

2. **No `--quiet` test for `slice:complete` or `slice:abandon`** — Tests cover `--quiet` for `slice:create`, `slice:list`, `slice:show`, and `slice:plan`, but not for `slice:complete` or `slice:abandon`. The plan asks for all output modes to be tested. Missing two quiet-mode test cases.

3. **`slice:create` import ordering** — `resolveProjectDir` is imported before `begin`, reversing the alphabetical-by-module pattern seen in epic commands (which import `begin` then `resolveProjectDir`). Both work; this is a cosmetic inconsistency with the established pattern. Biome doesn't flag it, so it's a style nit.

## Alignment with Plan

- All 12 tasks in the plan are addressed.
- `createSliceInputSchema` has `epic` as `z.string().min(1)` per plan specification.
- `slice:create` passes `epic` from the `--epic` flag through `validateInput` merge, consistent with INV-004.
- Human-readable output matches the specified format: `{sliceName} (epic: {epicName}): {previousStatus} -> {newStatus}` for create, multi-line format for complete.
- `slice:list` uses direct data layer access (no RPC), matching commands-api.md routing rules.
- `slice:abandon` uses `pc.yellow` for the abandoned status (differentiated from `pc.green` for success transitions), matching epic:abandon.
- All 8 commands registered in `main.ts` under the `slice:` namespace.
- The `--query` flag gap is acknowledged in the plan as not-a-regression.

## Alignment with Architecture

- Commands are thin wrappers with no business logic (commands-api.md contract).
- Read-only commands (`list`, `show`) go to Data Layer; mutations go through RPC Layer.
- Zod validation at CLI boundary before any layer call (INV-005).
- Explicit target flags on every command (INV-004).
- Output handling uses shared `output()` function with `--json`/`--quiet` modes.

## Test Quality

Strong coverage: 8 command runners, validation error cases, output mode tests, and a full lifecycle integration test (`create -> plan -> refine-plan -> implement -> complete`). The `setupActivatedEpic` helper properly walks through the full epic lifecycle. The `advanceSliceToImplementationComplete` helper handles state machine guard requirements (writing plan.md, plan-refined.md, invalidating cache). Test isolation via temp directories and `vi.restoreAllMocks()` is solid.
