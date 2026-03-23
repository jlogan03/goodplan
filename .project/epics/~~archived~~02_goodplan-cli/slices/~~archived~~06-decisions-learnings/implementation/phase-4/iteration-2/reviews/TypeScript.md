# TypeScript Review: Phase 04 — Universal --query & Schema Command (iteration 2)

## Issues

No issues found.

## Score: 9/10

The implementation is clean and well-structured from a TypeScript perspective. Key observations:

- **Type safety**: `OutputArgs` interface correctly uses `boolean | undefined` and `string | undefined` patterns compatible with `exactOptionalPropertyTypes`. The `applyQuery` function properly handles `unknown` types throughout. `z.toJSONSchema()` is called correctly (all-caps JSON, matching Zod v4 API per research).
- **Module design**: Clean extraction of `applyQuery` to `src/util/query.ts` with proper re-export. No circular dependencies introduced. `import type` used consistently for type-only imports with `verbatimModuleSyntax`.
- **noUncheckedIndexedAccess compliance**: `stdinSchemaRegistry[commandName]` correctly checks `!== undefined` before use (line 371 in schema.ts). `commandRegistry.get()` returns `Map<K,V>.get() => V | undefined` and is correctly guarded.
- **Validation layer**: `GLOBAL_FLAG_KEYS` in `validate.ts` correctly includes `"query"` to strip it from stdin validation — prevents `--query` from leaking into Zod schema validation for commands.
- **Schema command**: `stdinSchemaRegistry` is typed as `Record<string, z.ZodType>` which is appropriately general. The `CommandRegistryEntry` and `ArgDefinition` interfaces are minimal and correct. `z.toJSONSchema(stdinSchema, { unrepresentable: "any" })` prevents crashes on unrepresentable types per the research doc.
- **Consistent pattern**: All 44 command files uniformly apply `args.json || args.query` — the `start-*` commands correctly rely on `{ ...args, json: true }` which lets `--query` flow through `output()` naturally.
- **Tests**: Drift detection tests (INV-006) are thorough — bidirectional checks between `commandRegistry`, `subCommands`, and `stdinSchemaRegistry`.

The 1-point deduction reflects that the `commandRegistry` is a manually maintained parallel registry (as called for by the plan given citty's lack of introspection API), which carries inherent drift risk despite the tests mitigating it. This is a reasonable trade-off, not a fixable issue.

`tsc --noEmit` passes clean. All schema tests pass (10/10, 223 assertions).

## Summary
- Critical: 0
- Important: 0
- Minor: 0
