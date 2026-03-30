# Merged Feedback — Slice 05: Next Commands (Round 1)

## CRITICAL Issues

### C1. Registry is manually maintained, violating the key constraint
**Flagged by:** all 5 reviewers
**Files:** Phase 1 Task 1.2 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

The confirmed goal's KEY CONSTRAINT states: "Registry must derive from existing state machine data structures (transition tables, command-to-event mappings) rather than being a parallel manually-maintained definition." The plan's Phase 1 describes hand-building a `commandMetadata` registry covering all entity types and statuses manually (epic: 14, slice: 9, quest: 9, task: 3, decision: 3). This is the exact anti-pattern the constraint forbids.

The codebase already has all data needed for derivation:
1. **Transition tables** in `src/core/state/transitions/*.ts` — export `*Transitions` arrays with `{ from, event, to }` rows
2. **`buildBeginEvent()` switch** in `src/core/rpc/begin.ts` — maps `(BeginPhase, Target) -> StateEvent`
3. **`buildSubmitEvent()` switch** in `src/core/rpc/submit.ts` — maps `(SubmitPhase, Target) -> StateEvent`
4. **`handlerRecord`** in `src/core/state/reduce.ts` — exhaustive `StateEvent.type -> handler` mapping

The plan should restructure Phase 1 to:
1. Define a static `commandToEvent` mapping array: `{ command, event, entityType, template, description, userFacing }`
2. At module init, import all `*Transitions` arrays and build `(entityType, toStatus) -> commands[]` by inverting transitions + command-to-event mapping
3. Add display metadata (description, template, userFacing) that cannot be derived automatically

---

### C2. `computeNextCommands` lives in the wrong layer — should be in RPC, not called from 37 command files
**Flagged by:** software-architecture, api-contract, tui-cli (holistic and typescript flagged the symptom — type safety of the spread)
**Files:** Phase 2 in `plan.md`; affects `src/core/rpc/begin.ts`, `src/core/rpc/submit.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/types.ts`
**Resolution:** DIRECTLY_ACTIONABLE

The plan has 37 command files each calling `computeNextCommands()` and spreading the result into `output()`. This violates the Commands API "no business logic" contract and creates shotgun surgery. The RPC layer (`begin()`, `submit()`, `complete()`) should compute and include `nextCommands` in their result types. This means:
- 3 integration points instead of 37
- Command files need zero changes
- `output(result, args)` already serializes whatever the RPC layer returns
- Phase 2 is largely eliminated as a separate phase

---

## IMPORTANT Issues

### I1. Missing type integration with existing result types
**Flagged by:** holistic, software-architecture, typescript, api-contract
**Files:** `src/core/rpc/types.ts`
**Resolution:** DIRECTLY_ACTIONABLE

`BeginResult`, `CompleteResult`, and `SubmitResult` need `nextCommands?: NextCommands` added. The plan's `output({ ...result, nextCommands }, args)` spread creates an untyped ad-hoc shape. If C2 is fixed (RPC layer returns nextCommands), this is automatically addressed — the types get the field and the RPC functions populate it.

---

### I2. `computeNextCommands` signature uses `string` for entityType — should use `Target["type"]` or narrower union
**Flagged by:** holistic, software-architecture, typescript, api-contract
**Files:** `src/core/rpc/next-commands.ts` (planned)
**Resolution:** DIRECTLY_ACTIONABLE

The plan uses `entityType: string` and `newStatus: string`. The codebase has `Target["type"]` (`"epic" | "slice" | "quest" | "task" | "decision" | ...`) and per-entity status unions (`EpicStatus`, `SliceStatus`, etc.). Using `string` loses compile-time safety, especially with `noUncheckedIndexedAccess: true`. Use `Target["type"]` or a subset excluding `"project"` and `"rollup"`. Better yet, accept a `Target` object directly (callers already have one).

---

### I3. Fitness test checks coverage but not derivation correctness
**Flagged by:** software-architecture, api-contract
**Files:** Phase 1 Task 3 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

The bidirectional fitness test verifies every command has a registry entry and vice versa. But it doesn't verify that every registry entry corresponds to a valid transition in the state machine. Someone could manually add a stale entry and the test would pass. The fitness test should additionally verify:
- Every `commandMetadata[entityType][status]` entry is reachable via transition tables
- Every transition that maps to a user-facing command has a corresponding registry entry

If C1 is fixed (derived registry), this becomes defense-in-depth.

---

### I4. Phase 3 "Before" section says "N/A" — no verification baseline
**Flagged by:** holistic
**Files:** Phase 3 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

Every phase needs concrete before/after checks. Phase 3's "Before" should verify Phase 2 integration is complete (e.g., grep for `computeNextCommands` usage count or, if C2 is adopted, verify RPC functions include nextCommands).

---

### I5. No documentation update tasks
**Flagged by:** holistic
**Files:** `plan.md`; affects `architecture/rpc-layer-api.md`, `architecture/commands-api.md`
**Resolution:** DIRECTLY_ACTIONABLE

The plan adds `nextCommands` to every mutation response and creates a new module. These docs need updating:
- `architecture/rpc-layer-api.md` — document `computeNextCommands()` and the registry
- `architecture/commands-api.md` — document that `--json` output now includes `nextCommands`

---

### I6. 37 mutation files not enumerated; non-obvious cases unaddressed
**Flagged by:** typescript, tui-cli
**Files:** Phase 2 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

Even if C2 moves integration to the RPC layer (reducing scope), the plan should enumerate the mutation files and address edge cases:
- `submit-plan.ts`, `submit-refinement.ts`, `submit-implementation.ts` handle both slice and quest — `entityType` must be derived from the target
- `task/convert.ts` produces a new entity — which entity type gets nextCommands?
- `epic/add-verification.ts` and `epic/update-verification.ts` don't change status (`(same)` in transition table) — clarify whether nextCommands applies

Tui-cli notes the count may be 35-36, not 37. The exact list should be derived programmatically or enumerated explicitly.

---

### I7. Phase 2/3 verification uses `./gp` without build step
**Flagged by:** software-architecture, typescript, tui-cli, api-contract
**Files:** Phases 2 and 3 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

All `./gp` verification commands require the binary to be built first (`bun run build`). The plan should include this as a prerequisite. Phase 2 verification should primarily rely on `bun run test` (faster, catches type errors); shell-based `./gp` verification should be reserved for Phase 3 E2E.

---

## MINOR Issues

### M1. Phase 1 Expected Behavior uses `node -e "require(...)"` — CJS on an ESM project
**Flagged by:** holistic, typescript, tui-cli, api-contract
**Files:** Phase 1 Expected Behavior in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

Use `bun -e "import { computeNextCommands } from './src/core/rpc/next-commands.ts'; console.log(typeof computeNextCommands)"` or rely on unit tests passing.

---

### M2. Phase 1 test case 5 references `SubmitResult.advanced === false` but `computeNextCommands` has no `advanced` parameter
**Flagged by:** holistic, software-architecture, typescript, tui-cli
**Files:** Phase 1 Task 2.5 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

`computeNextCommands` takes `(entityType, entityName, newStatus)` — it has no knowledge of `advanced`. Rephrase: "Test status unchanged after submit — pass a non-terminal status like `refining` and verify nextCommands includes the submit command."

---

### M3. Template placeholder convention (`{name}` vs `<reason>`) is undocumented
**Flagged by:** tui-cli, api-contract
**Files:** Phase 1 type definitions in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

Curly braces for auto-interpolated values, angle brackets for user-supplied values — add JSDoc or type-level documentation for this convention.

---

### M4. "Other" section commands are hardcoded, not derived
**Flagged by:** software-architecture
**Files:** Phase 1 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

The "other" section (`gp epic:create`, `gp quest:create`, etc.) is manually curated. Acknowledge this as a pragmatic exception to the derivation constraint.

---

### M5. Phase 3 E2E cleanup may leave orphan state on failure
**Flagged by:** tui-cli
**Files:** Phase 3 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

If any Phase 3 task fails, `/tmp/gp-e2e-test` cleanup won't run. Use a trap or document manual cleanup.

---

### M6. Epic status count (14) includes status-preserving events
**Flagged by:** holistic
**Files:** Phase 1 in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

`ADD_VERIFICATION` and `UPDATE_VERIFICATION` don't change status. Clarify that the registry maps pre-activation statuses to include `add-verification`/`update-verification` as available commands, but no separate "post-verification" status entries are needed.

---

### M7. `CommandMetadataEntry.template` could use a branded or template literal type
**Flagged by:** typescript
**Files:** Phase 1 type definitions in `plan.md`
**Resolution:** DIRECTLY_ACTIONABLE

A template literal type like `` `gp ${string}` `` would prevent non-template strings. Minor — fitness test is the real safety net.

---

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C1 — Derive registry from transition tables.** Restructure Phase 1 to: (a) define a `commandToEvent` mapping array with `{ command, event, entityType, template, description, userFacing }` entries, (b) import transition table arrays and build `(entityType, toStatus) -> commands[]` at module init by inverting transitions + command-to-event mapping, (c) keep manual display metadata only for what can't be derived. Research the exact shape of transition table exports first (see RESEARCH_NEEDED R1).

2. **C2 — Move nextCommands to RPC layer.** Compute `nextCommands` inside `begin()`, `submit()`, `complete()` and include it in their result types. This eliminates the 37-file integration phase. Update `BeginResult`, `SubmitResult`, `CompleteResult` in `src/core/rpc/types.ts` to add `nextCommands?: NextCommands`.

3. **I1 — Add `nextCommands?: NextCommands` to result types.** Addressed by C2 above.

4. **I2 — Type `entityType` as `Target["type"]` or narrower union.** Change the function signature to accept `Target` (or at minimum `Target["type"]`) instead of `string`. Same for `newStatus` if feasible with existing per-entity status unions.

5. **I3 — Strengthen fitness test.** Add assertions that every registry entry corresponds to a reachable transition, and every user-facing transition has a registry entry.

6. **I4 — Add Phase 3 "Before" baseline.** Define a concrete check verifying Phase 2 integration is complete.

7. **I5 — Add documentation update tasks.** Add tasks to update `rpc-layer-api.md` and `commands-api.md`.

8. **I6 — Enumerate mutation files; address edge cases.** List exact files or derive programmatically. Address `submit-*.ts` dual-entity, `task/convert.ts`, and status-preserving commands.

9. **I7 — Add `bun run build` prerequisite** to Phases 2 and 3 verification. Phase 2 should primarily use `bun run test`.

10. **M1 — Fix ESM verification.** Replace `node -e "require(...)"` with `bun -e "import ..."` or rely on unit tests.

11. **M2 — Fix test case 5 description.** Rephrase to "status unchanged after submit" rather than referencing `SubmitResult.advanced`.

12. **M3 — Document placeholder convention** in JSDoc or type definition.

13. **M4 — Acknowledge "other" section** as pragmatic exception to derivation constraint.

14. **M5 — Add cleanup trap** or document manual cleanup for Phase 3 E2E.

15. **M6 — Clarify status-preserving events** don't need separate status entries.

16. **M7 — Consider template literal type** for `CommandMetadataEntry.template`.

---

## RESEARCH_NEEDED

### R1. Transition table export format — are they queryable data structures or only functions?
**Why it matters:** C1 (derive registry) depends on being able to import transition tables as arrays at module init time. If they're only exposed as handler functions (not data arrays), a different approach is needed.
**Tool strategy:** CODEBASE_EXPLORATION — `Grep` for `export` in `src/core/state/transitions/*.ts` to see what's exported, then `Read` representative files to check if the `*Transitions` arrays are exported or only consumed internally by handler functions.

### R2. Command-to-event mapping — is it already codified as data or only as switch statements?
**Why it matters:** C1 requires inverting command-to-event. If `buildBeginEvent` and `buildSubmitEvent` are pure switch statements with no data-structure equivalent, the plan needs to extract this mapping into a data structure first.
**Tool strategy:** CODEBASE_EXPLORATION — `Read` `src/core/rpc/begin.ts` and `src/core/rpc/submit.ts` to inspect `buildBeginEvent` and `buildSubmitEvent`. Check if there's a declarative mapping or only imperative switches.

### R3. Exact mutation file list
**Why it matters:** I6 — the plan claims 37 but reviewers found 35-36. Need the definitive list.
**Tool strategy:** CODEBASE_EXPLORATION — `Grep` for `output(result` or `begin(` / `submit(` / `complete(` in `src/commands/` to enumerate all mutation command files.

---

## Contradictions Resolved

1. **Mutation file count (37 vs 35-36):** tui-cli says 36 (or 35 after exclusions), plan says 37. Trusting tui-cli's analysis but marking as CODEBASE_EXPLORATION (R3) since the exact count needs programmatic verification.

2. **Where `computeNextCommands` should live:** holistic and typescript focused on the type safety of the spread pattern (symptom), while software-architecture and api-contract identified the root cause (wrong layer). Trusting the architecture specialists — fixing the layer placement (C2) eliminates the type safety issue (I1) automatically.

3. **Whether `advanced` parameter is needed:** tui-cli says `computeNextCommands` needs an `advanced` parameter to distinguish "just entered refining" from "stayed in refining." Other reviewers say `computeNextCommands` only sees `newStatus` and doesn't need `advanced`. Trusting the majority — `computeNextCommands` receives the status after mutation; the `advanced` distinction is a caller/display concern, not a registry concern. If the status didn't change, the same commands are valid. Reclassified as MINOR (M2).

4. **Structured command entries vs template strings (M3/M7):** api-contract suggests structured data (command name + args as key-value pairs) instead of template strings; typescript suggests template literal types. These are complementary suggestions at different levels. Keeping both as MINOR — template strings are simpler for the initial implementation; structured entries could be a follow-up.

---

## Unresolved (USER_INPUT required)

No items require user input. All issues have DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION resolutions. The CODEBASE_EXPLORATION items (R1, R2, R3) can be resolved by the implementer during plan revision.
