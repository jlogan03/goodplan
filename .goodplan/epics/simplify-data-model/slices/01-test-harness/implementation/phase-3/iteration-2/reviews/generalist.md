# Phase 3 Review: Migrate Existing Harness Scripts (Iteration 2)

**Reviewer:** Generalist
**Score:** 8/10
**Issues:** Critical: 0, Important: 1, Minor: 2

## Summary

This iteration is a substantial improvement over iteration 1 (previously 7/10). All 13 issues from the prior review have been addressed: AUTONOMOUS_SYSTEM_PROMPT removed everywhere, firstOption auto-answering eliminated, stdin payloads restored, ESM imports cleaned up, error handling exits 1 on fatal, and all scripts use shared utilities consistently.

The migration is mechanically sound. Five scripts totaling ~1,800 lines have been refactored to use shared `createLogger`, `gp`/`gpJson`/`gpForce`, `runSkillSession`, `createSimulatedUser`, `parseModel`/`tierDefault`, and `isSuccess`. Duplication is dramatically reduced. The 34/34 unit test pass and zero AUTONOMOUS/firstOption grep matches confirm the cross-cutting cleanup is complete.

## Issues

### Important

**I-1: harness.ts lacks end-of-run violation summary**

validate.ts correctly accumulates violations across skill runs in `allViolations[]` and prints a summary at the end. harness.ts logs violations per-skill-run (lines 291-294) but has no aggregation or summary in its final HARNESS SUMMARY block (lines 2012-2023). This means an operator running a full `harness.ts all` session could miss violations buried in mid-run output. The old code had `directAccessViolations` with a summary — this was removed but not replaced with the equivalent using the new `session.violations` pattern.

Fix: Add an `allViolations: string[]` accumulator (same pattern as validate.ts) and print it in the HARNESS SUMMARY block.

### Minor

**M-1: validate.ts entityStatus uses verifyEntityStatus with empty expected string**

`entityStatus` calls `verifyEntityStatus(type, name, "", { cwd: PROJECT_DIR })` and reads `result.actual`. Passing `""` as expected is a semantic misuse — `verifyEntityStatus` is designed to compare against an expected status. The returned `ok` field will always be `false` (since no status equals `""`). This works but is confusing for readers and would be cleaner as a direct `gpJson` call, or `verifyEntityStatus` could support an overload that just returns the status without comparison.

**M-2: Unicode box-drawing characters replaced inconsistently**

Some scripts replace `=` box-drawing with ASCII `=` (validate.ts, harness.ts), arrows `->` replace em-dashes in comments, but harness.ts still uses Unicode box-drawing for `"─".repeat(60)` in the summary section (line 2012) and `┌─`, `│`, `└─` for the skill runner output. This is fine functionally but the plan called for "Unicode box-drawing restored" — the inconsistent mix of ASCII `=` and Unicode `─`/`┌`/`└` is worth noting. Not a bug.

## Strengths

- Clean separation: all 5 scripts now import exclusively from `./utils`, with zero direct agent SDK imports
- The `gpLocal`/`gpLocalJson`/`gpLocalForce` wrappers in harness.ts are a good pattern for project-scoped defaults without losing the generic shared utilities
- `patchSkillModels`/`restoreSkillModels` removal is a welcome simplification — model selection via `parseModel` + `query()` model option is far less fragile than file mutation
- Simulated user prompts are well-tailored per script (flashcards context for validate.ts, nondet-eval for harness.ts, TypeScript fixture for test-onboard.ts)
- Error handling in harness.ts `main()` now catches and falls through to summary instead of crashing, with proper `process.exit(1)` on failure
- `.project/` to `.goodplan/` path updates are thorough, with appropriate exemptions for test-migrate.ts
