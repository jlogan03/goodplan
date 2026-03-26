# Learnings — slice-quality-and-health

## Refinement feedback directly shapes implementation quality

The 3 refinement rounds caught 14 issues (5 IMPORTANT, 9 MINOR) that all landed in the final plan — multi-file editing strategy, scope exclusion, strictly-increasing detection criteria, run directory naming, graceful stop coverage. Without refinement, implementation would have discovered these as blockers.

## Multi-file review skills need explicit file-matching protocols

The scattered working copy pattern (goal-refining.md across N directories + sequencing-refining.md) diverged from the single-file/directory convention the iteration loop was built for. Refinement caught this and the plan specified: filename prefixes on each issue, editor inference fallback, manifest-based file tracking. This pattern should be reusable for future multi-file review skills.

## Shared infrastructure reuse works well when interfaces are explicit

refine-slices successfully reuses refine-plan's bootstrap/synthesis prompts, shared-preamble.md, and the iteration-loop.md skeleton while only creating a local editor prompt. The Loop Parameters interface from the architecture-quality quest made this plug-and-play.

## Signal tracking algorithms need precise trigger conditions

"Trending upward" was ambiguous; refinement sharpened it to "strictly increasing across all 3 data points (a < b < c)" with explicit non-triggers like [3, 2, 3]. Vague trend language in skill instructions will be interpreted differently by different agent runs.

## Skill-file-only implementations don't produce standard implementation/ artifacts

This quest modified files outside the repo (in ~/.claude/skills/), so there were no sub-agent reviews or implementation/ directory contents. The complete-slice auto-detect heuristic (needs plan-refined + implementation/ with content) wouldn't have found this scope. Direct implementation is valid for skill-editing quests but requires manual scope specification.
