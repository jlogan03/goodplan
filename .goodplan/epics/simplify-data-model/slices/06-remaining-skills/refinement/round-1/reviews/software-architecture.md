## Issues

**[CRITICAL]** Reviewer agent count mismatch: plan says 18 total (6 existing + 12 new) but architecture specifies 20 domains

The architecture spec in `skill-model-api.md` lists 20 reviewer agents across 6 categories: always-on (2), language (3), web (4), cross-cutting (5), AI tooling (2), scientific (4). The plan overview and Phase 5 intro both claim "18-domain reviewer infrastructure" and "6 existing + 12 new = 18." However, Phase 5's task list actually enumerates **14** new reviewers (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). Combined with 6 existing, that's 20 total — matching the architecture but contradicting the "18" claim in the overview and Phase 5 intro. The expected-behavior assertion `ls agents/reviewer-*.md | wc -l` says "returns 18" when it should say 20. Similarly, `ls skills/_shared/references/review-*.md | wc -l` says "returns 18 (6 existing + 12 new)" but should say 20 (6 existing + 14 new). The actual task list is correct; the summary numbers are wrong.

Fix: Update the overview, Phase 5 intro, and all three count-based assertions to say 20 (6 existing + 14 new).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 6 does not account for updating shared reference files that mention deleted skill names

Several shared reference files contain references to old skill names that will be stale after Phase 6 deletions:
- `skills/_shared/references/cli-interaction.md` references `/project-status`, `/create-architecture`, `/create-slices`, `/complete`, `/audit-architecture`
- `skills/_shared/references/expertise-tracking.md` references `/create-architecture`, `/create-slices`, `/create-plan`, `/complete`, `/project-status`, `/refine-plan`, `/refine-architecture`, `/refine-slices`, `/audit-architecture`, `/onboard-repo`
- `skills/_shared/references/decisions-format.md` references `/project-status`, `/create-epic`, `/refine-plan`, `/implement-plan`
- `skills/_shared/references/epic-conventions.md` references `/create-slices`, `/create-plan`, `/refine-slices`, `/project-status`, `/complete`

These files are injected into agent contexts via `@` references. Stale skill names would confuse sub-agents about which skills exist. Phase 6's tasks cover skill directory deletions and `build-plugin.sh` updates but not reference file hygiene.

Fix: Add a task to Phase 6 (or a dedicated cleanup sub-task) to grep all `skills/_shared/references/*.md` files for the 15 deleted skill names and update them to the new consolidated names.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 (renames) does not specify what happens to reference files from old skills

The `migrate` skill has `references/migration-heuristics.md`, `project-status` has `references/status-logic.md`, and `onboard-repo` has 5 reference files under `references/`. The plan says "Copy reference files from `skills/migrate/references/` if needed" and similar for project-status, but doesn't specify whether these references should be:
1. Copied into the new skill's `references/` directory
2. Moved to `skills/_shared/references/` if they'll also be used by agents
3. Left behind (and deleted in Phase 6)

For `upgrade` (from `migrate`): `migration-heuristics.md` is skill-specific and should move with it.
For `status` (from `project-status`): `status-logic.md` is skill-specific and should move with it.
For `init` (from `onboard-repo`): Phase 3 says the onboard-phase agent should have access to conventions/architecture references. The 5 onboard-repo reference files (architecture-extraction, convention-heuristics, expertise-profiling, migration-detection, repo-scanning) are large and crucial for onboarding quality. The plan says to "inject shared references" but doesn't specify where these files live after the onboard-repo directory is deleted in Phase 6.

Fix: Explicitly state for each renamed skill whether reference files are copied to the new skill directory, moved to `_shared/references/`, or injected into agent definitions via `@` references. For `init`/onboard-phase, specify that the 5 reference files either move to `skills/init/references/` or `skills/_shared/references/` with `@` injection into the onboard-phase agent.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No cross-reference update for `reviewers-cross-cutting.md` and other multi-domain reference files

`skills/_shared/references/reviewers-cross-cutting.md` (31KB) is the large monolithic file containing all cross-cutting reviewer prompts. The architecture spec says these should be "split into per-domain files" and the plan creates individual `review-*.md` files. However, neither Phase 5 nor Phase 6 mentions deleting or deprecating `reviewers-cross-cutting.md` after the per-domain files are created. This file will remain in the dist, consuming space and potentially confusing future maintenance (two sources of truth for reviewer criteria).

Fix: Add a task to Phase 6 to delete `skills/_shared/references/reviewers-cross-cutting.md` (and any other monolithic reviewer reference files that have been fully decomposed into per-domain files). Verify no remaining `@` references point to it.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 1 `create-side-quest` missing `user-invocable: true` in frontmatter spec

The frontmatter specification for create-side-quest says: "Add `user-invocable: true`, `requires: gp >= 1.0.0`." This is correct. However, the existing `create-epic` skill — which follows the same pipeline pattern — does NOT have `user-invocable: true` in its frontmatter. This inconsistency means either create-epic should also get it (which this plan doesn't address since create-epic is already built), or the plan should note the inconsistency for a follow-up fix.

Fix: Add a task (Phase 4 or Phase 6) to add `user-invocable: true` to `skills/create-epic/SKILL.md` for consistency with all other user-facing pipeline skills.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 (audit) agent location doesn't follow the established `agents/` directory convention

Phase 2 specifies creating agents at paths like `agents/audit-architecture-phase.md`, `agents/audit-docs-phase.md`, `agents/audit-tests-phase.md`. This follows the convention. However, the architecture overview says the audit skill "spawns reviewer agents" which is the reviewer infrastructure, not phase agents. The plan correctly creates these as phase-specific agents (not reviewers), but the naming `-phase.md` suffix is consistent with existing phase agents (explore-phase, architecture-phase, etc.), which is good. No action needed — this is just confirming the naming is appropriate.

Resolution: N/A (observation, no issue)

---

**[MINOR]** Phase 6 `bun tools/dogfood/test-plugin-skills.ts` assertion assumes exactly 12 skills, but test file may need updating

The existing `test-plugin-skills.ts` may have hardcoded skill counts or skill name lists from the pre-consolidation era. Phase 6 says to run this test but doesn't include a task to update the test file itself if it contains stale assertions.

Fix: Add a task to Phase 6 to review and update `tools/dogfood/test-plugin-skills.ts` if it contains hardcoded skill counts or name lists.

Resolution: CODEBASE_EXPLORATION

## Score: 6/10

The plan is well-structured and follows the proven orchestrator pattern correctly. Phase sequencing is logical (build new skills before deleting old ones). However, the reviewer count mismatch is a factual error that would cause incorrect build assertions, and the missing reference file cleanup tasks represent a significant gap — stale skill references in shared files that agents consume would degrade agent performance. Fixing the count mismatch, adding reference file cleanup, and specifying reference file disposition for renamed skills would bring this to 9+.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
