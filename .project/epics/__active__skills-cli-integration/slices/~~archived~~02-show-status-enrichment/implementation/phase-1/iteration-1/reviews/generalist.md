# Phase 1 Review: Show Artifact Enrichment

**Reviewer:** Generalist
**Score:** 9/10

## Summary

Clean, well-structured implementation that closely follows the plan. The `detectArtifacts()` pure function, Zod schemas, command integrations, and tests are all solid. One minor deviation from the plan (adding `entityJson` parameter) is a correct improvement.

## Plan Adherence

All tasks marked complete and verified:

- `src/core/artifacts.ts` created as peer to `tree.ts` with JSDoc module comment, overloaded signatures, correct `import type` usage
- `src/schemas/commands/artifacts.ts` created with separate slice/epic schemas, `z.infer` exports
- All three show commands modified: `slice/show.ts`, `epic/show.ts`, `quest/show.ts`
- Unit tests cover all specified fixtures (all/none, both entity types, planRefined file vs directory, empty implementation dir)
- Integration tests cover `--json` includes artifacts, non-JSON omits artifacts

**Deviation:** Plan specifies 2-param overloaded signatures `(tree, entityType)` but implementation uses 3 params `(tree, entityType, entityJson)`. This is correct — the plan itself says "goal (check entity JSON goal field)" which requires the entity data. The plan's signature was underspecified.

## Findings

### Important (1)

1. **Zod schemas defined but unused at runtime.** `src/schemas/commands/artifacts.ts` defines `sliceArtifactFlagsSchema` and `epicArtifactFlagsSchema` but neither is imported anywhere except potentially by tests. The plan says "These schemas are reused by `show --json` output schemas" and the integration tests should "Validate `show --json` output against the response schema (INV-005/INV-006)." The integration tests do not validate against the schema — they check individual fields manually. The schemas exist but serve no validation purpose yet. This is not blocking (the plan also notes output schema exposure is deferred), but the schemas are dead code until consumed.

### Minor (2)

1. **Fallback empty directory pattern is duplicated.** All three show commands have the identical pattern:
   ```ts
   const dir = getDir(state, `<path>`);
   const artifacts = dir !== undefined
     ? detectArtifacts(dir, "<type>", entity)
     : detectArtifacts({ type: "directory", contents: {} }, "<type>", entity);
   ```
   This fallback to an empty `DirectoryEntry` could be encapsulated inside `detectArtifacts` itself (accept `DirectoryEntry | undefined`) or extracted as a helper. Not a bug, just mild duplication across three call sites.

2. **No quest integration test.** The integration tests cover `slice:show` and `epic:show` but not `quest:show`. The plan notes quest testing is conditional ("if none exists, create a temporary quest first or skip"), and the implementation pragmatically skipped it. Acceptable given the identical code path to slice, but worth noting.

## Cross-File Integration

- `getDir` from `tree.ts` returns `DirectoryEntry | undefined` — callers handle both cases correctly
- `detectArtifacts` is only imported by the Commands layer (verified via grep), honoring the JSDoc constraint
- Entity JSON types (`Epic`, `Slice`, `Quest`) all have `goal: string` fields, compatible with the `{ goal?: string }` parameter type
- `output({ ...entity, artifacts }, args)` correctly spreads artifacts into the JSON output without affecting human-readable output (which takes the else branch)

## Code Quality

- TypeScript strictness respected: `noUncheckedIndexedAccess` guards present on all `contents[]` lookups
- `import type` used correctly per `verbatimModuleSyntax`
- `EpicArtifactFlags` uses `false` literal types for `plan`/`planRefined`/`implementation` — provides compile-time guarantees
- Alphabetical property ordering in both interfaces and return objects — consistent style
- Unit test coverage is thorough: positive, negative, edge cases (empty goal string, undefined entityJson, file-vs-directory planRefined, empty implementation dir, non-directory implementation entry)
