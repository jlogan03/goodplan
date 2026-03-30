# API Contract Review: Next Commands

## Issues

**[CRITICAL]** Registry is manually defined, not derived from existing data structures

The plan's Phase 1 task says to "Build the `commandMetadata` registry as `Record<string, Record<string, CommandMetadataEntry[]>>`" and enumerates all entity types and statuses by hand. The confirmed goal's KEY CONSTRAINT states: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition."

The codebase already has:
- `handlerRecord` in `src/core/state/reduce.ts` — exhaustive `StateEvent.type -> handler` mapping
- The `buildBeginEvent` switch in `src/core/rpc/begin.ts` — maps `(BeginPhase, Target) -> StateEvent`
- The `buildSubmitEvent` switch in `src/core/rpc/submit.ts` — maps `(SubmitPhase, Target) -> StateEvent`
- Transition tables in `src/core/state/transitions/` that define valid `(from, event) -> to`

The plan should derive the registry programmatically from these existing structures (e.g., by inverting the command-to-event mapping and combining with the transition table's from/to status pairs) rather than manually listing every `(entityType, status) -> commands[]` entry. A manual registry with ~38 statuses across 5 entity types will inevitably drift from the actual state machine.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** nextCommands integration at wrong architectural layer (37 command files vs. RPC result types)

Phase 2 proposes adding `computeNextCommands()` calls inside each of the 37 mutation command files' `args.json || args.query` branches. This contradicts the architecture: the Commands layer is a "thin CLI layer" with "no business logic" (Commands API). The RPC layer already assembles results — `begin()` returns `BeginResult`, `submit()` returns `SubmitResult`, `complete()` returns `CompleteResult`. These are the correct places to attach `nextCommands`.

Adding `nextCommands` to the RPC result types means:
1. One integration point per RPC function (3 functions) instead of 37 command files
2. All consumers of the RPC layer automatically get `nextCommands` (not just `--json` path)
3. The output function stays unchanged — it already serializes the full result
4. The human-readable path can choose to display or ignore `nextCommands` as a formatting decision

The plan's approach also introduces a contract inconsistency: `output({ ...result, nextCommands }, args)` means the `--json` shape includes `nextCommands` but the TypeScript result type (`BeginResult`, `SubmitResult`, `CompleteResult`) does not. Callers inspecting result types would not see `nextCommands`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** NextCommands type not added to existing result type interfaces

The plan defines `NextCommands { entity: CommandEntry[]; other: CommandEntry[] }` as a standalone type but never adds an optional `nextCommands?: NextCommands` field to `BeginResult`, `SubmitResult`, or `CompleteResult` in `src/core/rpc/types.ts`. This means:
1. TypeScript consumers cannot discover the field via type inspection
2. The `output()` call uses spread (`{ ...result, nextCommands }`) which is untyped
3. There is no compile-time guarantee the field is present

The fix follows naturally from the previous issue: add `nextCommands?: NextCommands` to the three result interfaces in `types.ts`, and populate it in the RPC layer.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Fitness test checks command templates, not derivation correctness

The bidirectional fitness test (Phase 1, task 3) verifies that every command file has a matching registry template and vice versa. This is a useful coverage check but does not verify the KEY CONSTRAINT — that the registry derives from state machine data structures. If someone manually edits the registry to add/remove entries, the fitness test would still pass as long as the commands and templates match.

The fitness test should also verify derivation integrity: that every `commandMetadata` entry for `(entityType, status)` corresponds to a valid transition in the state machine (i.e., there exists a transition FROM that status via the mapped event). This would catch a stale registry entry that references a status the state machine no longer supports.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `computeNextCommands` signature uses `string` for entityType and status — loses type safety

The signature `computeNextCommands(entityType: string, entityName: string, newStatus: string, parentEpic?: string)` accepts bare strings where the codebase has concrete types. `Target.type` is a discriminated union (`"epic" | "slice" | "quest" | "task" | "decision"`), and each entity has typed status unions (e.g., `EpicStatus`, `SliceStatus`). Using `string` means:
1. Callers can pass invalid entity types or statuses with no compile-time error
2. The function cannot narrow behavior based on entity type without runtime checks

The entityType parameter should use `Target["type"]` (or a subset excluding `"project"` and `"rollup"`), and the function should accept the result object directly rather than requiring callers to destructure it.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 verification uses `./gp` (local build) but Phase 3 E2E also uses `./gp` — no distinction from unit/integration tests

Phase 2's "After implementation" verification runs `./gp epic:create --json` via shell and parses output with Python. Phase 3 does the same but longer. These are essentially the same verification method at different scales. Meanwhile, Phase 2 could be verified by running the existing test suite (`bun run test`) since integration tests already exercise `--json` paths, plus a targeted unit test for `computeNextCommands`.

The E2E verification in Phase 3 is valuable but should be the only shell-based verification. Phase 2 verification should rely on TypeScript tests (unit + integration), which are faster, more precise, and catch type errors.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** CommandMetadataEntry's `template` uses `{name}` and `{epic}` placeholders — fragile string interpolation

The plan uses string templates like `gp epic:explore --epic {name}` with manual interpolation. This is a secondary format for representing commands alongside the actual citty command definitions. Consider whether the registry should store structured data (command name, required args as key-value pairs) rather than pre-formatted template strings. Structured entries would be:
1. Easier to validate against the actual command schema
2. Less prone to interpolation bugs (missing placeholder, wrong placeholder name)
3. More useful for consumers that need to programmatically construct commands

This is minor because the current approach works and the confirmed goal does not require structured entries.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 expected behavior uses `node -e "const m = require(...)"` — Bun project should use Bun

The verification `node -e "const m = require('./src/core/rpc/next-commands.ts')"` uses Node.js `require()` on a `.ts` file, which won't work without a transpiler. This is a Bun project — the check should use `bun -e "import { computeNextCommands } from './src/core/rpc/next-commands.ts'; ..."` or simply rely on the test suite.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has two critical architectural issues: (1) the registry is manually defined despite the key constraint requiring derivation from existing state machine structures, and (2) the integration point is in 37 command files instead of the 3 RPC functions. These are not just style preferences — they directly contradict the confirmed goal's KEY CONSTRAINT and the project's architectural boundaries (Commands = thin layer, RPC = orchestration). Fixing these would restructure Phase 1 and eliminate most of Phase 2's complexity, likely bringing the score to 8+. Adding proper type safety and fixing the fitness test derivation check would bring it to 9+.

## Summary
- Critical: 2
- Important: 4
- Minor: 2
