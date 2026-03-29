## Issues

**[IMPORTANT]** State machine `reduce()` return type diverges from architecture for INIT_PROJECT

The plan's Phase 4 describes `reduce(state, event): ProjectState | StateError`. The architecture's `state-machine-api.md` defines `StateError` as an interface with `code`, `message`, and optional `detail` fields. However, the plan's Phase 4 task says "For unknown event types, return `StateError` with `STATE_INVALID_TRANSITION`" -- which is correct -- but does not specify that the INIT_PROJECT guard failure should use `STATE_ALREADY_INITIALIZED`. The plan says "INIT_PROJECT on existing project -> StateError with STATE_ALREADY_INITIALIZED" in the test spec but the task description only mentions "Guard: `project.json` must not exist in state tree." The guard error code should be made explicit in the task description to avoid ambiguity during implementation.

Additionally, the `StateError` interface in `state-machine-api.md` is a plain object (`{ code, message, detail? }`), but the existing codebase uses `GoodplanError` (a class extending `Error`) for all error handling. The plan does not address how the state machine's `StateError` return value (plain object) is translated to a `GoodplanError` in the RPC layer. Phase 5's RPC init task says "check for StateError" but doesn't specify the conversion. This is a design gap the implementer will need to resolve.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `assembleState` scoping mismatch: plan walks `.project/` but architecture walks from project root

The plan's Phase 3 says `assembleState(projectDir?)` "recursively walk `.project/`, build tree." The architecture's `data-layer-api.md` says assembleState "recursively walks `.project/`" and the state tree is "rooted at a single `DirectoryEntry` representing `.project/`." This is consistent. However, the plan's Phase 3 task says "Skip `.state-cache.json`, `node_modules`, and dotfiles other than `.project/`." The skip-dotfiles-other-than-.project clause doesn't make sense when the walk starts inside `.project/` -- there's no `.project/` child of `.project/`. The skip rules should be: skip `.state-cache.json` within `.project/`, and skip any directories/files not relevant to state (like `node_modules` if it somehow appears). The "dotfiles other than `.project/`" language suggests confusion about the walk root.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `commitState` concurrent modification detection is described but plan says it's deferred

The plan overview says "no concurrent modification detection (deferred to slice 03)." But the Phase 3 task description for `commitState` includes: "Changed json -> validate + deterministicStringify + atomic write (temp + rename)" without mentioning the old-vs-on-disk comparison. This is correct deferral. However, `data-layer-api.md` says commitState "verifies that on-disk content matches `oldState` before writing" as a contract. The plan should explicitly note that this contract is NOT implemented in this slice, so the implementer doesn't accidentally skip it vs intentionally defer it. A code comment like `// TODO: concurrent modification detection deferred to slice 03` would satisfy this.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing `projectSchema` field for INIT_PROJECT state tree output

Phase 4's INIT_PROJECT handler produces `project.json` with "name, version '1.0.0', null active pointers, timestamps." But the existing `projectSchema` in `src/schemas/entities/project.ts` requires: `version`, `name`, `activeEpic`, `activeSlice`, `activeQuest`, `created`, `updated`. The plan correctly lists these as what should be produced. However, `project.json` is created as a `JsonEntry` in the state tree, and `commitState` validates it against the schema registry. The plan's Phase 2 schema registry task does not mention mapping `project.json` to `projectSchema` -- it only lists new schemas (epic, slice, quest, overview, records). The existing `projectSchema` must be included in the registry. The research doc `_codebase-context.md` confirms the schema exists at `src/schemas/entities/project.ts` with status "Keep." Add an explicit task to include `projectSchema` in the schema registry.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `StateEvent` type defined in schemas but Phase 4 re-exports from `state/types.ts`

Phase 2 task says "Create `src/schemas/state-events.ts` -- `StateEvent` discriminated union type." Phase 4 task says "Export `StateEvent` and `StateError` types from `src/core/state/types.ts` (re-export from schemas)." This is fine architecturally (schemas are importable by any layer), but the indirection is unnecessary at this stage -- with only INIT_PROJECT, the re-export adds a file that just proxies imports. Not a problem, but the implementer should know that `src/core/state/types.ts` is a thin re-export layer, not a place for new type definitions.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Debug logging convention (`GOODPLAN_DEBUG=1`) vs architecture convention (`--verbose`)

The plan specifies `GOODPLAN_DEBUG=1` env var for debug logging in Phase 3. The architecture's `conventions.md` specifies `--verbose` as the diagnostic output flag. The codebase research notes this potential conflict. The plan should clarify: is `GOODPLAN_DEBUG` an internal dev-time mechanism distinct from `--verbose`? If so, document that intent. If they should be unified, use `--verbose` consistently. Having two debug mechanisms early will create confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 removes `readProject`/`writeProject` but `resolveProjectDir` return semantics shift

Currently `resolveProjectDir()` returns the path to `.project/` (the metadata directory). The plan says to keep `resolveProjectDir()` for use by `assembleState`. But `assembleState(projectDir?)` will need the project root (parent of `.project/`) or the `.project/` path itself. The plan should be explicit about which: does `assembleState` accept the `.project/` path (matching `resolveProjectDir`'s return value) or the project root? The architecture says "project root is resolved from GOODPLAN_DIR or by walking up from cwd looking for `.project/`" and `resolveProjectDir` currently returns the `.project/` path. If `assembleState` takes the `.project/` path, that's consistent. But this should be stated explicitly to avoid a mismatch.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan faithfully implements the architecture and is well-structured bottom-up. Module boundaries are clean: types (Phase 1), schemas (Phase 2), I/O (Phase 3), state machine (Phase 4), wiring (Phase 5) -- each independently testable with correct dependency direction. The separation of pure state machine from I/O is preserved. The main gap is precision around boundary contracts: the `StateError`-to-`GoodplanError` translation, the `assembleState` walk scope description, the deferred concurrent modification detection needing explicit callout, and the missing `projectSchema` in the registry task. These are all directly fixable without restructuring. Resolving the IMPORTANT issues brings this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
