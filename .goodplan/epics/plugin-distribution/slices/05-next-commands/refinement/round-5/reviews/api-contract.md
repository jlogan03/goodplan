# API Contract Review — Round 5

Reviewer: api-contract
Plan: /Users/iwhite/Repos/goodplan/.goodplan/epics/plugin-distribution/slices/05-next-commands/plan-refining.md
Iteration: 5

## Codebase Exploration Summary

Read all three RPC files (`begin.ts`, `submit.ts`, `complete.ts`), `src/core/rpc/types.ts`, representative transition tables (`epic-lifecycle.ts`, `epic-phase.ts`, `epic-verify.ts`, `epic-refine.ts`, `slice-submit.ts`, `slice-abandon.ts`, `decision.ts`, `task-lifecycle.ts`), `src/schemas/entities/*.ts`, `src/commands/global/schema.ts`, `src/util/output.ts`, `src/commands/epic/create.ts`, and the fitness test `mutation-through-state-machine.test.ts`. Active epic confirmed as `plugin-distribution`.

Round 4 merged review confirmed: all three IMPORTANT issues (I1 `(error)` filtering, I2 generic `(same)` expansion, I3 `"(none)"` sentinel) and all six MINOR issues are now incorporated into the plan text.

---

## Issues

**[MINOR]** `show` command excluded from `entity` commands but not explicitly specified in `computeNextCommands` — omission is ambiguous

The plan says "Include the entity's read command (e.g., `gp epic:show --epic {name}`)" in the entity section for all statuses, including terminal. The plan also says terminal statuses return `{ entity: [showCommand], other: [] }`. However, the plan never explicitly states that the `show` command is *always* included regardless of status (non-terminal and terminal alike) — it only mentions it in two contexts: the terminal case, and as a parenthetical in the `entity` section description. This is not a contradiction, but an implementer could reasonably interpret it as "show only for terminal" or "show always." The unit tests do not include a non-terminal test case that explicitly verifies `show` appears alongside workflow commands, leaving this behavior unvalidated.

Additionally, the `show` commands (`epic:show`, `slice:show`, `quest:show`, `task:show`, `decision:show`) are read-only commands — they produce no state events and therefore have no entries in the transition tables or `commandToEvent`. The plan proposes adding them manually outside the derivation. This is a second pragmatic exception alongside the "other" creation commands, but is not called out as such. The plan should acknowledge that `show` commands are manually appended (like creation commands in "other"), not derived.

Fix: Clarify that the `show` command is always appended to the entity section for all statuses (not just terminal), and that this is a manually-specified exception like the "other" creation commands. Add a unit test case asserting that `computeNextCommands({ type: "epic", name: "e" }, "exploring")` includes `gp epic:show --epic e` alongside workflow commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `nextCommands` field on `CompleteResult` has a conflicting comment in `types.ts` that needs updating

The existing `paths` field on `BeginResult`, `SubmitResult`, and `CompleteResult` carries this comment: "Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it." The plan adds `nextCommands: NextCommands` as required (not optional). For `paths`, optional was chosen specifically for backward compatibility. `nextCommands` has no existing consumers to be backward-compatible with, so required is correct per the plan.

However, `CompleteResult` has a notably complex shape with many optional fields. Making `nextCommands` required there is a meaningful statement: every `complete()` call must now populate it. The plan's note "Terminal statuses return `{ entity: [showCommand], other: [] }` (always both fields, always arrays — never omitted)" covers the terminal case for `complete()`. But `complete()` only handles epic/slice/quest — it throws for other target types. The plan does not specify what `computeNextCommands` receives when `complete()` is called: it will receive `(target, newStatus)` just like `begin` and `submit`. Since `complete` only fires for epic/slice/quest, the entity types are well-defined. No gap here — confirming the plan is sufficient.

The issue is narrower: the `paths` comment on `BeginResult` says "typed optional for backward compatibility." Adding a required `nextCommands` with no backward-compat concern should use a different (or no) comment, to avoid implying `nextCommands` also has a backward-compat story. The plan should note the distinction so implementers add appropriate JSDoc.

Fix: Add a note to Phase 2's `types.ts` update task: "Do not repeat the 'typed optional for backward compatibility' comment pattern for `nextCommands` — add a brief JSDoc describing the field's purpose instead (e.g., 'Available next commands, computed from the transition registry')."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `commandToEvent` `entityType` field is `NextCommandsEntityType` but some commands are polymorphic (target-type-dependent)

The `commandToEvent` array has one entry per `(command, event, entityType)` triple. Several `begin` phases map to different events depending on `target.type` — `plan`, `refine-plan`, `implement`, `abandon` each dispatch different events for slices vs. quests (e.g., `BEGIN_PLAN` vs. `BEGIN_QUEST_PLAN`). The derivation correctly uses `event + entityType` matching, so `slice:plan` and `quest:plan` would each have their own `commandToEvent` entry pointing to `BEGIN_PLAN` and `BEGIN_QUEST_PLAN` respectively. This is the right design.

The potential issue: the CLI command name for `quest:plan` maps to `BEGIN_QUEST_PLAN`, but `BEGIN_QUEST_PLAN` appears in the quest transition tables. The fitness test's forward-check verifies that every user-facing command file has a matching `commandToEvent` entry. This should work as long as each command file has its own `commandToEvent` entry. However, the plan gives one example (`epic:create`, `quest:create`, `task:create`) for the "other" section, but does not show a full sample entry for the polymorphic commands. Implementers could mistakenly create a single `commandToEvent` entry for `slice:plan` without a corresponding `quest:plan` entry (or vice versa).

Fix: In Phase 1 task 2, add an explicit note: "Polymorphic commands (plan, refine-plan, implement, abandon) each require two `commandToEvent` entries — one per entity type (slice and quest), pointing to their respective events. For example: `{ command: 'slice:plan', event: 'BEGIN_PLAN', entityType: 'slice', ... }` and `{ command: 'quest:plan', event: 'BEGIN_QUEST_PLAN', entityType: 'quest', ... }`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `decisionTransitions` shape is incompatible with the generic wildcard/`(none)` expansion logic

The plan specifies `decisionTransitions` entries using concrete `from` values (`"active"`, `"revisiting"`, `"(none)"`). This is correct. However, the decision entity uses `id` (not `name`) as its identifier, and `decision` has no `show` command flag pattern like `--epic` or `--name` — it uses `--id`. The `template` for `decision:update` would be `gp decision:update --id {id}`, which requires `{id}` interpolation rather than `{name}`.

The plan describes `{name}` interpolation using `resolveEntityName(target)`, which already returns `target.id` for decision targets. This covers the interpolation correctly. But the `template` field in `commandToEvent` uses `` `gp ${string}` `` literal type. The placeholder convention note says "`{name}` and `{epic}` are auto-interpolated values." For decisions, `{name}` would resolve to the decision ID, which works — but a template like `gp decision:update --id {name}` is semantically confusing: the flag is `--id` but the placeholder is `{name}`.

Fix: Add a note in Phase 1 task 2 clarifying that for `decision:*` command templates, `{name}` interpolates to `target.id` (per `resolveEntityName`), so templates should use `{name}` consistently even though the flag name is `--id`. Alternatively, the placeholder convention could document `{name}` as "the entity's primary identifier" which for decisions is its ID. Either way, clarify this in the JSDoc on the `template` field.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `epic:complete` requires stdin input but appears in `nextCommands` as a simple command entry

`epic:complete` requires `{ verificationResults: [...] }` via stdin. `slice:complete` requires `{ verificationPassed, deferred?, learnings?, architectureDelta? }`. `quest:complete` requires `{ verificationPassed, learnings?, architectureDelta? }`. These commands cannot be invoked without the right stdin content — they are not single-flag commands like `epic:explore`.

The `template` field for these would be something like `gp epic:complete --epic {name}`, which is technically a valid template string but omits the stdin requirement. A consumer reading `nextCommands` to suggest next steps might display this template without informing the user that stdin is required. The `commandMappings` description field is manually maintained; including a note like "Complete this epic (requires stdin)" would partially address this.

This is not a blocking API contract issue because the `template` field is documented as a hint, not a complete invocation specification. But the fitness test's description drift check could catch bad descriptions if the convention is to flag stdin-requiring commands.

Fix: Note in Phase 1 task 2 that `description` for stdin-requiring commands should indicate the stdin requirement (e.g., "Complete this epic with verification results"). This is a style suggestion for the manually-maintained descriptions, not a structural fix.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness test forward-check scope may silently miss `start-*` command files

Phase 1 task 4.2 says: "For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`..." The `start-*` command files (e.g., `start-plan.ts`, `start-explore.ts`) do NOT call `begin()`, `complete()`, or `submit()` — they are context-fetch commands, not mutation commands. This exclusion is correct behavior.

However, there are 8 `start-*` files and 8 `submit-*` files in `src/commands/subagent/`. The test's forward-check iterates command files calling `begin/complete/submit`. `submit-*` files call `submit()`, so they are included in the forward-check. But `start-*` files won't be, since they don't mutate state. The forward-check should therefore find exactly 36 command files with `begin/complete/submit` calls (matching the mutation inventory). If the test implementation naively scans for the string "begin(" or "submit(" in source, it might accidentally catch string literals or comments.

Fix: Add a note in Phase 1 task 4 step 2: "The forward-check scan should detect actual `begin(`, `submit(`, or `complete(` call expressions in source code, not string matches in imports or comments. `start-*` files do not call these functions and should naturally be excluded."

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The plan is well-specified and all R4 issues are correctly incorporated. The R5 findings are minor: two clarify ambiguous behavior (`show` command inclusion, `{name}` vs `{id}` for decisions), two are implementer guidance (polymorphic command entries, stdin-requiring command descriptions), one is a JSDoc convention note, and one guards against a fitness test implementation pitfall. None of these are correctness blockers — an attentive implementer would navigate them correctly. The one issue most likely to cause a subtle bug if unaddressed is the missing explicit test for `show` appearing in non-terminal entity commands.

## Summary
- Critical: 0
- Important: 0
- Minor: 6
