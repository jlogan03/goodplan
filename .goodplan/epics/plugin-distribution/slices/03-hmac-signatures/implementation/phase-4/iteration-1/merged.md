# Merged Review — Phase 4: Verify Commands & Build Defines

## Scores
| Reviewer | Score |
|---|---|
| Generalist | 9/10 |
| Software Architecture | 9/10 |
| TypeScript | 9/10 |
| TUI/CLI | 8/10 |

**Consensus:** 9/10. Clean, well-structured implementation. Two lint issues and one error-path gap prevent a higher score.

---

## Issues

### Important (2)

**I1: Unused imports in verify test file** *(TUI/CLI)*
`signStateTree` and `assembleState` are imported in `tests/unit/commands/verify.test.ts:5` but never used. Biome flags these as `noUnusedImports` errors. New code should not add to the existing lint count.
Resolution: DIRECTLY_ACTIONABLE — remove the two unused imports.

**I2: Import out of sort order in schema.ts** *(TUI/CLI)*
The `LEGACY_DIR_NAME, PROJECT_DIR_NAME` import from `../../core/data/project.js` at `src/commands/global/schema.ts:27` is out of sort order. Biome's `organizeImports` rule flags this. It was likely appended rather than inserted at the correct sorted position.
Resolution: DIRECTLY_ACTIONABLE — move the import to its correct alphabetical position.

---

### Minor (5)

**M1: `--query` not preserved in catch block error output** *(TypeScript, TUI/CLI)*
In `verify.ts:105`, the catch block reconstructs `OutputArgs` as `{ json: true }`, dropping `args.query`. If a user runs `gp verify --query '.error.code'` and it fails, the error output is not filtered through the jq expression. `state.ts` has the same pattern (always forces `json: true`), but `verify` has a human-readable mode where this is more visible. Consider preserving `query`: `{ json: true, query: args.query } as const`, or passing `args` directly to `outputError`/`outputUnexpectedError`.
Resolution: DIRECTLY_ACTIONABLE — preserve `args.query` in the error path.

**M2: `verify` misclassified in stateless-commands fitness test** *(Software Architecture, TypeScript, Generalist)*
`verify` sits in `READ_ONLY_COMMANDS` in `tests/fitness/stateless-commands.test.ts:16-21`, but `verify --fix` writes `project.json` directly via `atomicWrite()`. The INV-001 rationale ("infrastructure metadata maintenance, not a workflow state transition") supports the current placement, but the classification is imprecise. `migrate`, which also mutates without entity flags, lives in `ENTITY_EXEMPT_COMMANDS`. Either:
- Move `verify` to `ENTITY_EXEMPT_COMMANDS` to be consistent with `migrate`, or
- Add a comment explaining why `verify` belongs in `READ_ONLY_COMMANDS` despite `--fix`.
Resolution: DIRECTLY_ACTIONABLE — add a comment at minimum; move to `ENTITY_EXEMPT_COMMANDS` if preferred.

**M3: Markdown exclusion change is scope creep from Phase 4** *(Generalist)*
The diff includes a behavioral change from `serializeStateTree(state, { inline: false })` to a new `serializeExcludingMarkdown()` that omits markdown entries entirely. This is sound (sub-agents write `.md` files between commits so their presence should not affect the hash), and it is well-tested with all three fixture `stateSignature` values updated. However, it is not listed as a Phase 4 task. It should be noted in the plan as an in-flight correction so the rationale is on record.
Resolution: NOTE_ONLY — document in the plan as an in-flight correction.

**M4: Empty `setup()` method in verify command** *(TypeScript)*
`setup() {}` at `verify.ts:46` is unnecessary — citty does not require it. This matches the pattern in `status.ts` and other commands, so no action is needed unless the team cleans up the pattern globally.
Resolution: NOTE_ONLY — consistent with codebase convention; no action required.

**M5: Test spy re-creation is slightly fragile** *(TypeScript)*
In the "fixes tampered project (JSON)" test around `verify.test.ts:772`, `process.stdout.write` is re-spied after the first `runVerify` call instead of resetting the capture array (`chunks.length = 0`). The current approach works but is fragile if Vitest changes spy replacement semantics.
Resolution: DIRECTLY_ACTIONABLE (low priority) — prefer `chunks.length = 0` to reset the array between steps.

---

## Additional Coverage Gaps *(TUI/CLI)*

The following are not bugs but would complete output-mode coverage:

- No test for `--quiet` flag (should suppress all stdout on a passing project).
- No test for `--query` flag (e.g., `gp verify --json --query '.status'` should return `"pass"`).
- No test for `NO_COLOR=1` behavior (picocolors handles this internally, so risk is low).

---

## Strengths

- `verify.ts` correctly uses `assembleState()` directly (bypassing `loadState()` HMAC check) as the escape hatch for broken signatures.
- `--fix` validates through `projectSchema.parse()` before writing, preserving INV-005.
- INV-001 exception is documented in all three relevant locations: system invariants, epic invariants, data-layer API.
- `atomicWrite()` export has appropriate JSDoc warning limiting its use to `verify --fix`.
- `verifyHmacOrThrow` is a clean DRY extraction that eliminates duplicate verification logic across `load.ts` and `state.ts`.
- Error handling matches the `state.ts` self-contained pattern with proper JSON/human output branching and correct exit codes per INV-007.
- Build defines use the correct quoting conventions for each context (`package.json` shell quoting vs `build-plugin.sh` escaped quotes).
- Fitness tests cover the full spectrum: commit always embeds signature, signature changes on state change, end-to-end via compiled binary, tampering detection, and markdown immunity.
- Type safety is strong: proper `GoodplanError` with typed error codes, `import type` usage with `verbatimModuleSyntax`, and `exactOptionalPropertyTypes`-safe patterns used where applicable.
