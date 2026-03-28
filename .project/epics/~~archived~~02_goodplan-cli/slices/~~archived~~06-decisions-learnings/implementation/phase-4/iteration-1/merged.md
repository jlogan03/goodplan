# Phase 04 Merged Review: Universal --query & Schema Command

**Reviewers:** Generalist (7/10), Software Architecture (6/10), TypeScript (5/10)
**Composite score:** 6/10

---

## Critical

### C1: `--query` broken on all commands except `status` and `schema`

**Raised by:** All 3 reviewers (Generalist C1, Architecture I1, TypeScript C1)

All commands besides `status` and `schema` gate structured output behind `if (args.json)`. When `--query` is passed without `--json`, these commands take the human-readable branch and pass a pre-formatted string to `output()`. The jq expression then runs against a string instead of structured data, producing wrong results or null.

The plan explicitly requires `--query` to auto-imply `--json`. This was done for `status` and `schema` (guard changed to `if (args.query || args.json)`) but not applied to any other command. All ~35-40 other commands need the same `|| args.query` treatment.

**Fix:** Update every command file that has `if (args.json)` to `if (args.json || args.query)`.
**Files:** All command files in `src/commands/` with `if (args.json)` branching -- `epic/list.ts`, `decision/list.ts`, `slice/list.ts`, `quest/list.ts`, `epic/show.ts`, `decision/show.ts`, `slice/show.ts`, `quest/show.ts`, `epic/create.ts`, `decision/create.ts`, `decision/update.ts`, `learning/list.ts`, `learning/rollup.ts`, and all subagent submit commands.
**Resolution:** DIRECTLY_ACTIONABLE

---

## Important

### I1: `globalArgDefs` in schema.ts duplicates `globalArgs` from global-args.ts -- drift risk

**Raised by:** All 3 reviewers (Generalist M3, Architecture I3, TypeScript M1)

The `globalArgDefs` object (schema.ts:79-84) manually re-declares the four global flags already defined in `globalArgs`. Any change to `global-args.ts` will cause silent divergence -- exactly the kind of drift INV-006 is meant to prevent.

**Fix:** Derive `globalArgDefs` programmatically from the actual `globalArgs` object.
**File:** `src/commands/global/schema.ts:79`
**Resolution:** DIRECTLY_ACTIONABLE

### I2: Command registry drift detection (INV-006) only checks key presence, not arg shapes

**Raised by:** Generalist (I1), Architecture (I2)

The drift-detection test (schema.test.ts:147-178) only verifies that registry keys match `subCommands` keys. It does not validate that descriptions, arg types, required/optional, or defaults match the actual command definitions. A command could change a flag from required to optional and the test would still pass.

**Fix:** Extend the drift-detection test to also compare arg key sets (at minimum) or full arg shapes against actual citty command definitions.
**File:** `tests/unit/commands/schema.test.ts:147`
**Resolution:** DIRECTLY_ACTIONABLE

### I3: `stdinSchemaRegistry` has no drift detection test

**Raised by:** TypeScript (I1), Generalist (M1)

`stdinSchemaRegistry` is a manually maintained mapping of command names to Zod schemas. If a new stdin-accepting command is added without a registry entry, the schema output silently omits the stdin schema. There is no test equivalent to INV-006 for stdin schemas.

**Fix:** Add a test that verifies every command which calls `validateInput` (or reads stdin) has a corresponding `stdinSchemaRegistry` entry.
**File:** `src/commands/global/schema.ts:42`
**Resolution:** DIRECTLY_ACTIONABLE

### I4: `outputError` / `outputUnexpectedError` don't apply `--query` to error objects

**Raised by:** Generalist (I2), Architecture (M2), TypeScript (I2)

When `args.query` is set, `outputError` and `outputUnexpectedError` output the full error as JSON but do not apply the jq expression. This breaks the contract that `--query` always filters output. Arguably correct for errors (exceptional path), but undocumented and inconsistent.

Additionally, `output()` can throw `VALIDATION_INVALID_QUERY` if the jq expression is invalid. All callers must handle this -- verify the top-level command runner catches `GoodplanError` from `output()`.

**Fix:** Document the intentional behavior difference, or apply the query to error objects for consistency. Verify error propagation from `output()` is handled.
**Files:** `src/util/output.ts:55`, `src/util/output.ts:74`
**Resolution:** CODEBASE_EXPLORATION

---

## Minor

### M1: Schema command human-readable output is raw JSON

**Raised by:** Architecture (M1)

The `schema` command outputs `JSON.stringify(data, null, 2)` for human mode. While the plan says "Human-readable output: indented JSON," this is inconsistent with every other command which uses picocolors-formatted text. Acceptable since the primary consumer is LLMs using `--json`, but worth noting.

**File:** `src/commands/global/schema.ts:408`

### M2: `buildCommandHierarchy` could be simplified

**Raised by:** TypeScript (M2)

`buildCommandHierarchy` (line 342-348) iterates and pushes to an array. Can be simplified to `Array.from(commandRegistry.values())`.

**File:** `src/commands/global/schema.ts:342`

### M3: Schema command `run` function has duplicated output logic

**Raised by:** TypeScript (M3)

The `run` function has two nearly identical branches (with/without `args.command`), each repeating the same `if (args.json || args.query)` output pattern. Extract to a single branch:

```ts
const data = args.command ? buildCommandDetail(args.command) : buildCommandHierarchy();
if (args.json || args.query) { output(data, args); }
else { process.stdout.write(`${JSON.stringify(data, null, 2)}\n`); }
```

**File:** `src/commands/global/schema.ts:401`

### M4: Schema test uses empty string instead of undefined for optional args

**Raised by:** Generalist (M2)

In `schema.test.ts:19-20`, `command: args.command ?? ""` passes empty string when absent. Works only because empty string is falsy in JS. Using `undefined` would be clearer.

**File:** `tests/unit/commands/schema.test.ts:19`

---

## Consensus Assessment

The core `applyQuery` extraction and `output()` integration is well-implemented. The schema command with its registry, stdin schema introspection, and INV-006 drift detection is solid foundational work. However, the phase's central goal -- "lift `--query` to shared `output()`" -- is incomplete because ~35-40 command callers still gate on `args.json` only, making `--query` effectively broken outside of `status` and `schema`. The duplicate `globalArgDefs` introduces exactly the kind of drift the schema system is designed to prevent.

**To reach 9+:** Fix the `args.json || args.query` guard across all commands, derive `globalArgDefs` from source, add stdin schema drift detection, and strengthen registry drift tests to compare arg shapes.
