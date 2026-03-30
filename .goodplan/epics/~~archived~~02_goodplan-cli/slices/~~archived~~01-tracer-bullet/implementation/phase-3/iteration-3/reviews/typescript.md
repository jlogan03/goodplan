# TypeScript Reviewer — Phase 3: Command Framework (Iteration 3)

## Round 2 Verification

Two items were flagged in round 2 and reportedly fixed:

1. **CRITICAL — Unknown commands exit 0** — Fixed. A pre-dispatch check in `main()` now calls `getKnownSubcommands(mainCommand)` before dispatching to `runCommand`. Running `bun src/index.ts badcommand` now produces `Error: Unknown command: badcommand` on stderr, exit 2. Running with `--json` produces structured JSON on stdout, exit 2. The fix is correct and behaviorally verified.

2. **IMPORTANT — Stale/incorrect comment in `error-output.ts`** — Fixed. The comment now accurately describes the union type and `exactOptionalPropertyTypes` behavior. The old incorrect claims about `string | undefined` and the ability to pass `detail: undefined` explicitly are gone.

The round 2 MINOR items (missing `Record` detail tests and `validateInput` structured detail) are also fixed: `errors.test.ts` adds a `Record` detail test at line 13, `output.test.ts` adds a JSON serialization test with structured detail at line 83.

---

## Issues

**[CRITICAL]** `meta.alias` property access does not exist on `CommandMeta` — type errors in compiled output

`getKnownSubcommands` in `src/index.ts` accesses `def?.meta?.alias` (lines 34–38), but `CommandMeta` in citty's type definitions does not include an `alias` field:

```
interface CommandMeta {
  name?: string;
  version?: string;
  description?: string;
  hidden?: boolean;
}
```

`tsc --noEmit` produces four errors on this:

```
src/index.ts(34,18): error TS2339: Property 'alias' does not exist on type 'Resolvable<CommandMeta>'.
src/index.ts(35,43): error TS2339: Property 'alias' does not exist on type 'Resolvable<CommandMeta>'.
src/index.ts(35,61): error TS2339: Property 'alias' does not exist on type 'Resolvable<CommandMeta>'.
src/index.ts(35,79): error TS2339: Property 'alias' does not exist on type 'Resolvable<CommandMeta>'.
```

The code compiles via `bun` (which skips type-checking) so the runtime alias lookup silently returns `undefined` — meaning aliases are never registered. The fix is either: (a) remove the alias registration code since `subCommands: {}` currently has no subcommands with aliases anyway, or (b) if aliases will be needed, extend `CommandMeta` via module augmentation and document the approach. The correct fix for now is (a) — the alias path is dead code until real subcommands exist. The project must be type-error-free against its own `tsconfig.json`.

File: src/index.ts:34-38
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `runCommand(mainCommand, { rawArgs })` — TS2379 error under `exactOptionalPropertyTypes`

`tsc --noEmit` produces a second error:

```
src/index.ts(92): error TS2379: Argument of type 'CommandDef<...>' is not assignable to parameter of type 'CommandDef' with 'exactOptionalPropertyTypes: true'.
```

The `mainCommand` is typed with a concrete args generic. `runCommand` expects `CommandDef` (erased to `CommandDef<ArgsDef>`). Under `exactOptionalPropertyTypes: true`, the `setup` callback's parameter type narrows the concrete args, creating a contravariance conflict with `CommandDef<ArgsDef>`. The project's `tsconfig.json` has `exactOptionalPropertyTypes: true` — this is a real type error in the checked configuration. It does not affect runtime behavior (Bun runs it fine) but means the codebase fails its own type checker.

Fix options: cast `mainCommand as CommandDef` at the call site, or restructure the call. Since the issue is a citty/`exactOptionalPropertyTypes` compatibility gap, casting is acceptable here with a brief comment explaining why.

File: src/index.ts:105
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `validateInput` detail is still a flattened string, not structured

Carried from iteration 2. `validateInput` passes `result.error.message` as `detail` (a plain concatenated Zod error string). Now that `detail` accepts `Record<string, unknown>`, this could pass `result.error.flatten()` to give JSON consumers structured field-level errors. This is not a correctness issue — the current behavior is valid — but the broadened `detail` type was motivated by structured validation errors, and `validateInput` is the primary producer of those errors.

File: src/util/validate.ts:31-36
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The CRITICAL behavior regression from iteration 2 (unknown command exit 0) is confirmed fixed. The stale comment is gone. The missing `Record` detail tests are present and correct. The remaining blockers are type correctness: `tsc --noEmit` fails with two errors (`meta.alias` not in `CommandMeta`, and `exactOptionalPropertyTypes` incompatibility with `runCommand`). Both are directly fixable. With those two resolved, this reaches 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 1
