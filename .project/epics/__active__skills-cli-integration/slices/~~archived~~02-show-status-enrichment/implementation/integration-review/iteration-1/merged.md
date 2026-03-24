# Merged Integration Review: Show/Status Enrichment (All 4 Phases)

**Composite Score: 9/10** | Critical: 0, Important: 2, Minor: 4

---

## Overall Assessment

Both reviewers agree: the implementation is strong. Goal alignment is clean across all four phases, layering is correct, no regressions detected, and 941 tests pass. The issues below are improvements to documentation and type clarity, not correctness problems.

---

## Issues

### [IMPORTANT] I1: INV-001 exception for version stamping is undocumented in invariants.md

`bumpDataVersionIfNeeded` in `src/core/rpc/version-stamp.ts` mutates `project.json.version` post-reduce in the RPC layer — a deliberate exception to INV-001 (all mutations through the state machine). The code comment explains the rationale well, but `.project/architecture/invariants.md` has no record of this exception. A future contributor reading the invariant doc will conclude it's a violation and may "fix" it incorrectly.

**Action:** Add a "Known Exceptions" subsection to INV-001 in `.project/architecture/invariants.md`:

```
**Known Exceptions:**
- `project.json.version` is stamped post-reduce in the RPC layer (`src/core/rpc/version-stamp.ts`). Version is infrastructure metadata (tracking which CLI version last wrote the data), not workflow state. The state machine need not validate or be aware of it.
```

---

### [IMPORTANT] I2: `PathReferences` typed as `Record<string, string>` — per-phase key guarantees lost

`PathReferences` (defined in `src/core/rpc/types.ts:109`) is a fully open map. The `resolvePathReferences` JSDoc documents guaranteed keys per phase, but the type system doesn't enforce them. Callers must consult documentation rather than getting compile-time verification. This matches the epic architecture spec and is acceptable for iteration 1 (primary consumers are LLM skills parsing JSON dynamically), but is a known shallow-interface tradeoff.

**Action:** Add a comment on the type definition:
```
// TODO: Consider discriminated union per-phase PathReferences (e.g., PlanPaths, ExplorePaths)
// when consumers need compile-time key guarantees.
```

---

### [MINOR] M1: `resolveEntityDir` silent `undefined` return needs a comment

`resolveEntityDir` in `src/core/rpc/paths.ts:140` returns `undefined` for `project`, `decision`, and `rollup` targets, causing `resolvePathReferences` to return `{}`. This is correct (these targets have no entity directory), but is unexplained. A future developer adding a new target type might miss the pattern.

Both reviewers flagged this independently with the same resolution.

**Action:** Add a brief comment at the `undefined` return site:
```
// These target types have no entity directory — return undefined to yield empty paths.
```

---

### [MINOR] M2: `conventions.md` still references deleted `files.ts`

`.project/conventions.md` line 61 reads: `data/ # assemble/commit/load state tree, tree types, schema registry, files (countFiles helper)`. `src/core/data/files.ts` was deleted in Phase 2. The `countFiles` reference is stale.

**Action:** Remove the `files (countFiles helper)` parenthetical from that line.

---

### [MINOR] M3: `cli-interaction-conventions.md` "Coming in Future Slices" section is stale

`skills/_shared/references/cli-interaction.md` line 255 still lists `show --json` with `artifacts` field as "coming in future slices". Phase 1 implemented it.

**Action:** Remove the entry or move it to a "Recently Added" note.

---

### [MINOR] M4: Redundant `| "complete"` in `resolvePathReferences` signature

`SubmitPhase` already includes `"complete"` as a variant (`types.ts:53`), but `resolvePathReferences` accepts `BeginPhase | SubmitPhase | "complete"` with a redundant explicit `| "complete"`. Harmless, but slightly confusing.

**Action:** Simplify the union to `BeginPhase | SubmitPhase`, or add a comment explaining why the literal is explicitly listed (e.g., `complete()` passes it directly and the redundancy is intentional for clarity).

---

## Strengths

- Exhaustive switches with `never` defaults throughout (`mapToBeginPhase`, `resolveForBeginPhase`, `resolveEntityDir`). Compile-time safety against missing cases.
- Clean layering: `detectArtifacts` is pure (no I/O) at the core layer; `resolvePathReferences` is pure in the RPC layer; version stamp is RPC-layer only with a documented INV-001 exception.
- Tree-based approach for both `collectMdFiles` (status) and `detectArtifacts` (show) avoids redundant filesystem I/O when the tree is already in memory. Deletion of `files.ts` is an improvement.
- `parseSemver` uses `safeParse` + `GoodplanError` (not raw ZodError). `bumpDataVersionIfNeeded` catches parse errors and skips rather than failing mutations.
- Phase ordering is correct: 1.0.0 version boundary established (Phase 4) before the breaking schema change in Phase 2. Convention doc annotates the breaking change with "Changed in 1.0.0".
- No regressions: breaking schema change fully propagated through `formatStatusHuman()` and all tests; `parseGlobalFlags` extension is backward compatible.
- 941 tests passing with dedicated unit tests for each new module and integration tests for the binary.
