## Issues

**[IMPORTANT]** Phase 1: `CREATE_EPIC` event in plan contradicts state-machine-api.md canonical union — missing `ts` field

The plan's Phase 1 task says CREATE_EPIC and ACTIVATE_EPIC need `ts` and includes an architecture amendment task. However, the canonical `StateEvent` union in `state-machine-api.md` (lines 37-38) currently defines `CREATE_EPIC` as `{ type: 'CREATE_EPIC'; name: string; goal: string }` with no `ts` field. The plan's amendment task addresses this, but the plan text in the overview still says "only events that produce timestamped entities carry `ts`" and "CREATE_EPIC (sets `created`, `updated`) and ACTIVATE_EPIC (sets `activated`) also need `ts`." This is internally consistent. The issue is that the plan describes the `updated` field as "set only by CREATE_EPIC and ACTIVATE_EPIC, not on every transition" but the existing `epicSchema` in `src/schemas/entities/epic.ts` (line 38) has `updated: timestampSchema` as a required non-nullable field. If `updated` is only set on create and activate, then any test that loads an epic after a non-create/non-activate transition will still need a valid `updated` value — meaning it retains whatever was set at create time. The plan should make this explicit: `updated` is set at creation and only updated by ACTIVATE_EPIC, and the reducer for other transitions must not modify it. This avoids an implementer assuming `updated` should be refreshed on every status change.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `slice-submit.ts` COMPLETE_PLAN guard uses `hasChild` for `plan.md` but entity path construction is unspecified

The plan says COMPLETE_PLAN guards with `hasChild(state, "slices/<name>", "plan.md")` matching transition-tables.md. However, the `slice` field on the COMPLETE_PLAN event (from state-machine-api.md line 56) is just the slice name string. The handler needs to resolve the full tree path `slices/${event.slice}` before calling `hasChild`. This is straightforward but unspecified — and more critically, the handler also needs to look up `slices/${event.slice}/slice.json` to read the current status for the from-status guard. The plan doesn't mention how the handler locates the slice entity in the state tree. For epic handlers this is clear (event carries `epic: string`, handler resolves `epics/${event.epic}/epic.json`), but the slice-submit handlers are pulled forward from a future slice and the path resolution pattern should be explicit to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: `begin()` function signature shows generic but `BeginPayloadMap` exhaustiveness may not compile under `exactOptionalPropertyTypes`

Phase 4 now shows `begin<P extends BeginPhase>(phase: P, target: Target, payload: BeginPayloadMap[P], options?: WorkflowOptions)`. With `exactOptionalPropertyTypes: true` in `tsconfig.json`, if `BeginPayloadMap` maps most phases to `undefined`, callers cannot pass `undefined` explicitly — they must omit the argument. But with `payload` as a required positional parameter before `options`, it cannot be omitted. Two options: (1) use a conditional type or overloads so phases with no payload don't require the parameter, or (2) map no-payload phases to `Record<string, never>` (empty object `{}`) instead of `undefined`. The plan should specify which approach to use; otherwise the implementer will hit a compile error on the first call like `begin('explore', target, undefined)`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2: `loadState()` incremental path replicates `assembleState()` skip rules but doesn't mention `SKIP_NAMES` set

The plan says the incremental path "must replicate `assembleState()`'s skip rules: unregistered JSON files are skipped, unknown file types are skipped." The actual `assembleState()` in `src/core/data/assemble.ts` also skips entries matching the `SKIP_NAMES` set (currently `{".state-cache.json", "node_modules"}`). The plan should reference this set explicitly or note that `loadState()` should import and use the same skip logic, not reimplement it. Duplicating skip rules creates a maintenance hazard.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5: `epic:list` navigates to `epics/overview.json` but return shape includes `goal` field not present in overview entries

Phase 5 says `epic:list` returns `{ items: Array<{ name: string; status: EpicStatus; goal: string }> }` and notes "the shape matches the overview.json items array." The existing `overviewSchema` in `src/schemas/entities/overview.ts` should be checked — if overview items don't include a `goal` field, the command would need to resolve each epic's `epic.json` individually to get goals. This would change the implementation from a single tree lookup to N lookups. The plan should clarify whether overview items carry `goal` or whether the command needs to join with individual entity files.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 6: Binary regression test uses `bun run build` output path that may not match actual build artifact

Phase 6 says to use "actual binary output path from `package.json` build script — likely `dist/goodplan` or `bin/goodplan`." The actual build script in `package.json` is `bun build --compile src/index.ts --outfile goodplan`, which outputs `./goodplan` in the project root, not `dist/goodplan` or `bin/goodplan`. The test should use `./goodplan` or the absolute path from the project root.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

Round 3's three IMPORTANT issues are all resolved: the `refinement` field now correctly uses the shared `refinementSchema.nullable()`, the architecture amendment is an explicit task item, and the `begin()` signature includes the typed payload parameter. The `submit()` phase redundancy assertion is now specified. The handler Map exhaustiveness uses `satisfies Record<...>`. The remaining issues are: (1) `updated` field semantics need clarification to prevent implementers from refreshing it on every transition; (2) slice-submit path resolution should be explicit since these handlers are pulled forward; (3) `exactOptionalPropertyTypes` interaction with the `BeginPayloadMap` needs a design choice. To reach 10: clarify `updated` semantics, specify path resolution for slice-submit, and resolve the payload parameter ergonomics under strict optional property types.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
