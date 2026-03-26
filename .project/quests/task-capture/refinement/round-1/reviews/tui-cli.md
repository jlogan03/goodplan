# TUI and CLI Review: Task Capture Plan

## Issues

**[IMPORTANT]** `task:drop` uses stdin but should use flags for simple scalar input
The plan specifies `task:drop` reads stdin via `taskDropInputSchema` with `{ reason: string }`. However, the established codebase convention (documented in the research context and visible in `quest:abandon`) is that simple scalar inputs use flags, not stdin. `quest:abandon` uses `--reason <text>` as a flag. `task:drop` should follow the same pattern: `goodplan task:drop --task <name> --reason "not worth doing"`. This is consistent with INV-004 (every command is stateless, target flags required) and reduces invocation friction (no stdin pipe needed for a single string).

The plan's Phase 2 Expected Behavior section shows `echo '{"reason":"not worth doing"}' | goodplan task:drop --task <name> --json` which contradicts the flag-based pattern. The `taskDropInputSchema` in Phase 1 may still be useful for schema validation, but the command itself should read from `--reason` flag.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `task:convert` stdin schema is too minimal -- missing `name` for the created entity
The plan's `taskConvertInputSchema` is `{ to: "quest" | "epic" }` and says the command "auto-derives quest/epic name from task slug, goal from task title + description." However, auto-deriving the name removes user control over the created entity's name. Every other `create` command (`epic:create`, `quest:create`, `slice:create`) requires the user to provide an explicit `name`. If auto-derivation produces a collision or an undesirable slug, there is no override mechanism.

Consider: (a) add an optional `name` field to `taskConvertInputSchema` that defaults to the task slug if not provided, or (b) if auto-derivation is deliberate, document the collision handling (does it fail with a duplicate name error from the state machine?). Option (a) is more consistent with existing CLI conventions.

Similarly, `goal` is auto-derived from title + description. The `CREATE_QUEST` event requires a `goal` field. The plan should specify how `goal` is constructed (is it `"${title}: ${description}"` or just `title`?) and whether the user can override it.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `task:create` uses stdin but `name` is auto-derived from `title` -- inconsistent with other create commands
The plan says `task:create` reads stdin `{ title, description?, context? }` and the command layer auto-generates `name` via `slugify(title)`. This means the name is implicit. All other entity create commands (`epic:create`, `quest:create`, `slice:create`) take an explicit `name` in the stdin payload. This creates an asymmetry in the CLI surface.

Two concerns: (1) The user cannot control the slug. If the title is "Fix error handling in migrate.ts", the slug might be `fix-error-handling-in-migratets` which is ugly. (2) If the user changes the title, the slug remains fixed -- the name is a one-way derivation. Consider: accept an optional `name` field in `taskCreateInputSchema` that overrides auto-derivation. This keeps the friction-free path (omit name, auto-derive) while allowing explicit control when needed.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `tasks/overview.json` not created by `INIT_PROJECT` -- first task creation will fail
The `init.ts` handler creates `epics/overview.json`, `slices/overview.json`, and `quests/overview.json` on project init. The plan does not update `INIT_PROJECT` to also create `tasks/overview.json`. The research context (Gotcha #8) identifies this: "Init handler creates overview files... Must also create tasks/overview.json for newly initialized projects. Existing projects need the overview file created on first task creation (or migration)."

For new projects, the fix is adding `tasks/overview.json` to `init.ts`. For existing projects (including the goodplan project itself), the `CREATE_TASK` handler must create `tasks/overview.json` if it does not exist (rather than failing like `CREATE_QUEST` does when overview is missing). Phase 1 tasks mention `task-create.ts` "creates tasks/<name>/task.json, adds to tasks/overview.json" but don't explicitly handle the missing-overview case. This will cause a runtime failure on the first task created in any existing project.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Missing `schema` command registration for task input schemas (INV-006)
INV-006 requires that the `schema` command output reflects actual command signatures. The `schema.ts` file imports and registers input schemas for all entity commands (e.g., `createQuestInputSchema`, `completeSliceInputSchema`). The plan does not mention updating `schema.ts` to register `taskCreateInputSchema`, `taskDropInputSchema`, and `taskConvertInputSchema`. Without this, skills using `goodplan schema --command task:create --json` will not discover the expected input shape.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `task:list` default filtering to open-only differs from other list commands without clear signaling
The plan says `task:list` filters to `status === "open"` by default with an `--all` flag to include converted/dropped. No other `list` command (`quest:list`, `epic:list`, `slice:list`) has default filtering -- they all return all items. This creates an inconsistency in CLI behavior. A user who runs `task:list` and `quest:list` will get different filtering semantics for the same `list` verb.

If the filtering is intentional (because terminal tasks are noise), the human output should clearly indicate filtering is active (e.g., "3 open tasks (use --all to show all 7)") so users understand they are seeing a subset. The `--json` output should also indicate the filter state. The plan's Expected Behavior section doesn't verify this signaling.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:convert` Expected Behavior shows complex return shape not consistent with `BeginResult`
The Phase 2 Expected Behavior shows `task:convert` returning `{ task: { status: "converted", convertedTo: {...} }, created: { entity, type: "quest" } }`. But all other mutation commands return the standard `BeginResult` shape: `{ entity, phase, previousStatus, newStatus, paths? }`. Returning a non-standard shape would violate the consistency principle (all begin-phase commands return `BeginResult`). The plan should either: (a) return standard `BeginResult` with the converted task's status transition, or (b) explicitly document and implement a new result type. Option (a) is simpler and consistent -- the created quest/epic can be verified separately via `quest:show`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Human output strings in Phase 2 don't follow the established pattern
The plan specifies human output like `"Created task: <name>"` for `task:create`. The established pattern (visible in `quest:create`, `quest:abandon`, etc.) is `"entity: previousStatus -> newStatus"` using picocolors formatting. For example, quest:create outputs `"task-name: none -> created"`. The task commands should follow this pattern for consistency unless there is a deliberate reason to diverge.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 verification doesn't test the `/capture` skill end-to-end
Phase 3 verification says "Read the installed skill at `~/.claude/skills/capture/SKILL.md` and confirm it follows cli-interaction.md conventions." This is a static read check, not an actual invocation. The TUI/CLI reviewer expects verification to run the actual command with test args. A proper verification would be: invoke the skill (or at minimum, run the underlying CLI commands the skill would invoke) and verify the output. For example: create a task via the CLI pipeline the skill would use, and verify the result.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No `--status` filter flag for `task:list`
The plan adds `--all` to override the default open-only filter, but doesn't offer a `--status <value>` flag for targeted filtering (e.g., show only converted tasks). This is a minor ergonomics gap -- if a user wants to see all dropped tasks, they must use `--all` and visually or programmatically filter. Consider adding `--status` for parity with potential future list filtering across other entity types.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has the right overall structure and follows established patterns for entity creation, but has several consistency issues with existing CLI conventions. The most significant: (1) `task:drop` using stdin instead of flags contradicts the `quest:abandon` precedent, (2) missing `tasks/overview.json` initialization will cause runtime failures on existing projects, (3) missing `schema.ts` registration violates INV-006, and (4) `task:list` default filtering diverges from other list commands without user signaling. To reach 9+: fix the stdin-vs-flag inconsistencies, handle the overview initialization gap, register schemas, add filter signaling to list output, and align return shapes and human output with established patterns.

## Summary
- Critical: 0
- Important: 6
- Minor: 4
