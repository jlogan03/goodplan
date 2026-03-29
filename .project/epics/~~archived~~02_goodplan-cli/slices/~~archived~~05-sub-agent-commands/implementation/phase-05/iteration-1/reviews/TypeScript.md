# TypeScript Review: Phase 5 — Start Commands & E2E

## Issues

**[IMPORTANT]** Massive code duplication across 8 start-* commands

The 3 slice/quest start commands (`start-plan.ts`, `start-refinement.ts`, `start-implementation.ts`) are character-for-character identical except for the phase string (`"plan"`, `"refinement"`, `"implementation"`). The 5 epic start commands (`start-explore.ts`, `start-architecture.ts`, `start-slices.ts`, `start-refine-architecture.ts`, `start-refine-slices.ts`) are likewise identical except for the phase string. This is ~400 lines of duplicated logic across 8 files.

A shared factory function would eliminate this:

```typescript
function makeSliceQuestStartCommand(phase: SubmitPhase, name: string, description: string) {
  return defineCommand({ meta: { name, description }, args: { ...globalArgs, slice: {...}, quest: {...}, inline: {...} }, setup() {}, run({ args }) { /* shared logic */ } });
}
```

This is a simplicity concern — 8 near-identical files is maintenance overhead with no benefit. However, the plan explicitly specifies "one file per command" as the established pattern, and existing submit-* commands follow the same per-file structure. This follows the existing convention consistently.

File: src/commands/subagent/start-plan.ts:1
Resolution: USER_INPUT

**[MINOR]** Non-null assertion on questVal

In all three slice/quest start commands, `questVal!` is used on line 50 after the mutual exclusivity check. The check on line 41 `(sliceVal !== undefined) === (questVal !== undefined)` does guarantee that if `sliceVal` is undefined then `questVal` is not, but TypeScript's flow analysis cannot narrow this. The `!` assertion is a pragmatic choice here — the alternative would be a redundant runtime check or a type guard function. This is acceptable given the guard above, but a comment noting why the assertion is safe would improve maintainability.

File: src/commands/subagent/start-plan.ts:50
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `run()` handlers are synchronous but citty expects async

The start-* command `run` handlers are defined as synchronous functions (`run({ args }) { ... }`), while the submit-* commands use `async run({ args }) { ... }`. Both patterns work with citty (it handles sync and async), but the inconsistency is worth noting. Since `loadState()` and `startContext()` are synchronous, the sync handler is technically correct and marginally more efficient. No change needed, but the inconsistency with submit-* commands is intentional (submit-* read stdin which is async).

File: src/commands/subagent/start-plan.ts:37
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `as string | undefined` casts on args

All start-* commands cast `args.slice as string | undefined` and `args.quest as string | undefined` (or `args.epic as string | undefined`, `args.inline as string | undefined`). This pattern matches exactly what existing submit-* commands do (e.g., `submit-plan.ts` uses `validateInput` which handles the typing). The casts are needed because citty's type inference doesn't distinguish optional string args from `string | boolean`. Consistent with the codebase convention.

File: src/commands/subagent/start-plan.ts:38
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The implementation is clean, type-safe, and follows established codebase patterns precisely. TypeScript strict mode is fully honored (noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax). `tsc --noEmit` passes clean. The `parseInlineBudget` utility correctly handles all citty delivery modes and is well-tested. The `CompleteResult.context` wiring in `complete.ts` is properly typed with the optional `ContextBundle` field. Import paths use `type` imports where appropriate (`import type { Target }`). The `SubmitPhase` union type correctly includes `"complete"` for the inline-on-mutation use case.

The one IMPORTANT issue (duplication) follows the explicit project convention of one file per command and mirrors the existing submit-* pattern, so it may be intentional. Reaching 10 would require either extracting the shared factory or a documented decision that per-file duplication is preferred.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
