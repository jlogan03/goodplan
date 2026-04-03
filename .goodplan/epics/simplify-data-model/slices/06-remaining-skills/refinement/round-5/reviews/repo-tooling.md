# Repo, Tooling, & Docs Review -- Round 5

## Issues

**[MINOR]** Phase 5 `iteration-loop.md` update task still only targets one of two `sub-agent-prompts.md` references

Round 4 flagged that `iteration-loop.md` has two locations referencing `sub-agent-prompts.md`: the Reviewer Spawn Pattern section (line ~50) and the Editor Sub-Agent Pattern section (line ~109). The Phase 5 task (bullet 2 under "Update `skills/_shared/references/iteration-loop.md`") only says "Remove references to `sub-agent-prompts.md` as the bootstrap source" without specifying both locations. An implementer could update line 50 and miss line 109. Add an explicit note: "Two locations reference `sub-agent-prompts.md`: the Reviewer Spawn Pattern (~line 50) and the Editor Sub-Agent Pattern (~line 109). Update both."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 verification still lacks a concrete total agent count assertion

Round 4 noted that Phase 6 only asserts reviewer agent count (20) without a total agent count. The current plan says "assert agent count: `ls agents/reviewer-*.md | wc -l` returns 20, plus non-reviewer agents" -- the "plus non-reviewer agents" is vague. After all phases complete, the expected total is: 20 reviewers + 10 existing non-reviewers + 4 new non-reviewers (audit-architecture-phase, audit-docs-phase, audit-tests-phase, onboard-phase) = 34. The `build-plugin.sh` update task should include a concrete total agent count assertion (e.g., `test "$AGENT_COUNT" -eq 34`) alongside the skill count assertion. Without it, a non-reviewer agent accidentally deleted during cleanup goes undetected.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `start-explore` extension should note that `submit-explore` also needs `--quest` support

Phase 1 Sub-phase A includes a task for extending `start-explore` to accept `--quest`, and a separate task for extending `submit-explore` to support quest submission. Both are present and well-specified. However, the Expected Behavior section only lists `gp start-explore --quest test` as a "Before" and "After" check. There is no corresponding Expected Behavior item for `submit-explore --quest`. Adding one would make verification more explicit: e.g., "After: `gp submit-explore --quest test --json` succeeds."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Both round 4 IMPORTANT issues (review-*.md glob count off-by-one, generate-onboard-fixture.sh orphan) are fixed. The plan is comprehensive, well-structured, and internally consistent. Phase ordering respects dependencies (CLI prerequisite before skill, creation before cleanup). Expected Behavior sections use direct verification (CLI commands, test harness runs, file existence checks). The remaining issues are all MINOR and concern verification completeness rather than correctness -- the plan would execute successfully as-is. What would bring it to 10: concrete total agent count assertion in build-plugin.sh and explicit dual-location callout for the iteration-loop.md update.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
