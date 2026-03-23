# Generalist Review — Phase 04, Iteration 2

**Score: 9/10** | Critical: 0, Important: 0, Minor: 2

## Summary

All three focus areas are clean. The iteration successfully addressed the prior critical and important issues.

## Focus Area 1: `--query` universality

**Verdict: Complete and consistent.**

- All 45 command files now use `args.json || args.query` (verified via exhaustive grep — zero remaining `args.json` without `|| args.query`).
- `globalArgs` in `src/commands/global-args.ts` includes `query` as an optional string.
- `GLOBAL_FLAG_KEYS` in `src/util/validate.ts` correctly strips `query` before schema validation.
- The `output()` function in `src/util/output.ts` handles `--query` with correct precedence: query > quiet > json > human.
- The start-* subagent commands use `output(bundle, { ...args, json: true })`, which correctly passes the `query` field through via the spread, so `--query` works on those too.
- `status.ts` properly removed its local `applyQuery` and `--query` arg definition, delegating to the shared path.

## Focus Area 2: INV-006 drift detection test

**Verdict: Sound.**

The test in `tests/unit/commands/schema.test.ts` has three layers of drift detection:

1. **Forward check** (lines 149-163): every key in `mainCommand.subCommands` must exist in `commandRegistry`.
2. **Reverse check** (lines 165-179): every key in `commandRegistry` must exist in `subCommands`.
3. **Arg key check** (lines 181-210): for each command, registry arg keys (excluding global args) must match the actual citty command's arg keys.

This is a proper bidirectional sync check. The `stdinSchemaRegistry` drift test (lines 213-256) uses a hardcoded list of stdin commands, which is the one weakness — but it includes a reverse check, so adding a new entry to the registry without updating the list would also fail.

## Focus Area 3: Error outputs query-filtered

**Verdict: Correct.**

Both `outputError()` and `outputUnexpectedError()` in `src/util/output.ts` check `args.query` first, apply `applyQuery` to the structured error object, and output via `deterministicStringify`. This means `--query '.error.code'` on a failed command returns the error code as JSON — correct behavior per the architecture.

## Minor Issues

### M-1: `stdinSchemaRegistry` drift test uses hardcoded list

**File:** `tests/unit/commands/schema.test.ts:218-237`

The `stdinSchemaRegistry` drift test relies on a manually maintained `stdinCommands` array. If a developer adds a new stdin-accepting command and forgets to update both the registry AND this test list, the test won't catch the drift. The command registry drift test avoids this by importing the actual `subCommands` object. Consider a similar approach: grep/import the actual `validateInput` call sites or derive from the registry itself.

**Severity:** Minor — the reverse check partially mitigates this, and the pattern is documented.

### M-2: `schema` command human-readable output is raw JSON

**File:** `src/commands/global/schema.ts:407-408`

Without `--json` or `--query`, the schema command outputs `JSON.stringify(data, null, 2)` directly. This is intentional per the plan ("JSON Schema is already structured data — no custom formatter needed"), but it bypasses the `output()` function entirely, writing directly to `process.stdout`. This is fine for now but means `--quiet` has no effect on the human path. Not a bug since schema is a developer/introspection tool, but worth noting.

**Severity:** Minor — edge case, documented behavior.
