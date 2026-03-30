# Software Architecture Review — Round 3

## Issues

**[IMPORTANT]** Phase 1 `serializeStateTree` placement in `src/core/data/serialize.ts` creates an asymmetric API surface in the Data Layer

The plan places `serializeStateTree()` in `src/core/data/serialize.ts`. This function transforms the typed `StateEntry` tree into a plain JSON-serializable object — it is a pure transformation with no I/O. The Data Layer's documented role is "Entity CRUD and all filesystem I/O" (architecture `_overview.md`). A pure transformation function fits more naturally alongside the pure tree types in `src/core/tree.ts` or in a new `src/core/serialize.ts` sibling module.

However, the function depends on `ProjectState`, `DirectoryEntry`, `JsonEntry`, `JsonlEntry`, and `MarkdownEntry` — all defined in `src/core/tree.ts`. Since `src/core/data/tree.ts` already re-exports these types, placing the serializer in `src/core/data/` creates no circular dependency, but it does mean the Data Layer now contains both I/O functions (`assemble.ts`, `project.ts`, `files.ts`) and a pure transformation. This is a minor layering concern, not a blocking issue — the current plan is workable. But it would be cleaner as `src/core/serialize.ts` to keep the Data Layer focused on I/O.

The state command (`src/commands/global/state.ts`) imports from the Data Layer anyway for `assembleState`, so either location works for the caller. No action required if the team prefers the current placement, but note the trade-off.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `status --json` dependency assumes `DATA_NO_PROJECT` error code detection — convention doc should document this pattern

Phase 3 Step 1 uses a two-stage detection: (a) `goodplan --version --json` to confirm binary exists, (b) `goodplan status --json` to confirm a project exists by checking for `DATA_NO_PROJECT`. This is architecturally sound — it correctly separates "binary present" from "project initialized." However, the convention doc (Phase 2) should explicitly document the `DATA_NO_PROJECT` error code and its meaning as part of the error handling section (section 10). Currently, the plan's Phase 2 task list mentions exit codes (0/1/2/3) but does not enumerate specific error codes that skills should pattern-match against. Skills need to distinguish `DATA_NO_PROJECT` (no `.project/` directory) from other exit-1 errors (unexpected failures). Without this, the two-stage detection pattern works in the tracer bullet but is not generalizable.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `state` command bypasses `output()` — Phase 1 should add a code comment explaining why

The plan correctly specifies that the state command writes directly via `deterministicStringify()` + `process.stdout.write()` instead of using the shared `output()` function. This is the right call — `output()` couples query application and serialization, and the state command needs to insert pagination between them. However, every other command in the codebase uses `output()`. Without a comment explaining why `state` is different, a future contributor may "fix" it by switching to `output()`, breaking pagination. The plan mentions adding a comment about the bare `state` behavior; extend it to explain why `output()` is not used.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 references `show --json` for entity details but the exact fields available are not specified

Phase 3 Step 6 says "use `show --json` for entity details (without artifacts — artifacts field is deferred to slice 02)." This correctly notes the missing `artifacts` field, but does not specify which `show --json` fields the skill will actually use. The existing `slice:show --json` and `epic:show --json` return the raw entity JSON (`slice.json`, `epic.json` content). The skill needs to know it can rely on `status`, `name`, and `goal` fields from these responses. This is implicit from the codebase (show commands return the entity JSON directly via the Data Layer), but a brief note in the plan would prevent the implementer from assuming richer `show` output than what exists.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 2 raised 0 critical, 2 important, and 2 minor issues. The revised plan addresses all of them:

- **I1** (activity-log tail approach): Fully resolved — committed to `.[-5:]` as primary with full-array fallback. The `--offset`/`--limit` suggestion for "last N" is properly noted as unsuitable.
- **I2** (`--inline` type-change documentation): Fully resolved — plan now explicitly calls for a concrete example showing the same query with and without `--inline`, and documents the `true` vs `string` type change.
- **M1** (key sorting): Resolved — plan now includes "Do not add key-sorting logic — key ordering is handled by `deterministicStringify` in the output layer."
- **M2** (test file naming): Resolved — now uses `state.test.ts` matching existing convention.

All round-2 merged feedback items (I1-I8, M1-M13) are addressed in the current plan. The remaining issues are refinements to improve clarity and prevent future drift, not structural problems.

The architecture is clean: the state command correctly routes Commands -> Data Layer (read-only, bypassing RPC per the documented pattern), the serialization is a pure transform, the four-layer dependency direction is preserved, and the public API contract (JSON output shape) is well-specified. The `state` command's exception to the `output()` convention is properly justified and documented.

To reach 10/10: place `serializeStateTree` in `src/core/serialize.ts` (pure types layer) rather than the Data Layer, and enumerate specific error codes in the convention doc's error handling section.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
