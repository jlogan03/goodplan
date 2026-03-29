# Holistic Review — onboard-repo Plan (Round 4)

## Issues

**[MINOR]** Phase 5 CLAUDE.md update task references "conventions.md repo structure section" but conventions.md is project-specific

The last task in Phase 5 says: "Update `.project/conventions.md` (repo housekeeping, not skill logic): Add `onboard-repo/` to the skills list in the repo structure section." This is updating the goodplan repo's own conventions file — a repo housekeeping task mixed into a phase about skill logic (expertise profiling, hot spots, CLAUDE.md). It would be clearer as a separate task at the end of Phase 1 (where the skill files are created) or flagged as a cross-cutting housekeeping item. Also, since the plan says "Skills-only changes" in the Overview, this conventions.md edit is the only non-skill file touched beyond the install script — worth noting explicitly so the implementer doesn't overlook it.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 smoke test success criteria don't verify expertise memory file path derivation

Phase 5 smoke test says to verify "expertise memory file exists in `~/.claude/projects/<project>/memory/`" but the expertise profiling reference (Step 10) describes a specific path derivation using `git rev-parse --show-toplevel` with slashes replaced by dashes. The smoke test criteria should verify the actual path matches this derivation (e.g., for a cloned repo at `/tmp/some-repo`, the memory path should be `~/.claude/projects/-tmp-some-repo/memory/expertise_*.md`). Without this, the test could pass with a wrong path that breaks cross-session persistence.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 fixture generation specifies "at least 2 contributors" but git user config will be the same person running the script

The fixture script task says "at least 2 contributors in git log." Since the script generates commits programmatically, it needs to explicitly set different `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` environment variables for some commits to simulate multiple contributors. This is implied but not stated — an implementer might miss it and end up with a single-author fixture, which would make Phase 5's expertise profiling tests less meaningful (can't test per-contributor analysis).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 convention heuristics task lists Python/Rust/Go/Java generalization but fixture is TypeScript-only

The convention-heuristics.md task includes a dispatch table for multiple languages and "Generalization notes: Python gets pyproject.toml/mypy/ruff detection, Rust gets Cargo.toml/clippy detection." But the only fixture is a TypeScript project, and the smoke test is also TypeScript. Non-TypeScript heuristics will be completely untested. This is acceptable for initial delivery, but the plan should acknowledge this gap explicitly — either as a known limitation or as a future side quest. Without acknowledgment, it looks like the plan claims coverage it doesn't verify.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 issues have been addressed. The plan is well-structured with clear phasing, concrete verification at each phase, proper use of existing patterns (dogfood harness, cli-interaction.md references, output-templates.md Variant B), and careful attention to re-entry handling. The test architecture is sound — fixture generation script + SDK-based automated test + real repo smoke test covers the important paths. The known gh CLI limitation in fixture tests is explicitly documented with the gap covered by the smoke test. Invariant compliance is clean — the skill only uses CLI commands for state mutations (INV-001) and Write tool for LLM-owned markdown (consistent with Data Layer ownership model). The remaining issues are all minor precision items that improve implementability but don't affect correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
