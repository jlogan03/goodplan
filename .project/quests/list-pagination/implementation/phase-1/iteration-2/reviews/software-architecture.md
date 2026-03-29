# Software Architecture Review: Phase 1 — Shared Pagination Infrastructure (Iteration 2)

## Issues

**[MINOR]** `listArgs` not applied to other list commands in Phase 1 scope — inconsistent surface
The `listArgs` export is the right mechanism for scoping `--limit`/`--offset` to list commands. However, only `learning:list` and `schema.ts`'s `registerCommand("learning:list", ...)` were updated. The other five list commands (`epic:list`, `slice:list`, `quest:list`, `task:list`, `decision:list`) do not spread `listArgs` in their `defineCommand` args or in `registerCommand` calls. The stated scope of Phase 1 is "shared infrastructure" — the pattern exists but is not applied consistently even within the one command implemented in this phase vs what was left for Phase 2. This is intentional per the plan (other commands are Phase 2), but the `schema.ts` registry update only covers `learning:list`, meaning the live `schema --json` output for Phase 2 list commands won't include `limit`/`offset` until their registry entries are updated. The pattern is correct; the scope is explicit. No violation here — flagging as MINOR to ensure Phase 2 doesn't miss the registry update step for the remaining five commands.
File: src/commands/global/schema.ts:369
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `state` command in the schema registry uses manually maintained `offset`/`limit` entries — divergence risk
The `state` command's registry entry in `schema.ts` (lines 148-160) manually declares `offset` and `limit` with state-specific descriptions. The comment in `state.ts` explaining why these are not `listArgs` was added in this iteration (well done), but the same explanation is absent in `schema.ts` where the manual declarations mirror it. If a future maintainer sees the `state` registration with its custom `offset`/`limit` while seeing `learning:list` use `...listArgDefs`, the inconsistency may prompt an "alignment" refactor that silently changes the `state` command's description semantics. A brief comment on the `schema.ts` `state` registration entry would close this gap.
File: src/commands/global/schema.ts:148
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The listArgs refactor is clean and well-reasoned. Moving `limit`/`offset` out of `globalArgs` into a separate `listArgs` constant correctly prevents these flags from leaking onto mutation commands — both in CLI `--help` output and in `schema --json` (which LLM consumers use). The `GLOBAL_FLAG_KEYS` in `validate.ts` is not polluted with these keys, and the test in `validate.test.ts` explicitly documents that they are NOT stripped. The `parseNonNegativeInt` extraction to `pagination.ts` is a clean module deepening: it went from a private `state.ts` implementation detail to a shared, testable export with a proper unit test suite. The `PaginatedResult<T>` interface correctly uses optional properties (not `T | undefined`) under `exactOptionalPropertyTypes: true`, documented with a comment explaining the conditional spread constraint. Fitness functions now derive from source of truth (`Object.keys(globalArgs)`) rather than hardcoded lists — closing the drift risk that existed in iteration 1. Both identified MINOR issues are low-risk documentation/consistency gaps, not structural problems.

What would bring this to 10/10: add the comment in `schema.ts` for the `state` registration (mirrors the excellent comment already added in `state.ts`), and confirm Phase 2 plan explicitly calls out updating the registry for the remaining five list commands.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
