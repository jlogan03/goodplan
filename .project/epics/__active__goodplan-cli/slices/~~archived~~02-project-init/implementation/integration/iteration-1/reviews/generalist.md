# Integration Review: Project Init (All 5 Phases)

**Reviewer:** Generalist
**Score: 9/10**
**Findings:** Critical: 0, Important: 2, Minor: 3

## Summary

The implementation faithfully delivers the plan's core goal: a recursive tree state model with a working load-reduce-commit cycle. The five phases integrate cleanly, with no orphaned code, no contradictory patterns, and no regressions from earlier phases caused by later ones. All 256 tests pass, `tsc --noEmit` is clean, and the state machine layer is verifiably pure (no `fs` imports).

The architecture is sound: `tree.ts` (Phase 1) provides the foundation, schemas (Phase 2) provide validation, `assemble.ts`/`commit.ts` (Phase 3) wire I/O, `reduce.ts` (Phase 4) dispatches purely, and `rpc/init.ts` + command refactoring (Phase 5) tie it all together. The layering is correct — dependencies flow downward, the state machine has zero I/O imports, and the RPC layer is the only place that orchestrates the full cycle.

## Important Findings

### I1. `StateErrorCode` duplicated between `state-events.ts` and `errors.ts`

`src/schemas/state-events.ts` defines `StateErrorCode = "STATE_ALREADY_INITIALIZED" | "STATE_INVALID_TRANSITION"`. `src/util/errors.ts` defines an identical `StateErrorCode` type independently. These are not shared — they will drift apart as new state error codes are added in future slices. One should import from or re-export the other.

**Files:** `src/schemas/state-events.ts:5`, `src/util/errors.ts:12`

### I2. `commitState` validates but writes original content, not parsed output

`commitState` calls `schema.safeParse(newContent)` for validation but then writes `newContent` (the original object), not `result.data` (the Zod-parsed output). In Zod 4, `safeParse` may strip unknown keys or coerce values in `result.data`. This means:
- Extra properties on objects pass validation and persist to disk (visible in the commit round-trip test which writes `{ items: [], created: ..., updated: ... }` to an overview.json whose schema only defines `items`).
- A subsequent `assembleState` reads the file, parses with the same schema, and `result.data` strips the extra fields — so the in-memory representation differs from what was written.

This is not blocking today (no extra fields in production init flow), but will cause subtle bugs when schemas evolve. Either write `result.data` instead of `newContent`, or document the deliberate choice.

**Files:** `src/core/data/commit.ts:104-115`, `tests/unit/data/commit.test.ts:66-69`

## Minor Findings

### M1. Test fixture overview.json has fields not in the schema

The commit test round-trip fixture includes `created` and `updated` on overview.json objects, but `overviewSchema` only defines `items`. This passes because Zod doesn't reject extra keys by default, but the fixture doesn't match the actual schema shape. The test should use `{ items: [] }` to match what INIT_PROJECT actually produces.

**File:** `tests/unit/data/commit.test.ts:66-69`

### M2. `assembleState` returns empty directory (not `ZERO_STATE`) for existing but empty `.project/`

When `.project/` exists but is empty, `assembleState` returns `{ type: "directory", contents: {} }` — a freshly constructed object, not the `ZERO_STATE` constant. Functionally identical, but `ZERO_STATE` uses `as const` for type-level immutability. Code that does `=== ZERO_STATE` reference comparison (unlikely but possible) would get a false negative. The test on line 67-69 of `assemble.test.ts` correctly tests this case, but the semantic difference is worth noting.

**File:** `src/core/data/assemble.ts:41`

### M3. `init` command duplicates the `STATE_ALREADY_INITIALIZED` check

The init command checks `fs.existsSync(projectDirPath)` before calling `rpcInit`, which itself calls `assembleState` -> `reduce` which also guards via `hasChild(state, "", "project.json")`. The pre-check is documented as a deliberate tracer bullet learning (check cwd directly, don't use `resolveProjectDir` which walks up). This is fine — it's a fast-fail optimization — but the error messages differ slightly between the two paths ("Project already initialized in this directory" vs "Project is already initialized (project.json exists)"). Future callers of `rpcInit` won't get the cwd-specific message.

**File:** `src/commands/global/init.ts:34-39`

## Cross-Phase Integration Assessment

- **Phase 1 -> 2:** Tree types are used correctly by schemas (no direct dependency, clean separation).
- **Phase 2 -> 3:** Schema registry correctly maps all entity/record paths. `assembleState` and `commitState` both use `findSchema` consistently.
- **Phase 3 -> 4:** State machine uses `setEntry`/`hasChild` from Phase 1 — no I/O leakage. `ZERO_STATE` flows correctly from assemble through reduce.
- **Phase 4 -> 5:** RPC layer correctly orchestrates assemble->reduce->commit. Init command delegates to RPC cleanly. Status command reads via `assembleState` directly (documented as temporary).
- **No regressions:** Phase 5 cleanly removes `readProject`/`writeProject`/`readEntity`/`writeEntity` and their tests. No dangling imports. The `resolveProjectDir` function is preserved and used by status.
- **Plan compliance:** All plan tasks are checked off. The deferred items (cache, concurrent modification detection) are documented with TODO comments in the right places.
