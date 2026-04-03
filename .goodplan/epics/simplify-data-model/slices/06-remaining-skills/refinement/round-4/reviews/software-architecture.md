## Issues

**[IMPORTANT]** Phase 1 Sub-phase A `submit-explore` extension is underspecified — the existing command routes through `COMPLETE_EXPLORE` which is epic-only

Phase 1 includes a task to "extend `submit-explore` CLI command to support quest exploration submission: add `--quest <name>` flag." The current `submit-explore` command (`src/commands/subagent/submit-explore.ts`) routes through the RPC submit layer which dispatches `COMPLETE_EXPLORE` — an epic-scoped event handled in `src/core/state/transitions/epic-phase.ts`. The plan correctly specifies adding a `COMPLETE_QUEST_EXPLORE` event and transition handlers in `quest-phase.ts`, and the task says to "route to `COMPLETE_QUEST_EXPLORE` event in the RPC submit layer." However, the plan does not address how `submit-explore` determines which event to dispatch. Currently there is no `--quest` flag on `submit-explore`, and the `--epic` flag is required. The plan needs to specify: (1) make `--epic` and `--quest` mutually exclusive on `submit-explore` (matching the pattern on `submit-plan`/`submit-refinement`/`submit-implementation`), (2) remove the `required: true` from `--epic` and add a guard that exactly one of `--epic`/`--quest` is provided. The task text mentions this pattern but it reads as a description rather than an implementation directive. The same mutual-exclusivity treatment is needed for `start-explore` (which currently has `epic` as `required: true`).

Fix: Make the `submit-explore` task more explicit: "Make `--epic` and `--quest` mutually exclusive (remove `required: true` from `--epic`, add guard that exactly one is provided). Route to `COMPLETE_EXPLORE` for epic scope, `COMPLETE_QUEST_EXPLORE` for quest scope." Similarly clarify the `start-explore` task: "Change `--epic` from `required: true` to optional, add `--quest` flag, add mutual-exclusivity guard."

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 `BEGIN_QUEST_PLAN` transition table must be updated to accept `explored` as a valid source status

The current quest state machine has `BEGIN_QUEST_PLAN` transitioning from `created` only (line 74 of `quest-plan.ts`: `{ from: "created", event: "BEGIN_QUEST_PLAN", to: "planning" }`). Phase 1's transition table additions include `explored -> BEGIN_QUEST_PLAN -> planning` (which "replaces current `created -> BEGIN_QUEST_PLAN -> planning`"). But this is not a replacement — it is an addition. Quests that skip exploration (created directly, then planned) still need the `created -> BEGIN_QUEST_PLAN` path. The plan should specify: add `explored` as a valid source status for `BEGIN_QUEST_PLAN` while retaining `created` as a valid source. The `guardQuestStatus` call in `quest-plan.ts` currently checks for `"created"` only — it must accept `["created", "explored"]`. Without this, the create-side-quest pipeline will fail at the plan Q&A phase after exploration completes.

Fix: Add explicit task: "Update `handleBeginQuestPlan` in `quest-plan.ts` to accept both `created` and `explored` as valid source statuses. Update the `beginQuestPlanTransitions` array accordingly. Update `architecture/transition-tables.md` to show both source rows."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 reference file copy for init is listed here but the target directory is created in Phase 3 — ordering dependency is implicit

Phase 4 includes "copy the 5 reference files from `skills/onboard-repo/references/` to `skills/init/references/`." Phase 3 creates `skills/init/SKILL.md` and `agents/onboard-phase.md` but does not create `skills/init/references/`. The dependency is obvious from phase ordering (4 runs after 3), but Phase 3 does not include creating the `references/` subdirectory. If the onboard-phase agent injects references via `@${CLAUDE_PLUGIN_ROOT}/skills/init/references/...`, those references need to exist when the agent is first tested in Phase 3's verification step. Either Phase 3 should create the `references/` directory with the files (and Phase 4 should only verify them), or Phase 3's test harness should not depend on reference file injection.

Fix: Move the reference file copy from Phase 4 to Phase 3 (co-locate with init skill creation), or explicitly note in Phase 3 that the onboard-phase agent's `@` references will be dangling until Phase 4, and adjust Phase 3's verification to account for this.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 `validate.ts` rewrite guidance mentions old workflow structure changes but does not specify the new validation flow

The Phase 6 task for `validate.ts` provides a mapping from old skill names to new skills and notes "May require restructuring validation logic, not just renaming." The mapping is helpful but the task does not specify what the new validation flow should look like. Given that `validate.ts` is the full-workflow validation script (75KB), a "significant restructuring" without a target structure risks producing an incomplete or incorrect rewrite. At minimum, the task should specify: (1) the sequence of pipeline invocations that replace the old sequential skills, (2) which verification assertions change (e.g., old "refine-plan created refinement artifacts" becomes "plan-slice created both plan and refinement artifacts"), (3) the expected skill count assertion (12 skills, matching build-plugin.sh).

Fix: Add a brief target flow outline to the `validate.ts` rewrite task: e.g., "New validation flow: init -> create-epic (covers architecture + slices) -> plan-slice -> implement -> complete-epic. Verify 12 skills discovered, all pipelines produce expected artifacts."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has addressed all IMPORTANT and MINOR issues from round 2. The quest state machine extension now includes transition table updates, fitness function verification, and the activeQuest guard decision. The reviewer registry is explicitly marked as a full rewrite. The monolithic file cleanup is explicit in Phase 6 with orphan detection. The hardcoded reviewer lists in orchestrator skills are addressed in Phase 5 with a preference to migrate to registry references. The iteration-loop.md update is specified with concrete changes.

The two remaining IMPORTANT items are implementation-level gaps that could cause runtime failures: the `submit-explore`/`start-explore` mutual-exclusivity treatment is implied but not explicit enough for an implementer, and the `BEGIN_QUEST_PLAN` guard expansion is missing (the plan says "replaces" when it should say "adds to"). Both are straightforward fixes. The MINOR items are ordering/documentation concerns. Addressing the IMPORTANT items would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
