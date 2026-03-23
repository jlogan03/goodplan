# Software Architecture Review — Phase 1: Decision & Rollup State Machine

## Issues

**[IMPORTANT]** ROLLUP_LEARNINGS semantics diverge from COMPLETE_SLICE/COMPLETE_QUEST inline rollup — source entries are removed
The new `ROLLUP_LEARNINGS` handler (rollup-learnings.ts:86-91) removes rolled-up entries from the source `learnings.jsonl` after copying to the target ("idempotency" design). However, the existing inline rollup in `COMPLETE_SLICE` and `COMPLETE_QUEST` does NOT remove entries from the source — it copies them to the target scope while leaving the per-slice/per-quest learnings intact. This means:
1. If `COMPLETE_SLICE` rolls up learnings inline (entries with `rollupTo: ["project"]`), those entries remain in `slices/<name>/learnings.jsonl`.
2. If `ROLLUP_LEARNINGS` is later invoked on the same source, it would find those entries again and attempt to re-roll them up (duplicate).
3. Conversely, the removal behavior in `ROLLUP_LEARNINGS` means per-scope learnings become incomplete after explicit rollup — the source scope loses its record.

This is a semantic inconsistency between two rollup mechanisms. The plan text (task for rollup-learnings.ts) explicitly says "Idempotency: after copying matched entries to target, remove them from source" — so the implementation matches the plan. But the plan introduces a behavioral divergence from the existing inline rollup pattern. If both mechanisms can target the same source, there's a risk of duplicate entries or data loss depending on invocation order.

This is not a bug in the implementation (it matches the plan), but the architectural inconsistency should be flagged. If `ROLLUP_LEARNINGS` is only ever called on scopes that did NOT go through `COMPLETE_SLICE`/`COMPLETE_QUEST` inline rollup, the divergence is harmless. If they can overlap, the system needs a clear rule about which mechanism owns rollup.
File: src/core/state/transitions/rollup-learnings.ts:86-91
Resolution: USER_INPUT

**[MINOR]** `validTransitions` re-allocated on every UPDATE_DECISION call
In `handleUpdateDecision` (decision.ts:98-101), the `validTransitions` Record and its inner `Set` objects are allocated fresh on every call. Since this is a pure function operating on an immutable tree, it's functionally correct. However, following the existing pattern of `DECISION_TERMINAL_STATUSES` (line 56, module-level `Set`), these could be module-level constants.
File: src/core/state/transitions/decision.ts:98-101
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `resolveTargetPath` returns `string | StateError` — could use the guard pattern
Other transition files use guard helpers that return `Entity | StateError` with `isStateError()` narrowing. `resolveTargetPath` returns `string | StateError` and narrows with `typeof targetPathOrErr !== "string"`. This works but is the only place in the transition layer that uses typeof narrowing instead of `isStateError()`. Minor consistency concern — not a functional issue.
File: src/core/state/transitions/rollup-learnings.ts:21-44
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Implementation is clean, well-structured, and aligns with the architecture spec. Module boundaries are correct (state machine purity preserved, no I/O imports). The handler-per-file pattern is followed. The O(n^2) fix is correct and well-tested. Test coverage is thorough with good edge cases. The one IMPORTANT issue is a semantic question about the interaction between two rollup mechanisms rather than a structural defect. All tests pass (53 tests, 130 assertions). The `satisfies` exhaustiveness check in reduce.ts ensures compile-time completeness. No invariant violations detected (INV-001 through INV-007 all preserved).

## Summary
- Critical: 0
- Important: 1
- Minor: 2
