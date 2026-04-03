# TUI & CLI Review — Round 4

## Issues

**[IMPORTANT] Phase 1: `BEGIN_QUEST_PLAN` guard must accept `explored` status, not just `created`**
The plan adds `exploring`/`explored` statuses and specifies `explored -> BEGIN_QUEST_PLAN -> planning` as a new transition (replacing `created -> BEGIN_QUEST_PLAN -> planning`). However, the current `handleBeginQuestPlan` in `src/core/state/transitions/quest-plan.ts` (line 27) hardcodes `guardQuestStatus(quest, event.quest, "created", "BEGIN_QUEST_PLAN")`. The plan's Sub-phase A task list does not explicitly call out updating this guard to also accept `explored`. The transition table row is listed, but the implementation task for modifying `quest-plan.ts` is missing. Without this, a quest that goes through explore will be stuck at `explored` — `quest:plan` will reject it.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1: `quest:plan` CLI command precondition description is stale after this change**
The `quest:plan` command's meta description says `Precondition: 'created' status`. After adding the explore path, the precondition becomes `'created' OR 'explored'`. The plan does not include a task to update the command's description string or the schema registry entry (`registerCommand("quest:plan", ...)` in `src/commands/global/schema.ts` line 297). Since `gp schema` output is consumed by LLM orchestrators (INV-006), a stale description would cause incorrect assumptions about valid preconditions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 1: Missing `--quest` mutual exclusivity enforcement on `start-explore` and `submit-explore`**
The plan says to add `--quest` to `start-explore` and `submit-explore`. The existing `start-explore` has `epic: { required: true }` — adding `--quest` requires making `--epic` optional and adding mutual exclusivity validation, matching the pattern in `start-plan.ts` (lines 45: `"Exactly one of --slice or --quest is required"`). The plan mentions this for `submit-explore` but does not spell out the corresponding change to `start-explore`'s arg definition (changing `epic` from `required: true` to optional + adding the mutex guard). This is a non-trivial CLI contract change.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 4: No verification that renamed skills actually respond to invocation**
The `test-renames.ts` described in Phase 4 tests "skill loads via plugin discovery" and "responds to trigger phrases." But the test description only checks discoverability (skill appears in list) and trigger phrase matching. There is no test that actually invokes the skill and verifies it produces expected output — e.g., running `/gp:task` and confirming it attempts to create a task, or `/gp:status` and confirming it returns project status JSON. The `Expected Behavior` section has `bun tools/dogfood/test-renames.ts` but the test tasks only describe smoke-level checks. For `status` in particular (which is invoked at the start of nearly every session), a functional test that verifies JSON output structure would catch content regressions from the rename.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2: Audit skill mode parsing relies on natural language positional argument — no `--mode` flag**
The audit skill parses mode from the first positional word after the skill name (e.g., `/gp:audit architecture`). This is fine for interactive use but means there's no `--mode` flag for scripted/test harness invocations. The test harness `test-audit.ts` will need to pass the mode in the natural language prompt to `query()`, which is less deterministic than a flag. Consider documenting this as the canonical invocation pattern in the skill's description so test authors know to use it.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3: `--mode` parsing described as argument but skills don't receive formal CLI flags**
Phase 3 says "Override: argument `--mode new` or `--mode onboard`" and then clarifies in a note that `--mode` is parsed from natural language. This is correct but the initial description reads as if it's a formal CLI flag. The task description should consistently use the "parsed from invocation text" framing from the start to avoid implementer confusion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: `validate.ts` rewrite scope is underspecified for error output**
The `validate.ts` rewrite task notes significant restructuring but doesn't specify what the validation output format should be. Currently it likely outputs pass/fail per skill. After consolidation, pipeline skills subsume multiple old skills — the output should indicate which pipeline phases were validated, not just the pipeline name. Without this, a validation failure in `create-epic` doesn't tell you whether it was the explore phase, architecture phase, or slices phase that failed.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Good improvement from round 2. The CLI prerequisite work in Phase 1 is well-structured with explicit transition table rows, fitness function verification, and the `activeQuest` guard decision is documented. Error handling has three distinct failure modes in Phase 2. The status-to-phase mapping table in Phase 1 is clear and complete. The two IMPORTANT issues around the `quest:plan` guard update and `start-explore` mutual exclusivity are implementation gaps that would cause runtime failures — fixing those would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
