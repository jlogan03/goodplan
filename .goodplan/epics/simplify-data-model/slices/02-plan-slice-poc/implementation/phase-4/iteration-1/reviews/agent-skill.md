# Agent Skill Review: Phase 4 — Test Harness & Verification

## Issues

**[IMPORTANT]** verifyNoArtifactReads not covered in test-utils.ts
The new `verifyNoArtifactReads()` function is exported from `utils.ts` but is not tested in `test-utils.ts`, which tests all other exported utilities. This is a pure function with no I/O — it should be trivial to unit test with synthetic tool call arrays, covering both positive (violation detected) and negative (clean) paths. Without tests, regressions in the pattern matching logic would go undetected.
File: tools/dogfood/utils.ts:741
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** ARTIFACT_PATH_PATTERNS may produce false positives on legitimate paths
The `\bsrc\/` pattern will flag any Read on any file whose path contains a `src/` segment, including paths in the fixture's own `/tmp/gp-fixture-.../src/` directory. If the orchestrator legitimately reads a file like `/tmp/gp-fixture-123/src/index.ts` for any reason (e.g., a Bash `cat` that gets misclassified, or the orchestrator querying the fixture), it would be flagged. Similarly, `\bskills\/` would flag reads of `skills/_shared/references/` files that might be legitimate for the orchestrator to reference during its own assembly. The `\bagents\/` pattern also catches reads of the `agents/` directory. Consider narrowing the patterns to be more context-specific — e.g., only flag reads within the fixture's `.goodplan/` tree, or use path-anchored patterns that distinguish orchestrator-level reads from harness-level reads.
File: tools/dogfood/utils.ts:730
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Score progression detection relies on text matching in orchestrator messages only
The test tracks score progression by parsing `aggregate|overall|net score:` patterns from assistant text blocks (lines 214-222 of test-plan-slice.ts). However, as noted in line 358, scores may be reported only in sub-agent sessions (not visible to orchestrator). The test correctly treats this as a non-hard-failure (WARN), which is appropriate. The comment is well-written and the fallback is sound.
File: tools/dogfood/test-plan-slice.ts:214
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Hardcoded fallback version in resolveDefaultGpBin is 1.0.2 while project is 1.0.3
The fallback path in `resolveDefaultGpBin()` references version `1.0.2` (line 60 of utils.ts) while the project is at `1.0.3`. This was pre-existing before this phase but worth noting since this phase depends on the utility. The dynamic resolution path above it should handle this correctly in practice.
File: tools/dogfood/utils.ts:60
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** test-plan-slice.ts builds plugin inline — no isolation from repo working tree
The test runs `bun run build:plugin` against the repo working tree (line 77), which means uncommitted changes to skills or agents affect the test. This is acceptable for development workflow but could produce confusing results if the test is run with a dirty working tree. A comment noting this dependency would be helpful.
File: tools/dogfood/test-plan-slice.ts:76
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is well-structured, follows established patterns from existing harness scripts, and correctly implements all plan-specified functionality: `verifyNoArtifactReads()` utility, extended `createMinimalFixture()` with backward-compatible optional params, comprehensive `test-plan-slice.ts` with simulated user and multi-assertion post-run verification, and CLAUDE.md update. The code quality is high with good documentation and JSDoc comments. Score is 8 rather than 9 because: (1) `verifyNoArtifactReads` lacks unit test coverage in test-utils.ts, and (2) the artifact path patterns could produce false positives that would confuse test results.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
