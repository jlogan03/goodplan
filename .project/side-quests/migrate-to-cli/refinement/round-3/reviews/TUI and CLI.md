# TUI and CLI Review — Round 3

## Round 2 Issue Resolution Check

The two IMPORTANT issues from round 2 have been addressed:

1. **`readStdin()` + `validateInput()` decision** — Resolved. Phase 2 now commits to: use `readStdin()` as-is (handles TTY detection, size limits, JSON parsing, returns `Record<string, unknown>`), then parse through `migrationResponseSchema.safeParse()` directly in `rpcMigrate()`, bypassing `validateInput()` since there are no entity-targeting flags to merge. Clean, explicit, no new stdin path.

2. **`MigrationResult` dual error path** — Resolved. The plan now commits to option (b): all errors thrown as `GoodplanError`, `MigrationResult` simplified to `'questions' | 'complete'` only. The concern about losing multi-error reporting is addressed by the `VALIDATION_MIGRATION_INVALID` code which can carry a `detail` field listing all invalid paths. Single error path throughout.

Round 2 MINOR issues:
- `--force` behavior: Resolved. Phase 2 now explicitly documents `--force` as N/A for migrate, silently ignored.
- Question ID naming convention: Resolved. Phase 1 now documents the kebab-case convention with the round-N-from-round-N-1 dependency noted.
- `GOODPLAN_DIR` env var: Resolved. Phase 6 now says `rpcMigrate()` accepts a `projectDir` argument (like `rpcInit()`), and the test uses that directly rather than env var or `process.chdir()`. This is the correct approach matching the established pattern.

## Issues

**[IMPORTANT] `stdinSchemaRegistry` receives a discriminated union but the registry maps a single schema per command — the union approach has unresolved shape ambiguity**
Phase 2 says: "Register a discriminated union of all round response types (keyed by `round` field), since multi-round schemas share the same command entry point." Looking at the `stdinSchemaRegistry` in `src/commands/global/schema.ts`, it maps command names to `z.ZodType` and passes them directly to `z.toJSONSchema()` for the `goodplan schema --command migrate` output. A discriminated union of round schemas (round 1 = inventory, round 2 = epic-details, round 3 = confirmation) would produce a large, opaque JSON Schema that does not help the LLM understand which shape is expected at the current round. The LLM already receives the `responseSchema` inline in each `MigrationQuestion` — that's the schema it actually uses. The `stdinSchemaRegistry` entry would be the "all rounds" union used only for `goodplan schema --command migrate`, which is a discovery path. The plan should either: (a) explicitly document that the registry entry is the "full protocol schema" (union of all round envelopes) used for discovery only, and that the per-question `responseSchema` is what the LLM actually validates against during the flow; or (b) register only the outer `MigrationResponse` envelope (`{ round: number, answers: MigrationAnswer[] }`) as the stdin schema — since the answers themselves are heterogeneous blobs validated at runtime, not at the schema command level. The current plan text doesn't clarify which approach is intended, leaving the implementer to decide.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 pre-check condition mismatch — init checks `.project/` existence, migrate checks `project.json` existence**
The `initCommand` in `src/commands/global/init.ts` checks for `.project/` directory existence (not `project.json`). Phase 2's `rpcMigrate()` pre-check says "`.project/` must NOT exist — already migrated → `STATE_ALREADY_INITIALIZED`" but the condition described is checking for `project.json` ("the old `.project/` is already CLI-format"). These are different conditions: a user could have `.project/` without `project.json` (pre-CLI format, which is exactly what migration handles). The plan should be precise: the "already migrated" guard checks for `project.json` existence within `.project/`, not `.project/` existence. The current Phase 2 expected behavior confirms this: "in a dir with `.project/project.json` already → throws `GoodplanError` with code `STATE_ALREADY_INITIALIZED`". The tasks section should match — currently says "`.project/` must NOT exist" which is wrong. Low risk of misimplementation given the expected behavior section is clear, but the task wording is misleading.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 skill invocations use `echo '...' | goodplan migrate --json` but `cli-interaction.md` section 4 shows `stdin: ""` syntax for commands with no payload — the skill should follow consistent conventions**
The plan correctly specifies `echo '<json>' | goodplan migrate --json` for piping JSON answers. This is valid shell syntax. However `cli-interaction.md` uses two notations: `echo '...' | goodplan ...` (shell style) and `stdin: ""` (Claude Code Bash tool parameter style). The plan should explicitly note which context applies: the skill runs via Claude Code's Bash tool, so either syntax is acceptable, but `echo '...' | goodplan migrate --json` is the cleaner choice for non-empty payloads (piping JSON). The verification step in Phase 5 confirms this: "Verify all `goodplan migrate` invocations use correct `echo '...' | goodplan migrate --json` stdin piping syntax." This is already correct — just a documentation clarity note, not a blocking issue.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 confirmation round `hint` field carries the full state summary — size risk for very large projects**
Phase 3 says the state summary is included as the `hint` field of the confirmation question. `MigrationQuestion.hint` is a string. For a project with many epics and slices, this summary could be very large (hundreds of epics × slice lists). The plan has no size guard on the hint field. The `MigrationQuestion` type definition in Phase 1 should note that `hint` is informational and the LLM is expected to process it, but for very large projects the implementer should consider truncating or paginating the summary. This is a quality-of-life issue — it won't break correctness since the LLM uses the `responseSchema`, but an oversized hint degrades usability.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 `commitState(projectDir, ZERO_STATE, newState)` — `ZERO_STATE` import path not specified, verify it's exported from `src/core/tree.ts`**
Phase 4 says "Pass `ZERO_STATE` (from `src/core/tree.ts`) as `oldState`." This is a specific claim about the module that exports `ZERO_STATE`. Searching the codebase: `ZERO_STATE` is referenced in the plan but no exported constant by that name is visible in the schema files I explored. The plan should confirm this constant exists and is exported, or direct the implementer to create it. If `ZERO_STATE` doesn't exist yet, Phase 4 needs a task to define and export it from `src/core/tree.ts`. The `init` flow (via `begin()`) is a useful reference for how new state is bootstrapped — the implementer should verify the import path before coding.
Resolution: CODEBASE_EXPLORATION

## Score: 9/10

The plan is now in excellent shape. Both R2 IMPORTANT issues were cleanly resolved: the `readStdin()` commit is explicit and correct, and the single-error-path simplification is the right architectural call. The remaining issues are all MINOR — one about `stdinSchemaRegistry` union ambiguity (IMPORTANT downgraded to IMPORTANT because it's borderline), one task wording imprecision in Phase 2's pre-check description, one documentation note about `echo` vs `stdin:` syntax, one size risk in the confirmation hint field, and one import path verification. None block implementation. Resolving the `stdinSchemaRegistry` clarification and the pre-check wording would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 1
- Minor: 4
