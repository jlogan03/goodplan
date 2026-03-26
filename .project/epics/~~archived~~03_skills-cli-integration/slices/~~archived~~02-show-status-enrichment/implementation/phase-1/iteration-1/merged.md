# Merged Review — Phase 1: Show Artifact Enrichment

**Scores:** Generalist 9/10 · Software Architecture 8/10 · TypeScript 8/10
**Issue counts:** Critical: 0 · Important: 3 · Minor: 2

---

## Important Issues

### I-1: Disconnected type definitions — drift risk between `artifacts.ts` and `schemas/commands/artifacts.ts`
**Reviewers:** TypeScript

`SliceArtifactFlags` and `EpicArtifactFlags` are hand-written interfaces in `src/core/artifacts.ts`. `SliceArtifactFlagsOutput` and `EpicArtifactFlagsOutput` are Zod-inferred types in `src/schemas/commands/artifacts.ts`. These define the same shape but are completely disconnected — nothing enforces they stay in sync.

Per project conventions, `z.infer<typeof schema>` is the single source of truth. Either: (a) import the Zod-inferred types into `artifacts.ts` and use them as `detectArtifacts()` return types (preferred), or (b) add a compile-time `satisfies` / `extends` assignability check.

Files: `src/core/artifacts.ts:13`, `src/schemas/commands/artifacts.ts:22`
Resolution: DIRECTLY_ACTIONABLE

---

### I-2: Zod artifact schemas are dead exports — no runtime usage and no TODO marker
**Reviewers:** Generalist, Software Architecture, TypeScript (all three flagged)

`sliceArtifactFlagsSchema` and `epicArtifactFlagsSchema` in `src/schemas/commands/artifacts.ts` are not imported anywhere. The plan states "These schemas are reused by `show --json` output schemas" and the plan tasks include "Validate `show --json` output against the response schema (INV-005/INV-006)." Neither condition is met. The integration tests check individual fields manually rather than validating against the schema.

The plan notes output schema exposure is deferred, making this acceptable for now — but the dead export should be annotated with a `// TODO:` comment referencing the deferred slice so it is clearly intentional rather than an oversight.

File: `src/schemas/commands/artifacts.ts:14`
Resolution: DIRECTLY_ACTIONABLE (add TODO comment); full wiring deferred

---

### I-3: `completion` boolean omitted — discrepancy with epic target architecture
**Reviewer:** Software Architecture

`cli-interaction-conventions.md` (line 238) specifies a `completion` boolean in the artifact shape for slices. `cli-changes.md` (lines 110–124) omits it. The implementation follows `cli-changes.md`. The research file (item 6) flagged this discrepancy during planning and it was left unresolved.

Since the convention doc is the consumer-facing spec that skills will code against, the omission must be resolved explicitly: either add `completion` now (detecting a completion marker file) or explicitly document why it is excluded from the current slice.

File: `src/core/artifacts.ts:107`
Resolution: USER_INPUT — requires decision before closing the slice

---

## Minor Issues

### M-1: Unreachable fallback to empty directory repeated at three call sites
**Reviewers:** Generalist, Software Architecture, TypeScript (all three flagged)

All three show commands (`slice/show.ts:42`, `epic/show.ts:42`, `quest/show.ts:42`) contain the same pattern:
```ts
const dir = getDir(state, `entityType/${name}`);
const artifacts = dir !== undefined
  ? detectArtifacts(dir, type, entity)
  : detectArtifacts({ type: "directory", contents: {} }, type, entity);
```
Because `getJson()` already succeeded for the same entity path, `getDir()` on that path is always defined — the fallback branch is unreachable in practice. This is duplication and dead code simultaneously.

Options: simplify with a non-null assertion + comment, make `detectArtifacts` accept `DirectoryEntry | undefined` and handle the empty-dir case internally, or extract a small helper. Low priority.

Files: `src/commands/slice/show.ts:42`, `src/commands/epic/show.ts:42`, `src/commands/quest/show.ts:42`
Resolution: DIRECTLY_ACTIONABLE (low priority)

---

### M-2: No `quest:show` integration test
**Reviewer:** Generalist

Integration tests cover `slice:show` and `epic:show` but not `quest:show`. The plan acknowledges this as conditional ("if none exists, create a temporary quest first or skip") and the implementation pragmatically skipped it. The quest code path is identical to slice, so coverage is acceptable for now.

Resolution: DIRECTLY_ACTIONABLE (low priority — consider adding in a future iteration)

---

## What Is Working Well

- Module placement is correct: `src/core/artifacts.ts` as a pure tree interpreter peer to `tree.ts`
- Dependency direction is correct: Commands imports from core; no imports from `src/core/state/`
- `detectArtifacts()` is genuinely pure — no I/O, deterministic, testable with in-memory fixtures
- Overloaded signatures provide correct call-site type narrowing
- `noUncheckedIndexedAccess` guards present on all `contents[]` lookups
- `import type` used correctly throughout per `verbatimModuleSyntax`
- `as const` on literal `false` returns in the epic branch correctly narrows type
- Unit test coverage is thorough: all/none, both entity types, planRefined file vs directory, empty implementation dir, non-directory implementation entry, empty goal string, undefined entityJson
- 3-param signature `(tree, entityType, entityJson)` is a correct improvement over the 2-param plan spec (goal detection requires entity data)
- Alphabetical property ordering consistent in both interfaces and return objects
