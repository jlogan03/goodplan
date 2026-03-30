# TypeScript and JavaScript Review — Slice 05: Next Commands

## Issues

**[CRITICAL]** Plan's `commandMetadata` registry is a hand-maintained `Record<string, Record<string, CommandMetadataEntry[]>>` — violates the key constraint

The confirmed goal states: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition." The epic architecture echoes this: "inverts the existing command-to-event mapping from the Commands API."

However, the Phase 1 tasks describe manually building a `commandMetadata` registry covering all entity types and statuses by hand (e.g., "Cover all entity types: epic (14 statuses), slice (9 statuses), quest (9 statuses), task (3 statuses), decision (3 statuses)"). This is exactly the parallel manually-maintained definition the constraint forbids.

The codebase already has the data needed to derive this programmatically:
1. **Transition tables** — every transition file exports a `*Transitions` array with `{ from, event, to }` rows (e.g., `epicPhaseTransitions`, `epicLifecycleTransitions`, `sliceSubmitTransitions`, etc.). These define which events are valid from which statuses.
2. **Commands API mapping** — `commands-api.md` documents the command-to-event mapping (e.g., `epic:explore` -> `BEGIN_EXPLORE`). The RPC layer's `begin.ts` switch statement is the runtime embodiment of this mapping.

The plan should instead:
- Define a static `commandToEvent` mapping (an array of `{ command: string, event: StateEvent["type"], entityType: string, template: string, description: string, userFacing: boolean }` entries) that captures the CLI-to-event relationship.
- At module initialization, import all `*Transitions` arrays and build the `(entityType, status) -> commands[]` index by: for each transition row `{ from, event, to }`, find all commands that produce that event, then index by `(entityType, to)`.
- This derived approach means adding a new transition or command automatically updates `nextCommands` — no parallel maintenance.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `computeNextCommands` function signature uses `string` for `entityType` — should use the existing `Target["type"]` discriminant or a dedicated union

The plan defines `computeNextCommands(entityType: string, entityName: string, newStatus: string, parentEpic?: string)`. Using `string` for `entityType` loses type safety. The codebase already has `Target` with a discriminated `type` field (`"epic" | "slice" | "quest" | "task" | "decision" | "project" | "rollup"`). The function should use a constrained union type like `"epic" | "slice" | "quest" | "task" | "decision"` (the entity types that participate in nextCommands) or derive it from `Target["type"]` with an `Exclude`.

Similarly, `newStatus` should be typed using the existing status union types (`EpicStatus`, `SliceStatus`, etc.) via a discriminated overload or generic, rather than raw `string`. At minimum, the registry lookup keys should be typed to prevent typos.

With `noUncheckedIndexedAccess: true` (confirmed in tsconfig.json), the `Record<string, Record<string, CommandMetadataEntry[]>>` type means every access returns `T | undefined`. The plan mentions guarding for this — good — but a more specific key type would provide compile-time guarantees and enable exhaustive checking.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 proposes `output({ ...result, nextCommands }, args)` — spread merging loses type safety

The plan says to add `nextCommands` via object spread: `output({ ...result, nextCommands }, args)`. The `output()` function accepts `unknown`, so this works at runtime, but it means the shape of the JSON output is untyped. Per the epic architecture, `nextCommands` is deliberately NOT part of `BeginResult`/`SubmitResult`/`CompleteResult` — the Commands layer adds it separately.

This is fine architecturally, but the plan should define an explicit output type (e.g., `type MutationJsonOutput<T> = T & { nextCommands: NextCommands }`) so the spread is typed and any accidental property name collisions are caught at compile time. Given `exactOptionalPropertyTypes: true`, this also ensures `nextCommands` is always present (not accidentally `undefined`) in the JSON output path.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 1 Expected Behavior uses `node -e "const m = require(...)"` — this is a CJS `require()` call on an ESM project

The project uses `"type": "module"` in package.json and `"module": "ESNext"` in tsconfig.json with `verbatimModuleSyntax: true`. Source `.ts` files cannot be `require()`'d. The verification step `node -e "const m = require('./src/core/rpc/next-commands.ts'); ..."` will fail.

Use a Bun-compatible verification instead: `bun -e "import { computeNextCommands } from './src/core/rpc/next-commands.ts'; console.log(typeof computeNextCommands)"` or simply rely on the unit test passing as proof of export.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fitness test design checks `begin()`, `complete()`, `submit()` calls in command files — but the command-to-RPC mapping is not centralized in a parseable structure

The plan says the fitness test should: "For every user-facing command in `src/commands/` that calls `begin()`, `complete()`, or `submit()`, verify there exists a `commandMetadata` entry with a matching template."

This requires static analysis of source files to detect which commands call which RPC functions. The existing `mutation-through-state-machine.test.ts` fitness test does this via regex scanning (looking for `fs.writeFileSync`). The same approach would work here, but it's fragile — a renamed import or re-exported function could fool the regex.

A better approach: if the `commandToEvent` mapping is made explicit (as recommended in the first issue), the fitness test becomes trivial — compare the explicit mapping against command files on disk (forward) and against transition table entries (reverse). No source parsing needed.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** 37 mutation files to modify in Phase 2 — plan does not list them or provide a strategy for determining `entityType`/`entityName`/`parentEpic` per file

The plan says "For each of the 37 mutation command files" but doesn't enumerate them. The `output(result` grep shows ~39 matches across commands (including `init.ts` and `migrate.ts` which are excluded). The implementer needs to know exactly which files, and for each: what `entityType` to pass, how to extract `entityName`, and whether `parentEpic` applies.

Some non-obvious cases:
- `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts` handle both slice and quest — `entityType` must be derived from which flag (`--slice` vs `--quest`) is present.
- `task/convert.ts` produces a new entity (epic or quest) — the `entityType` should probably be `"task"` (the source entity), but the user might want nextCommands for the converted-to entity.
- `epic/add-verification.ts` and `epic/update-verification.ts` don't change status (the transition table shows `(same)` in the `to` column) — `computeNextCommands` with the unchanged status will return the same commands as before. The plan should clarify whether these are included in the 37 or excluded.

A table mapping each file to its `(entityType, entityName expression, parentEpic expression)` would prevent implementation errors across 37 files.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 unit test item 5 tests `SubmitResult.advanced === false` scenario but `computeNextCommands` has no `advanced` parameter

The plan says: "Test `SubmitResult.advanced === false` scenario — same status returned, verify nextCommands suggests the same submit command." But `computeNextCommands` takes `(entityType, entityName, newStatus, parentEpic)` — it has no knowledge of whether the status advanced or not. The function will return the same result regardless. If the intent is to verify that when `newStatus` equals the pre-mutation status the correct commands are returned, the test should just call `computeNextCommands` with a status that maps to a self-loop (e.g., `"refining"`) and verify the result includes the submit command.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `CommandMetadataEntry.template` type should use a branded or template literal type for safer interpolation

The templates contain `{name}` and `{epic}` placeholders. A template literal type like `` `gp ${string}` `` or at minimum a branded type would prevent accidentally storing non-template strings. This is a minor type safety improvement — the fitness test provides the real safety net.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification commands reference `./gp` but the plan doesn't mention building the binary first

Phase 3's Expected Behavior and Tasks use `./gp init`, `./gp epic:create --json`, etc. The binary must be built first with `bun run build`. The plan should include a build step or note this as a prerequisite. Phase 2's verification section similarly references no build step.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has the right high-level structure (registry, pure function, commands integration, fitness test) and correctly identifies exclusions (init, migrate, rollup, read-only commands). However, the critical issue — building the registry as a hand-maintained data structure rather than deriving it from existing transition tables and command mappings — directly contradicts the confirmed goal's key constraint. The architecture docs explicitly say the registry "inverts the existing command-to-event mapping," but the plan describes manual construction covering "14 statuses, 9 statuses, 9 statuses..." which is exactly the parallel definition the constraint forbids.

To reach 9+: (1) Redesign the registry to derive from transition table arrays + a command-to-event mapping, (2) type the function signature with proper union types instead of `string`, (3) add the per-file integration table for Phase 2, (4) fix the ESM verification step.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
