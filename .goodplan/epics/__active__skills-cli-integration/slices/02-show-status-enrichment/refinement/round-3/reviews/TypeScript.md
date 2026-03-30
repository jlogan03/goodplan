# TypeScript Review — Round 3

## Issues

**[MINOR] Phase 4 `parseSemver` Zod validation may throw unstructured error**
The plan says `parseSemver` should "validate input with `z.string().regex(...)` at the parse boundary; throw a structured error on invalid input." Zod v4's `.parse()` throws a `ZodError`, not a `GoodplanError`. The task should specify catching `ZodError` and re-throwing as `GoodplanError('VALIDATION_INVALID_INPUT', ...)` so the error flows through the structured error path (INV-007). Alternatively, use `.safeParse()` and throw a `GoodplanError` on failure — this is the pattern used elsewhere in the codebase (e.g., `assembleState` validation).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 `detectArtifacts` return type should use separate interfaces, not a union**
The plan says "Entity-type-specific artifact mappings" with different shapes for slice/quest vs epic (epic adds `architectureDefined`, `slicesDefined` and omits some fields). The Zod schemas are described as "Separate schemas for slice/quest and epic artifact shapes." Good. But the task for `detectArtifacts(tree, entityType)` returns a single `ArtifactFlags` type. With the discriminated shapes, the return type should be `SliceArtifactFlags | EpicArtifactFlags` (or use overloaded signatures keyed on `entityType`). Otherwise callers need a type assertion or guard to access epic-specific fields. The overload approach (`detectArtifacts(tree, 'epic'): EpicArtifactFlags` / `detectArtifacts(tree, 'slice'): SliceArtifactFlags`) gives the tightest types at call sites.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan has addressed all round-2 TypeScript issues well. The `noUncheckedIndexedAccess` guards are called out, `import type` with `verbatimModuleSyntax` is specified, `exactOptionalPropertyTypes` conditional spread is resolved (M4 — always include `paths`), and the Zod schema placement is corrected to `src/schemas/commands/`. The two remaining issues are minor refinements — Zod error wrapping and overloaded return types — neither blocks implementation.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
