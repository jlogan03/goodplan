# Holistic Review — Slice 08 Documentation Plan

## Issues

**[IMPORTANT]** Phase 3 stale reference sweep is incomplete — 12 files missing from explicit tasks
The plan explicitly lists 6 files to update in Phase 3, but the actual grep finds 18 files with stale references (75 total occurrences). The plan has a catch-all "Run full grep" task at the end, but 12 files with stale references are not called out: `create-epic/SKILL.md` (10 hits), `plan-slice/SKILL.md` (2), `audit/SKILL.md` (4), `create-side-quest/SKILL.md` (1), `_shared/references/cli-interaction.md` (2), `_shared/references/decisions-format.md` (1), `_shared/references/README.md` (1), `_shared/references/audit-conventions.md` (1), `init/references/expertise-profiling.md` (1), `init/references/repo-scanning.md` (1), `init/references/migration-detection.md` (1), `upgrade/references/migration-heuristics.md` (2). Relying on a vague catch-all grep task for 12 of 18 affected files risks the implementer missing them. Enumerate all 18 files with their match counts and the specific replacements needed, or at minimum group the remaining 12 as an explicit sub-task with the file list.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 does not cover `agents/` directory stale references
The plan's Phase 3 catch-all mentions "skills/ and agents/ directories" but only enumerates files under `skills/`. There are 4 stale references across 3 agent files: `agents/audit-architecture-phase.md` (2 hits), `agents/audit-docs-phase.md` (1), `agents/audit-tests-phase.md` (1). These should be explicitly listed as tasks or at minimum as a named sub-task.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 Before grep pattern does not match the After verification pattern
The Before check uses a long pipe through `grep -v 'SKILL.md:.*description'` to exclude false positives, but the After verification grep on line 106 uses a different pattern (adds `\b` word boundaries on some terms, removes others like `/complete[^-]`). The Before and After checks should test the same thing with the same pattern so the implementer can confirm the Before count drops to zero. Align the patterns.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 verification does not include a functional test
Phase 1 rewrites an entire skill. The verification is limited to `bun run build:plugin` passing and grep checks for removed patterns. There is no functional test that the rewritten start-epic skill actually works (e.g., running it against a fixture repo in a known state). Given the E2E gate in Phase 5, this is partially mitigated, but a Phase 1 functional smoke test would catch issues earlier and reduce debugging cost in Phase 5. Consider adding a note that Phase 5's E2E run covers start-epic, or add a targeted harness run.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Bug A description is vague about the payload format
The task says "Include all learnings in the `epic:complete` payload, not just the first one" but does not specify the payload format. The implementer needs to know what `epic:complete` expects — is it stdin JSON with a `learnings` array? A repeated flag? Specifying the expected CLI command shape (referencing `gp schema` output or the commands-api architecture doc) would remove ambiguity.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 4 success criteria are subjective
Phase 4 After checks say "README.md lists exactly 12 skills with correct `/gp:` names" and "`.goodplan/architecture/_overview.md` references 12 skills" — but these are verified by "Read each doc and confirm accuracy." This is a human judgment verification, not a runnable check. Add a grep-based count: `grep -c '/gp:' README.md` should return at least 12, and a negative grep for old skill names should return 0.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is well-structured with clear phases, good goal alignment, and solid verification patterns. The main gap is Phase 3's incomplete file enumeration — only 6 of 18 affected files are explicitly tasked, and the agents/ directory is omitted from explicit tasks. The Before/After pattern mismatch in Phase 3 could confuse the implementer. Fixing the file enumeration and aligning verification patterns would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
