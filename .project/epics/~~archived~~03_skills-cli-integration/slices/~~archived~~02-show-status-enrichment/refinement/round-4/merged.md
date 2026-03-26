# Round 4 Merged Feedback

Scores: Holistic 9/10 · Software Architecture 9/10 · TypeScript 9/10 · TUI-CLI 10/10 · API Contract 9/10

No critical issues. Three important/minor issues remain, all directly actionable.

---

## Important Issues

### [IMPORTANT-1] Phase 2 file arrays must replicate dual-directory aggregation (Holistic + API Contract overlap)

The current `countArtifacts()` aggregates counts from both the project-level directories (`architecture/`, `research/`, etc.) and the active epic's directories (`epics/<name>/architecture/`, etc.). When switching to tree-based file listing with `{ count, files }` objects, the `files` arrays must similarly aggregate across both locations. The plan's Phase 2 tasks say "walk `DirectoryEntry.contents` keys from the assembled state tree" but do not mention the dual-directory aggregation. If the implementer only walks one location, file arrays will be incomplete and counts will regress silently.

**Fix:** In the Phase 2 task "Update `src/commands/global/status.ts`", explicitly state that tree-based file listing must replicate the current dual-directory aggregation (project-level + active epic). Specify that `files` arrays use state-tree-relative paths (relative to `.project/`, e.g., `"architecture/_overview.md"`, `"epics/skills-cli-integration/architecture/cli-changes.md"`) so consumers can distinguish origin directory. This also resolves the minor path-format ambiguity (Holistic MINOR-1) — state-tree-relative paths are consistent with `architecturePaths` on `CompleteResult`.

### [IMPORTANT-2] Phase 4 version stamping mutates state after `reduce()` — needs explicit INV-001 decision (Software Architecture)

`stampVersionIfNeeded()` is specified as a post-`reduce()` transformation applied in `begin()`, `submit()`, and `complete()` before `commitState()`. This means the RPC layer mutates `project.json` content outside the state machine's `reduce()` — the entity INV-001 says must flow through the reducer. The state machine would be unaware of the version field change, creating a divergence between `reduce()` output and what gets committed.

**Fix:** The plan must explicitly choose one of:
- **(a) Add `STAMP_VERSION` event** to the state machine so the update flows through `reduce()` — strict INV-001 compliance, more complexity.
- **(b) Document as intentional INV-001 exception** — version is metadata, not workflow state; the state machine need not validate it. This is the pragmatic path, but it must be a conscious, documented decision, not a silent violation.

Either option is acceptable; the plan must state the choice and rationale.

### [IMPORTANT-3] Convention doc `completion` field not removed from `cli-interaction-conventions.md` example (API Contract)

Round-3 I1 removed `completion` from `ArtifactFlags` (now 6 fields: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `abandoned`) and its resolution explicitly required updating the `cli-interaction-conventions.md` example at line 238, which still shows `"completion": false`. The Phase 2 convention doc task does not include this cleanup. Skills reading the convention doc will expect a field that doesn't exist.

**Fix:** Add to the Phase 2 convention doc task: update the `show --json` artifact shape example in `cli-interaction-conventions.md` to remove `completion` and show only the 6 current fields.

---

## Minor Issues

### [MINOR-1] Path format ambiguity in Phase 2 `files` arrays — resolved by IMPORTANT-1

The path format for `files: string[]` (bare filename vs. tree-relative vs. absolute) was unspecified. Addressed by IMPORTANT-1's fix: use state-tree-relative paths (relative to `.project/`).

### [MINOR-2] `stampVersionIfNeeded` should use `ProjectState` not `State`, and note `setEntry()` usage (TypeScript)

The plan specifies `stampVersionIfNeeded(state: State, cliVersion: string): State`, but all RPC-layer functions operate on `ProjectState` (which is `DirectoryEntry`). Using a vague `State` alias creates confusion. Additionally, writing back after reading via `getJson<Project>(newState, 'project.json')` (which returns `Project | undefined` under `noUncheckedIndexedAccess`) requires `setEntry()` from `tree.ts` to preserve the immutable tree pattern — this should be noted in the plan.

**Fix:** Change the signature to `stampVersionIfNeeded(state: ProjectState, cliVersion: string): ProjectState`. Add a note that the write-back uses `setEntry()`.

### [MINOR-3] `parseGlobalFlags` `--quiet` duplication is intentional — document it (TypeScript)

`--quiet` will be parsed twice: once in the pre-dispatch `parseGlobalFlags()` (for the compat check, which runs before citty) and once by citty via `globalArgs`. This is architecturally justified but silently duplicated. If `--quiet` is renamed, both parsers must be updated.

**Fix:** Add a brief inline comment in the implementation noting this is intentional duplication and that the two parsers must stay in sync.

### [MINOR-4] `detectArtifacts` consumption boundary should be documented (Software Architecture)

`detectArtifacts()` is placed in `src/core/artifacts.ts` as a peer to `src/core/tree.ts`. Unlike `tree.ts` (shared across all layers), `detectArtifacts` is only consumed by the Commands layer. Without a comment, a future caller might import it into the state machine.

**Fix:** Add a JSDoc comment to `src/core/artifacts.ts` clarifying it is Commands-layer-only and must not be imported by the state machine.

### [MINOR-5] `paths?` field JSDoc should document "always populated" intent (Software Architecture)

The type is `paths?: PathReferences` (optional for backward compat) but `resolvePathReferences` always returns an object. A future reader may add unnecessary `paths` guards.

**Fix:** Add a JSDoc on the `paths?` field: "Always populated by the RPC layer; typed optional for backward compatibility with consumers that don't expect it."

### [MINOR-6] Phase 4 version comparison semantics — reference `parseSemver` explicitly (API Contract)

The plan says `stampVersionIfNeeded` checks "if CLI version > `project.json.version`" without specifying comparison semantics. String comparison fails for multi-digit versions (`1.10.0` vs `1.9.0`).

**Fix:** Clarify that "greater than" uses `parseSemver` output and compares `(major, minor, patch)` tuples numerically, consistent with `checkCompatibility`.

---

## What's Working Well

- All 11 round-3 issues resolved; TUI-CLI scores 10/10 with no remaining concerns.
- Phase ordering rationale (1, 3, 4, 2) is well-articulated — the breaking schema change boundary is clearly motivated.
- Verification sections are concrete: CLI commands with `jq` filters, positive and negative scenarios for Phase 4.
- `noUncheckedIndexedAccess` guards, `import type` usage, and overloaded `detectArtifacts` signatures are all correctly specified.
- Version warning output via `process.stderr.write()` (not stdout), suppressed in `--json`/`--quiet` modes, is correct for scripting consumers.
- `VALIDATION_VERSION_MAJOR_MISMATCH` error code maps to exit code 2 via `exitCodeForError()` — consistent with INV-007.

---

## Resolution Checklist

| # | Severity | Description | Phase |
|---|----------|-------------|-------|
| 1 | IMPORTANT | Dual-directory aggregation + path format in `files` arrays | Phase 2 |
| 2 | IMPORTANT | INV-001 exception decision for `stampVersionIfNeeded` | Phase 4 |
| 3 | IMPORTANT | Remove `completion` from `cli-interaction-conventions.md` example | Phase 2 |
| 4 | MINOR | `stampVersionIfNeeded` signature: `ProjectState` + `setEntry()` note | Phase 4 |
| 5 | MINOR | `parseGlobalFlags` `--quiet` duplication comment | Phase 4 |
| 6 | MINOR | `detectArtifacts` Commands-layer-only JSDoc | Phase 1 |
| 7 | MINOR | `paths?` field JSDoc "always populated" | Phase 3 |
| 8 | MINOR | Version comparison: reference `parseSemver` tuple comparison | Phase 4 |
