# TUI and CLI Review — Epic Lifecycle Plan

## Issues

**[IMPORTANT] Phase 5: submit commands placed under `src/commands/subagent/` but architecture says `submit-*` are global commands**

The commands-api.md lists `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-refine-slices` etc. as top-level commands (not namespaced under any entity). Phase 6 places them under `src/commands/subagent/`. While the directory name is fine for organization, the plan must ensure these are registered in `main.ts` as flat top-level subcommands (`submit-plan`, `submit-refinement`, etc.) using citty's colon-free naming — not nested under a `subagent:` namespace. The existing `main.ts` pattern registers flat keys in the `subCommands` object. The plan should explicitly state the registration key names (e.g., `"submit-plan": submitPlanCommand`) to avoid ambiguity.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 5: `epic:abandon` routes through `begin('abandon', ...)` but passes `--reason` as a flag — no plan for how `reason` reaches the StateEvent**

The `epic:abandon` command requires `--reason` as a flag. The plan says it calls `begin('abandon', {type:'epic', name})`. But the `begin()` signature is `begin(phase, target, options?)` — there is no place for `reason` in the target or options. The `ABANDON_EPIC` event needs a `reason` field per transition-tables.md. The plan needs to specify how flag-only data (like `reason`) flows through the RPC `begin()` function to the StateEvent. Either `begin()` needs an additional `payload` parameter, or `WorkflowOptions` needs to carry arbitrary event fields, or `Target` needs to be extended. This same gap applies to `epic:add-verification` and `epic:update-verification` (which carry stdin payloads that need to reach the StateEvent).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 5: `epic:create` says "TTY without stdin -> validation error" but existing `readStdin()` returns `{}` for TTY**

The plan for `epic:create` states: "TTY without stdin -> validation error." But the existing `readStdin()` in `src/util/stdin.ts` returns `{}` when `isTTY` is true — it does not error. The plan needs to clarify who enforces this: the command itself must check whether the parsed result has the required `name` and `goal` fields (which it will, via Zod validation of the merged input). Since `readStdin()` returns `{}` on TTY and `name`/`goal` are required fields, Zod validation will naturally reject this. The plan should simply state that Zod schema validation handles this case rather than implying a separate TTY check is needed.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 5: Missing `--override` flag on `epic:refine-architecture` and `epic:refine-slices` commands**

The commands-api.md documents `--override` as a common workflow flag for refinement commands. Phase 5 lists `epic:refine-architecture` and `epic:refine-slices` but doesn't mention `--override`. These commands call `begin('refine-architecture', ...)` which transitions to the refining state — the override flag is needed on the corresponding `submit-refine-architecture` / `submit-refine-slices` commands in Phase 6. Phase 6 mentions `--override` only for `submit-refinement`. The plan should explicitly add `--override` to `submit-refine-architecture` and `submit-refine-slices` command definitions, consistent with the architecture's cross-cutting `--override` pattern.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 5: `epic:list` calls `assembleState()` directly, but Phase 2 introduces `loadState()` as the preferred read path**

Phase 2 introduces `loadState()` with caching as the standard way to read state. Phase 5 says `epic:list` calls `assembleState()` directly. For consistency with the new data layer (and to benefit from caching), read-only commands should use `loadState()` instead. The existing `status` command uses `assembleState()` too — the plan should note that both `status` and the new read-only commands should be updated to use `loadState()` (or explicitly justify why `assembleState()` is preferred).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5: No help text quality specification for new commands**

The commands-api.md contract specifies that every command must include descriptions for the command itself and each flag, and that help text should include expected stdin payload shape, state preconditions, and resulting state transition. Phase 5 lists command creation but doesn't mention help text content. Adding a task or note about help text quality (matching the `initCommand` pattern which has `description` on both the command and each arg) would ensure consistency.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: End-to-end verification uses `goodplan` binary name but build output location is unspecified**

Phase 6 verification step 12 references `./goodplan` and `/abs/path/to/goodplan` but the actual binary output path after `bun run build` is not specified in the plan. The existing codebase doesn't show a build script. The plan should reference the actual build output path or note that the binary path depends on the `build` script in `package.json`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 6: `submit-refine-slices` listed under `src/commands/subagent/` but architecture also has `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`**

The commands-api.md lists 8 submit commands total. Phase 6 only creates 4: `submit-plan`, `submit-refinement`, `submit-implementation`, `submit-refine-slices`. The remaining 4 (`submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`) are absent from the plan. The overview says "minimal submit-* commands" so this may be intentional scoping, but the plan should explicitly list which submit commands are deferred and why, to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5: No `NO_COLOR` / `FORCE_COLOR` environment variable handling mentioned**

The commands-api.md specifies picocolors for colored output. picocolors respects `NO_COLOR` and `FORCE_COLOR` automatically, so this is likely handled implicitly. However, since Phase 5 introduces many new human-readable output paths, the plan could note that picocolors handles this to confirm the convention is understood.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phase boundaries, good verification steps, and correct layering (types -> data -> state -> RPC -> CLI). The main gaps are around the data flow between CLI flags/stdin and the RPC `begin()` function (how `reason`, verification payloads, etc. reach the StateEvent), the missing `--override` flag on epic-level refinement submit commands, and the inconsistency between `assembleState()` and the new `loadState()` for read-only commands. Addressing the IMPORTANT issues (primarily the `begin()` payload gap and flag routing) would bring the score to 9+.

## Summary
- Critical: 0
- Important: 5
- Minor: 4
