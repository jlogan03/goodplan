# Software Architecture Review — HMAC Signatures Plan (Round 4)

## Issues

**[IMPORTANT]** Phase 2: `commitState()` signature injection creates a layering tension with `processJsonEntry`'s Zod validation

Phase 2 task 1-3 describes computing the signature from `newState` using `signStateTree(newState)`, then creating a shallow clone of the project node with `stateSignature` injected, then finding the existing `jsonWrites` entry for `goodplan.json` and updating its `content` with the re-serialized clone. The problem is that `processJsonEntry` has already run on the `goodplan.json` entry by this point — it validated through Zod, serialized via `deterministicStringify`, and pushed a `PendingWrite` with string `content`. The plan says to update this entry's `content`, but this means re-serializing a second time, bypassing the Zod validation that `processJsonEntry` already performed. Specifically:

1. If the `jsonWrites` entry already exists, its `content` is a string (`deterministicStringify(contentToWrite) + "\n"`). The plan says to update it with "the re-serialized clone" but doesn't specify whether this means re-running through `processJsonEntry` (which would re-validate) or just calling `deterministicStringify` directly (which bypasses INV-005).

2. If the `jsonWrites` entry does NOT exist (the "create a new entry" case), the plan explicitly says to create a `PendingWrite` with the serialized clone as content — again without Zod validation, which would be an INV-005 violation.

The `stateSignature` field is `z.string().optional()` in `projectSchema`, so Zod validation would pass. But the principle matters: every write path should go through schema validation. The plan should specify that the re-serialized clone is validated through `projectSchema.parse()` before writing — either by calling `processJsonEntry` on the updated clone, or by adding an explicit `projectSchema.parse()` call before serialization. Phase 4's `verify --fix` already does this correctly ("validates through `projectSchema.parse()` before writing") — Phase 2 should match.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3: the `status.ts` switch from `assembleState()` to `loadState()` rationale could be stronger

Phase 3 says to switch `status.ts` from `assembleState()` to `loadState()` to "ensure HMAC verification runs on that command." The round-3 review flagged that `state.ts` should stay on `assembleState()` (ground-truth semantics), and the plan correctly adopted that. But the `status.ts` switch deserves a note about the behavioral change: `status.ts` currently has a comment saying "Uses assembleState() (not loadState) — deliberately chosen because it handles fresh/zero-state projects gracefully." The plan should acknowledge this existing rationale and explain why it's safe to switch: `loadState()` already returns `ZERO_STATE` for missing/empty project dirs (lines 46-53 of `load.ts`), so the zero-state handling is preserved. The `buildStatusResult` function then throws `DATA_NO_PROJECT` when `project.json` is absent regardless. Without this note, an implementer seeing the existing comment might hesitate to change it.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: `atomicWrite` export changes the module's public API surface without noting it as an architectural change

Phase 4 task 3 says to "Export `atomicWrite()` from `src/core/data/commit.ts` (currently module-private)." This widens the Data Layer's public API surface. While the function is simple and the use case is legitimate (`verify --fix`), the plan should note that this is a deliberate API surface expansion and that `atomicWrite` should remain an internal utility — not used by commands or RPC layer for general writes (those should use `commitState()`). A brief comment in the export or a note in the plan would prevent future misuse. This is especially relevant because all subsystems are at Developing maturity — API surfaces are still being shaped.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `serializeForHmac` strips `stateSignature` from the serialized tree's `"project.json"` node, but the stripping logic assumes specific tree structure

The plan says: "the serialized tree has a `"project.json"` node — destructure out `stateSignature` from that node and reconstruct without it (stripping at the wrong level produces a different HMAC)." This is correct in the current tree structure, but it creates an implicit coupling between the HMAC module and the tree layout. If `project.json` is ever renamed or relocated (e.g., the entity-restructuring epic mentioned in the CLAUDE.md), the stripping logic would silently compute HMACs over a tree that still contains `stateSignature`, producing valid but non-comparable signatures. The plan could add a comment in the function noting this coupling, or better, make the stripping logic resilient by recursively searching for and removing any `stateSignature` key at any level. However, given the current Developing maturity and the fact that `project.json`'s path is stable, this is low priority — a comment suffices.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 4 has successfully resolved both IMPORTANT issues from round 3. The `serializeForHmac` function signature tension is resolved — the plan now clearly specifies a single `serializeForHmac(state: ProjectState)` signature that uses `serializeStateTree` internally, with an explicit note that `newState` content is post-Zod so round-trip discrepancies don't occur. The incremental update HMAC gap is fixed — the plan now verifies on both `incrementalUpdate()` and `assembleState()` return paths, with clear rationale for skipping only the cache-hit path. The `state.ts` vs `status.ts` distinction is well-handled (state stays on `assembleState` with inline HMAC check, status switches to `loadState`).

The remaining IMPORTANT item is the INV-005 compliance gap in Phase 2's signature injection into `commitState()`. The three MINOR items are documentation/clarity improvements. Resolving the INV-005 item and addressing the minors would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
