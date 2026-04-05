# Repo, Tooling, & Docs Review — Round 2

## Issues

**[IMPORTANT]** Phase 3 task list enumerates files that no longer have stale references
Round 1 flagged incomplete file enumeration and the plan added explicit file lists. However, the added lists are inaccurate — many of the enumerated files have already been cleaned up (likely by earlier slices in this epic). Running the plan's own verification grep against the current codebase finds stale references in only 5 files (32 total matches), not the 15+ files listed. Files listed in the plan that have 0 stale references today:
- `skills/create-epic/SKILL.md` (0 matches — all references are CLI commands with `$GP`, correctly excluded by the grep filter)
- `skills/plan-slice/SKILL.md` (0 matches)
- `skills/audit/SKILL.md` (0 matches)
- `skills/create-side-quest/SKILL.md` (0 matches)
- `skills/_shared/references/cli-interaction.md` (0 matches)
- `skills/_shared/references/output-templates.md` (0 matches)
- `skills/_shared/references/iteration-loop.md` (0 matches)
- `skills/_shared/references/decisions-format.md` (0 matches)
- `skills/_shared/references/README.md` (0 matches)
- `skills/_shared/references/audit-conventions.md` (0 matches)
- `skills/init/SKILL.md` (0 matches)
- `skills/init/references/migration-detection.md` (0 matches)
- `skills/init/references/repo-scanning.md` (0 matches)
- All 3 agent files (`agents/audit-architecture-phase.md`, `agents/audit-docs-phase.md`, `agents/audit-tests-phase.md`) (0 matches)

Files that actually have stale references:
1. `skills/start-epic/SKILL.md` — 13 matches (addressed by Phase 1 rewrite)
2. `skills/status/references/status-logic.md` — 13 matches
3. `skills/explore/SKILL.md` — 4 matches
4. `skills/upgrade/references/migration-heuristics.md` — 1 match (plan says ~2, actual is 1)
5. `skills/init/references/expertise-profiling.md` — 1 match

Fix: Replace the Phase 3 task list with the actual 5-file scope. Remove all tasks for files that have 0 stale references. Keep the final "run full grep to confirm" task as a safety net, but the explicit file list must match reality. This prevents the implementer from wasting time reading and editing files that need no changes, and eliminates confusion when the "Before" assertion produces fewer matches than expected.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 Before assertion count will not match expectations
The "Before implementation" Expected Behavior says the grep should return matches, but the research context claims ~75 stale references. With only 32 actual matches (and 13 of those in `start-epic/SKILL.md` which is being rewritten in Phase 1), the implementer running Phase 3 after Phase 1 will find only ~19 matches. This is not a plan error per se — the count was never specified — but the research's "~75" figure is stale and could confuse. Fix: no plan change needed, but the mismatch is worth noting for awareness.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 README verification pattern could produce false negatives
The Phase 4 "After" verification `grep -r 'create-plan\|refine-plan\|implement-plan' README.md` will correctly catch stale references, but the README also contains `/project-status`, `/onboard-repo`, `/migrate`, `/capture`, `/create-architecture`, `/refine-architecture`, `/create-slices`, `/refine-slices`, `/complete`, `/audit-architecture`, `/audit-docs`, and `/audit-tests` which are stale skill names not covered by this pattern. The second verification grep covers some of these but not `/complete`, `/capture`, `/onboard-repo`, or `/migrate`. Fix: extend the Phase 4 verification grep to also include `/complete[^-]\|/capture\b\|/onboard-repo\|/migrate\b` or simply reuse the Phase 3 grep pattern against README.md.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's three IMPORTANT issues (grep false positives from CLI commands, missing file enumeration, missing `/project-status` rename) were all addressed. The grep patterns now correctly exclude `$GP` and `gp` CLI command invocations. The `/project-status` rename is in the mapping table. File enumeration was added. However, the enumerated file list is now inaccurate in the opposite direction — it lists many files that have 0 stale references, having been cleaned up by earlier slices. This is a correctness issue that will waste implementation time and create confusion, but it won't cause incorrect changes (the implementer will simply find nothing to change in those files). To reach 9+: update the Phase 3 file list to match the actual 5-file scope, and extend Phase 4 README verification to cover all stale skill names.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
