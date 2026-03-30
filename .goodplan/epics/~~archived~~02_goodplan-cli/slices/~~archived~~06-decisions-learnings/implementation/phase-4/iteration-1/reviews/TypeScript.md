# TypeScript Review: Phase 04 — Universal --query & Schema Command

## Issues

**[CRITICAL]** `--query` silently broken on all commands except `status` and `schema`

All commands other than `status` and `schema` still branch on `if (args.json)` to decide between structured and human-readable output. When a user passes `--query` without `--json`, these commands take the human-readable branch and pass a pre-formatted string to `output()`. The `output()` function then applies the jq expression to a plain string instead of structured data, producing wrong results.

For example, `epic:list` (line 32): `if (args.json) { output({ items: overview.items }, args); } else ...` — passing `--query '.items[0].name'` without `--json` will apply jq to a picocolors-formatted string, not the items array.

The fix: every command that branches on `args.json` needs to also check `args.query`, i.e. `if (args.json || args.query)`. This is exactly what `status.ts` and `schema.ts` already do. All ~40 commands with `if (args.json)` need updating.

File: src/commands/epic/list.ts:32 (and ~40 other command files — see `grep -n 'if (args.json)' src/commands/`)
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `stdinSchemaRegistry` duplicates knowledge — INV-006 drift risk for stdin schemas

The `stdinSchemaRegistry` in `schema.ts` is a manually maintained `Record<string, z.ZodType>` mapping command names to their Zod schemas. If a new command with stdin is added but this registry is not updated, the schema output will silently omit the stdin schema. There is a drift-detection test for the command registry (line 147-178 in schema.test.ts), but no equivalent test verifying that every command which actually reads stdin has a corresponding entry in `stdinSchemaRegistry`.

Consider adding a test that imports each command's source and checks whether it calls `validateInput` (or reads stdin), then asserts a matching `stdinSchemaRegistry` entry exists. Alternatively, move the schema registration to be co-located with the command definition.

File: src/commands/global/schema.ts:42
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `outputError` unreachable `args.query` branch

In `output.ts` line 55, `outputError` checks `args.json || args.query`. However, if `--query` is passed and the query itself throws `VALIDATION_INVALID_QUERY`, the error is thrown from within `output()` (line 26-28). The caller's catch block would then call `outputError` with `args.query` set. But at that point, `outputError` would try to serialize the error as JSON to stdout — which is correct behavior. However, if the jq expression is invalid, the error from `applyQuery` propagates up uncaught from `output()`. The caller must catch it. This is fine architecturally but worth noting: `output()` can throw, and all callers must handle this. Verify that the top-level command runner catches `GoodplanError` from `output()`.

File: src/util/output.ts:55
Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** `globalArgDefs` in `schema.ts` duplicates `globalArgs` from `global-args.ts`

The `globalArgDefs` record (schema.ts:79-84) manually duplicates the descriptions and types from `globalArgs`. If `globalArgs` changes (e.g., a new global flag or description update), `globalArgDefs` must be updated in lockstep. Consider deriving `globalArgDefs` from `globalArgs` programmatically, e.g.:

```ts
const globalArgDefs: Record<string, ArgDefinition> = Object.fromEntries(
  Object.entries(globalArgs).map(([k, v]) => [k, { type: v.type, description: v.description, ...('default' in v ? { default: v.default } : {}) }])
);
```

File: src/commands/global/schema.ts:79
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `buildCommandHierarchy` could be simplified

`buildCommandHierarchy` (line 342-348) iterates `commandRegistry.values()` and pushes to an array. This can be simplified to `Array.from(commandRegistry.values())`.

File: src/commands/global/schema.ts:342
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Schema command run function has duplicated output logic

The `run` function in `schemaCommand` (lines 401-419) has two nearly identical branches for `args.command` vs no command, each with the same `if (args.json || args.query) { output(...) } else { JSON.stringify(...) }` pattern. Consider extracting the output logic:

```ts
const data = args.command ? buildCommandDetail(args.command) : buildCommandHierarchy();
if (args.json || args.query) {
  output(data, args);
} else {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}
```

File: src/commands/global/schema.ts:401
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The core extraction of `applyQuery` to a shared module and integration into `output()` is well-done. The schema command implementation with registry, stdin schema introspection, and INV-006 drift detection tests is solid. However, the critical issue that `--query` is effectively broken on all commands except `status` and `schema` (because they still branch on `args.json` only) is a fundamental gap — the feature was "lifted to shared output()" but the ~40 callers still gate on `args.json` to decide whether to pass structured data. To reach 9+: fix the `args.json || args.query` check across all commands, add stdin schema drift detection, and reduce duplication between `globalArgDefs` and `globalArgs`.

## Summary
- Critical: 1
- Important: 2
- Minor: 3
