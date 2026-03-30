# Generalist Review — Phase 4: Verify Commands & Build Defines

## Score: 9/10

## Summary

Clean, well-structured implementation that faithfully executes the plan. The verify command handles all three modes (pass, fail, fix) with proper JSON/human output symmetry. Build defines are correctly added to both `package.json` and `build-plugin.sh` matching existing quoting patterns. The `verifyHmacOrThrow` extraction into `hmac.ts` is a good refactor that benefits both `load.ts` and `state.ts`. Tests are thorough with good coverage of happy path, tampering, bootstrap, and fix scenarios.

## Issues

### Important (1)

**I1: `verify --fix` conditional spread not used for `stateSignature`**
File: `src/commands/global/verify.ts`, line 59-61.
The plan explicitly requires using the `exactOptionalPropertyTypes`-safe conditional spread pattern: `...(signature !== undefined ? { stateSignature: signature } : {})`. The implementation uses a direct property assignment `stateSignature: signature` instead. Since `signature` is the return value of `signStateTree()` (always a string, never undefined), this works in practice. However, the plan called this out specifically to maintain consistency with the pattern used elsewhere in the codebase (Phase 2 `commitState`). This is a style/convention deviation rather than a bug.

### Minor (2)

**M1: Markdown exclusion is a behavioral change from Phase 1, not a Phase 4 task**
Files: `src/core/data/hmac.ts`, `tests/unit/data/hmac.test.ts`, fixture `project.json` files.
The diff includes a change from `serializeStateTree(state, { inline: false })` (which replaced markdown with `true`) to a new `serializeExcludingMarkdown()` that completely omits markdown entries. This is a sound improvement (sub-agents write `.md` files between commits, so their presence should not affect the hash), but it is not listed as a Phase 4 task. It required updating all three fixture `stateSignature` values. The change is well-tested and the rationale is documented, but it represents scope creep from Phase 4's defined tasks. If this was discovered during Phase 4 integration, it should be noted in the plan as an in-flight correction.

**M2: `verify` added to `READ_ONLY_COMMANDS` in stateless-commands fitness test**
File: `tests/fitness/stateless-commands.test.ts`.
`verify` without `--fix` is read-only, but `verify --fix` writes to disk. The fitness test classifies `verify` as read-only, meaning the test won't check whether `--fix` needs entity-identifying flags. This is acceptable since `--fix` operates on the whole project (not a specific entity), but the classification is imprecise. A comment noting "verify --fix writes but is project-scoped" would clarify the intent.

## Strengths

- Error handling in `verify.ts` follows the `state.ts` self-contained pattern exactly as planned, with proper JSON/human output branching.
- `atomicWrite` export has the requested JSDoc comment limiting its use to `verify --fix`.
- Architecture docs (commands-api, data-layer-api, invariants) are all updated with clear, accurate descriptions.
- The `verifyHmacOrThrow` helper is a well-factored DRY extraction that eliminates duplicate verification logic across `load.ts` and `state.ts`.
- Fitness tests cover the full spectrum: commit always embeds signature, signature changes on state change, end-to-end via compiled binary, tampering detection, and markdown immunity.
- Build defines use the correct quoting patterns for each context (`package.json` shell quoting vs `build-plugin.sh` escaped quotes).
