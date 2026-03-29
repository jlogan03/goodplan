# TypeScript Review — 02-project-init Plan (Round 2)

## Issues

**[IMPORTANT]** `StateError.detail` type mismatch between plan and architecture

Phase 4 defines `StateError` as `{ code: string, message: string, detail?: string }` (per the task text "plain object type: `{ code: string, message: string, detail?: string }`"). However, `state-machine-api.md` defines `StateError.detail` as `Record<string, unknown> | undefined` (structured context), not `string | undefined`. The existing `GoodplanError` in `src/util/errors.ts` accepts `detail?: string | Record<string, unknown>` — accommodating both. The plan should match the architecture spec: `detail?: Record<string, unknown>`. Using `string` here means the Phase 5 RPC mapping from `StateError` to `GoodplanError` would need an unnecessary conversion, and structured detail (e.g., `{ currentStatus: "activated", attemptedEvent: "INIT_PROJECT" }`) would be lost.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `assembleState` error handling strategy unspecified — throw or collect?

Phase 3 tests mention "`.json` validation failure -> error with path" and "`.jsonl` with invalid line -> error with line number." But the plan never specifies whether `assembleState` throws on the first validation error or collects all errors and throws a summary. For a CLI that reads a potentially corrupted `.project/` tree, throwing on the first error is poor UX — the user fixes one file, re-runs, hits the next error. Collecting errors and reporting all at once is better. The Zod research doc notes `safeParse()` for reads "where we want to collect errors or handle corrupt files gracefully." The plan should specify: use `safeParse()`, collect all validation errors across files, throw a single `GoodplanError` with `DATA_VALIDATION_ERROR` code and a detail object listing all failing file paths and their Zod errors. This doesn't add complexity — it's a loop pattern change.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `commitState` JSON write ordering claim conflicts with implementation sketch

Phase 3 says "Write ordering: JSON first, JSONL second." But the implementation works by recursive tree diff — walking the tree recursively, writing entries as they're encountered. A recursive walk doesn't naturally separate JSON from JSONL writes. Either: (a) the recursive diff collects writes into two arrays (JSON writes, JSONL writes) and flushes them in order, or (b) drop the ordering requirement since it's not architecturally motivated (the data-layer-api.md doesn't mention write ordering). The plan should resolve this — option (b) is simpler unless there's a specific reason for the ordering (e.g., JSONL entries referencing JSON entity state).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `overviewSchema` item status field lacks type constraint

Phase 2's overview schema task says items have `name, status, created, completed (nullable)`. The `status` field needs to accept any entity status string since overview.json aggregates across entity types (epics, slices, quests all have different status enums). Using `z.string().min(1)` is correct here. However, the plan doesn't mention this — an implementer might try to use a specific status enum and fail. Add a brief note that overview item status is a `z.string()` since it aggregates heterogeneous entity statuses.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 schema for `learningEntrySchema` — `rollup` and `rollupTo` fields need precise typing

The data model shows `rollup: true` (boolean) and `rollupTo: ["epic", "project"]` (string array). But the data model also says "rollup: true is set when rollupTo is non-empty" — implying `rollup` is derived. The schema should define `rollup` as `z.boolean()` and `rollupTo` as `z.array(z.string())`. However, with `exactOptionalPropertyTypes: true`, if `rollupTo` can be absent vs. empty array, the schema must distinguish these. The data model examples always show both fields present, so make them required (not optional). This is a small point but `exactOptionalPropertyTypes` makes it load-bearing.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `ZERO_STATE` should be `as const satisfies ProjectState` for immutability

The plan says "Implement `ZERO_STATE` constant." Since `ZERO_STATE` is shared across the codebase (used by `assembleState` and potentially by tests), it should be deeply immutable. Using `as const satisfies ProjectState` ensures the object is frozen at the type level. Without `as const`, nothing prevents accidental mutation of `ZERO_STATE.contents` in a test or careless code path, which would be a subtle shared-state bug. Alternatively, use `Object.freeze()` at runtime, but `as const` is the TypeScript-idiomatic approach.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 missing Zod schema for `Verification` and `VerificationResult` types

The `state-machine-api.md` defines `Verification` (used in `epic.json`'s `verifications` array) and `VerificationResult` (used in `COMPLETE_EPIC` event). The `epicSchema` in Phase 2 includes a `verifications` array — this needs a `verificationSchema` to validate against. The plan lists `verifications array` in the epic schema fields but doesn't create a corresponding Zod schema for the `Verification` object shape. This is needed for `assembleState` to validate `epic.json` files. Either define `verificationSchema` inline within `epicSchema` (using `z.object(...)` as an array element) or as a standalone export.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 feedback was well-addressed — the plan now explicitly specifies `StateError` as a plain object, `setEntry` auto-creates intermediates, JSONL uses length-only comparison (trusting reducer purity per INV-003), debug logging is wired to both `--verbose` and `GOODPLAN_DEBUG`, `import type`/`export type` is called out, the schema registry includes `projectSchema`, and Phase 5 expected behavior covers human-readable output, quiet mode, and JSON mode. The remaining issues are mostly precision gaps: `StateError.detail` type mismatch with the architecture spec, `assembleState` error collection strategy, and `commitState` write ordering feasibility. Fixing the 3 IMPORTANT items and 4 MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
