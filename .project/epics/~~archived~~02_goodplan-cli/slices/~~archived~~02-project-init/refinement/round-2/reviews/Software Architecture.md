## Issues

**[IMPORTANT]** `StateError.detail` type mismatch between plan and architecture

Phase 2 task for `src/schemas/state-events.ts` specifies `StateError` as `{ code: string, message: string, detail?: string }`. However, `state-machine-api.md` defines `StateError.detail` as `Record<string, unknown>`, not `string`. The existing `GoodplanError` class in `src/util/errors.ts` accepts `detail: string | Record<string, unknown>`. The plan's `detail?: string` is narrower than the architecture spec. This will cause a type mismatch when the RPC layer maps `StateError` to `GoodplanError` (Phase 5), since `GoodplanError` expects the union type. Fix: change `detail?: string` to `detail?: Record<string, unknown>` in the Phase 2 `StateError` definition to match `state-machine-api.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `assembleState` error handling strategy unspecified for non-schema JSON files

Phase 3's `assembleState` task says: "For `.json` files: parse, look up schema via registry, validate, create `JsonEntry`." But it does not specify what happens when a `.json` file has no matching schema in the registry. The schema registry only covers known entity patterns (`project.json`, `epic.json`, etc.). If a `.json` file exists inside `.project/` that doesn't match any registry pattern (e.g., a user-created config file, or a future file from a newer CLI version), should `assembleState` skip it, read it as untyped `JsonEntry<unknown>`, or throw? The architecture's `data-layer-api.md` says "Files not matching any pattern are either markdown (`.md` -> `MarkdownEntry`) or ignored." This means unregistered `.json` files should be **ignored** (not included in the state tree). The plan should state this explicitly since the implementer might reasonably assume all `.json` files should be parsed.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 INIT_PROJECT handler creates `learnings.jsonl` at project root but data model shows it there

Phase 4 task says INIT_PROJECT produces `learnings.jsonl` (empty). The data model in `data-model.md` confirms `learnings.jsonl` at the project root (`.project/learnings.jsonl`). This is consistent. However, the schema registry in `data-layer-api.md` has two patterns for learnings: `^learnings\.jsonl$` (project-level) and `.*\/learnings\.jsonl$` (per-slice/quest). The second pattern also matches the root path. The registry should be ordered so the specific pattern matches first, or the second pattern should use a prefix like `^(slices|quests)\/`. The plan's Phase 2 schema registry task copies the architecture's patterns verbatim, which is correct but inherits this overlap. Not blocking -- both patterns point to the same schema -- but the implementer should be aware that the `.*\/learnings\.jsonl$` pattern is a superset that will match root-level `learnings.jsonl` too.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 `commitState` write ordering rationale could be more explicit

Phase 3 specifies "Write ordering: JSON first, JSONL second" but doesn't explain why. The architecture's `data-layer-api.md` explains: "Write ordering: entity JSON files first, JSONL appends second, state cache last. If the process crashes mid-write, the state cache (written last) is stale, triggering a full `assembleState()` on next invocation." The plan defers the state cache to slice 03, so the crash-recovery rationale only partially applies. The remaining reason for JSON-before-JSONL is that entity files establish structural state while JSONL records are append-only audit trail -- a crash after JSON writes but before JSONL appends loses audit entries but not state integrity. Adding a one-line rationale comment would help the implementer understand the ordering is intentional.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 1 issues (IMP-1 through IMP-7 from the Software Architecture domain) have been addressed in the current plan revision. Module boundaries remain clean with correct dependency direction: types (Phase 1) -> schemas (Phase 2) -> I/O (Phase 3) -> state machine (Phase 4) -> wiring (Phase 5). The state machine purity invariant (INV-003) is preserved. The `StateError`-to-`GoodplanError` mapping is now explicit in Phase 5. The `assembleState` walk scope is corrected. The deferred concurrent modification detection has an explicit TODO. The `projectSchema` is included in the registry. The two remaining IMPORTANT issues are precision gaps that are straightforward to fix: the `StateError.detail` type needs to match the architecture spec, and the handling of unregistered `.json` files in `assembleState` needs explicit "ignored" behavior per the architecture. Fixing those brings this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
