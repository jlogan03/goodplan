# Holistic Review — Rename to gp (Round 3)

## Issues

**[IMPORTANT] Phase 1 catch-all task would incorrectly rename migrate-specific `.project/` references that describe the legacy format**
The catch-all task says "All remaining `src/` files with `.project/` in string literals, error messages, JSDoc, and comments -- update to `.goodplan/`". However, several files in `src/commands/global/migrate/schemas.ts` (5 `.describe()` strings like "Path to the old-format epic directory relative to .project/", "All epics found in the old .project/ directory") and `src/core/rpc/migrate.ts` (hint strings at lines 1026, 1034, 1042 telling the LLM to "Look in .project/epics/ for directories") describe the pre-CLI legacy directory structure that the migrate command reads FROM. Since `migrate` accepts `.project/` as legacy input (and `pre-cli-project` fixture keeps `.project/`), these references to "old .project/" are semantically correct and should NOT change. The catch-all task needs an exclusion clause for migrate-related strings that describe the legacy input format, similar to how the plan already excludes prose "goodplan" product name references from the `goodplan` -> `gp` rename.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 test file count estimate is low (25+ stated vs 35 actual)**
Grep for `.project` across `tests/**/*.ts` finds 35 files with 98 total occurrences. The plan says "approximately 25+ files based on grep." The task description ("All test files with `.project/` path assertions") is correct in scope, but the count should be corrected so implementers can gauge effort accurately.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `tests/integration/migrate-learnings.test.ts` not explicitly listed alongside `migrate.test.ts`**
This file has `.project` references at lines 30, 335, and 341 (creating `.project` directories for migrate testing, checking `.project-old-` backup dirs). The plan explicitly calls out `migrate.test.ts` but not `migrate-learnings.test.ts`. The catch-all "All test files" task covers it, but given that migrate tests have special semantics (some `.project/` references should stay because they test legacy input), this file should be listed explicitly alongside `migrate.test.ts` with the same "support both `.project/` (legacy input) and `.goodplan/`" guidance.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has matured well through two rounds. All previous IMPORTANT and CRITICAL issues are resolved. The scope decisions table is clear, phasing is logical, atomicity requirements are explicit, the `pre-cli-project` fixture exception is documented, and verification steps cover the full lifecycle including migrate. The remaining gap is the catch-all task needing an exclusion for migrate-specific legacy `.project/` references in schema descriptions and LLM hints -- without this, the implementer will incorrectly rename strings that should stay as-is. Fixing the IMPORTANT issue and tightening the test estimates would bring this to 9+.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
