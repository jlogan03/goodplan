# Software Architecture Review: Integration (All 5 Phases)

## Issues

**[CRITICAL]** State machine imports from the data layer, violating the documented layer boundary

The architecture documents state two clear rules:
1. `_overview.md`: State Machine "Dependencies: None (pure functions)"
2. `state-machine-api.md`: "The state machine imports only its own types and shared schema types from `src/schemas/`"
3. `conventions.md`: "The State Machine may not import from the Data Layer (pure, no I/O)"

However, `src/core/state/transitions/init.ts` imports both types and runtime functions from `src/core/data/tree.ts`:
```
import type { ProjectState } from "../../data/tree.js";
import { hasChild, setEntry } from "../../data/tree.js";
```

And `src/core/state/reduce.ts` imports:
```
import type { ProjectState } from "../data/tree.js";
```

While `tree.ts` is a pure module with no I/O (its header says "Pure data structures -- no I/O"), the architecture explicitly prohibits state machine imports from the data layer package. The file physically lives at `src/core/data/tree.ts`.

**Fix:** Move the pure type definitions (`ProjectState`, `DirectoryEntry`, `StateEntry`, etc.) and the pure navigation/mutation helpers (`resolve`, `getJson`, `hasChild`, `setEntry`, etc.) out of `src/core/data/` and into either:
- `src/schemas/state-tree.ts` (since schemas is the blessed shared layer), or
- `src/core/tree.ts` (a shared module at the `core/` level, imported by both `data/` and `state/`).

The I/O-dependent parts (`assemble.ts`, `commit.ts`, `project.ts`, `schema-registry.ts`) remain in `src/core/data/`. This physically enforces the boundary -- a lint rule or import restriction on `src/core/state/ -> src/core/data/` would then catch violations.

File: src/core/state/transitions/init.ts:6-7
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Duplicate initialization guard in both command and state machine

The `init` command (`src/commands/global/init.ts:34`) checks `fs.existsSync(projectDirPath)` before calling `rpcInit`. The state machine's `handleInitProject` (`src/core/state/transitions/init.ts:17`) also guards with `hasChild(state, "", "project.json")`. The RPC layer's `assembleState` call will return ZERO_STATE when the directory doesn't exist, so the state machine guard handles the case where `.project/` exists but was assembled into state.

The command-level check is reasonable as a fast-fail optimization, but it uses a different detection mechanism (directory existence) than the state machine (project.json existence in the tree). These could diverge: if `.project/` exists but is empty (e.g., `mkdir .project`), the command says "already initialized" but the state machine would say "go ahead." Per INV-001, every state mutation goes through the state machine, so the command should not independently decide initialization status.

**Fix:** Remove the `fs.existsSync` check from `init.ts` and let the state machine be the single authority. The RPC layer already handles the `assembleState` -> `reduce` -> error path correctly. If the error message needs to mention the filesystem path, the RPC layer can enrich the StateError before throwing.

File: src/commands/global/init.ts:34-38
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `slice.json` deferred field schema is `z.array(z.string())` but architecture defines `DeferredItem` as an object

The `state-machine-api.md` defines:
```typescript
interface DeferredItem {
  description: string;
  targetSlice: string;
}
```

But `src/schemas/entities/slice.ts:23` has:
```typescript
deferred: z.array(z.string()),
```

This means when a later slice implements `COMPLETE_SLICE` with deferred work routing, the schema will need to change, which would be a breaking change to any data already persisted. Since no data is persisted yet (this is the foundation slice), this is the right time to fix it.

**Fix:** Define a `deferredItemSchema` with `description` and `targetSlice` fields, and update the slice schema to `deferred: z.array(deferredItemSchema)`.

File: src/schemas/entities/slice.ts:23
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `--query` requires `--json` but the commands-api.md says `--query` implies `--json`

The `status` command (`src/commands/global/status.ts:137-139`) throws an error if `--query` is used without `--json`. But the architecture (`commands-api.md`) says: "`--query`: applies jqjs filter to the JSON output, then prints the result. Implies `--json` for the intermediate representation." The word "implies" means `--query` should automatically enable JSON mode, not require the user to also pass `--json`.

**Fix:** When `--query` is present, treat it as implying `--json` rather than requiring it explicitly. This is a better UX and matches the architecture doc.

File: src/commands/global/status.ts:137-139
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `assembleState` returns ZERO_STATE when `projectDir` is undefined, conflating "no dir specified" with "no project"

In `src/core/data/assemble.ts:31-33`, if `projectDir` is undefined, it returns ZERO_STATE. But the function signature says `projectDir?: string` -- an optional parameter. This means callers must distinguish between "I want to assemble an empty state" and "I forgot to pass the directory." The `data-layer-api.md` says: "If `.project/` doesn't exist or is empty, returns an empty tree" -- the undefined case is not mentioned.

In practice, only `rpcInit` calls `assembleState(projectDir)` where projectDir could be an empty `.project/` path (not undefined). But the `status` command could theoretically pass undefined if `resolveProjectDir` threw and was caught. The current usage is safe but the API is misleading.

**Fix:** Either make `projectDir` required (since callers always have it) or document the undefined behavior explicitly. Making it required is cleaner -- it forces callers to resolve the project dir first.

File: src/core/data/assemble.ts:30
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `src/core/data/json.ts` still exists per the codebase-context research but was listed as "Replace"

The research file says `src/core/data/json.ts` should be replaced by `assembleState`/`commitState`. The file does not appear in the changed files list and doesn't exist on disk (read returned "File does not exist"). This means it was correctly removed. However, `src/util/json.ts` does exist and contains the `deterministicStringify` functions that were kept. This is fine -- just noting that the migration is complete.

No action needed.

---

**[MINOR]** `StateEvent` type is minimal -- only `INIT_PROJECT` defined

The `src/schemas/state-events.ts` only defines `INIT_PROJECT`. The TODO comment acknowledges this. This is correct for this slice's scope, but worth noting: the `reduce` function's default case uses `(event as { type: string }).type` which means the TypeScript exhaustiveness check doesn't help. When more events are added, the `default` branch should be replaced with exhaustive matching via `never` to catch missing handlers at compile time.

File: src/schemas/state-events.ts:2
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `ts` field on `INIT_PROJECT` event is injected by RPC layer, not part of the `StateEvent` type definition in architecture

The `state-machine-api.md` `StateEvent` union shows `INIT_PROJECT` as `{ type: 'INIT_PROJECT'; name: string }` with no `ts` field. But the implementation adds `ts: string` to the type (`src/schemas/state-events.ts:2`) and the RPC layer injects it (`src/core/rpc/init.ts:35`). The init transition handler uses `event.ts` for timestamps.

This is a pragmatic deviation -- the state machine needs timestamps for the activity log entry and `project.json` dates, and injecting `ts` in the event keeps the reducer pure (no `new Date()` inside). This is actually good design. However, it diverges from the documented API. The architecture doc should be updated to include `ts` on events that need timestamps.

File: src/schemas/state-events.ts:2
Resolution: USER_INPUT

## Score: 7/10

The 4-layer architecture is implemented with clear separation of concerns and the dependency direction is mostly correct. The state machine is genuinely pure (no I/O), the data layer handles all filesystem operations, the RPC layer correctly orchestrates assemble-reduce-commit, and commands are thin. The critical issue is that the physical module boundaries don't match the documented architecture -- `tree.ts` (types + pure helpers) lives inside the data layer package but is imported by the state machine. This is a structural issue that will compound as more transitions and guards are added. Fixing the module location now prevents a growing coupling problem. The deferred schema mismatch should also be corrected before data is persisted.

To reach 9+: move `tree.ts` to a shared location (resolving the layer boundary violation), fix the deferred item schema, and address the `--query` implies `--json` behavior.

## Summary
- Critical: 1
- Important: 3
- Minor: 3
