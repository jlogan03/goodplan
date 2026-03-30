# TypeScript and JavaScript Review — Phase 03: Epic State Machine

## Issues

**[IMPORTANT]** Non-null assertions after `guardEpicStatus` could be replaced by narrowing return
Throughout `epic-phase.ts`, `epic-refine.ts`, `epic-lifecycle.ts`, and `epic-verify.ts`, the pattern is: call `guardEpicStatus(epic, ...)`, check for error, then use `epic!` on all subsequent lines. The guard function confirms `epic !== undefined` internally but TypeScript cannot narrow through the return value. The `!` assertions are safe given the guard's semantics, but they add 30+ non-null assertions across the codebase that would be unnecessary if `guardEpicStatus` returned the narrowed `Epic` on success (e.g., returning `Epic | StateError` and checking via `isStateError`). Same pattern exists with `guardSliceStatus` and `guardQuestStatus` in `slice-submit.ts`. This is a pervasive readability and maintenance concern but not a correctness bug since the guard logic is sound.
File: src/core/state/transitions/helpers.ts:45
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `appendActivityLog` uses `project.updated` as timestamp, not the event's `ts`
The `appendActivityLog` helper (line 75-91 in helpers.ts) reads `project?.updated` to get a timestamp. For events that do not carry their own `ts` field (e.g., `BEGIN_EXPLORE`, `COMPLETE_EXPLORE`, etc.), this means the activity log entry's timestamp will be whatever `project.updated` was set to by a *previous* event (likely `INIT_PROJECT` or `ACTIVATE_EPIC`). This is deterministic and pure, but the timestamps will be stale and misleading — every explore/architecture/slicing phase transition will carry the project creation timestamp rather than the actual time the event occurred. The RPC layer injects `ts` on events that produce timestamped entities, but the activity log entries for phase transitions will have incorrect timestamps. Consider either: (a) adding `ts` to all events at the RPC layer, or (b) having the RPC layer update `project.updated` before calling `reduce()`, or (c) accepting this as a known limitation and documenting it. This is an architectural question about timestamp fidelity.
File: src/core/state/transitions/helpers.ts:82
Resolution: USER_INPUT

**[MINOR]** `as never` cast in `reduce()` for handler dispatch
Line 102 of `reduce.ts` uses `event as never` to pass the event to the handler. This is necessary because `Map.get()` returns the general `Handler` type and loses the discriminant narrowing. The `satisfies` check at the record level ensures correctness at compile time. The `as never` is the standard pattern for this and is acceptable, but a comment explaining *why* `never` works here (every `Extract<StateEvent, {type: T}>` is assignable from `never`) would help maintainability. The existing comment is adequate but could be more precise.
File: src/core/state/reduce.ts:102
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `override` field uses `?` optional syntax — verify `exactOptionalPropertyTypes` interaction
The `StateEvent` union members with `override` use `override?: boolean` (e.g., `COMPLETE_REFINE_ARCHITECTURE`). With `exactOptionalPropertyTypes: true`, this means `override` can be omitted or set to `boolean`, but NOT set to `undefined`. The handler code checks `input.override === true` which correctly handles the omitted case (evaluates to `undefined === true` which is `false`). The `RefinementInput` interface declares `override?: boolean | undefined` (helpers.ts:121) which explicitly includes `undefined`. This is a subtle mismatch: `StateEvent` allows omission but not explicit `undefined`, while `RefinementInput` allows both. In practice, this works because the event's `override` field is spread into `RefinementInput` and the `=== true` check handles both cases. But the types are technically inconsistent — `RefinementInput` is more permissive than the event definition. Consider aligning them.
File: src/core/state/transitions/helpers.ts:121
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `handlerRecord` satisfies expression uses mapped type instead of `Record`
The `satisfies` expression uses `{ [K in StateEvent["type"]]: Handler<K> }` rather than a plain `Record<StateEvent["type"], Handler>`. This is the correct choice — using `Record` would lose the per-key `K` binding needed for `Handler<K>` to enforce that each handler accepts the correctly narrowed event type. This is well done and the right pattern. (Not an issue — noting for completeness that this was evaluated.)
File: src/core/state/reduce.ts:81
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
Strong implementation. Type safety patterns are correctly applied: the `Extract<StateEvent, {type: T}>` narrowing is correct throughout, the `satisfies` exhaustiveness pattern catches missing handlers at compile time, `noUncheckedIndexedAccess` is respected (all array/map accesses handle `undefined`), `verbatimModuleSyntax` is satisfied (all imports correctly use `import type` vs `import`), and the state machine maintains purity (no I/O imports). The non-null assertion pattern after guard functions is the main area for improvement — it's safe but verbose and could be eliminated with a narrowing guard return type.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
