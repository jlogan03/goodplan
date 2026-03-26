## Issues

**[IMPORTANT]** Phase 1 `ArtifactFlags` Zod schema placed in `src/schemas/entities/` but consumed only by Commands layer

The plan says to define `ArtifactFlags` Zod schemas in `src/schemas/entities/`. The `src/schemas/entities/` directory contains schemas for persisted domain entities (Epic, Slice, Quest, Project, Overview). Artifact flags are not persisted entities — they are a computed projection derived from the state tree for command output enrichment. Placing them in `entities/` blurs the distinction between stored data schemas and computed output schemas.

The `show --json` output schema (needed for INV-006 `schema` command compatibility) naturally belongs in `src/schemas/commands/` alongside the existing `statusResultSchema`. The `ArtifactFlags` schema is a component of that output schema. Peer schemas like `statusResultSchema` already live in `src/schemas/commands/status.ts`.

Fix: Define `ArtifactFlags` Zod schemas in `src/schemas/commands/` (e.g., `src/schemas/commands/show.ts` or a shared `src/schemas/commands/artifacts.ts`). This keeps entity schemas for persisted data and command schemas for output shapes, consistent with the existing pattern where `statusResultSchema` lives in `src/schemas/commands/status.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 `paths` on `CompleteResult` overlaps with existing `architecturePaths` — no coexistence strategy documented

The plan adds `paths?: PathReferences` to `CompleteResult`, which already has `architecturePaths?: { currentArchitecture: string; targetArchitecture?: string }`. The round-1 review flagged this (M2) and requested clarification of the relationship. The plan-refining.md now mentions "`architecturePaths` deprecation is out of scope for this slice" in the Phase 3 task for `PathReferences`, but does not document the coexistence strategy.

The risk: `architecturePaths` uses state-tree-relative paths (per the JSDoc on `CompleteResult`), while `paths` uses absolute filesystem paths. Two path-reference mechanisms with different path semantics on the same result type is confusing for consumers (skills). Without a clear deprecation plan, consumers won't know which to use.

Fix: Add an explicit note to Phase 3 stating: (1) `paths` is the canonical forward-looking mechanism using absolute paths; (2) `architecturePaths` is retained for backward compatibility with its existing relative-path semantics; (3) new consumers should use `paths`; (4) `architecturePaths` removal is deferred to a future slice. This can be a single sentence in the Phase 3 overview or a comment in the task description.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 version stamp in RPC layer applies to all three mutation paths — risk of inconsistent implementation

The plan says to stamp `project.json.version` "in the RPC mutation path (`begin()`, `submit()`, `complete()`), after `reduce()` produces new state, check if CLI version > `project.json.version` and update it before calling `commitState()`." This means the same logic must be added in three separate locations (`begin.ts`, `submit.ts`, `complete.ts`). The round-1 review correctly moved this from Data Layer to RPC Layer, but the plan doesn't consolidate the stamping logic.

Currently, `buildBeginResult`, `buildSubmitResult`, and `buildCompleteResult` are the result-building functions in each file. The version stamp is not a result-building concern — it's a state-modification concern that happens between `reduce()` and `commitState()`. With three call sites, there's a risk one gets missed or implemented differently.

Fix: Extract a shared helper (e.g., `stampVersionIfNeeded(newState: ProjectState, cliVersion: string): ProjectState` in `src/core/rpc/version-stamp.ts` or inline in `types.ts`) that all three mutation paths call. The plan's task description should mention this consolidation to avoid triple-implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 compatibility check placement — plan says "after resolving project dir, before executing command" but `resolveProjectDir()` is called inside each command's `run()`, not in dispatch

The plan says: "in the main dispatch path (after resolving project dir, before executing command)." But looking at the current code, `resolveProjectDir()` is called inside each command's `run()` function (e.g., `slice:show` line 32). The main dispatch path in `src/index.ts` calls `runCommand()` which delegates to the command's `run()`. There's no centralized `resolveProjectDir()` call in the dispatch path.

The plan also says "skip check by wrapping in try-catch on `resolveProjectDir()`" which implies calling it a second time in the dispatch path (it's already called in each command). This would add a redundant filesystem call.

Fix: Either (a) add a new `resolveProjectDir()` call in the dispatch path (before `runCommand()`), accepting the minor redundancy since the result is used only for version checking, or (b) move version checking into a shared command middleware/hook that runs at the start of each command's `run()`. Option (a) is simpler and consistent with the plan's intent. The plan should be explicit about which approach to use.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all five IMPORTANT issues from round 1 correctly: artifact detection moved to `src/core/artifacts.ts`, version stamping moved to RPC layer, error code prefixed with `VALIDATION_`, `completion` boolean added, state tree used instead of raw I/O. The phase ordering rationale is sound. The remaining issues are: ArtifactFlags schema placement inconsistency with existing patterns (IMPORTANT), missing coexistence strategy for `paths` vs `architecturePaths` (IMPORTANT), and two MINOR consolidation/placement clarifications. Fixing the two IMPORTANT items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
