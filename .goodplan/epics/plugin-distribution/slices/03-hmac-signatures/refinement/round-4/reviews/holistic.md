# Holistic Review -- HMAC Signatures Plan (Round 4)

## Issues

**[MINOR] Phase 2: Write-read equivalence test (task bullet 4) should specify which state it reads back**
The commit test says "commit state via `commitState()`, read it back via `assembleState()`, verify the signature matches." This is a good test but does not specify that `assembleState()` must be called on the same `projectDir` used for `commitState()` and that the test must compare the `stateSignature` field from the re-assembled `goodplan.json` node against the result of `signStateTree()` called on the re-assembled state (not the original `newState`). The intent is clear to an experienced implementer, but adding "re-assemble from the same `projectDir`, extract `stateSignature` from the project node, call `signStateTree()` on the assembled state, assert they match" would remove any ambiguity about what "matches" means (signature field matches recomputed signature, not signature field matches original signature -- though they should be identical if the round-trip is clean).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3: `status.ts` switch from `assembleState()` to `loadState()` -- the current comment says "deliberately chosen"**
The plan says to switch `status.ts` from calling `assembleState()` directly to calling `loadState()`. The current source code at `status.ts` line 22-23 has an explicit comment: "Uses assembleState() (not loadState) -- deliberately chosen because it handles fresh/zero-state projects gracefully." The plan should note that this comment must be updated or removed when switching to `loadState()`. Additionally, `loadState()` already handles zero-state: line 47-48 returns `ZERO_STATE` when `projectDir === undefined`, and line 50-53 returns `ZERO_STATE` when the directory doesn't exist. So the switch is safe, but the existing comment is a deliberate architectural note that an implementer should not silently delete without understanding why.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4: `atomicWrite` export change is a public API expansion without test coverage of the export itself**
The plan says to export `atomicWrite()` from `commit.ts`. Currently `atomicWrite` is module-private (no `export` keyword). Exporting it is fine for `verify --fix`, but no existing test verifies the export works or that `atomicWrite` behaves correctly in isolation (current tests only exercise it indirectly through `commitState()`). The `verify.test.ts` tests will exercise it through `verify --fix`, which is sufficient coverage. Just noting this for completeness -- no action needed beyond what's already planned.

Resolution: DIRECTLY_ACTIONABLE

No issues found at CRITICAL or IMPORTANT severity.

## Score: 9/10

This plan has reached high quality. All round-3 IMPORTANT issues (the `serializeForHmac` API contradiction, the incremental update verification gap, the missing citty args block, the dual-define explanation) have been resolved with specific, concrete guidance integrated into the plan text. The resolution choices are sound:

- **Option A for `serializeForHmac`** (keep `ProjectState` parameter, use it on the write path too) is the simplest approach and the round-trip risk is genuinely negligible given INV-003 and post-Zod state.
- **HMAC verification on both `incrementalUpdate()` and `assembleState()` paths** closes the tampering gap properly.
- **Citty args definition** is now inline in the plan with the correct shape.
- **Dual-define explanatory note** is thorough and explains both the "why" and the "what breaks if missing."

All round-3 MINOR issues are also addressed: `typeof` guard, test case 9 wording, exhaustive switch removal, `state.ts` kept on `assembleState()` with inline HMAC check, documentation updates for both `commands-api.md` and `data-layer-api.md`, Zod validation before `verify --fix` write, command registration key, schema verification via `--query`, cache staleness UX note, define quoting parity note, and fitness test dependency note.

Phase ordering is logical and dependencies are clear. Success criteria are falsifiable with concrete before/after checks. Verification steps are runnable. The plan correctly handles all documented invariants (INV-001 exception for `verify --fix`, INV-002 via `deterministicStringify`, INV-003 preserved, INV-005 via Zod parse in `verify --fix`, INV-006 via citty args, INV-007 via `GoodplanError`). Fitness tests in Phase 4 cover the core invariant (signature always embedded), regression (signature changes with state), integration (end-to-end command), and negative cases (tampering detection, markdown exclusion).

The remaining minors are clarity improvements that would help an implementer but are not blocking.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
