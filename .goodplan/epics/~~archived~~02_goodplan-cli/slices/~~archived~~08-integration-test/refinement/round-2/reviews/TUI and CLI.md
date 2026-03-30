# TUI and CLI Review — Integration Tests & Fitness Functions (Round 2)

## Issues

**[MINOR]** Epic lifecycle test still uses descriptive phrases instead of exact CLI commands

The epic lifecycle test in `workflow-epic.test.ts` (Phase 2, line 68-69) says "skip explore -> define architecture -> define slices -> activate" without specifying exact CLI commands. Round 1 issue I7 asked for exact command names; the fix was applied to slice and quest lifecycle tests (lines 71-74) which now list full command chains, but the epic lifecycle test was not updated. The epic skip path involves submit commands: `submit-explore --epic <name>`, `submit-architecture --epic <name>`, `submit-refine-architecture --epic <name>`, `submit-slices --epic <name>`, `submit-refine-slices --epic <name>`, then `epic:add-verification --epic <name>`, `epic:activate --epic <name>`. Without exact commands, the implementer must reconstruct this from the transition tables.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `slice:complete` stdin payload not specified in workflow-slice test

The `workflow-slice.test.ts` chain ends with `slice:complete` but the plan doesn't specify the required stdin JSON payload for this command. Per the commands-api, `slice:complete` requires `{ verificationPassed, deferred, learnings, architectureDelta }`. The implementer needs to know the expected input shape to construct the test. The other submit commands in the chain also require stdin payloads (e.g., `submit-plan` needs content, `submit-refinement` needs scores) but these are more obvious from the command names. The `slice:complete` payload is the most complex and should be spelled out or at least referenced.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 issues (3 IMPORTANT, 4 MINOR) have been properly addressed. Error codes are correct, vitest timeout config is added, concurrent test removed, handlerRecord approach specified, INV-004 and INV-006 fitness functions added, import type distinction noted, withFixture cwd specified, exact command names added for slice/quest chains, NO_COLOR test added. The two remaining MINOR issues are about completeness of the epic lifecycle test commands and missing stdin payload details -- both are small gaps that an implementer could work around but would benefit from being explicit.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
