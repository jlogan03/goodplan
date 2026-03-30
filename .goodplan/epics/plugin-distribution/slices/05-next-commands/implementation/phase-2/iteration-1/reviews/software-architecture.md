# Software Architecture Review — Phase 2: RPC Layer Integration

## Issues

**[CRITICAL]** Helper functions fail `tsc --noEmit` due to missing required `nextCommands` field
The helper functions `buildBeginResult()` (begin.ts:366), `buildSubmitResult()` (submit.ts:199), and `buildCompleteResult()` (complete.ts:258) all have explicit return type annotations claiming to return `BeginResult`, `SubmitResult`, and `CompleteResult` respectively. However, Phase 2 made `nextCommands: NextCommands` a required field on all three result types. The helper functions return objects without this field, causing TypeScript type errors:

```
src/core/rpc/begin.ts(412,2): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'BeginResult'.
src/core/rpc/complete.ts(269,3): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
src/core/rpc/complete.ts(300,8): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
src/core/rpc/complete.ts(400,8): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'CompleteResult'.
src/core/rpc/submit.ts(208,2): error TS2741: Property 'nextCommands' is missing in type '...' but required in type 'SubmitResult'.
```

The code works at runtime because callers spread the base result and add `nextCommands` afterward, but the type annotations are incorrect. Bun's bundler does not perform strict type checking so the build passes, but `tsc --noEmit` fails.

**Fix**: Change helper return types to `Omit<BeginResult, "nextCommands" | "paths">` (and equivalently for submit/complete). This accurately reflects that the helpers return base results that the callers augment with `nextCommands` and `paths`. The `paths` field is already treated the same way (added by the caller, not the helper), so both should be omitted from the helper return type.

File: src/core/rpc/begin.ts:371
File: src/core/rpc/submit.ts:204
File: src/core/rpc/complete.ts:262
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The integration pattern is architecturally sound: each RPC function builds a base result, then augments it with `nextCommands` and `paths`. The `computeNextCommands` function is pure (takes target + status, no I/O), preserving INV-003 and INV-004. Dependency direction is correct (no Commands layer imports in `next-commands.ts`). The `NextCommands` type is required on all result types per spec. The rollup exclusion is correctly handled.

However, the `tsc` type errors are a blocking issue. While the runtime behavior is correct (the spread pattern works), the explicit return type annotations on the helper functions are lies that violate TypeScript strict mode. This must be fixed before the code can pass `tsc --noEmit`.

What would bring it to 9+: Fix the helper return types to use `Omit<ResultType, "nextCommands" | "paths">`, making the contract between helpers and callers explicit and type-safe.

## Summary
- Critical: 1
- Important: 0
- Minor: 0
