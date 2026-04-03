# Holistic Review — Plan-Slice PoC (Round 2)

## Round 1 Issue Verification

All 4 IMPORTANT issues from round 1 have been addressed:
- Severity levels now correctly specify CRITICAL/IMPORTANT/MINOR (line 44)
- Architecture doc fix task added as first task in Phase 1 (line 42)
- Re-entry behavior fully specified with operational detail (line 113)
- Temp directory lifecycle specified: preserved on failure, cleaned on success, path logged (line 16)

All 4 MINOR issues addressed or acceptable:
- Agent count "7 files" is correct for PoC scope (unchanged, acceptable)
- Plugin.json check now uses `jq '.agents'` instead of fragile grep (line 76)
- Orchestrator discipline distinction clarified via `canUseTool` scoping (lines 178-179)
- Documentation update task not added (see MINOR issue below)

## Issues

**[IMPORTANT]** Re-entry from `plan-refined` status proposes an invalid state transition

The plan (line 113) states: "Status transitions `plan-refined` -> `planning` before re-refinement, back to `plan-refined` on completion." However, the state machine transition tables (`architecture/transition-tables.md`) show NO transition from `plan-refined` back to `planning` or `refining`. The only valid transition from `plan-refined` is `BEGIN_IMPLEMENTATION -> implementing`. Additionally, `BEGIN_REFINEMENT` only works from `plan-created`, not from `plan-refined`.

This means the re-refinement re-entry behavior described in the plan cannot be executed with the current state machine. Either: (a) a new state machine transition must be added (which this slice should NOT do — it's out of scope and violates the "four-layer CLI stack unchanged" constraint), or (b) the re-entry behavior must be adjusted to work within existing transitions, or (c) re-refinement should use `--override` on `submit-refinement` from the existing `refining` state.

Resolution: DIRECTLY_ACTIONABLE

Fix: Simplify re-entry for `plan-refined` status: the orchestrator should offer to "view existing plan" or "proceed to implementation." Do NOT offer re-refinement until a state machine transition supporting it exists. If re-refinement is essential for this PoC, add a task to first extend the transition table with `plan-refined -> BEGIN_REFINEMENT -> refining`, but note this requires changes to the state machine (which should be flagged as an architecture change to the user). The simpler fix is to defer re-refinement to a later slice.

---

**[IMPORTANT]** Missing `slice:refine-plan` (or `start-refinement`) transition between plan submission and refinement

The plan's Phase 3 (lines 141-142) describes the status flow as: `gp submit-plan` (`planning` -> `plan-created`), then immediately `gp submit-refinement` per round. But the transition table shows that `plan-created` requires `BEGIN_REFINEMENT` to reach `refining` before `COMPLETE_REFINEMENT_ROUND` can fire. The plan never calls `gp slice:refine-plan --slice <name>` (or `gp start-refinement --slice <name>`) to transition from `plan-created` to `refining`.

Without this intermediate transition, the first `submit-refinement` call will fail because the slice is in `plan-created` status, not `refining`. (Note: there IS a skip path where `COMPLETE_REFINEMENT_ROUND` can fire directly from `plan-created` if scores meet threshold on the first round, but the plan's general flow assumes multiple rounds.)

Resolution: DIRECTLY_ACTIONABLE

Fix: Add `gp slice:refine-plan --slice <name> --json` (or `gp start-refinement --slice <name> --json`) after `submit-plan` and before the first `submit-refinement`. Update line 112 and the Phase 2 task list (around line 141-142) to include this transition step: `plan-created` -> `refining` before the refinement loop begins.

---

**[IMPORTANT]** `submit-refinement` requires scores stdin but plan doesn't specify it

The plan (line 142) says: "`gp submit-refinement --slice <name> --json` per refinement round (handles round tracking -> eventually `plan-refined`)" but `submit-refinement` requires `{ "scores": { "<criterion>": <number> } }` via stdin (verified from `src/schemas/commands/submit.ts` lines 25-33). The plan's Phase 2 task list doesn't mention piping synthesis scores into the command.

Resolution: DIRECTLY_ACTIONABLE

Fix: Update line 142 and the corresponding Phase 2 task (around line 142) to show: `echo '{"scores": {...}}' | gp submit-refinement --slice <name> --json` where scores are extracted from the synthesis agent's return value. Add a task or note specifying that the orchestrator must map the synthesis agent's aggregate score into the `Record<string, number>` format expected by `submit-refinement`.

---

**[MINOR]** Documentation update task still missing

Round 1 flagged that CLAUDE.md's Agent SDK Test Harness table should be updated with the new `test-plan-slice.ts` entry. This was not addressed in the revision. While low severity for a PoC, the table is used for discoverability — future developers won't know the test exists.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add a minor task in Phase 4 to update the Agent SDK Test Harness table in CLAUDE.md with a row for `test-plan-slice.ts` (purpose: plan-slice pipeline end-to-end, usage: `bun tools/dogfood/test-plan-slice.ts`).

---

**[MINOR]** Phase 3 verification section is weaker than other phases

Phase 3's verification (lines 150-153) consists entirely of manual inspection ("Read through the SKILL.md", "Check that all agent names match", "Verify the refinement loop exit conditions"). Unlike Phases 1, 2, and 4 which have concrete before/after checks with runnable commands, Phase 3 has no executable verification. Since Phase 3 is the core of the PoC, this is a gap. Phase 4's test harness partially covers this, but there's nothing verifiable between Phase 3 completion and Phase 4 completion.

Resolution: DIRECTLY_ACTIONABLE

Fix: Add at minimum: `bun run build:plugin` succeeds with the new skill included, `ls dist/gp-plugin/skills/plan-slice/SKILL.md` -> exists, and `grep 'name: gp:plan-slice' dist/gp-plugin/skills/plan-slice/SKILL.md` -> matches. These bridge the gap until Phase 4's integration test is built.

## Score: 7/10

Round 1's 4 IMPORTANT issues were all addressed, but 3 new IMPORTANT issues emerged — all related to state machine transition accuracy. The plan's orchestrator flow describes CLI command sequences that would fail at runtime: (1) re-entry from `plan-refined` proposes an impossible transition, (2) the `plan-created` -> `refining` transition is skipped, and (3) `submit-refinement` is called without the required scores stdin. These are fundamental to the plan working correctly — an implementer following this plan would hit state machine errors on the first run. Fixing these three items (and the two MINOR items) would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
