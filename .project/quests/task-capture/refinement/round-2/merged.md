# Merged Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: CONVERT_TASK quest/epic creation shape missing required schema fields
**Sources:** holistic, software-architecture, typescript
CONVERT_TASK step 5 creates quest with `{ name, goal, status: "created", created: ts }` but `questSchema` requires `refinement: refinementSchema.nullable()` and `updated: timestampSchema`. The plan must specify the full shape: `{ name, goal, status: "created", refinement: null, created: ts, updated: ts }`. Similarly verify epic creation shape includes all required `epicSchema` fields.
Resolution: DIRECTLY_ACTIONABLE

### IMP-2: CONVERT_TASK handler does not create epic subdirectories
**Sources:** software-architecture
`handleCreateEpic` creates 4 subdirectories (architecture/, research/, brainstorm/, prototypes/). The plan's CONVERT_TASK handler for `to === "epic"` does not mention creating these. Subsequent workflow steps (explore, architecture) will fail. The plan should specify: for `to === "epic"`, create these 4 subdirectories via `setEntry()` mirroring `handleCreateEpic`. For `to === "quest"`, no subdirs needed.
Resolution: DIRECTLY_ACTIONABLE

### IMP-3: `addEpicToOverview` helper does not exist
**Sources:** software-architecture, typescript
CONVERT_TASK step 6 references `addEpicToOverview`, but this helper does not exist. Epic overview insertion is done inline in `epic-create.ts`. Either: (a) create `addEpicToOverview` in `helpers.ts` (cleaner, parallel to existing `addQuestToOverview`), or (b) inline the epic overview update. The plan should specify which approach and, if (a), add the helper creation as an explicit task item.
Resolution: DIRECTLY_ACTIONABLE

### IMP-4: `"drop"` and `"convert"` BeginPhase names — naming convention decision needed
**Sources:** holistic, software-architecture, typescript, tui-cli, api-contract (all 5 non-agent reviewers)
All reviewers flagged this. Two options:
- **(a) Entity-prefixed:** `"drop-task"` and `"convert-task"` — consistent with `"create-decision"`, `"create-task"` already in the plan. Explicit, no collision risk.
- **(b) Generic with dispatch:** Keep `"drop"` and `"convert"` as generic phases that dispatch on `target.type` (like `"abandon"` does). Document that only `target.type === "task"` is supported today, with exhaustive `default` case that throws.

Both approaches are valid. The software-architecture reviewer argues (b) is the natural pattern since `buildAbandonEvent` already does this. The api-contract and tui-cli reviewers prefer (a) since drop/convert have task-specific semantics unlike abandon which is shared. This needs a user decision.
Resolution: USER_INPUT

### IMP-5: `task:convert` mixes flags and stdin in unprecedented hybrid pattern
**Sources:** holistic, tui-cli, api-contract, typescript
No existing command uses both flags and stdin. Two clean options:
- **(a) All flags:** `--task <name> --to quest|epic --name <override> --goal <override>` — cleanest since all fields are simple scalars. Eliminates `taskConvertInputSchema` for stdin. Follows `quest:abandon` pattern.
- **(b) All stdin:** `echo '{"to":"quest","name":"...","goal":"..."}' | goodplan task:convert --task <name> --json` — follows `quest:create` pattern.

Option (a) is recommended by 3 of 4 reviewers since all fields are simple scalars.
Resolution: DIRECTLY_ACTIONABLE

### IMP-6: `resolveEntityDir()` in paths.ts missing from exhaustive switch inventory
**Sources:** typescript
The plan lists 6 exhaustive switches to update but misses `resolveEntityDir()` in `paths.ts`. Adding `{ type: "task" }` to `Target` will cause a compile error here. The plan needs an explicit task: `case "task": return nodePath.join(projectDir, "tasks", target.name);` in `resolveEntityDir()`.
Resolution: DIRECTLY_ACTIONABLE

### IMP-7: `mapToBeginPhase()` and `resolveForBeginPhase()` need explicit task items
**Sources:** holistic, typescript
The plan mentions updating these as a parenthetical note but lacks explicit task items. Both have exhaustive `never` defaults. The plan should specify: new phases return `{}` for paths (lifecycle phases with no artifact paths), matching the existing pattern for `"create"`, `"abandon"`, etc.
Resolution: DIRECTLY_ACTIONABLE

### IMP-8: /capture skill description missing disambiguation from adjacent skills
**Sources:** agent-skill
The skill description says what it does but not when NOT to use it. Adjacent skills (/explore for research, /create-epic for large-scope work) could overlap. Add brief disambiguation: "for quick lightweight notes, not for research (/explore) or large-scope work (/create-epic)."
Resolution: DIRECTLY_ACTIONABLE

### IMP-9: `overviewItemSchema` `title` addition needs `exactOptionalPropertyTypes` awareness
**Sources:** holistic, software-architecture
Adding `title: z.string().optional()` to the shared `overviewItemSchema` is backward-compatible, but:
- Existing overview creation code should continue to omit `title` (valid with `.optional()`)
- CONVERT_TASK and `task-create.ts` handlers should include `title` in overview entries
- With `exactOptionalPropertyTypes`, the conditional spread pattern (`...(title ? { title } : {})`) may be needed
- Verify `commitState` round-trips existing overview files without adding `title: undefined`
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

### MIN-1: Phase 2 Expected Behavior output doesn't match actual `BeginResult` shape
**Sources:** holistic
Expected output says `{ entity, newStatus: "open" }` but `BeginResult` includes `phase`, `previousStatus`, and optional `paths`. Expected behavior should include all fields for falsifiability.
Resolution: DIRECTLY_ACTIONABLE

### MIN-2: Phase 3 skill verification items still not fully falsifiable
**Sources:** holistic
"Skill auto-captures context" and "Skill uses judgment" are not testable assertions. Replace with concrete checks or remove (since they describe prompt behavior, not testable behavior).
Resolution: DIRECTLY_ACTIONABLE

### MIN-3: `task:convert` JSON output doesn't surface created entity name
**Sources:** holistic, software-architecture
`BeginResult` carries the task entity info but not the created quest/epic name. Human output handles this ("Created quest: <name>") but JSON doesn't. The command layer should derive the name from input payload (it already has it in scope). Clarify in the plan that the command uses the input name directly for human output.
Resolution: DIRECTLY_ACTIONABLE

### MIN-4: CONVERT_TASK duplicate name guard needs namespace-specific check
**Sources:** software-architecture
Step 2 says "guard no duplicate quest/epic name" generically. Should specify: if `to === "quest"`, check `hasChild(state, "quests", name)`; if `to === "epic"`, check `hasChild(state, "epics", name)`. Don't check both.
Resolution: DIRECTLY_ACTIONABLE

### MIN-5: Phase 2 verification says "integration tests" but tasks describe unit tests
**Sources:** software-architecture, api-contract
Internal contradiction. Verification should say "unit tests" to match the Tasks section.
Resolution: DIRECTLY_ACTIONABLE

### MIN-6: `task:list` human output says "table" but no existing list command uses table format
**Sources:** tui-cli
Existing list commands use indented line format. Clarify that `task:list` uses the same pattern: `  bold(name)  title  status  (created date)`.
Resolution: DIRECTLY_ACTIONABLE

### MIN-7: `task:list` JSON adds `filter` field diverging from `quest:list`
**Sources:** api-contract
`quest:list` returns `{ items }`, `task:list` adds `{ items, filter }`. Document this as intentional divergence.
Resolution: DIRECTLY_ACTIONABLE

### MIN-8: `taskCreateInputSchema.context` should document it is typically auto-populated
**Sources:** api-contract
Add a doc comment noting `context` is typically auto-populated by the /capture skill and may be omitted for direct CLI usage.
Resolution: DIRECTLY_ACTIONABLE

### MIN-9: /capture skill reference path should specify "relative to this skill's directory"
**Sources:** agent-skill
Step 1 says "Load `../_shared/references/cli-interaction.md`" but doesn't anchor the path. Add "relative to this skill's directory" for consistency.
Resolution: DIRECTLY_ACTIONABLE

### MIN-10: Phase 3 verification doesn't test the skill's two-path judgment flow
**Sources:** agent-skill
Neither Expected Behavior nor Verification tests the core differentiator: inline capture path vs. bare /capture path. Add a manual review step confirming both paths are specified.
Resolution: DIRECTLY_ACTIONABLE

### MIN-11: `taskConvertInputSchema` includes `to` field redundant with `--to` flag
**Sources:** typescript
If `--to` is a required flag, remove `to` from `taskConvertInputSchema`. This is subsumed by IMP-5 (resolve the flag vs. stdin question).
Resolution: DIRECTLY_ACTIONABLE (subsumed by IMP-5)

### MIN-12: `task:show` human output doesn't enumerate displayed fields
**Sources:** tui-cli
Plan says "formatted task with context" but doesn't list fields. Should enumerate: name, title, status, description, created, context fields (git branch, active entities, capturedDuring).
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE
IMP-1, IMP-2, IMP-3, IMP-5, IMP-6, IMP-7, IMP-8, IMP-9, MIN-1 through MIN-12

## RESEARCH_NEEDED
None.

## Contradictions Resolved

1. **BeginPhase naming approach (entity-prefixed vs. generic dispatch):** software-architecture argues `"drop"`/`"convert"` should be generic with target-type dispatch (like `"abandon"`). typescript, tui-cli, and api-contract argue for `"drop-task"`/`"convert-task"` (like `"create-decision"`). Both patterns exist in the codebase. Escalated to USER_INPUT since this is an architectural convention choice with no clear precedent winner.

2. **`addEpicToOverview` — create helper vs. inline:** software-architecture recommends creating the helper (option b, cleaner). typescript presents both options neutrally. Resolved in favor of creating the helper (IMP-3) since it deepens the helpers module and matches the existing `addQuestToOverview` pattern.

3. **`task:convert` input pattern:** All reviewers agree the hybrid is wrong. holistic, tui-cli, and api-contract prefer all-flags. typescript leans toward removing `to` from stdin schema. Resolved: recommend all-flags (IMP-5) since all fields are simple scalars.

## Unresolved (USER_INPUT required)

(All resolved — see below)

### USER_INPUT Resolved

1. **IMP-4: BeginPhase naming**: Entity-prefixed — use `"drop-task"` and `"convert-task"`. Matches `"create-decision"` and `"create-task"` pattern. Drop/convert are task-specific semantics.
