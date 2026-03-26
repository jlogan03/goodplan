# Holistic Review — Round 2

## Issues

**[IMPORTANT]** `resolveEntityJsonPath` slice case update is in-scope but task placement is ambiguous

The plan's Phase 1 task for updating `Target` in `src/core/rpc/types.ts` says `resolveEntityJsonPath` "must update its slice case to `epics/${target.epic}/slices/${target.name}/slice.json`" — this is correct and the function is in-scope (it's in `types.ts`, not `paths.ts`). However, the Scope Boundary section lists `src/core/rpc/begin.ts`, `src/core/rpc/complete.ts`, `src/core/rpc/paths.ts` as out of scope, without mentioning `src/core/rpc/types.ts`. The task body correctly handles it, but an implementer reading the scope boundary first could mistakenly skip the entire `rpc/` directory. Clarify in the Scope Boundary section that `src/core/rpc/types.ts` is in-scope (it contains `Target` and `resolveEntityJsonPath`).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `verifications` type bug fix description references wrong type

Phase 1 task for `buildInitialEpicJson` says to fix `verifications: [] as string[]` to `[] as Verification[]`. Codebase check: the current code at line 449 is indeed `verifications: [] as string[]`, while `epicSchema` defines `verifications: z.array(verificationSchema)` where `Verification` is `{ description, status, addedDuring, modifiedDuring }`. The fix is correct, but the plan should note this requires importing the `Verification` type into `helpers.ts` (currently not imported — verified by checking line 1-14 of helpers.ts). Without the import, `tsc` will fail on this change.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `rollup-learnings.ts` source path construction needs updating but task is too vague

Phase 2 lists "Update `rollup-learnings.ts`: Resolve scope paths using nested format" but the handler's `event.from` is a caller-supplied scope string (e.g., `"slices/01-auth"`). The state machine doesn't control what callers pass — the RPC layer constructs this string. Since RPC is out of scope (slice 02), the rollup handler itself may not need changes in this slice. If `event.from` arrives as `"epics/my-epic/slices/01-auth"` (updated by RPC in slice 02), the handler already works correctly (`${event.from}/learnings.jsonl` produces the right path). Clarify whether this task is a no-op verification (like the epic-lifecycle.ts task) or requires actual code changes. If it's a no-op, mark it as verification-only to avoid confusion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Before-check for slice events could match epic events

Phase 1 Expected Behavior says `grep "epic:" src/schemas/state-events.ts | grep -c ""` should return "only 1 match" for slice events, but the grep has no slice-specific filter. Looking at the actual file, `epic:` appears on ~16 epic lifecycle events plus `CREATE_SLICE`. The plan's note "(this grep also matches epic lifecycle events — count only slice event types for accuracy)" acknowledges this, but the "before" check itself is unusable as written since it will return ~17, not 1. Either add a slice-specific grep (e.g., `grep -E "PLAN|REFINEMENT|IMPLEMENTATION|COMPLETE_SLICE|ABANDON_SLICE" | grep "epic:"`) or remove this check in favor of a more targeted assertion.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 fixture update task lists only 4 fixture directories but integration test fixtures may also need updating

Phase 2 says "Move slice entries from `slices/` to `epics/<epic>/slices/` in fixture state trees (affects same 4 fixture directories plus any integration test fixtures)." The "plus any" is vague. Codebase check: `tests/fixtures/` has exactly `epic-activated`, `epic-created`, `slice-in-progress`, `slice-refining-max-rounds`. The research file `affected-apis.md` lists `tests/integration/migrate.test.ts` as referencing `sliceSequence` — if that test has inline fixture data, it would need updating too. Enumerate the integration test fixtures explicitly or add a grep-based verification step to catch any missed fixture paths.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1 issues have been comprehensively addressed — the plan is substantially improved. The DeferredItem path correction, Target cascade documentation, atomicity ordering constraint, phase boundary clarification, @ts-expect-error strategy, and out-of-scope RPC notation are all well-handled. Remaining issues are clarity/precision problems that could cause implementer confusion but would not cause incorrect code if the implementer reads carefully. Fixing the import gap (Verification type), clarifying the rollup-learnings scope, and tightening the scope boundary note would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
