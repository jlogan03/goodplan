# TypeScript Review — Phase 1: Show Artifact Enrichment

## Issues

**[IMPORTANT]** Duplicate type definitions: interface in `artifacts.ts` vs Zod-inferred type in `schemas/commands/artifacts.ts`

The `SliceArtifactFlags` and `EpicArtifactFlags` interfaces are hand-written in `src/core/artifacts.ts`, while `SliceArtifactFlagsOutput` and `EpicArtifactFlagsOutput` are Zod-inferred in `src/schemas/commands/artifacts.ts`. These define the same shape but are completely disconnected — neither imports from the other, and nothing enforces they stay in sync. Per team conventions, types should be inferred from Zod schemas (`z.infer<typeof schema>`) as the single source of truth to prevent schema/type drift. Either: (a) import the Zod-inferred types in `artifacts.ts` and use them as the return types of `detectArtifacts()`, or (b) add a compile-time assignability check (e.g., `satisfies` or `extends` assertion) ensuring the interface matches the schema. Option (a) is preferred.

File: src/core/artifacts.ts:13
File: src/schemas/commands/artifacts.ts:22
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Zod schemas defined but never imported or used

`src/schemas/commands/artifacts.ts` exports `sliceArtifactFlagsSchema` and `epicArtifactFlagsSchema`, but no file in `src/` imports them. The plan says "These schemas are reused by `show --json` output schemas" but the show commands just spread artifacts into the output object without schema validation. Per INV-005 (schema validation on every read and write) and the plan's own task description, the `show --json` output should be validated against a response schema incorporating these artifact schemas. At minimum, the schemas should be imported and used for output validation, or if output validation is intentionally deferred, add a `// TODO:` comment referencing the deferred slice so the dead export is clearly intentional.

File: src/schemas/commands/artifacts.ts:14
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `entityJson` parameter typed as `{ goal?: string } | undefined` — looser than actual entity types

The `detectArtifacts()` function accepts `{ goal?: string } | undefined` for `entityJson`, but all three call sites pass actual entity objects (`Epic`, `Slice`, `Quest`) which all have `goal: string` (required, `z.string().min(1)`). The optional `goal?` property and `undefined` union are defensive for the pure-function contract, which is reasonable, but with `exactOptionalPropertyTypes: true`, the `goal?: string` means `goal` can be present-and-string or absent — it cannot be `undefined`. This is fine for the current callers since they always pass objects with a required `goal` field. No action needed, just noting the type is intentionally loose for testability (the unit tests pass `undefined` and `{ goal: "" }`).

File: src/core/artifacts.ts:38
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fallback empty directory pattern is repeated three times

All three show commands have identical fallback logic:
```ts
const dir = getDir(state, `entityType/${name}`);
const artifacts = dir !== undefined
  ? detectArtifacts(dir, type, entity)
  : detectArtifacts({ type: "directory", contents: {} }, type, entity);
```

This is a minor duplication. Since `getJson()` already found the entity JSON at the same path, `getDir()` should always succeed (the entity directory must exist for its JSON file to exist). The fallback to an empty directory is unreachable in practice. Consider simplifying with a non-null assertion comment or extracting a small helper, though this is low priority.

File: src/commands/slice/show.ts:42
File: src/commands/epic/show.ts:42
File: src/commands/quest/show.ts:42
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is clean, type-safe, and well-tested. The `detectArtifacts()` function is properly pure with no I/O, uses correct `noUncheckedIndexedAccess` guards on all tree lookups, and the overloaded signatures provide good call-site narrowing. The `as const` on literal `false` returns in the epic branch correctly narrows the type. Tests are thorough with good edge cases (empty goal, explore-skipped, plan-refined as directory, empty implementation dir). What keeps it from 9+: the disconnected type definitions between `artifacts.ts` and `schemas/commands/artifacts.ts` are a real drift risk, and the Zod schemas being dead exports suggests incomplete wiring.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
