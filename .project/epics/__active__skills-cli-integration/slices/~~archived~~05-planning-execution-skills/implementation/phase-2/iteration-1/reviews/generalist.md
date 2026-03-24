# Generalist Review — Phase 2: High-Complexity Skills (create-plan, create-slices)

**Score: 9/10**

## Summary

Clean migration of create-plan and create-slices to CLI-based state management. All `state.md`, `activity-log.jsonl`, `state-and-activity-formats.md`, and `ls -d __active__` patterns have been eliminated. Version checks, `requires` frontmatter, graceful stop semantics, and CLI submit patterns are consistent with Phase 1 migrated skills. Tests pass (941/941). Grep verification confirms zero hits for banned patterns.

## Findings

### Important (1)

1. **create-slices/SKILL.md line 102 still uses `mkdir -p .project/decisions/`** — create-plan/SKILL.md was updated to use `decision:create --json` (line 116), but create-slices/SKILL.md Step 4 retains the old `mkdir -p .project/decisions/` + manual Write pattern. This creates an inconsistency between the two skills. The plan only specified this change for create-plan (Step 4c3), so this is not a Phase 2 deviation — but it means create-slices will still use filesystem operations for decisions while create-plan uses the CLI. Should be addressed in Phase 3 or as a follow-up.

### Minor (1)

1. **create-slices/SKILL.md line 166 mentions `__active__`** — The migration note says "stale `__active__`-prefixed paths referenced in CLAUDE.md". This is a conceptual reference explaining what to look for when cleaning up stale paths, not an actual path usage. Grep verification correctly excludes this. Acceptable as-is, though could be reworded to avoid triggering future grep audits (e.g., "stale legacy-prefixed paths").

## Pattern Consistency with Phase 1

- **`requires` frontmatter**: Both files have `requires: goodplan >= 1.0.0` on line 11, matching refine-plan, implement-plan, refine-slices, migrate.
- **Version check (Step 0)**: Both use the same block structure — read `cli-interaction.md`, run `goodplan --version --json`, two failure messages. Identical to refine-slices pattern.
- **`goodplan status --json`**: Used consistently for epic detection, active slice/quest detection, and path resolution. Field type documentation (`{ name: string, status: string } | undefined`) present in both.
- **Graceful stop semantics**: Both skills correctly implement "stops leave artifacts, no state writes" — matching the plan spec. create-slices has the 3-case (a/b/c) pattern in both SKILL.md and guidance.md. create-plan has the 2-case (no plan.md / plan.md written) pattern.
- **CLI submit**: create-plan uses `submit-plan --slice <name>` / `submit-plan --quest <name>`. create-slices uses `submit-slices --epic <name>`. All confirmed to exist in `src/commands/`.
- **`decision:create`**: create-plan correctly uses CLI for decisions. Confirmed `src/commands/decision/create.ts` exists.

## Verification

- All CLI commands referenced (`submit-plan`, `submit-slices`, `decision:create`, `goodplan status`, `goodplan --version`) have corresponding source files.
- Zero grep hits for `state\.md`, `activity-log`, `state-and-activity-formats`, `ls -d.*__active__` in both skill directories (one acceptable conceptual `__active__` mention in migration note).
- guidance.md files are consistent with their parent SKILL.md files.
- Plan checklist items all marked `[x]`.

## Verdict

Solid execution. The one important finding (decisions inconsistency in create-slices) is out of Phase 2 scope per the plan but worth tracking.
