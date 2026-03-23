# Merged Integration Review: Project Init (All 5 Phases)

**Reviewers:** Generalist (9/10), Software Architecture (7/10)
**Merged Findings:** Critical: 1, Important: 5, Minor: 4

---

## Critical

### C1. State machine imports from the data layer, violating documented layer boundary

The architecture documents prohibit state machine imports from the data layer (`_overview.md`, `state-machine-api.md`, `conventions.md`). However, `src/core/state/transitions/init.ts` imports types and runtime functions from `src/core/data/tree.ts`, and `src/core/state/reduce.ts` imports types from the same file. While `tree.ts` is pure (no I/O), it physically lives inside `src/core/data/`, violating the boundary. This will compound as more transitions are added.

**Fix:** Move the pure type definitions (`ProjectState`, `DirectoryEntry`, `StateEntry`, etc.) and pure helpers (`resolve`, `getJson`, `hasChild`, `setEntry`) out of `src/core/data/` into either `src/schemas/state-tree.ts` or `src/core/tree.ts`. Keep I/O-dependent parts (`assemble.ts`, `commit.ts`, `project.ts`, `schema-registry.ts`) in `src/core/data/`.

**Files:** `src/core/state/transitions/init.ts:6-7`, `src/core/state/reduce.ts`
**Source:** Architecture reviewer
**Resolution:** DIRECTLY_ACTIONABLE

---

## Important

### I1. `StateErrorCode` duplicated between `state-events.ts` and `errors.ts`

`src/schemas/state-events.ts` defines `StateErrorCode = "STATE_ALREADY_INITIALIZED" | "STATE_INVALID_TRANSITION"`. `src/util/errors.ts` defines an identical type independently. These are not shared and will drift as new error codes are added.

**Fix:** One module should import from or re-export the other.

**Files:** `src/schemas/state-events.ts:5`, `src/util/errors.ts:12`
**Source:** Generalist reviewer
**Resolution:** DIRECTLY_ACTIONABLE

### I2. `commitState` validates but writes original content, not Zod-parsed output

`commitState` calls `schema.safeParse(newContent)` for validation but writes `newContent` (original object), not `result.data` (parsed output). In Zod 4, `safeParse` may strip unknown keys or coerce values. This means extra properties pass validation and persist to disk, but a subsequent `assembleState` read + parse strips them, causing in-memory/on-disk divergence.

Not blocking today (no extra fields in production init flow), but will cause subtle bugs when schemas evolve.

**Fix:** Write `result.data` instead of `newContent`, or document the deliberate choice.

**Files:** `src/core/data/commit.ts:104-115`, `tests/unit/data/commit.test.ts:66-69`
**Source:** Generalist reviewer
**Resolution:** DIRECTLY_ACTIONABLE

### I3. Duplicate initialization guard: command and state machine use different detection mechanisms

The `init` command checks `fs.existsSync(projectDirPath)` (directory existence) before calling `rpcInit`. The state machine checks `hasChild(state, "", "project.json")` (project.json in tree). These can diverge: `mkdir .project` makes the command say "already initialized" while the state machine would proceed. Per INV-001, every state mutation goes through the state machine, so the command should not independently decide initialization status.

*Note:* The Generalist reviewer rated this Minor, observing it is a documented tracer bullet learning and a fast-fail optimization. The Architecture reviewer rated it Important because it violates INV-001 (state machine as single authority). Elevated to Important given the architectural principle.

**Fix:** Remove the `fs.existsSync` check from `init.ts` and let the state machine be the single authority. If the error message needs the filesystem path, the RPC layer can enrich it.

**File:** `src/commands/global/init.ts:34-39`
**Source:** Both reviewers (Generalist M3, Architecture Important)
**Resolution:** DIRECTLY_ACTIONABLE

### I4. `slice.json` deferred field schema is `z.array(z.string())` but architecture defines `DeferredItem` as an object

`state-machine-api.md` defines `DeferredItem` as `{ description: string; targetSlice: string }`, but `src/schemas/entities/slice.ts:23` uses `deferred: z.array(z.string())`. This mismatch means a breaking schema change when `COMPLETE_SLICE` is implemented. Since no data is persisted yet, now is the right time to fix.

**Fix:** Define a `deferredItemSchema` with `description` and `targetSlice` fields, update the slice schema accordingly.

**File:** `src/schemas/entities/slice.ts:23`
**Source:** Architecture reviewer
**Resolution:** DIRECTLY_ACTIONABLE

### I5. `--query` requires `--json` but architecture says `--query` implies `--json`

The `status` command throws if `--query` is used without `--json`. The architecture (`commands-api.md`) says `--query` "implies `--json` for the intermediate representation."

**Fix:** When `--query` is present, automatically enable JSON mode rather than requiring it explicitly.

**File:** `src/commands/global/status.ts:137-139`
**Source:** Architecture reviewer
**Resolution:** DIRECTLY_ACTIONABLE

---

## Minor

### M1. Test fixture `overview.json` has fields not in the schema

The commit test round-trip fixture includes `created` and `updated` on overview.json objects, but `overviewSchema` only defines `items`. The fixture should use `{ items: [] }` to match what `INIT_PROJECT` actually produces. (Related to I2 -- would be caught if `result.data` were written.)

**File:** `tests/unit/data/commit.test.ts:66-69`
**Source:** Generalist reviewer

### M2. `assembleState` returns fresh object, not `ZERO_STATE` constant, for existing empty `.project/`

When `.project/` exists but is empty, `assembleState` returns `{ type: "directory", contents: {} }` rather than the `ZERO_STATE` constant. Functionally identical, but `ZERO_STATE` uses `as const` for type-level immutability, and reference comparison would fail.

**File:** `src/core/data/assemble.ts:41`
**Source:** Generalist reviewer

### M3. `assembleState` `projectDir` parameter should be required

`projectDir` is optional (`string | undefined`), but when undefined it silently returns `ZERO_STATE`, conflating "no dir specified" with "no project found." All callers always have a value. Making the parameter required is cleaner and prevents misuse.

**File:** `src/core/data/assemble.ts:30`
**Source:** Architecture reviewer
**Resolution:** DIRECTLY_ACTIONABLE

### M4. `StateEvent` exhaustiveness check missing in `reduce`

Only `INIT_PROJECT` is defined (correct for this slice). But `reduce`'s default case uses `(event as { type: string }).type`, bypassing TypeScript exhaustive matching. When more events are added, the default branch should use `never` to catch missing handlers at compile time.

**File:** `src/schemas/state-events.ts:2`, `src/core/state/reduce.ts`
**Source:** Architecture reviewer
**Resolution:** DIRECTLY_ACTIONABLE

---

## Needs User Input

### U1. `ts` field on `INIT_PROJECT` event diverges from documented API

The `state-machine-api.md` `StateEvent` union shows `INIT_PROJECT` as `{ type: 'INIT_PROJECT'; name: string }` with no `ts` field. The implementation adds `ts: string` and the RPC layer injects it. This is good design (keeps the reducer pure -- no `new Date()` inside), but diverges from the documented API. Should the architecture doc be updated to include `ts` on events that need timestamps?

**File:** `src/schemas/state-events.ts:2`, `src/core/rpc/init.ts:35`
**Source:** Architecture reviewer
