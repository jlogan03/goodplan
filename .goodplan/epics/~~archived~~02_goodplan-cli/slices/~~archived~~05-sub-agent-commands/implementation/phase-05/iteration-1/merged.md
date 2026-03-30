# Merged Review — Phase 05: Start Commands & E2E

**Scores:** Generalist 8/10 · TypeScript 9/10

---

## Critical Issues (0)

None.

---

## Important Issues (1)

### I1: Massive code duplication across start commands

The 3 slice/quest start commands (`start-plan.ts`, `start-refinement.ts`, `start-implementation.ts`) are character-for-character identical except for the phase string. The 5 epic start commands (`start-explore.ts`, `start-architecture.ts`, `start-slices.ts`, `start-refine-architecture.ts`, `start-refine-slices.ts`) are likewise identical except for the phase string. This is ~400 lines of duplicated logic across 8 files.

Any future change to inline budget wiring, error messages, or output behavior requires updating all 8 files identically.

A factory function would eliminate this:

```typescript
function makeSliceQuestStartCommand(phase: SubmitPhase, name: string, description: string) {
  return defineCommand({ meta: { name, description }, args: { ...globalArgs, slice: {...}, quest: {...}, inline: {...} }, run({ args }) { /* shared logic */ } });
}
```

**Note:** The plan specifies "one file per command" as the established pattern, mirroring submit-* commands. This may be an intentional convention — requires user decision.

**Files:** All `src/commands/subagent/start-*.ts`
**Resolution:** USER_INPUT

---

## Minor Issues (3)

### M1: Non-null assertion on `questVal`

In all three slice/quest start commands, `questVal!` is used after the mutual exclusivity check (`(sliceVal !== undefined) === (questVal !== undefined)`). The assertion is safe but TypeScript's flow analysis cannot narrow it. A comment explaining why the assertion is safe would improve maintainability.

**Files:** `src/commands/subagent/start-plan.ts:50`, `start-refinement.ts`, `start-implementation.ts`
**Resolution:** DIRECTLY_ACTIONABLE — add explanatory comment

### M2: `as string | undefined` casts on args

All start-* commands cast `args.slice as string | undefined`, `args.quest as string | undefined`, and `args.inline as string | undefined`. This is because citty's type inference doesn't distinguish optional string args from `string | boolean`. Pattern is consistent with existing submit-* commands — a single shared type-safe extraction helper would document the citty quirk in one place rather than repeating the cast across 8 files.

**Files:** All `src/commands/subagent/start-*.ts`
**Resolution:** DIRECTLY_ACTIONABLE (low priority, follows existing convention)

### M3: Test coverage gaps for epic-targeted start commands

Only `start-explore` has a test runner. The other 4 epic-targeted commands (`start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`) have no test coverage. Risk is low given identical structure, but tests would catch copy-paste errors in phase name strings.

**Files:** `src/commands/subagent/start-architecture.ts` et al.
**Resolution:** DIRECTLY_ACTIONABLE

---

## Omitted / Resolved

- **`parseInlineBudget` silent coercion** (Generalist I2): TypeScript reviewer confirmed the behavior is correct per citty delivery modes and is well-tested. Silently falling through to `true` for non-numeric strings is the intended fallback. Downgraded to non-issue.
- **`run()` sync vs async inconsistency** (TypeScript M): Noted as intentional — submit-* use async because they read stdin; start-* are sync because they don't. No action needed.

---

## Consensus Positives

- TypeScript strict mode fully honored (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). `tsc --noEmit` passes clean.
- `parseInlineBudget` correctly handles all citty delivery modes; well-tested.
- `CompleteResult.context` properly typed as `ContextBundle | undefined`.
- `SubmitPhase` union correctly includes `"complete"`.
- `type` imports used where appropriate.
- Architecture docs (`rpc-layer-api.md`, `_overview.md`) updated consistently with the code.
- All 8 start commands registered in `main.ts`; `startContext` signature consistent across all call sites.
