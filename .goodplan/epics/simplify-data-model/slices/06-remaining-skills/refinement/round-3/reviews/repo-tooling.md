# Repo & Tooling Review — Round 3

Reviewer: repo-tooling
Plan: Remaining Skills + Cleanup (19→12 skill consolidation)
Iteration: 3

---

## Issues

**[IMPORTANT]** `iteration-loop.md` still describes the old "Prompt File + Section" reviewer pattern after Phase 5

Phase 5 rewrites `skills/implement/references/reviewer-registry.md` to use the new `Agent` column pointing to `agents/reviewer-*.md`. However, `skills/_shared/references/iteration-loop.md` still instructs orchestrators to pass "Prompt file path and section heading (from reviewer-registry.md)" (line 52) and says "Always-on reviewers run every iteration... Specialists are selected based on the orchestrator's understanding of the content. Read the skill's `references/reviewer-registry.md`." (lines 46–52). After Phase 5 the registry format changes (no `Prompt File` + `Section` columns — just an `Agent` column), so the bootstrap instructions in `iteration-loop.md` will be stale/contradictory. The plan does not include updating `iteration-loop.md` to describe the new agent-name-based spawn pattern.

Fix: Add a task to Phase 5 (or Phase 6 cleanup) to update the Reviewer Spawn Pattern section of `skills/_shared/references/iteration-loop.md` to match the new agent-based approach (spawn by agent name, not by reading a prompt file + section).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `_shared/references/README.md` lists `reviewers-cross-cutting.md` as a live file; Phase 6 orphan audit may delete it without updating the README

Phase 6 identifies `reviewers-cross-cutting.md` (31KB) as an orphan candidate and says to delete it if no surviving skills reference it. The `skills/_shared/references/README.md` explicitly documents it: `| reviewers-cross-cutting.md | Cross-cutting reviewer prompts spanning multiple domains, with fillable placeholders |`. If the file is deleted, this README row becomes a dead reference. The plan does not include a task to update `_shared/references/README.md` after deleting orphaned shared files.

Fix: Add a cleanup task in Phase 6: after deleting orphaned `_shared/references/*.md` files, update `skills/_shared/references/README.md` to remove rows for deleted files.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `test-plugin-skills.ts` update task is underspecified — current `expectedSkills` list still uses old names; the plan says to update it but the verification criteria don't assert the update was done correctly

The plan (Phase 6) says to update `tools/dogfood/test-plugin-skills.ts` with the 12 new skill names. The current file has `const expectedSkills = ["project-status", "explore", "create-plan", "create-epic"]` (line 119) — a partial list that checks for 4 old skills. After the rename, `project-status` must become `status` and `create-plan` must become `plan-slice`. The verification step says "Run `bun tools/dogfood/test-plugin-skills.ts` to verify all 12 skills are discovered" but the current test only warns (not fails) when expected skills are missing (lines 120–124 use `logger.log("  WARN: ...")` not `process.exit(1)`). The test will pass even if the expected skills list is wrong.

Fix: Strengthen the test update task to: (1) update `expectedSkills` to all 12 new names, and (2) change the per-skill check from WARN to FAIL so the test is a real assertion. This is already partially implied by the plan's skill count assertion but the per-name check is currently advisory only.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 build assertion for agent count uses `reviewer-*.md` only; non-reviewer agents aren't counted separately

Phase 6 says: `ls agents/reviewer-*.md | wc -l` returns 20. The build-plugin.sh itself counts all agents (currently 16: 6 reviewers + 10 non-reviewers). The plan's verification step only asserts the reviewer subset count, not the total agent count. If a non-reviewer agent is accidentally deleted during cleanup, `bun run build:plugin` would pass (non-reviewer count not asserted) but the agent would be missing at runtime.

Fix: Add a total agent count assertion to `build-plugin.sh` alongside the reviewer count check. Expected total: 20 reviewer agents + existing 10 non-reviewer agents = 30. Or at minimum, assert that non-reviewer agents (editor, synthesis, refinement-coordinator, plan-phase, explore-phase, etc.) are still present by name.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `_shared/references/iteration-loop.md` has stale language about "sub-agent-prompts.md" bootstrap pattern

Line 50 in `iteration-loop.md`: "Use the reviewer bootstrap prompt template (from the skill's `references/sub-agent-prompts.md` or inherited from refine-plan)." After Phase 6 deletes `refine-plan/` (which holds `references/sub-agent-prompts.md`), this reference is orphaned. The new pattern spawns reviewer agents directly by agent name — there's no sub-agent-prompts.md involved. The `implement` skill's registry has already moved to agent-name spawning (confirmed in `agents/refinement-coordinator.md`).

Fix: Include `skills/_shared/references/iteration-loop.md` in the Phase 5/6 update scope to remove references to `sub-agent-prompts.md` and align with the agent-name spawn pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 `validate.ts` rewrite task correctly notes structural complexity (24 old skill references, workflow restructure) but doesn't add a verification step after the rewrite

The plan notes that `validate.ts` references 13+ old skill names and requires a structural rewrite (not just find-and-replace). But the Phase 6 verification steps don't include "run `bun tools/dogfood/validate.ts` (or dry-run check)" after the rewrite. Given validate.ts costs $50–100+ to run fully, a syntax check (`bun check tools/dogfood/validate.ts`) at minimum should be in the verification list.

Fix: Add `bun check tools/dogfood/validate.ts` (or `bun run --dry-run tools/dogfood/validate.ts`) to Phase 6 verification steps to catch TypeScript errors from the rewrite without running the full workflow.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `build-plugin.sh` exact skill count assertion is specified in Phase 6 tasks but the script today only prints "Packaged N skills" without asserting — the assertion wording in the plan is correct but depends on a script edit that isn't tracked as an explicit verification step

The plan specifies the exact shell assertion to add: `test "$SKILL_COUNT" -eq 12 || { echo "FAIL: ..."; exit 1; }`. This is clear. Minor gap: the plan's Phase 6 verification says `bun run build:plugin — passes with "Packaged 12 skills" in output` but the assertion will exit non-zero if the count is wrong, so the verification is by exit code not string match. The string check is weaker than the exit-code check already specified. This is a cosmetic inconsistency between the task wording and the verification wording — no functional impact.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The plan is well-structured and covers the key repo/tooling concerns: build assertion (skill count + name list), `install:skills` script removal, `package.json` cleanup, orphan detection with named candidates, and test harness updates. Round 2 correctly fixed the reviewer count (20 total) and listed orphan candidates. What would bring this to 9+:

1. Add `iteration-loop.md` to the Phase 5 update scope (2 stale sections describing the old Prompt File + Section pattern, and the sub-agent-prompts.md bootstrap path) — this is a real runtime risk once the monolithic reviewer files are deleted.
2. Strengthen `test-plugin-skills.ts` per-skill assertions from WARN to FAIL as part of the test update task.
3. Add `bun check tools/dogfood/validate.ts` to Phase 6 verification.
4. Add `_shared/references/README.md` to the Phase 6 stale reference cleanup scope.

## Summary

- Critical: 0
- Important: 3
- Minor: 3
