# Merged Feedback — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Phase 1 ROLLUP_LEARNINGS path resolution is underspecified**
Sources: Software Architecture (I1)

The `from` field is a path-based scope (e.g., `"slices/01-auth"`) while `to` is a label (e.g., `"project"`). The plan says `getJsonl` from source `learnings.jsonl` but doesn't specify: (1) how `from` resolves to a state tree path (`<from>/learnings.jsonl`), (2) how `to` resolves (especially `"epic"` which requires knowing the active epic name), (3) whether the handler validates that resolved paths exist. Without this, the implementer must guess path resolution logic — wrong resolution silently writes to the wrong location.

Resolution: DIRECTLY_ACTIONABLE — add explicit path resolution rules for `from` and `to` parameters in the Phase 1 ROLLUP_LEARNINGS handler description.

---

**I2. Phase 1 ROLLUP_LEARNINGS handler does not address duplicate prevention on repeated invocation**
Sources: TypeScript (I1)

The handler filters by `rollupTo` tag and batch-appends to target, but never removes or marks copied entries in the source. Running `learning:rollup` twice duplicates every matching entry. The handler should either: (a) remove rolled-up entries from source after copying, (b) mark them with a `rolledUp: true` flag and filter on subsequent rollups, or (c) document that rollup is intentionally additive and deduplicate on append. The existing `COMPLETE_SLICE` rollup avoids this because it only runs once.

Resolution: DIRECTLY_ACTIONABLE — specify the idempotency strategy (remove, mark, or deduplicate) in the Phase 1 handler description.

---

**I3. Phase 2 `decision:create` stdin payload deviates from `commands-api.md` without acknowledgment**
Sources: Holistic (I1)

`commands-api.md` groups `decision:create` with entities using `{ name, goal }` shape, but the Phase 2 schema is `{ id, domain, title, summary }`. The state-machine-level payload is correct; the architecture doc is wrong. The plan should note this deviation and include a task to update `commands-api.md` to show the correct decision:create stdin shape. Otherwise Phase 4 schema command will expose the real shape, creating visible inconsistency with the spec.

Resolution: DIRECTLY_ACTIONABLE — add a task to update `commands-api.md` and note the deviation in the plan.

---

**I4. Phase 3 status command does not specify slice completion counting criteria**
Sources: Holistic (I2)

The plan says "Count slice overview items for completed/total" but doesn't specify which statuses count as "completed" (is `abandoned` included?). The implementer needs explicit criteria: `completedSlices` = items where `status === "completed"`, `totalSlices` = all items regardless of status.

Resolution: DIRECTLY_ACTIONABLE — add one-line clarification of counting criteria.

---

**I5. Phase 3 status command introduces filesystem I/O (`readdir`) inside command handler — boundary unclear**
Sources: Software Architecture (I2)

`assembleState()` doesn't enumerate markdown files, so direct `readdir` is needed for file-based artifact counts (architecture, research, brainstorm, prototypes). The plan should clarify whether to: (a) add a Data Layer helper (e.g., `countFiles(projectDir, subpath)`) keeping I/O in the Data Layer, or (b) explicitly note this as an acceptable pragmatic exception for read-only status. Without guidance, implementer may put `readdir` inline in the command handler, creating a precedent for Commands-layer filesystem access.

Resolution: DIRECTLY_ACTIONABLE — specify where the `readdir` calls live (Data Layer helper or documented exception).

---

**I6. Phase 4 `--query` exit code for null results not specified**
Sources: TUI and CLI (I1)

The plan says "`--query` overrides `--quiet`" and "empty result -> output `null`" but doesn't specify exit code. `commands-api.md` says "empty result (null/undefined) -> exit 0, prints `null`". The plan should explicitly state exit 0 for null query results. Scripting consumers chain `--query` with `$?` checks.

Resolution: DIRECTLY_ACTIONABLE — add explicit exit 0 for null query results.

---

**I7. Phase 4 `commandRegistry` needs explicit metadata field specification**
Sources: TUI and CLI (I2), Software Architecture (M2)

The plan says "extract command metadata into a parallel registry" but doesn't specify which fields to capture per command. `commands-api.md` says schema output includes `{ name, description, args }`. The registry must capture: command name, description, and full args definition (types, required, default, description per flag). Without this, implementer may miss flag metadata, making `schema --command <name>` unable to return per-flag detail. Additionally, a verification step or comment convention should address the drift risk between the registry and actual commands (per INV-006).

Resolution: DIRECTLY_ACTIONABLE — enumerate registry entry fields and add drift-prevention guidance.

---

**I8. Phase 3 `StatusResult` artifact fields need explicit required/optional specification for `exactOptionalPropertyTypes`**
Sources: TypeScript (I2)

Replacing `artifacts: z.record(z.string(), z.unknown())` with specific artifact count fields under `exactOptionalPropertyTypes: true` requires careful handling. If fields are required, the builder must always provide every field (no `undefined`). Required fields defaulting to 0 is the safer choice. The plan should make this explicit.

Resolution: DIRECTLY_ACTIONABLE — specify that all artifact count fields are required with 0 defaults.

## MINOR Issues

**M1. Phase 2 `decision:show` data access pattern unspecified**
Sources: Software Architecture (M1), TypeScript (M1)

`decision:list` uses `loadState` + `getJsonl`, but `decision:show` is listed as "read-only" without specifying its data access pattern. Should use `loadState` + `getJsonl` + find-by-id (matching `epic:show`). Note: list commands require an initialized project while Phase 3 status uses `assembleState` for fresh-project support — this asymmetry is intentional but should be noted.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Phase 1 ROLLUP_LEARNINGS missing error code for invalid source path guard**
Sources: Holistic (M3)

The handler includes a guard for invalid source path but doesn't name the error code. Other guards specify codes explicitly. Should use `STATE_INVALID_TRANSITION` or add a new code.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 1 `Partial<DecisionEntry>` allows mutation of immutable fields**
Sources: TypeScript (M3)

`UPDATE_DECISION` payload uses `changes: Partial<DecisionEntry>`, which includes `id` and `date`. Should use `Partial<Omit<DecisionEntry, "id" | "date">>` to catch bugs at compile time. The Phase 2 `updateDecisionInputSchema` correctly excludes these, but the state-machine type should also exclude them.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 4 `OutputArgs` type needs `query` field**
Sources: TypeScript (M2)

Adding `--query` to `globalArgs` and integrating into `output()` requires updating the `OutputArgs` interface (currently `{ json?: boolean; quiet?: boolean }`). Without the `query` field, `args.query` access won't compile under strict typing.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Phase 2 `decision:list` human output column formatting**
Sources: TUI and CLI (M1)

The plan says "table with id, status, domain, title" but doesn't specify alignment. Existing list commands use simple `bold(name) status` formatting without alignment. Recommend following the same pattern (`bold(id) status domain title`) for consistency.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Phase 3 status section visual separators unspecified**
Sources: TUI and CLI (M2)

The plan lists sections but doesn't specify separators. The existing stub uses empty lines between groups. Should specify "empty line between sections" to match the existing convention.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Phase 4 E2E walkthrough step 10 vague on expected stdin schema fields**
Sources: TUI and CLI (M3)

Step 10 says "verify stdin schema includes verificationPassed, learnings, etc." — the "etc." is vague. Should list all expected fields of `completeSliceInputSchema` (`verificationPassed`, `deferred`, `learnings`, `architectureDelta`).

Resolution: DIRECTLY_ACTIONABLE

---

**M8. Phase 4 E2E walkthrough step 11 missing quest creation payload**
Sources: Holistic (M2)

Step 11 says "Quest lifecycle: create -> plan -> complete with learnings" but doesn't specify the quest creation payload. Should specify the `goal` field required by `CREATE_QUEST`.

Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE

All 16 issues (I1-I8, M1-M8) are directly actionable.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**C1. `decision:list` data access pattern** — Software Architecture (M1) says `decision:show` should use `loadState` + `getJsonl`. TypeScript (M1) additionally notes the asymmetry with Phase 3 status using `assembleState`. These are complementary, not contradictory. Merged as M1 with both points included.

**C2. `commandRegistry` concerns** — Software Architecture (M2) focuses on drift risk, TUI/CLI (I2) focuses on what metadata to capture. These are complementary concerns about the same feature. Merged as I7 covering both.

## Unresolved (USER_INPUT required)

None.
