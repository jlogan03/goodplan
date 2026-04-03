# Software Architecture Review — Phase 2 (Persistent Agent SDK Session Rewrite), Iteration 3

## Issues

**[IMPORTANT]** AsyncQueue does not handle multiple concurrent waiters

The `AsyncQueue` class stores a single `resolve` callback. If two consumers call `next()` before an item is pushed, the first waiter's promise is silently replaced and never resolves. In the current usage this is safe because only one `drainLoop` iterates the queue, but the class is exported-by-proximity (it could be extracted) and the single-waiter constraint is not documented or enforced. A second consumer would cause a silent hang.

File: tools/dogfood/utils.ts:339
Resolution: DIRECTLY_ACTIONABLE

Fix: Add a comment on `AsyncQueue` stating it supports exactly one consumer. Alternatively, change `resolve` to a queue of resolvers (`resolvers: Array<...>`) so multiple consumers are safely supported. Given Experimental maturity, a doc comment is sufficient.

---

**[IMPORTANT]** `drainLoop` promise is fire-and-forget with no error surfacing

The background `drainLoop` async IIFE (line 452-478) catches all errors silently. If the Agent SDK session fails for a reason other than abort (e.g., auth failure, network error), `responseResolve` will never be called, causing `ask()` to hang indefinitely until a timeout somewhere upstream. The `close()` method does `void drainLoop` which suppresses the unhandled rejection but also means callers have no way to detect or await a clean shutdown.

File: tools/dogfood/utils.ts:452
Resolution: DIRECTLY_ACTIONABLE

Fix: In the catch block of `drainLoop`, if `responseResolve` is non-null, reject or resolve it with a fallback so `ask()` doesn't hang. For example:
```ts
} catch (err) {
  if (responseResolve) {
    const r = responseResolve;
    responseResolve = null;
    r(""); // empty string triggers fallback-to-first-option in ask()
  }
}
```

---

**[IMPORTANT]** `test-migrate.ts` does not call `close()` on error path

The `close()` call is chained via `.then()` after `main()` resolves, but the `.catch()` handler calls `process.exit(1)` without closing the simulated user. This leaves the Agent SDK session dangling on fatal errors.

File: tools/dogfood/test-migrate.ts:208
Resolution: DIRECTLY_ACTIONABLE

Fix: Call `simulatedUser.close()` in both `.then()` and `.catch()`, or use a `.finally()`:
```ts
main()
  .finally(() => { simulatedUser.close(); })
  .catch((err) => { ... });
```

---

**[MINOR]** `sessionReady` reassignment creates a subtle ordering dependency

In `ask()`, `sessionReady` is reassigned to `responsePromise.then(() => {})` (line 529), and `responsePromise` is also awaited on line 530. Both resolve from the same `waitForResponse()` call — but `sessionReady` captures a `.then()` chain that resolves in a later microtask than the `await`. If `ask()` is called again before the `.then()` microtask runs, the next `ask()` could start before `sessionReady` has updated. In practice this is unlikely (callers await each `ask()`), but the pattern is fragile.

File: tools/dogfood/utils.ts:528
Resolution: DIRECTLY_ACTIONABLE

Fix: Simplify by making `sessionReady` track the full `ask()` promise rather than threading through `waitForResponse`:
```ts
const rawAnswer = await responsePromise;
// sessionReady is already set above — no issue in sequential usage
```
Or add a comment noting that `ask()` calls must be sequential (not concurrent).

---

**[MINOR]** `as` casts in drainLoop bypass type safety

Lines 457 and 465 cast `message` to inline object types rather than using the SDK's discriminated union types (`SDKAssistantMessage`, `SDKResultSuccess`). The `isSuccess` guard defined at line 300 already exists for result messages but isn't used here.

File: tools/dogfood/utils.ts:457
Resolution: DIRECTLY_ACTIONABLE

Fix: Use proper type narrowing or the existing `isSuccess` guard instead of `as` casts. If the SDK types don't provide the needed discriminants, add a `TODO` comment explaining the limitation.

---

**[MINOR]** Removed `@anthropic-ai/sdk` dependency is a positive simplification

The diff removes `@anthropic-ai/sdk` from `package.json` and `bun.lock`, consolidating on `@anthropic-ai/claude-agent-sdk` only. This eliminates the need for `ANTHROPIC_API_KEY` across all test harness scripts. Good dependency direction — the test harness now uses the same SDK as the production skill sessions.

File: package.json:28
Resolution: N/A (positive observation)

## Score: 8/10

The persistent session design is architecturally sound — it replaces stateless per-question LLM calls with a single session that accumulates context naturally, which is the right direction. The `AsyncQueue` is a clean abstraction for bridging push-based test control with the pull-based Agent SDK prompt interface. Removing the `@anthropic-ai/sdk` dependency simplifies the dependency graph.

The score is held back by the `drainLoop` hang risk (IMPORTANT) and the missing `close()` on error paths in `test-migrate.ts` (IMPORTANT). Both are straightforward fixes. The AsyncQueue single-consumer constraint should be documented. Reaching 9+ requires resolving the two IMPORTANT items.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
