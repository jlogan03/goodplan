# Merged Review: Phase 1 — Update rpc-layer-api.md

## Overall Assessment

Both reviewers agree: all 10 documented divergences have been addressed correctly. Every function signature, type definition, and structural reorganization in the updated doc matches the actual code. No critical or important issues. The only items are minor cosmetic or pre-existing gaps.

## Scores

| Reviewer | Score |
|---|---|
| Generalist | 9/10 |
| repo-tooling-docs | 9/10 |

**Consensus: 9/10**

---

## Issues

### Minor

**M-1: Unicode arrow / em-dash inconsistency** *(both reviewers; no action needed)*
The diff replaced Unicode right-arrow (`→`) with ASCII `->` throughout the routing table. Em-dash (`—`) is still used elsewhere in the doc. The mix is not a correctness issue — cosmetic only. No action required; note for future consistency passes.
Files: `.project/architecture/rpc-layer-api.md:68`
Resolution: DIRECTLY_ACTIONABLE (low priority)

**M-2: `ArchitectureDeltaInput` not defined inline** *(Generalist)*
`CompleteInput` references `ArchitectureDeltaInput[]` but its definition is not provided inline, unlike `LearningInput` which is defined. Pre-existing omission (old doc also omitted it). Could be added for completeness.
Files: `.project/architecture/rpc-layer-api.md` (CompleteInput section)
Resolution: DIRECTLY_ACTIONABLE

**M-3: `SubmitResult.paths?` has no explanatory comment** *(Generalist)*
`BeginResult.paths?` says "always included"; `SubmitResult.paths?` is silent on when it's populated. Minor inconsistency — the `?` typing handles it, but a note would match the style of `BeginResult`.
Files: `.project/architecture/rpc-layer-api.md` (SubmitResult section)
Resolution: DIRECTLY_ACTIONABLE

**M-4: Contracts section doesn't mention caller-provided state for `startContext()`** *(repo-tooling-docs)*
The Context Bundling section correctly documents that `startContext()` receives a `ProjectState` from the caller rather than loading it (testability design). The Contracts section still says "It depends on tree types and Data Layer reads" without this nuance — a reader of only the Contracts section might assume it loads state itself. The Context Bundling section is authoritative; Contracts section is a minor consistency gap.
Files: `.project/architecture/rpc-layer-api.md:424`
Resolution: DIRECTLY_ACTIONABLE

---

## Verification Coverage

All 10 gaps from the research phase were independently verified by the Generalist reviewer against source:

| Gap | Description | Status |
|---|---|---|
| 1 | `projectDir` parameter missing | Fixed |
| 2 | `begin()` generic mechanism undocumented | Fixed |
| 3 | Stale `context?` on `BeginResult`/`SubmitResult` | Fixed |
| 4 | `StatusResult` shape outdated | Fixed |
| 5 | `status()` misplaced in RPC section | Fixed |
| 6 | `startContext()` misplaced in RPC section | Fixed |
| 7 | `WorkflowOptions.force` missing | Fixed |
| 8 | `DecisionSummary.status` / `LearningSummary.file` errors | Fixed |
| 9 | Wrong type names (`Learning[]` / `ArchitectureDelta[]`) | Fixed |
| 10 | Stale slice-03/04 deferral note | Fixed |

---

## Deduplication Notes

- M-1 (arrow inconsistency) was raised by both reviewers — merged into one item.
- No contradictions between reviewers.
- No USER_INPUT items; all issues are directly actionable.
- No domains requiring re-review.
