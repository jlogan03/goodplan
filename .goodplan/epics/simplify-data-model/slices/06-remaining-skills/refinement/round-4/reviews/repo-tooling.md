# Repo, Tooling, & Docs Review — Round 4

## Issues

**[IMPORTANT]** Phase 5 Expected Behavior: `review-*.md` glob count assertion is wrong due to `review-preamble.md`

The Expected Behavior asserts `ls skills/_shared/references/review-*.md | wc -l` returns 20, with a parenthetical "(excludes `review-preamble.md` which is shared infrastructure, not a domain criteria file)." But `review-preamble.md` **does** match the `review-*.md` glob. Currently there are 7 files matching that pattern (6 domain criteria + `review-preamble.md`). After adding 14 new domain criteria files, the glob will return 21, not 20.

Fix (pick one):
- Change the assertion to `ls skills/_shared/references/review-*.md | wc -l` returns **21** (20 domain + 1 preamble), or
- Change the glob to exclude preamble: `ls skills/_shared/references/review-*.md | grep -v preamble | wc -l` returns 20, or
- Rename `review-preamble.md` to `shared-preamble.md` (breaks existing `@` references in 6 reviewer agents).

The simplest fix is updating the count to 21 and adjusting the parenthetical to say "includes `review-preamble.md`."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 6 omits `scripts/generate-onboard-fixture.sh` from cleanup

Phase 6 deletes `tools/dogfood/test-onboard.ts` (the only consumer of `scripts/generate-onboard-fixture.sh`). After that deletion, `generate-onboard-fixture.sh` becomes an orphan — it is not referenced by any other file in the repo. The plan should either:
1. Delete `generate-onboard-fixture.sh` alongside `test-onboard.ts`, or
2. Migrate it for use by `test-init.ts` (if the init onboard-mode test needs a fixture), or
3. Explicitly note it as retained tech debt.

Currently the plan's task for `test-init.ts` (Phase 3) says "Test 2: Directory with TypeScript source files -> onboard mode" but doesn't say how the fixture is created. If `test-init.ts` will generate its own fixtures inline (like `test-create-epic.ts` does), then `generate-onboard-fixture.sh` should be deleted.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 total agent count assertion is still incomplete

Round 3 flagged that Phase 6 verification only asserts reviewer agent count (`ls agents/reviewer-*.md | wc -l` returns 20) without asserting the total agent count. The current codebase has 16 agents (6 reviewers + 10 non-reviewers). After this plan: 20 reviewers + 10 non-reviewers = 30 total. If Phase 2 or 3 adds new non-reviewer agents (`audit-architecture-phase.md`, `audit-docs-phase.md`, `audit-tests-phase.md`, `onboard-phase.md`), the total becomes 34. The plan should add a total agent count assertion to `build-plugin.sh` or at minimum to the Phase 6 verification checklist. Without it, accidental deletion of a non-reviewer agent during cleanup goes undetected.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `user-invocable: true` task lists 6 existing skills but misses `explore` and `start-epic`

Phase 4 says "ensure ALL 12 skills have `user-invocable: true`" and then lists 6 existing skills to check: `create-epic`, `plan-slice`, `implement`, `complete-epic`, `explore`, `start-epic`. I verified the codebase: currently only `plan-slice`, `complete-epic`, and `implement` have `user-invocable: true`. So `create-epic`, `explore`, and `start-epic` need it added. The task text is actually correct in listing all 6 — this is not an error but an observation that the task is well-scoped. No change needed.

(Withdrawn — task is correct as written.)

---

**[MINOR]** Phase 5 `iteration-loop.md` update task references `sub-agent-prompts.md` but doesn't explain the replacement pattern

The task says to "Remove references to `sub-agent-prompts.md` as the bootstrap source" from `iteration-loop.md`. Currently `iteration-loop.md` line 50 says "Use the reviewer bootstrap prompt template (from the skill's `references/sub-agent-prompts.md` or inherited from refine-plan)." The replacement pattern (spawning reviewers by agent name from `reviewer-registry.md`) is mentioned but the task doesn't specify what text replaces the `sub-agent-prompts.md` references in the Editor Sub-Agent Pattern section (lines 107-109), which also references `sub-agent-prompts.md`. The task should call out both locations in `iteration-loop.md` that need updating (Reviewer Spawn Pattern section AND Editor Sub-Agent Pattern section).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has improved substantially from earlier rounds. The reviewer count is now consistent (20 total), CLAUDE.md updates are included, hardcoded reviewer list fixes are addressed, and `iteration-loop.md` updates are planned. The two IMPORTANT issues are straightforward: the `review-*.md` glob count is off-by-one due to `review-preamble.md`, and `generate-onboard-fixture.sh` becomes orphaned without being addressed. What would bring this to 9+: fix the glob count, decide on the fixture script's fate, and add a total agent count assertion.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
