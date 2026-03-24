# Software Architecture Review — Phase 1: State Command & Version, Iteration 2

## Code Under Review

Phase: Phase 1: State Command & Version
Changed files: package.json src/commands/global/schema.ts src/commands/main.ts src/index.ts src/commands/global/state.ts src/core/data/serialize.ts src/version.ts tests/unit/commands/state.test.ts tests/integration/state.test.ts

## Issues

**[MINOR]** `await stateCommand` in unit test helper is a no-op await on a non-Promise
The `runState` helper in `tests/unit/commands/state.test.ts` does `const def = await stateCommand` on line 224. `stateCommand` is not a Promise — it is a plain citty `CommandDef` object. `await` on a non-Promise resolves immediately, so the test passes, but this is misleading: a reader scanning for async I/O boundaries will assume `stateCommand` is async (e.g., lazily initialized). The pattern used by `status.test.ts` does not include this extra await. Remove the redundant `await`: `const def = stateCommand`.
File: tests/unit/commands/state.test.ts:224
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Schema registry omits `required: false` for `inline`, `offset`, `limit` on the `state` command
In `src/commands/global/state.ts` the three flags are registered with `required: false` explicitly (lines 35, 40, 45). In `src/commands/global/schema.ts` (lines 122–132) the corresponding registry entries for those same flags omit `required`. The fitness test for INV-006 (`schema-output-accuracy.test.ts`) currently spot-checks only a few commands (`init`, `epic:create`, `slice:plan`, `quest:show`) and does not include `state`, so the inconsistency is not caught. The immediate impact is small — `required: false` is the default — but it breaks the principle that the schema registry is the faithful reflection of command signatures. The registry entries should match the actual `defineCommand` args exactly, including `required: false` on optional string flags.
File: src/commands/global/schema.ts:122
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `__dirname` fallback in `version.ts` is a CommonJS idiom and may be undefined in ESM
`src/version.ts` uses `__dirname` in the `readVersionFallback()` path (line 22). The project is an ES module (`"type": "module"` in `package.json`). In native ESM, `__dirname` is not defined. Bun defines it as a compatibility shim, so this does not fail at runtime under Bun, but it is implicitly relying on a Bun-specific behavior rather than the standard ESM `import.meta.url` + `fileURLToPath` idiom. The code comment says "this code path is dead in compiled builds" and the catch block handles the failure gracefully (returns `"0.0.0-dev"`), so the practical risk is very low. However, if the test suite ever runs in a non-Bun ESM environment, the fallback silently returns the wrong version instead of failing loudly. Consider using `import.meta.url` for correctness:
```typescript
import { fileURLToPath } from "node:url";
const pkgPath = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "package.json");
```
File: src/version.ts:22
Resolution: DIRECTLY_ACTIONABLE

## Architectural Assessment

### Layer boundaries — clean

The `state` command correctly routes as a read-only command: Commands → Data Layer, bypassing RPC and State Machine. This matches the architecture spec (`_overview.md`: "Read-only commands (`list`, `show`) go directly to the Data Layer"). The explicit comment in `state.ts` documenting this routing decision is good practice.

### Invariant compliance — all pass

- **INV-001** (state mutations through state machine): `state` is read-only; no mutation path exists. Pass.
- **INV-002** (deterministic key ordering): key ordering is deferred to `deterministicStringify` at the output boundary; `serializeStateTree` explicitly documents this decision. Pass.
- **INV-003** (state machine purity): no state machine involvement. Pass.
- **INV-004** (stateless commands): `state` is stateless; `resolveProjectDir()` reads from env/cwd but does not rely on prior command invocations. Pass.
- **INV-005** (schema validation on reads): `assembleState()` validates on read; `state` uses it directly. Pass.
- **INV-006** (schema output reflects actual command signatures): `state` is registered in both the command registry (`schema.ts`) and `subCommands` (`main.ts`). The minor `required` inconsistency noted above is cosmetic; the structural registration is correct. Pass with caveat.
- **INV-007** (no silent errors, correct exit codes): the `state` command catches all errors, formats them as JSON (since the command always speaks JSON), and sets `process.exitCode` via `exitCodeForError()`. The pattern correctly reuses `outputError`/`outputUnexpectedError` rather than duplicating the error shape. Pass.

### Module depth — `serializeStateTree` is appropriately deep

`src/core/data/serialize.ts` presents a narrow public API (`serializeStateTree` + `SerializeOptions`) while hiding the recursive dispatch logic for four entry types. The exhaustive `switch` with a `never` guard is the correct pattern for a discriminated union in a Developing subsystem. The module's JSDoc comment documenting the contract as a breaking-change boundary is good.

### `parseNonNegativeInt` placement — acceptable, no action needed

`parseNonNegativeInt` lives in `state.ts` rather than a shared utility. It is only used by `state.ts` today, so this is the right place. If other commands later need pagination, the function should migrate to `src/util/` at that point. The inline documentation (why `parseInt` not `Number()`) adds clarity.

### `--version --json` handling — clean

The version flag is handled pre-dispatch in `src/index.ts` using the newly introduced `VERSION` constant from `src/version.ts`. The build-time injection via `--define` with a runtime fallback for dev/test is the correct pattern for a compiled single-binary CLI. The known gap (version not appearing in `schema --json` output) is explicitly documented in both the code comment and the plan.

### Warning for `--offset/--limit` without `--query` — correct but stdout vs stderr alignment

The `state` command emits the warning to `stderr` (line 87 in `state.ts`). The test for this path (`offset/limit is a no-op without --query`) spies only on `stdout.write`. The `stderr` warning is untested. This is acceptable for a MINOR-level concern (the behavior is correct; the test gap is minor), and is noted here for completeness.

### All 850 tests pass

Confirmed: `bun test` runs 850 tests across 77 files with 0 failures. Fitness functions for INV-006 (`schema-output-accuracy.test.ts`) pass, confirming the parallel registry is consistent.

### Epic architecture alignment

The implementation aligns with the epic architecture (`_overview.md`): `goodplan state --json --query` is identified as the keystone change for the skills-cli-integration epic, giving agents access to every `.project/` file through a single command. The implementation matches this intent.

## Score: 9/10

The implementation is structurally sound, all invariants are respected, layer boundaries are clean, and the full test suite passes. Three minor issues remain: a redundant `await` in the test helper, a cosmetic `required: false` inconsistency between `state.ts` arg definitions and the schema registry, and a Bun-specific `__dirname` shim in the version fallback path. None of these affect correctness or runtime behavior; they are maintainability and correctness hygiene items.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
