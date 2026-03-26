## Merged Review: Phase 1 — Low-Complexity Skills (refine-plan, implement-plan, refine-slices, migrate)

## Scores
- Generalist: 9/10
- agent-skill: 7/10

## Overall Assessment

The migration is clean and consistent. All old patterns (`state.md`, `activity-log.jsonl`, `__active__` globs, `ls -d`) are fully removed across all 4 skills. CLI submit commands are present and correct. `requires: goodplan >= 1.0.0` is in all 4 SKILL.md frontmatter blocks. Build, lint, and tests all pass (941 pass, 0 fail).

The gap: `refine-slices` correctly follows the Pattern 1 migration (Step 0 with CLI version check + cli-interaction.md loading), but `refine-plan` and `implement-plan` do not.

## Issues

**[IMPORTANT] refine-plan and implement-plan missing Step 0 version check and cli-interaction.md loading**
Both reviewers flag the same gap. The established migration pattern (Pattern 1, used in slices 03-04 and in `explore`, `create-architecture`, `refine-slices`) requires a Step 0 that: (1) reads `~/.claude/skills/_shared/references/cli-interaction.md`, (2) runs `goodplan --version --json`, (3) stops with a clear error if CLI is absent or version insufficient.

- `refine-plan/SKILL.md`: Step 0 jumps straight into plan detection. The skill now uses `goodplan status --json` (Step 2b) and `goodplan submit-refinement` (Step 5) — both fail silently if CLI is absent.
- `implement-plan/SKILL.md`: Starts at "Step 1: Load and Parse the Plan" with no CLI check. The skill uses `goodplan submit-implementation` (Step 4.2); its sub-agents (shared-preamble.md, sub-agent-prompts.md) also reference `goodplan status --json`. The orchestrator should verify CLI availability before spawning sub-agents.

Fix: Add the standard Step 0 version check block to both skills (renumber existing steps as needed), matching the pattern in `refine-slices/SKILL.md` lines 61-71.

Files: `skills/refine-plan/SKILL.md`, `skills/implement-plan/SKILL.md`
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] migrate skill description is too generic**
The `migrate` skill description ("Assists with skill migration and consolidation workflows. Not yet fully implemented.") is broad enough to trigger on unrelated migration questions (database migrations, data migrations, etc.). Low priority since the skill body immediately clarifies it's unimplemented, but worth narrowing to "Assists with goodplan skill migration..." to reduce false triggering.

File: `skills/migrate/SKILL.md:4`
Resolution: DIRECTLY_ACTIONABLE

## Summary
- Critical: 0
- Important: 1 (two files affected, same root cause)
- Minor: 1
