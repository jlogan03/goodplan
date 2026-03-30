# TypeScript Review (Round 2) — Decisions, Learnings & Full Status

## Issues

**[IMPORTANT]** Phase 1 ROLLUP_LEARNINGS handler does not remove rolled-up entries from the source

The Phase 1 `rollup-learnings.ts` handler description says: filter entries by `rollupTo` tag, batch append to target. But it never mentions removing or marking the copied entries in the source `learnings.jsonl`. Without this, running `learning:rollup --from slices/01-auth --to project` twice duplicates every matching entry in the project-level `learnings.jsonl`. The handler should either: (a) remove rolled-up entries from the source after copying, (b) mark them with a `rolledUp: true` flag and filter them out on subsequent rollups, or (c) document that rollup is intentionally additive and idempotent (e.g., by deduplicating on append). The existing `COMPLETE_SLICE` rollup doesn't have this problem because it only runs once per completion. The manual `ROLLUP_LEARNINGS` can be invoked repeatedly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `StatusResult` schema tightening may break `exactOptionalPropertyTypes`

Phase 3 replaces `artifacts: z.record(z.string(), z.unknown())` with specific artifact count fields (e.g., `architectureFiles: number, decisions: number`). With `exactOptionalPropertyTypes: true` in `tsconfig.json`, any fields that could be absent need careful handling. If `artifacts` becomes a strict object schema with required number fields, the status builder must always provide every field (no `undefined` values). The plan should specify whether artifact fields are all required (always computed, defaulting to 0) or whether some are optional. Given the existing pattern of omitting empty sections in human output, required fields with 0 defaults is the safer choice. The plan should make this explicit to avoid `exactOptionalPropertyTypes` violations during implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 `decision:list` uses `loadState` but Phase 3 status uses `assembleState` — inconsistent empty-project behavior

Phase 2 says `decision:list` uses `loadState` + `getJsonl` (following `epic:list` pattern). Phase 3 deliberately uses `assembleState` for fresh-project support. If `decision:list` is run on an uninitialized project, `loadState` will throw (it requires `project.json`). This is consistent with `epic:list` behavior (which also throws), so it is not wrong, but the plan should note this intentional asymmetry: list commands require an initialized project, status does not.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 `output()` signature change needs `OutputArgs` type update

Phase 4 adds `--query` to `globalArgs` and integrates it into `output()`. The current `OutputArgs` interface in `src/util/output.ts` is `{ json?: boolean; quiet?: boolean }` — it has no `query` field. The plan tasks adding `--query` to `globalArgs` and integrating into `output()`, but doesn't explicitly task updating the `OutputArgs` interface. With `verbatimModuleSyntax` and strict typing, accessing `args.query` on `OutputArgs` without the field will be a compile error. The implementer will likely figure this out, but the plan should be explicit about the type change.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `decision.ts` handler — `Partial<DecisionEntry>` includes `id` and `date` in the changes type

The UPDATE_DECISION event payload specifies `changes: Partial<DecisionEntry>`. Since `DecisionEntry` includes `id` and `date`, the `changes` object would type-check with `{ id: "new-id" }` — allowing callers to change a decision's id, which should be immutable. The handler should either: (a) use `Partial<Omit<DecisionEntry, "id" | "date">>` for the changes type, or (b) guard against `id` and `date` in the changes object at runtime. The plan's Phase 2 `updateDecisionInputSchema` correctly lists only `status, domain, title, summary, supersededBy` — but the state-machine-level type should also exclude immutable fields to catch bugs at compile time rather than runtime.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical and important issues from round 1 have been addressed. The plan now correctly uses `z.toJSONSchema()` with `unrepresentable: "any"`, adds `create-decision` as a dedicated phase, specifies `StateErrorCode` additions, drops `learning:show`, fixes flag names, and clarifies rollup filtering semantics. The remaining issues are one important concern about rollup idempotency and several minor type-safety refinements. Fixing the rollup idempotency issue would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
