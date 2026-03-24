# TypeScript Review: Show/Status Enrichment & Spec Alignment (Round 2)

## Issues

**[IMPORTANT]** Phase 1 `ArtifactFlags` Zod schema placed in `src/schemas/entities/` but artifacts are not entity properties

The plan says to define `ArtifactFlags` Zod schemas in `src/schemas/entities/` with the rationale "artifact flags describe entity properties, not command shapes." However, `src/schemas/entities/` contains entity persistence schemas (`epic.ts`, `slice.ts`, `quest.ts`, `project.ts`, `overview.ts`) -- these define what gets written to `.project/` JSON files. Artifact flags are a derived, read-only projection computed from the state tree; they are never persisted as part of an entity. They are closer to a command output shape (like `StatusResult`) than an entity schema. Place them in `src/schemas/commands/` (alongside `status.ts`) or in a new `src/schemas/commands/artifacts.ts`. This keeps `src/schemas/entities/` pure as the serialization contract for on-disk entities.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `PathReferences` as `Record<string, string>` still underspecified despite round-1 feedback

Round 1 flagged that `Record<string, string>` loses type safety with `noUncheckedIndexedAccess`. The plan now says "Add JSDoc documenting guaranteed keys per phase" on `resolvePathReferences`. This is better than nothing, but the plan's task list still defines the type as `type PathReferences = Record<string, string>` and does not include a task to add JSDoc. The plan should include an explicit task item: "Add JSDoc on `resolvePathReferences` documenting guaranteed keys per phase (e.g., `slice:plan` always returns `{ plan: string }`)." Otherwise the implementer will skip it. Alternatively, since the codebase already uses discriminated unions and specific interfaces extensively (see `BeginPayloadMap`, `SubmitInput`, `CompleteInput` in `types.ts`), define per-phase path interfaces as a union:

```ts
type PlanPaths = { plan: string };
type ImplementPaths = { implementation: string };
// ...
type PathReferences = PlanPaths | ImplementPaths | ... | Record<string, never>;
```

This gives consumers compile-time knowledge of available keys when the phase is known.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 `checkCompatibility` return type `'minor-ahead'` conflates two distinct scenarios

The plan defines four variants: `'compatible' | 'minor-ahead' | 'major-ahead' | 'major-behind'`. However, `minor-ahead` is ambiguous -- it doesn't indicate whether the CLI is ahead or the data is ahead. The spec's compatibility table (`cli-changes.md` lines 188-194) has two minor-mismatch cases: (1) CLI minor > data minor (CLI is newer -- warn, run), and (2) data minor > CLI minor (data is newer -- warn, run). Both produce warnings but with different messages: "consider updating your project data" vs "consider updating your CLI." The plan collapses these into one variant. Since both produce warnings (not errors), this is acceptable if the warning message is generic. But the plan's expected behavior section says "CLI version ahead of data minor version (`minor-ahead`)" and separately "CLI version behind data minor version (`minor-ahead` from data perspective)" -- treating them as the same variant with the same label. Clarify whether `minor-ahead` means "CLI ahead" or "any minor mismatch." If the latter, rename to `minor-mismatch` for clarity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 `detectArtifacts` function signature takes `DirectoryEntry` but plan doesn't show how to obtain entity directory from state tree

The plan says: "resolve the slice's directory in the tree, call `detectArtifacts()`." The show commands use `getJson<Slice>(state, 'slices/<name>/slice.json')` to get the entity JSON. To get the slice's directory, the implementer needs `getDir(state, 'slices/<name>')` from `tree.ts`. This is straightforward but the plan's task for modifying `show.ts` should explicitly mention using `getDir()` to get the directory entry. Currently the task says "resolve the slice's directory in the tree" without naming the helper.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 conditional spread pattern for `exactOptionalPropertyTypes` not specified for `SubmitResult`

The plan specifies: "With `exactOptionalPropertyTypes`, use conditional spread (`...paths !== undefined ? { paths } : {}`) when constructing results, or always include `paths`." This note is only on the `BeginResult`/`CompleteResult` task. Since `resolvePathReferences` always returns an object (never `undefined`, per round-1 fix M6), the conditional spread is unnecessary -- just always include `paths`. But the plan should be consistent and state this once, applying to all three result types. The current plan only mentions the `exactOptionalPropertyTypes` concern in the `PathReferences` type definition task, not in the modify-RPC tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 version stamping in RPC layer: no guard against `project.json` being absent

The plan says: "in the RPC mutation path, after `reduce()` produces new state, check if CLI version > `project.json.version` and update it before calling `commitState()`." But `getJson<Project>(newState, 'project.json')` returns `Project | undefined` due to `noUncheckedIndexedAccess` on tree lookups. If `project.json` is somehow absent (e.g., during `init` which creates it), the version stamp code would need to guard against `undefined`. The `begin('create', { type: 'project' })` path creates `project.json` via the state machine, so it should exist in `newState` after `reduce()`. But the plan should note the guard or explicitly state that version stamping is skipped for the `create` phase (where `oldState` has no `project.json`).

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan addressed all round-1 TypeScript issues effectively. The `completion` boolean, error code prefix, layer placement, tree-based file listing, Zod validation on `parseSemver`, and four-variant compatibility check are all resolved. Three remaining issues: the `ArtifactFlags` schema placement contradicts the existing `src/schemas/entities/` convention (IMPORTANT), the `PathReferences` typing improvement is acknowledged but lacks a concrete task item (IMPORTANT), and the `minor-ahead` naming ambiguity (IMPORTANT). Fixing these three would bring the score to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
