# Agent Skill Review — Slice 08 Documentation and Skill Bug Fixes

## Issues

**[CRITICAL]** Phase 1 start-epic rewrite: Step 2 pre-activation check only looks for `slices-refined` status, but `epic:activate` command description says `slices-defined` or `slices-refined` — however the actual state machine transition table (`src/core/state/transitions/epic-lifecycle.ts` line 208) only allows `slices-refined`. The plan's Step 2 is correct about the precondition being `slices-refined`, but it should also handle the `slices-defined` case explicitly by telling the user to run `/gp:plan-slice` to refine slices first. Currently the plan says "If wrong status, tell user what's needed" — this is too vague for a rewrite that replaces a full skill. The step should enumerate the main wrong-status cases and their remedies (e.g., `created` -> run `/gp:create-epic`, `explored` -> run `/gp:create-epic` to continue, `slices-defined` -> run `/gp:plan-slice` to refine slices, `activated` -> already done).
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 2 Bug A — Learnings rollup: The plan says "read `consolidated-learnings.md` and parse each learning entry" and "include all learnings in the `epic:complete` payload" but does not specify the **required schema format** for learnings. The `learningInputSchema` requires `{ category, summary, detail, tags, rollupTo }` with `category` being one of `"domain" | "worked" | "didnt-work" | "do-differently"`. The plan must specify that the completion-epic agent's `consolidated-learnings.md` must contain learnings in this exact schema format, OR that Step 7 must parse the markdown and construct properly-typed learning objects. Without this, the implementer will likely produce learnings that fail Zod validation at the CLI boundary.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 start-epic rewrite: The plan's Step 1 (Scope Resolution) says to auto-detect via `gp epic:list --json` looking for `slices-refined` status. However, `epic:list` is not in the CLI schema output. The correct command is `gp status --json` which has `.activeEpic` or use `gp epic:show --epic <name> --json` per epic. The plan should use `gp status --json` for auto-detection (checking if there's an epic in the appropriate status) or iterate known epics from the overview structure.
Resolution: CODEBASE_EXPLORATION

Research: Verify `gp epic:list` exists as a command. Check `src/commands/epic/` for a `list.ts` file. If it doesn't exist, the plan must use an alternative discovery mechanism.

**[IMPORTANT]** Phase 2 Bug C — Verification validation: The plan says "check all `verificationResults` entries have `passed: true`" before the `epic:complete` call, but the `verificationResults` in the plan's Step 7 are constructed by the orchestrator itself (line 253: "or use `[{"index": 0, "passed": true}]` if verification was handled by the agent"). This means the orchestrator would be validating data it just constructed — the check is pointless for the self-constructed case. The real validation should check the **agent's analysis of the epic's verification criteria** (from `gp epic:show --json` which has the verification definitions), not the payload the orchestrator is about to submit. The plan should clarify: read the epic's verification criteria, have the agent assess each one, then validate all passed before constructing the submission payload.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 start-epic rewrite: Missing sub-agent context discipline statement. The existing complete-epic skill has an explicit "Context Discipline" section establishing the orchestrator boundary. The start-epic rewrite plan doesn't include one. Since start-epic is being rewritten to use CLI commands (no longer doing direct file ops), it should include a context discipline statement clarifying that it reads architecture files to present to the user (Step 4) — this is a legitimate orchestrator exception (user-facing presentation), not a violation. Without this, the implementer may add a discipline section that incorrectly forbids the architecture reading step.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 stale reference sweep: The mapping table says `/complete` maps to `/gp:complete-epic` (for epics) or "built into /gp:implement" (for slices), but the explore skill (line 242-245) recommends `/create-architecture` and `/create-plan` as next steps — these should map to `/gp:create-epic` and `/gp:plan-slice` respectively. The plan's Phase 3 task list does include updating `skills/explore/SKILL.md`, but the specific lines to update (242-245) reference "next step based on scope" which uses both `/create-architecture` AND `/create-plan`. The plan should explicitly list all four replacements in the explore skill: `/create-architecture` -> `/gp:create-epic` (x2), `/create-plan` -> `/gp:plan-slice` (x2).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 E2E validation: The verification criteria say "All 8 pipeline steps PASS" and "All 6 quality metrics PASS" but the plan doesn't specify what to do if failures are caused by **harness issues** rather than skill bugs. The plan says "diagnose and fix the skill or harness issue" — but fixing harness issues is out of scope for this slice (the harness is Experimental maturity). The plan should distinguish: skill/reference bugs are in scope; harness infrastructure bugs should be captured as tasks via `/gp:task` and the specific failing step marked as "harness limitation, not skill bug" in the results.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 start-epic rewrite: Step 6 says "Display epic name, slice count, next step (`/gp:plan-slice` for the first slice)." However, after `epic:activate`, the next step depends on whether slices already have plans. The more accurate next step is: "Run `/gp:plan-slice` to create a plan for the first slice, or `/gp:status` to see the full slice list." This is minor because the user will figure it out, but it's a triggering accuracy concern — the skill should guide accurately.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2: The complete-epic skill references `../_shared/references/epic-conventions.md` and `../_shared/references/state-and-activity-formats.md` — but the plan's stale reference sweep (Phase 3) doesn't check whether these shared references themselves contain stale skill names. The `epic-conventions.md` file likely references old skill names in its state machine documentation. Phase 3 should include these files in the sweep scope.
Resolution: CODEBASE_EXPLORATION

Research: Check `skills/_shared/references/epic-conventions.md` and `skills/_shared/references/state-and-activity-formats.md` for stale skill name references.

**[MINOR]** Phase 3: The `init/SKILL.md` fix says "fix line ~209 reference to `/gp:create-architecture`" — but `/gp:create-architecture` is already a stale name being replaced. The text should say "fix reference to `create-architecture` (old name) by replacing with `create-epic` (new name)." The current wording is confusing because it looks like the `/gp:` prefix version IS the target, but `create-architecture` in any form is stale.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan correctly identifies the three main problems (start-epic rewrite, complete-epic bugs, stale references) and the documentation gap. However, the start-epic rewrite lacks sufficient detail about CLI command existence (epic:list may not exist), error case handling, and context discipline. The complete-epic fix for learnings rollup misses the critical schema format requirement that will cause Zod validation failures. The verification validation (Bug C) has a logical gap — it validates self-constructed data rather than the epic's actual verification criteria. To reach 9+: fix the learnings schema specification, verify and correct the CLI commands used in start-epic, add context discipline to start-epic, and clarify the verification validation logic.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
