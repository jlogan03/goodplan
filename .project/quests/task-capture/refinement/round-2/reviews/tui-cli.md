# TUI and CLI Review: Task Capture Plan (Round 2)

## Issues

**[IMPORTANT]** `task:convert` mixes flags and stdin in a way no other command does
The plan specifies `task:convert` uses `--task <name> --to quest|epic` flags for scalars, then reads optional stdin for `name`/`goal` overrides via `taskConvertInputSchema`. No existing command in the codebase mixes flag-based and stdin-based input. Commands are either fully flag-based (e.g., `quest:abandon --quest <name> --reason <text>`) or fully stdin-based (e.g., `quest:create` reads `{name, goal}` from stdin). This hybrid approach creates ambiguity for skill authors: do they pipe JSON or pass flags? What happens if someone passes `--to` as a flag AND `to` in the stdin JSON?

Recommendation: Either (a) make it fully flag-based (`--task <name> --to quest|epic --name <override> --goal <override>`) following the `quest:abandon` pattern since all fields are simple scalars, or (b) make it fully stdin-based with `--task <name>` as the only flag (the target identifier). Option (a) is cleanest since there are no complex nested fields. The `name` and `goal` overrides could be optional flags that default to auto-derived values.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `"drop"` and `"convert"` are overly generic `BeginPhase` names
The plan adds `"drop"` and `"convert"` to `BeginPhase`. Existing phase names are either entity-agnostic verbs that dispatch by target type (e.g., `"create"`, `"abandon"`, `"plan"`) or entity-specific names (e.g., `"create-decision"`). If `"drop"` and `"convert"` are task-only operations, they should follow the `"create-decision"` precedent and be named `"drop-task"` and `"convert-task"`. If they are intended to be generic (any entity could be dropped/converted in the future), the plan should state this intent. Currently the plan says `"drop"` and `"convert"` are only used with `{ type: "task" }` targets, making the generic names misleading.

This matters because the exhaustive `never` defaults in `buildBeginEvent()`, `mapToBeginPhase()`, and `resolveForBeginPhase()` all need cases for these phases. Generic names suggest generic applicability and will confuse future contributors who try to reuse `"drop"` for another entity type.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:list` human output specifies "table with name, title, created date, status" but no existing list command uses a table format
The existing `quest:list`, `slice:list`, and `epic:list` all use a simple indented line format: `  bold(name)  status  (extras)`. The plan describes "table with name, title, created date, status" for `task:list` human output. If "table" means a formatted table with column headers and alignment, this diverges from the established list pattern. If it means the same indented line format with more fields, the plan should say so explicitly. Recommend following the existing pattern: `  bold(name)  title  status  (created date)` as an indented line, not a formal table.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 verification says "Full CLI cycle works" but doesn't specify JSON output verification
The Phase 2 verification includes "Full CLI cycle works: create a task, list it, show it, drop it. Create another, convert to quest, verify quest exists via `quest:show`." This describes a manual flow but doesn't specify verifying JSON output shape. Since the primary consumers are LLM skills using `--json`, the verification should also confirm: (a) `task:create --json` returns a valid `BeginResult`, (b) `task:list --json` returns `{ items: [...], filter: "open" }`, (c) `task:show --json` includes context fields. Running the commands with `--json` and checking output shapes is the most direct verification method for CLI commands.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `task:show` human output doesn't mention displaying `description` field
The plan says `task:show` human output is "formatted task with context" but doesn't enumerate which fields are shown. The task schema includes `description` (optional, free-text), which is likely the most important field for a user who runs `task:show`. The existing `quest:show` explicitly lists what it displays: name, status, goal, created, updated, refinement. `task:show` should similarly enumerate: name, title, status, description, created, context fields (git branch, active entities, capturedDuring).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues were addressed well. The plan now has flag-based `task:drop`, filter signaling in `task:list`, schema registration, overview creation in init, convert name/goal overrides, and standard `BeginResult` returns. The remaining issues are: (1) the hybrid flags+stdin pattern on `task:convert` which is unprecedented in the codebase, and (2) the overly generic `"drop"`/`"convert"` `BeginPhase` names that should follow the `"create-decision"` entity-specific precedent. To reach 9+: resolve the convert input pattern (fully flags or fully stdin) and namespace the phase names.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
