# Learnings: decisions-and-expertise

## Shared references solve the cross-skill duplication problem

Moving duplicated files to `_shared/references/` eliminated 6 copies of formats.md and 3×2 copies of dependency-research/team-defaults/codebase-context-discovery. The consolidation criterion ("will these stay unified long-term?") prevents premature consolidation of files that may diverge — reviewer prompt files were correctly left as skill-specific copies.

## Loading Protocol abstraction prevents duplication in consumers

Instead of each skill inlining the decisions loading algorithm (glob, skip superseded, flag revisiting), defining it once in `decisions-format.md` and having skills reference it avoids the N-copies problem. The original plan had each skill duplicating the logic; reviewers caught this in round 1 and proposed the Loading Protocol section.

## Extension policies are essential for shared conventions

Both decisions-format.md and expertise-tracking.md include extension policies documenting what changes are safe (additive fields) vs breaking (format changes requiring consumer updates). This was surfaced by reviewers thinking about downstream side quests that will build on these conventions. Any shared reference file consumed by multiple skills needs one.

## Conditional steps reduce context waste

The expertise check step was originally unconditional (always read expertise-tracking.md). Reviewers identified that CLAUDE.md is already in context, so the reference file only needs to be read when there's actually new expertise to record. This check-then-load pattern (vs always-load) should apply to any cross-cutting step added to multiple skills.

## Downstream consumer goals are valuable review context for upstream work

Reading the architecture-quality and slice-quality-and-health goal files during planning/refinement caught gaps (missing refine-plan/implement-plan as decision readers, no extension policies) that wouldn't have been found otherwise. When work has known downstream consumers, reviewing their goals during planning prevents rework.
