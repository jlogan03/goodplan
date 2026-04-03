# TUI & CLI Review -- Round 5

## Issues

**[IMPORTANT] Phase 1: No explicit task to update `quest-plan.ts` guard and `schema.ts` description for dual precondition**
The transition table row now correctly says `created|explored -> BEGIN_QUEST_PLAN -> planning`, and the plan documents this as a "dual precondition." However, there is still no explicit task in Sub-phase A to (a) update the `guardQuestStatus()` call in `src/core/state/transitions/quest-plan.ts` (line 27) to accept both `"created"` and `"explored"`, or (b) update the `quest:plan` command description in `src/commands/global/schema.ts` (line 297) and the command meta in `src/commands/quest/plan.ts` which says `Precondition: 'created' status`. The transition table row describes the *desired* behavior, but the implementation task list in Sub-phase A does not name these two files as needing modification. An implementer following the task list literally would add the transition table row to the architecture doc but miss the code changes. This was raised in round 4 as two separate IMPORTANT issues; the transition table was fixed but the task list gap remains.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1: `start-explore` arg definition change from `required: true` to optional not spelled out**
The plan correctly documents that `--quest` and `--epic` must be mutually exclusive on `start-explore` and `submit-explore`. However, the current `start-explore` command defines `epic: { required: true }` (line 22 of `src/commands/subagent/start-explore.ts`). Adding `--quest` requires changing `epic` to `required: false` and adding a mutual exclusivity guard (the same pattern in `start-plan.ts` line 45: `"Exactly one of --slice or --quest is required"`). The plan's task says "accept `--quest <name>` flag" but does not call out that the existing `epic: { required: true }` must change to optional. Similarly, `submit-explore` has `epic: { required: true }`. An implementer could add `--quest` as a second required flag and create a command that requires both, which is the opposite of the intent. This was noted in round 4; the mutual exclusivity guard is now documented, but the specific arg definition change (required -> optional) is still missing.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1: `commands-api.md` architecture doc not listed for update**
The commands-api.md architecture doc (`.goodplan/architecture/commands-api.md`) currently lists `start-explore --epic <name>` and `submit-explore --epic <name>` in the Sub-Agent Commands section (lines 153-154). After adding `--quest` support, these should read `--epic <name>|--quest <name>`. The plan updates the transition tables but does not include a task to update the commands-api.md sub-agent command signatures. Since `gp schema` output is generated from citty definitions (INV-006), the runtime is correct, but the architecture doc becomes stale documentation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: Renamed skills lack functional invocation tests**
Round 4 flagged that `test-renames.ts` only tests discoverability (skill appears in plugin list, trigger phrases match), not functional behavior. The plan was updated to note "Test error path: invoke each with missing arguments or context, verify graceful error message" -- but error path testing is not the same as happy-path functional testing. For `status` specifically (invoked at the start of nearly every session), a test that invokes `/gp:status` against an initialized fixture and verifies it returns valid JSON with expected fields (activeEpic, activeSlice, etc.) would catch content regressions. The coverage gap is acknowledged but not addressed. Downgrading to MINOR since the underlying skill logic is identical to the source skills which have their own test coverage.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: `CLAUDE.md` updates reference old skill invocation patterns throughout**
Phase 6 includes a task to update `CLAUDE.md` but only lists three specific replacements (`/project-status` -> `/gp:status`, `/create-plan` -> `/gp:plan-slice`, `/implement-plan` -> `/gp:implement`). The actual CLAUDE.md has additional references to old skill names -- for example, the Agent SDK Test Harness table, the "Three Separate Things" section, and the installed tools description all mention patterns like `/project-status`, `/create-plan`, etc. The task says "Verify no references to the 15 deleted skill names remain" which is the right approach, but the listed replacements are incomplete. Consider adding a grep-based sweep task rather than enumerating specific replacements.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Solid improvement over prior rounds. The dual precondition for `BEGIN_QUEST_PLAN` is correctly specified in the transition table. The mutual exclusivity guards for `start-explore`/`submit-explore` are documented. The status-to-phase mapping table is clear and covers all re-entry paths including the skip-explore case. The two remaining IMPORTANT issues are implementation task list gaps -- the *behavior* is correctly specified in the transition table and CLI description, but the concrete file edits needed are not enumerated in the task list, which creates risk for an implementer. Adding explicit tasks for (1) `quest-plan.ts` guard + `schema.ts` description update and (2) `start-explore.ts` arg definition change from required to optional would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
