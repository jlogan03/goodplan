# TypeScript and JavaScript Review — Phase 4: Verify Commands & Build Defines

## Issues

**[IMPORTANT]** `verify` with `--fix` is a mutation, not read-only — misclassified in stateless-commands fitness test
The `verify` command is listed in `READ_ONLY_COMMANDS` in `tests/fitness/stateless-commands.test.ts`. This is correct for the bare `gp verify` (read-only check), but `gp verify --fix` is a mutation: it writes `project.json` directly via `atomicWrite()`. However, because `--fix` is a boolean flag defaulting to false and the command doesn't target a specific entity (it operates on the whole project), this classification is defensible — it matches the pattern of `init` and `migrate` (project-scoped operations). The `ENTITY_EXEMPT_COMMANDS` set exists for exactly this case (`migrate` is there). If the intent is that `verify` when invoked with `--fix` is a mutation, it should be in `ENTITY_EXEMPT_COMMANDS` rather than `READ_ONLY_COMMANDS`. If the intent is that `verify` is always considered read-only (with `--fix` as a metadata repair operation, not a workflow mutation), then `READ_ONLY_COMMANDS` is correct. The INV-001 exception rationale ("infrastructure metadata maintenance, not a workflow state transition") supports the current classification, but it's worth being explicit. Consider adding a comment explaining why `verify` is in `READ_ONLY_COMMANDS` despite `--fix`.
File: tests/fitness/stateless-commands.test.ts:21
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Error catch block reconstructs `OutputArgs` instead of passing `args` directly
In `verify.ts` line 105, the catch block creates `const jsonArgs = args.query || args.json ? ({ json: true } as const) : {};` instead of passing `args` directly to `outputError`/`outputUnexpectedError`. This works but loses the `query` arg — if the user ran `gp verify --query '.error.code'` and it failed, the error output wouldn't be filtered through the jq query. The `state.ts` command has the same pattern (always forces `json: true`), but `state` always outputs JSON. For `verify`, the user might reasonably use `--query` on error output. Consider passing `args` directly, or at minimum preserving the query: `{ json: true, query: args.query } as const`.
File: src/commands/global/verify.ts:105
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Empty `setup()` method in verify command
The `setup() {}` on line 46 of `verify.ts` is unnecessary — citty doesn't require it. Other commands like `statusCommand` in `status.ts` also include it, so this is consistent with the codebase convention. No action needed unless the team wants to clean up the pattern globally.
File: src/commands/global/verify.ts:46
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test file `verify.test.ts` uses `vi.restoreAllMocks()` but also manually re-mocks `process.stdout.write` in multi-step tests
In the "fixes tampered project (JSON)" test (around line 770-779 of the diff), after the first `runVerify` call, the test re-creates the `process.stdout.write` spy. Since `vi.restoreAllMocks()` only runs in `afterEach`, the intermediate re-mock via `vi.spyOn` should work correctly (it replaces the existing spy). This is fine but slightly fragile — if Vitest changes spy replacement semantics, the second capture array could include output from the first call. A clearer pattern would be `chunks.length = 0` to reset the existing array, but this is minor.
File: tests/unit/commands/verify.test.ts:772
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Strong implementation. Type safety is excellent — proper use of `GoodplanError` with typed error codes, schema validation via `projectSchema.parse()` before writing, and correct `import type` usage with `verbatimModuleSyntax`. The `__GP_HMAC_KEY__` build define follows the established `__GOODPLAN_VERSION__` pattern exactly. The `atomicWrite` export has appropriate JSDoc warning about limited intended use. The error handling catch block in verify.ts correctly handles both `GoodplanError` and unexpected errors with proper exit codes per INV-007. The IMPORTANT issue about `--query` not being preserved in the error path is the main gap preventing a 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
