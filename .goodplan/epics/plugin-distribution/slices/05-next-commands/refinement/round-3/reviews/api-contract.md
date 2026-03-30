# API Contract Review — Round 3

## Issues

**[IMPORTANT] `resolveEntityName` already exists in `src/core/rpc/types.ts` — plan proposes duplicating it in `next-commands.ts`**

Phase 1 task 4 says: "Export a `resolveEntityName(target: Target): string` helper" in the new `next-commands.ts` file. This function already exists in `src/core/rpc/types.ts` (lines 206-223) and is already imported by `begin.ts`, `submit.ts`, and `complete.ts`. Creating a second copy introduces drift risk and violates DRY. The existing implementation already handles all Target variants including `project` and `rollup` — for `nextCommands`, the caller can simply import from `./types.js` and the `computeNextCommands` function can guard against `project`/`rollup` target types at the call boundary (which it already must do since `NextCommandsEntityType` excludes them).

Fix: Remove task 4 from Phase 1. Import `resolveEntityName` from `./types.js` instead. Update any references in subsequent tasks that mention `resolveEntityName` as being from `next-commands.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] `commandToEvent` plan says to "pull description from the existing `commandRegistry`" at module init — this creates a runtime coupling to a side-effect-heavy module**

Phase 1 task 2 says: "Pull `description` from the existing `commandRegistry` (in `src/commands/global/schema.ts`) at module init rather than duplicating descriptions." The `commandRegistry` in `schema.ts` is a `Map<string, CommandRegistryEntry>` that is populated by `registerCommand()` calls at module-level evaluation time. Importing it from `src/core/rpc/next-commands.ts` creates a dependency from the RPC layer (`src/core/rpc/`) upward into the Commands layer (`src/commands/`). This inverts the intended dependency direction: Commands depends on RPC, not the other way around. The architecture docs explicitly state the RPC layer is consumed *by* the Commands layer.

Additionally, `commandRegistry` registration happens as a side effect of importing `schema.ts`, which imports all Zod command schemas. If `next-commands.ts` triggers this import, every module that imports `next-commands.ts` (i.e., `begin.ts`, `submit.ts`, `complete.ts`) would pull in the entire command schema graph.

Fix: Keep `description` as a manually-maintained field in the `commandToEvent` array within `next-commands.ts`. Descriptions are short strings that rarely change. Add a fitness test check (forward check in Phase 1 task 5.2) that verifies `commandToEvent` descriptions match `commandRegistry` descriptions at test time — this catches drift without coupling the layers at runtime.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `NextCommands` type is well-specified but the contract for `entity` ordering is undefined**

The plan specifies `entity: CommandEntry[]` and `other: CommandEntry[]` but does not define ordering within each array. Consumers (skills, LLM orchestrators) may display these as-is. Consider whether `entity` commands should be ordered by workflow progression (e.g., the "natural next step" first) or alphabetically. Without a defined order, the output will reflect Map insertion order of the derivation, which is non-obvious and could change if transition tables are reordered.

Fix: Add a note in Phase 1 task 5 specifying that `entity` commands are ordered by their position in the transition table (reflecting workflow progression), and `other` commands are ordered alphabetically by command name. This makes the contract explicit for consumers.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Plan does not specify whether `nextCommands` appears in error responses**

The plan says `nextCommands` is added to `BeginResult`, `SubmitResult`, and `CompleteResult` — all success types. But the error contract (`{ error: { code, message, detail? } }`) is unchanged. This is correct behavior (failed mutations have no "new status" to compute commands for), but should be explicitly stated so that consumers know `nextCommands` is a success-only field.

Fix: Add a one-line note in Phase 2 overview or task 1: "Error responses retain the existing `{ error: { code, message, detail? } }` shape — `nextCommands` is success-only."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 E2E verification uses `$GP_BIN` but the variable assignment syntax shown is a shell script construct**

Phase 3 tasks show `GP_BIN="$(cd "$(dirname "$0")/.." && pwd)/gp"` — this is a shell script idiom (`$0` refers to the script path). In an interactive session or implementation plan context, the implementer should use the absolute path directly (e.g., `GP_BIN="/Users/iwhite/Repos/goodplan/gp"` or resolve from `pwd`). The round-2 merged feedback (I7) noted the `./gp` path issue and the plan updated to use `$GP_BIN`, but the assignment syntax is still fragile.

Fix: Simplify to `GP_BIN="$(pwd)/gp"` (assuming cwd is the repo root after `bun run build`) or just document "use the absolute path to the built binary at `<repo-root>/gp`."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Fitness test forward check (Phase 1, task 5.2) should also verify `commandToEvent` entries have valid `event` values**

The forward check verifies command files exist for each `commandToEvent` entry, and the reverse check verifies `commandToEvent` entries exist for each command file. But neither check validates that the `event` string in each `commandToEvent` entry matches an actual `StateEvent["type"]`. The `as const satisfies` pattern (M5 from round 2) catches this at compile time, but a runtime fitness test assertion adds defense-in-depth and makes failures more diagnosable.

Fix: In the transition reachability check (task 5.4), add an assertion that every `event` in `commandToEvent` appears in at least one transition table. This may already be implied by "transition reachability" but making it explicit prevents the check from only verifying the derived `commandMappings` output without validating input correctness.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan is well-structured and addresses all round-2 feedback thoroughly. The registry derivation design is sound and the 3-integration-point approach at the RPC layer is clean. The two IMPORTANT issues are: (1) duplicating an existing function instead of reusing it, and (2) an upward dependency from RPC to Commands that violates the layering architecture. Both are straightforward to fix. The MINOR issues are documentation/contract clarity gaps that don't affect correctness. Fixing both IMPORTANT issues and the ordering contract would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
