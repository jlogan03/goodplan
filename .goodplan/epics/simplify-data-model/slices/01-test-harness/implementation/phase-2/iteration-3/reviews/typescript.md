# TypeScript Review — Post-Phase fix: persistent Agent SDK session rewrite

Iteration 3

Changed files: `tools/dogfood/utils.ts`, `tools/dogfood/test-simulated-user.ts`, `tools/dogfood/test-integration.ts`, `tools/dogfood/harness.ts`, `tools/dogfood/validate.ts`, `tools/dogfood/test-onboard.ts`, `tools/dogfood/test-migrate.ts`

## Issues

**[IMPORTANT]** AsyncQueue silently drops items when `push()` is called with `undefined`

The `[Symbol.asyncIterator]().next()` method uses `if (queued !== undefined)` to check if something was dequeued from the array. If a caller ever pushes `undefined` (which the generic `T` allows), the queue will treat it as "nothing dequeued" and either block or return `done: true`. Since `T` is instantiated as `SDKUserMessage` in production, this is unlikely to be hit — `SDKUserMessage` is an object type. However, the queue is a generic reusable class and the contract is silently broken for `T = string | undefined` or similar unions.

A safer check is `this.queue.length > 0` instead of checking the shifted value against `undefined`.

File: tools/dogfood/utils.ts:364
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `close()` in `test-migrate.ts` and `test-onboard.ts` not called on error path

Both `test-migrate.ts` and `test-onboard.ts` create `simulatedUser` at module scope and call `close()` only in `.then()`. If `main()` (or `negativeTest()` in onboard) throws, the `.catch()` handler calls `process.exit(1)` without closing the session. This leaves the Agent SDK session dangling until the process exits. Compare with `test-simulated-user.ts` and `test-integration.ts` which correctly use `finally` blocks.

File: tools/dogfood/test-migrate.ts:208
File: tools/dogfood/test-onboard.ts:283
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Potential deadlock: only one pending `responseResolve` at a time

The drain loop stores a single `responseResolve` callback. If the assistant responds with multiple `assistant` messages (e.g., tool-use followed by text), only the first text block resolves the promise — subsequent text blocks are silently discarded because `responseResolve` is `null` after the first resolution. Conversely, if the assistant emits no text block at all (pure tool-use turn), `responseResolve` stays set and `ask()` hangs indefinitely until the next turn produces text.

This is mitigated by `maxTurns: 200` and the `abortController`, so it will not hang forever, but it could produce incorrect or missing answers. At Experimental maturity this is acceptable, but worth documenting the assumption that every push produces exactly one assistant text response.

File: tools/dogfood/utils.ts:453-461
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `as` casts in drain loop could use type narrowing

The drain loop uses `as` casts to access message properties:
```ts
const msg = message as { message?: { content?: Array<{ type: string; text?: string }> } };
```
and
```ts
const result = message as { subtype: string; total_cost_usd?: number };
```

These bypass TypeScript's type checker. Since `SDKMessage` is a discriminated union on `type`, narrowing with `message.type === "assistant"` should give access to the correct variant. If the SDK types don't expose the needed fields directly, a type guard would be safer than raw `as` casts.

File: tools/dogfood/utils.ts:455-456
File: tools/dogfood/utils.ts:464
Resolution: CODEBASE_EXPLORATION

**[MINOR]** `void drainLoop` in `close()` — floating promise reference

```ts
close(): void {
    messageQueue.end();
    abortController.abort();
    // drainLoop will exit naturally when the session ends
    void drainLoop;
}
```

The `void drainLoop` expression evaluates the promise but doesn't await it. This is correct for fire-and-forget cleanup, but the comment says "drainLoop will exit naturally" — it actually exits when the abort signal fires or the queue ends, whichever happens first. Since both are triggered here, this is fine. The `void` is good practice to suppress floating promise lint warnings.

No action needed — this is just a note for completeness.

File: tools/dogfood/utils.ts:553
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Empty catch block in drain loop

```ts
} catch {
    // Session ended (abort or error) — expected during close()
}
```

Per project CLAUDE.md, empty catch blocks should "log or rethrow." The comment explains the intent, but a `console.debug` or conditional log (e.g., only log if the error is not an AbortError) would make unexpected failures diagnosable.

File: tools/dogfood/utils.ts:475-477
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The core design — `AsyncQueue<T>` feeding an `AsyncIterable<SDKUserMessage>` into a persistent `query()` session — is a clean pattern that solves the stateless-to-stateful migration well. The `SDKUserMessage` construction matches the SDK's type signature. Cost tracking via incremental deltas is correct. All consumer scripts properly add `cwd` and `close()`.

What would bring it to 9+: (1) Fix the `close()` leak in `test-migrate.ts` and `test-onboard.ts` error paths. (2) Add a comment or guard documenting the single-response-per-push assumption. (3) Use `this.queue.length > 0` in the async iterator instead of checking against `undefined`.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
