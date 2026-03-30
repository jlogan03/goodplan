# Learnings: Tracer Bullet

## citty runMain vs runCommand — must use runCommand for exit code control

`runMain` catches all errors and calls `process.exit(1)` — no hook exists to differentiate exit codes. The architecture requires exit 2 (validation) and exit 3 (state). Additionally, citty doesn't throw `E_UNKNOWN_COMMAND` when `subCommands` is an empty `{}` object, requiring manual pre-dispatch detection. Future slices adding commands should test that the pre-dispatch check stays in sync with registered subcommands.

## exactOptionalPropertyTypes creates contravariance conflicts with citty's generics

citty's `CommandDef<ArgsDef>` generic combined with `exactOptionalPropertyTypes: true` causes type errors in `runCommand` and `showUsage` calls. Requires `as unknown as CommandDef` casts with documenting comments. This is a citty/TS strictness compatibility gap, not a project bug. If citty is upgraded, re-check whether the casts are still needed.

## process.env.X = undefined assigns the string "undefined"

Must use `delete process.env.X` in test cleanup. This caused actual test failures — Bun doesn't coerce `undefined` to deletion like some runtimes. Establish as a project testing convention: always use `delete` for env var cleanup.

## deterministicStringify is a cross-layer utility, not a data layer function

Both the data layer (json.ts) and the commands layer (output.ts) need deterministic JSON. Placing it in `src/core/data/` created a cross-layer import violation caught by architecture review. It belongs in `src/util/json.ts`. Future utility code that serves multiple layers should start in `src/util/`.

## Main runner integration tests are needed — regression proved it

Removing the pre-dispatch unknown command check (to fix an alias issue) silently broke `badcommand` handling (exit 0 instead of exit 2). The regression was only caught by code review, not by the test suite. `src/index.ts` main runner needs process-spawning integration tests. This is in scope for slice 08 (integration tests).

## conventions.md repo structure is already stale

It lists `src/core/context/`, `src/commands/build/`, `src/commands/resource/` which don't match the architecture docs. Implementation created `src/commands/global-args.ts` (not in any doc). Reconcile conventions.md with architecture and actual repo structure — either as part of slice 02 or as a standalone fix.
