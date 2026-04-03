# Agent Skill Review — create-side-quest Pipeline (Phase 1, Iteration 1)

## Issues

### [IMPORTANT] Missing `user-invocable: true` consistency note — actually fine
`skills/create-side-quest/SKILL.md` frontmatter
The skill includes `user-invocable: true`, which matches `plan-slice/SKILL.md` but differs from `create-epic/SKILL.md` (which omits it). Since the plan explicitly requests it (line 75: "Add `user-invocable: true`"), this is correct. No action needed — noting for completeness that create-epic should probably get the same field added in a follow-up.
**Resolution**: No change required.

### [IMPORTANT] Missing active conditions evaluation in explore phase
`skills/create-side-quest/SKILL.md`, Step 4 (Phase 2: Autonomous Explore)
The create-epic skill has Step 4c "Load Active Conditions" which calls `gp decision:list --json` and `gp learning:list --json`, filters for `reconsiderWhen`/`validUntil`, passes them to the explore-phase agent, and surfaces triggered conditions to the user in Step 4e. The create-side-quest skill omits this entirely — the explore-phase agent spawn (Step 4c) does not include conditions in the task prompt, and Step 4d does not check `triggeredConditions` in the return.

The plan does not explicitly require condition evaluation for quests, and quests are lighter-weight than epics, so this may be intentional. However, the explore-phase agent already supports conditions (its Inputs section mentions "Conditions -- reconsiderWhen/validUntil conditions to evaluate"), and the create-side-quest skill claims to follow the create-epic pattern.
**Resolution**: Either add condition loading (matching create-epic Step 4c pattern) or add a comment explicitly noting that condition evaluation is omitted for quests and why.

### [IMPORTANT] Refinement loop missing context bundle reload per iteration
`skills/create-side-quest/SKILL.md`, Step 6e (Refinement Loop)
The create-epic skill reloads the context bundle at the start of each refinement iteration (Step 6d-i calls `$GP start-refine-architecture --epic`). The create-side-quest refinement loop (Step 6e) does not reload context per iteration — it loads `start-plan` once in Step 6a and then iterates. This means the refinement coordinator and reviewers do not get updated context if the editor modified the plan in a previous iteration.

The coordinator spawn in Step 6e-i does not include inline context or reference paths from a context bundle, unlike create-epic's 6d-ii which passes `ContextBundle.inline key-value pairs` and `ContextBundle.references`. The reviewer spawn in 6e-ii similarly lacks context bundle data.
**Resolution**: Add a context bundle reload at the start of each refinement iteration, or use `start-plan` (or an equivalent refinement context command like `start-refine-plan`) to get fresh context per round. Update coordinator and reviewer task prompts to include inline context and reference paths.

### [IMPORTANT] Reviewer spawn missing inline context and reference paths
`skills/create-side-quest/SKILL.md`, Step 6e-ii and 6e-iii
The reviewer agent spawns (Step 6e-ii) include only `artifact path`, `review context`, and `domain`. The create-epic reviewer spawns (Step 6d-iii) include `Inline context: {ContextBundle.inline key-value pairs}` and `Reference paths: {ContextBundle.references}`. Without these, reviewers cannot access project conventions, architecture, or other context needed for meaningful review.

Similarly, the synthesis agent spawn (Step 6e-iv) omits context that may be needed.
**Resolution**: Add inline context and reference paths to reviewer and synthesis task prompts, matching the create-epic pattern.

### [MINOR] Refinement coordinator task prompt missing artifact path
`skills/create-side-quest/SKILL.md`, Step 6e-i
The refinement coordinator spawn includes `artifact path: {planPath}`, `review context`, and `available reviewers`, but does not include inline context or reference paths from the context bundle. In create-epic (Step 6d-ii), the coordinator gets `ContextBundle.inline key-value pairs` and `ContextBundle.references`. This is related to the context bundle reload issue above but specifically affects the coordinator's ability to select appropriate reviewers.
**Resolution**: Include context bundle data in the coordinator task prompt.

### [MINOR] No `--inline` flag on `start-explore` in create-epic but used in create-side-quest
`skills/create-side-quest/SKILL.md`, Step 4b vs `skills/create-epic/SKILL.md`, Step 4b
Create-side-quest uses `$GP start-explore --quest $QUEST_NAME --inline --json` while create-epic uses `$GP start-explore --epic $EPIC_NAME --json` (without `--inline`). Both are valid — `--inline` is supported — but the inconsistency means the context bundle format may differ. The create-side-quest approach (with `--inline`) is actually the newer, better pattern that provides inline content directly.
**Resolution**: No change needed — create-side-quest uses the better pattern. Consider updating create-epic in a follow-up.

### [MINOR] Test harness Test 3 tests CLI commands, not skill error handling
`tools/dogfood/test-create-side-quest.ts`, `testErrorPath()` function (line 567-651)
The plan says "Test error path: invoke with missing epic context, verify graceful error message." The test creates a project without an active epic and then tests individual CLI commands (`quest:create`, `quest:explore`, `submit-explore`, `start-explore` without flags). This verifies CLI command behavior but does not invoke the actual skill via Agent SDK to test the skill's error handling path. The test also notes (line 589-590) that "quests are project-scoped, not epic-scoped" so the error path it tests is `start-explore` without `--epic`/`--quest`, which is a CLI validation test, not a skill error path test.
**Resolution**: Consider adding a test that invokes the skill via `runSkillSession` in a project without an epic to verify the skill's own error handling and graceful stop behavior.

### [MINOR] Temp directory cleanup inconsistency
`skills/create-side-quest/SKILL.md`, Step 7
The skill says to use `rm -rf $TMPDIR` on success, but the refinement loop writes reviewer output to `$TMPDIR/reviews/` which is inside the temp dir. This is correct behavior (cleanup removes everything). However, the Q&A output is written to `$TMPDIR/qa/plan-qa.md` (Step 5d) but the temp dir creation (Step 3a) only creates `$TMPDIR` — it does not create `$TMPDIR/qa/` subdirectory. The Write tool can create parent directories, so this works, but the plan-slice skill explicitly creates subdirectories: `mkdir -p "$TMPDIR/qa" "$TMPDIR/draft" "$TMPDIR/reviews"`.
**Resolution**: Update Step 3a to create subdirectories (`$TMPDIR/qa`, `$TMPDIR/draft`, `$TMPDIR/reviews`) matching the plan-slice pattern.

### [MINOR] Test harness installed cache sync is fragile
`tools/dogfood/test-create-side-quest.ts`, lines 97-127
The test syncs skills to the installed plugin cache by finding the latest version directory under `~/.claude/plugins/cache/goodplan-marketplace/goodplan/`. This pattern is copied from other test harnesses but relies on a specific directory structure that may change. The `try/catch` with `console.warn` handles this gracefully, but it adds complexity. Other test harnesses (test-create-epic.ts) use the same pattern, so this is consistent.
**Resolution**: No change needed — follows established pattern.

## Score: 7/10

## Summary
Critical: 0, Important: 3, Minor: 5

The skill follows the create-epic orchestrator pattern well for most aspects: frontmatter, version check, scope resolution, re-entry detection, context discipline, phase table, explore/plan/refinement structure, error handling, graceful stop, and sub-agent tool restrictions. The test harness is thorough with three test scenarios (full pipeline, re-entry, error path) and follows the established test-create-epic pattern.

The main gaps are in the refinement loop, which is missing per-iteration context bundle reloading and does not pass inline context/reference paths to coordinators, reviewers, or synthesis agents. This means reviewers operate without project context, which will degrade review quality. Additionally, the omission of condition evaluation (reconsiderWhen/validUntil) during exploration is a divergence from the create-epic pattern that should be explicitly justified or implemented.
