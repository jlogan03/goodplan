# TUI and CLI Review: Next Commands Plan

## Issues

**[CRITICAL]** Registry is manually maintained, contradicting the key constraint

The plan's Phase 1 Task 1 describes building `commandMetadata` as a hand-crafted `Record<string, Record<string, CommandMetadataEntry[]>>` with manually enumerated statuses (epic: 14 statuses, slice: 9 statuses, etc.) and manually written entries per status. This directly contradicts the confirmed goal's KEY CONSTRAINT: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition."

The codebase already has the required building blocks:
- `handlerRecord` in `src/core/state/reduce.ts` maps every `StateEvent.type` to its handler (exhaustiveness-checked via `satisfies`)
- The command-to-event mapping in `commands-api.md` (and implicitly in the command files themselves) maps CLI commands to `StateEvent` types
- The transition tables define `(fromStatus, event) -> toStatus` for every entity

The registry should be computed at build time or module init by: (1) inverting the command-to-event mapping to get `event -> command`, (2) inverting the transition tables to get `(entityType, toStatus) -> event[]`, and (3) composing these to get `(entityType, status) -> command[]`. This is the entire point of the key constraint -- if the registry is manually maintained, it will drift from the actual state machine, which is the exact failure mode the constraint exists to prevent.

The plan must describe how to programmatically derive the registry from `handlerRecord`, the transition table data structures, and the command-to-event mapping. The current approach of manually listing every status and its commands is a non-starter given the confirmed goal.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Mutation file count is wrong (36, not 37)

The plan states "37 mutation command files need integration" (Phase 1 overview and Phase 2). Counting actual mutation command files in `src/commands/` -- excluding read-only (`list`, `show`), infrastructure (`init`, `migrate`, `schema`, `status`, `state`, `verify`), start-* commands, and utility files -- yields 36 files. With `learning/rollup.ts` excluded (as the plan correctly notes), the actual wiring target is 35 files. The plan should enumerate the exact file list or derive it programmatically via the fitness test to avoid wiring the wrong count.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `computeNextCommands` signature lacks `SubmitResult.advanced` handling

The plan's Phase 1 Task 3 tests "SubmitResult.advanced === false scenario" but `computeNextCommands()` has no `advanced` parameter. When a refinement round doesn't advance (same status returned), the user needs to see "retry the submit" as a next command. But the function signature is `(entityType, entityName, newStatus, parentEpic?)` -- it has no way to distinguish "just entered refining for the first time" from "stayed in refining after a failed round." The function needs an additional parameter (e.g., `previousStatus` or `advanced`) to handle this correctly, or the caller must conditionally add submit commands. The plan describes a test for this scenario but doesn't address it in the function design.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 integration is dangerously repetitive -- no shared helper

Phase 2 asks the implementer to copy-paste nearly identical code into 35+ command files:
```typescript
const nextCommands = computeNextCommands(entityType, entityName, result.newStatus, parentEpic);
output({ ...result, nextCommands }, args);
```

This violates the Commands API contract "No business logic" -- while `computeNextCommands` itself lives in the RPC layer, the orchestration of calling it and spreading it into the result is being duplicated 35+ times. The plan should instead push `nextCommands` computation into the RPC layer's `begin()`, `submit()`, and `complete()` functions, so they return results that already include `nextCommands`. This way:
- Command files remain thin (no new imports, no new logic)
- The RPC layer owns the entire `nextCommands` lifecycle
- Adding/changing `nextCommands` in the future touches one place, not 35

The `output()` call already takes the result object -- if the RPC layer includes `nextCommands` in the result, no command-file changes are needed at all (only the human-readable output path might need adjustment, but `nextCommands` is JSON-only).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 verification uses `./gp` against ephemeral state without build step

Phase 3 tasks reference `./gp init`, `./gp epic:create --json`, etc. but never mention building the binary first (`bun run build` or equivalent). The `./gp` binary must include the Phase 1 and 2 changes to produce `nextCommands` in output. The verification tasks should explicitly state the build prerequisite. Additionally, the Phase 2 Expected Behavior section also uses `./gp` without mentioning a build step.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `node -e "const m = require(...)"` will fail for ESM

Phase 1 Expected Behavior includes `node -e "const m = require('./src/core/rpc/next-commands.ts')"` as an export check. This project uses ESM (TypeScript with `verbatimModuleSyntax`). `require()` will fail. Use `bun -e "import(...)"` or simply rely on the unit tests (which already verify the export works).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Template placeholder convention inconsistency

The plan uses `{name}` and `{epic}` as interpolation markers in command templates but uses `<reason>` for non-interpolated user-supplied values. This dual convention (curly braces for auto-interpolated, angle brackets for user-supplied) is functional but undocumented. The types or JSDoc should explicitly define the convention so future maintainers understand which placeholders get auto-filled and which are prompts for the user.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** E2E cleanup may leave orphan state on failure

Phase 3 creates `/tmp/gp-e2e-test` and the last task is `rm -rf /tmp/gp-e2e-test`. If any prior task fails, cleanup won't run. Use a trap or ensure the verification step documents cleanup as manual if the validation is a human-driven process (not an automated test).

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The critical issue -- the registry being manually maintained despite the key constraint explicitly requiring derivation from existing data structures -- fundamentally undermines the plan's architectural integrity. The codebase has `handlerRecord`, transition handlers, and command-to-event mappings that should be the source of truth. Additionally, the Phase 2 approach of modifying 35+ command files when the RPC layer could own this entirely suggests a design that will be painful to maintain. To reach 9+: (1) redesign the registry as a computed derivation from existing state machine structures, (2) push `nextCommands` into the RPC result types so command files need zero changes, (3) fix the file count and `advanced` handling, (4) fix the ESM verification command.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
