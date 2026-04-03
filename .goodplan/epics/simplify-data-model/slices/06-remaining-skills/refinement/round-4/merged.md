# Merged Feedback — Round 4

## IMPORTANT (4 issues)

### 1. Phase 1: `BEGIN_QUEST_PLAN` guard must accept both `created` and `explored` statuses
Sources: software-architecture, tui-cli

The plan adds `explored -> BEGIN_QUEST_PLAN -> planning` but describes it as "replacing" the existing `created -> BEGIN_QUEST_PLAN` path. This is an addition, not a replacement — quests that skip exploration still need `created -> BEGIN_QUEST_PLAN`. The `guardQuestStatus` call in `quest-plan.ts` currently hardcodes `"created"` and must accept `["created", "explored"]`. The `beginQuestPlanTransitions` array needs both source rows. Also update `architecture/transition-tables.md` to show both rows.

Additionally, the `quest:plan` command's precondition description says `'created' status` — update to `'created' OR 'explored'` in both the meta description and `registerCommand` in `src/commands/global/schema.ts` (INV-006: schema output consumed by LLM orchestrators).

Resolution: DIRECTLY_ACTIONABLE

### 2. Phase 1: `start-explore` and `submit-explore` need `--quest` flag with mutual exclusivity
Sources: software-architecture, tui-cli

Both commands currently have `epic: { required: true }`. Adding `--quest` requires: (1) change `--epic` from `required: true` to optional, (2) add `--quest` flag, (3) add mutual-exclusivity guard (exactly one of `--epic`/`--quest` required), matching the pattern in `start-plan.ts`. For `submit-explore`, route to `COMPLETE_EXPLORE` for epic scope, `COMPLETE_QUEST_EXPLORE` for quest scope. The plan mentions this for `submit-explore` but does not spell out the corresponding changes to `start-explore`.

Resolution: DIRECTLY_ACTIONABLE

### 3. Phase 5: `review-*.md` glob count assertion is off-by-one due to `review-preamble.md`
Source: repo-tooling

The Expected Behavior asserts `ls skills/_shared/references/review-*.md | wc -l` returns 20, claiming it excludes `review-preamble.md`. But `review-preamble.md` matches the `review-*.md` glob. After adding 14 new criteria files: 6 existing domain + 14 new + 1 preamble = 21. Simplest fix: update count to 21 and adjust the parenthetical to say "includes `review-preamble.md`."

Resolution: DIRECTLY_ACTIONABLE

### 4. Phase 6: `generate-onboard-fixture.sh` becomes orphaned after `test-onboard.ts` deletion
Source: repo-tooling

Phase 6 deletes `tools/dogfood/test-onboard.ts`, the only consumer of `scripts/generate-onboard-fixture.sh`. Either delete the script alongside `test-onboard.ts`, migrate it for use by `test-init.ts`, or explicitly note it as retained tech debt.

Resolution: DIRECTLY_ACTIONABLE

## MINOR (6 issues)

### 5. Phase 3: Reference file copy for `skills/init/references/` happens in Phase 4 but init skill is created in Phase 3
Sources: software-architecture, agent-skill

Phase 3 creates `skills/init/SKILL.md` and `agents/onboard-phase.md`, but the 5 reference files from `skills/onboard-repo/references/` are not copied until Phase 4. If Phase 3 verification runs onboard mode, `@` references will be dangling. Either move the copy to Phase 3 or add an explicit note to Phase 3 verification: "Onboard mode verification requires Phase 4 reference file copy. Phase 3 verification covers new-project mode and skill structure only."

Resolution: DIRECTLY_ACTIONABLE

### 6. Phase 2/3: Mode parsing described as "positional argument" / `--mode` flag — should say "parsed from invocation text"
Sources: agent-skill, tui-cli

Phase 2 says "Parse mode from first positional argument" and Phase 3 says "Override: argument `--mode new` or `--mode onboard`". Skills receive context from natural language, not CLI argv. Replace with "Extract mode from the user's invocation text" to avoid implementers writing formal arg-parsing code. Document this as the canonical invocation pattern so test authors know to pass mode in the natural language prompt to `query()`.

Resolution: DIRECTLY_ACTIONABLE

### 7. Phase 3: Onboard-phase agent write target unspecified — risk of HMAC bypass
Source: agent-skill

The `init` skill runs `gp init` before spawning the onboard-phase agent, so `.goodplan/` is HMAC-protected. If the agent writes directly to `.goodplan/`, those writes bypass HMAC. Specify either: (a) agent writes drafts to `<tmpdir>/`, orchestrator copies via CLI commands (safer, matches explore-phase pattern), or (b) agent uses `gp` CLI commands for all `.goodplan/` writes.

Resolution: DIRECTLY_ACTIONABLE

### 8. Phase 5: No runtime verification of new reviewer agents
Source: agent-skill

Only file existence and build-time checks cover the 14 new reviewer agents. A single lightweight test (spawn one new reviewer with a small fixture, verify valid JSON with `status`, `summary`, `score`, `review` fields) would catch `@` reference resolution failures. Alternatively, note which Phase 1/2/3 test harness scripts implicitly exercise new reviewers via the refinement loop.

Resolution: DIRECTLY_ACTIONABLE

### 9. Phase 6: `validate.ts` rewrite needs target flow outline and output format specification
Sources: software-architecture, tui-cli

The task says "may require restructuring validation logic" without specifying the target flow or output format. Add: (1) new validation sequence (e.g., init -> create-epic -> plan-slice -> implement -> complete-epic), (2) updated assertions (e.g., plan-slice produces both plan and refinement artifacts), (3) expected skill count (12), (4) per-pipeline-phase output so failures indicate which phase failed, not just which pipeline.

Resolution: DIRECTLY_ACTIONABLE

### 10. Phase 6: Total agent count assertion missing
Source: repo-tooling

Phase 6 verification only asserts reviewer agent count (20) without asserting total agent count. After this plan: 20 reviewers + non-reviewers (including new ones from Phases 2-3) = ~34 total. Add a total agent count assertion to catch accidental deletions of non-reviewer agents.

Resolution: DIRECTLY_ACTIONABLE

### 11. Phase 4: Renamed skill invocation tests are smoke-level only
Source: tui-cli

`test-renames.ts` checks discoverability and trigger phrase matching but does not invoke skills and verify output. For `status` in particular (invoked at session start), a functional test verifying JSON output structure would catch content regressions.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 CRITICAL and IMPORTANT issues have been resolved. The plan is comprehensive, well-sequenced, and implementable. The 4 remaining IMPORTANT issues are straightforward implementation gaps (guard expansion, mutual-exclusivity enforcement, glob count, orphan script) that would cause runtime failures if missed. The 7 MINOR issues are ambiguity reductions and verification improvements. Addressing the IMPORTANT items would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 4
- Minor: 7
