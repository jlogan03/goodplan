# Repo & Tooling Review — Remaining Skills + Cleanup (Round 2)

## Issues

**[CRITICAL]** Reviewer agent count is STILL inconsistent across overview, Phase 5, and architecture spec

Round 1 flagged this as CRITICAL and it was listed as addressed, but the numbers remain contradictory:
- **Architecture spec** (`skill-model-api.md` lines 130-164) lists exactly **20** reviewer agents across 5 categories (2 always-on + 3 language + 4 web + 5 cross-cutting + 2 AI tooling + 4 scientific = 20).
- **Currently existing**: 6 agents (`reviewer-agent-skill`, `reviewer-holistic`, `reviewer-repo-tooling`, `reviewer-software-architecture`, `reviewer-tui-cli`, `reviewer-typescript`).
- **Phase 5 task list** enumerates **14** new agents (python, rust, backend, frontend, data-layer, devops, ci-github-workflows, ux-ia, api-contract, mcp-server, algorithm-numerical, performance, ml-pipeline, data-io). That yields 6 + 14 = **20 total**.
- **Overview** says "Twelve new reviewer agent definitions complete the reviewer infrastructure (matching the 18-domain architecture spec)." This claims 12 new and 18 total.
- **Phase 5 Expected Behavior** says `ls agents/reviewer-*.md | wc -l` returns **18** (6 existing + 12 new).

The task list (14 new, 20 total) contradicts the overview (12 new, 18 total) and the Expected Behavior assertion (18 total). The architecture spec agrees with the task list (20 total). Fix: update the overview to say "14 new reviewer agents" and "20-domain architecture spec", and update Expected Behavior to assert 20, not 18. Alternatively, if 2 domains are being deliberately dropped, remove them from the task list and document why.

Additionally, the review criteria file count assertion in Phase 5 Expected Behavior says `ls skills/_shared/references/review-*.md | wc -l` returns 18 (6 existing + 12 new). Currently 7 review criteria files exist (`review-agent-skill.md`, `review-holistic.md`, `review-preamble.md`, `review-repo-tooling.md`, `review-software-architecture.md`, `review-tui-cli.md`, `review-typescript.md`). If 14 new are created, that's 7 + 14 = 21 (or 20 excluding `review-preamble.md` which is the shared preamble, not a domain criteria file). This assertion also needs correction.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 6 does not mention `scripts/generate-onboard-fixture.sh`

Phase 6 deletes `scripts/install-skills.sh` but does not mention `scripts/generate-onboard-fixture.sh` (17K, last modified Mar 29). This script was used by `test-onboard.ts` which Phase 6 deletes. If the `init` skill's `test-init.ts` uses a different fixture approach, `generate-onboard-fixture.sh` becomes orphaned. The plan should either: (a) explicitly delete it in Phase 6 if it's no longer needed, or (b) explicitly state it's retained for `test-init.ts` and show how it's referenced.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Phase 6 `validate.ts` update is underspecified

Phase 6 says "Review `tools/dogfood/validate.ts` for old skill name references and update to new names." Actual examination shows `validate.ts` references **13 old skill names** across ~15 lines: `create-architecture`, `refine-architecture`, `create-slices`, `refine-slices`, `create-plan`, `refine-plan`, `implement-plan`, plus associated CLI commands (`submit-architecture`, `submit-refine-architecture`, `submit-slices`, `submit-refine-slices`, `submit-plan`, `submit-refinement`, `submit-implementation`). This is a significant rewrite — the entire epic and quest workflow in `validate.ts` needs to be rearchitected to use the new consolidated skill names (`create-epic`, `plan-slice`, `implement`). "Review and update" is too vague for this scope. The task should: (a) list the specific skill name mappings, (b) note that the workflow structure changes (previously sequential skill invocations become single pipeline invocations), (c) acknowledge this may require restructuring `validate.ts` logic, not just find-and-replace.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 reviewer registry update task is incomplete

Round 1 flagged the missing reviewer registry update and a task was added to Phase 5: "Update the reviewer registry in `skills/implement/references/reviewer-registry.md`." However, the current registry references monolithic prompt files (`reviewers-language.md`, `reviewers-scientific.md`, `reviewers-web.md`, `reviewers-ai-tooling.md`) that live under `skills/refine-plan/references/` and `skills/implement-plan/references/`. Phase 6 deletes both `refine-plan` and `implement-plan`, which means those monolithic files will be deleted. The `skills/implement/references/reviewer-registry.md` (which survives) currently references these monolithic files by relative path. The task needs to specify: (a) the new registry format (referencing `agents/reviewer-*.md` + `skills/_shared/references/review-*.md`), and (b) that no surviving skill should reference the deleted monolithic files after Phase 6.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `test-renames.ts` scope mismatch with `test-migrate.ts` replacement claim in Phase 6

Phase 6 says "Delete `tools/dogfood/test-migrate.ts` (replaced by `test-renames.ts` from Phase 4, which covers upgrade)." But Phase 4's `test-renames.ts` is described as a smoke test that verifies skills load and respond to trigger phrases. The existing `test-migrate.ts` (8K, 236 lines) tests actual migration functionality (creating old-format state, running migration, verifying new-format output). `test-renames.ts` as described would not cover this — it only tests that the skill is discoverable and triggers correctly. Either: (a) expand `test-renames.ts` to include migration functional tests, or (b) create a separate `test-upgrade.ts` for functional testing, or (c) accept the coverage gap and document it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `test-init.ts` replaces `test-onboard.ts` but scope differs

Similar to the above: `test-onboard.ts` (10K, 298 lines) tests actual onboarding behavior (repo scanning, convention extraction, architecture scaffolding via a generated fixture). Phase 3's `test-init.ts` tests mode detection and basic initialization. The plan should clarify whether `test-init.ts` will include the onboarding functional tests from `test-onboard.ts` (particularly the `generate-onboard-fixture.sh`-based test), or if that coverage is deliberately reduced.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `test-plugin-skills.ts` still references old skill names

Phase 6 says to update `test-plugin-skills.ts` to verify 12 skills and update hardcoded counts. The current file (line 119) checks for `expectedSkills = ["project-status", "explore", "create-plan", "create-epic"]`. These need updating to the new names (`status`, `explore`, `plan-slice`, `create-epic`). The plan mentions updating counts but does not mention updating the specific skill name assertions. Add: update `expectedSkills` array to reflect the 12 new skill names.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round 1 addressed several issues well: reference file migration for upgrade/status/init is now explicit, `install-skills.sh` removal has a concrete `package.json` task, and the reviewer registry update was added. However, the CRITICAL reviewer agent count discrepancy (the original Round 1 CRITICAL) was not actually resolved — the numbers in the overview, Expected Behavior, and task list still conflict (12 vs 14 new, 18 vs 20 total). The `validate.ts` rewrite scope is significantly underspecified for what is effectively a restructuring of the entire validation workflow. Fixing the count discrepancy, specifying the `validate.ts` migration approach, and clarifying the reviewer registry's new format would bring this to 9+.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
