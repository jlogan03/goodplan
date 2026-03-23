# Software Architecture Review — Round 2

## Issues

**[IMPORTANT] Phase 1 ROLLUP_LEARNINGS handler path resolution is underspecified for the `from` parameter**
The plan says the handler reads source `learnings.jsonl` filtering by `rollupTo` matching the target (per U2 resolution in round 1). But the `from` field in the event payload is described as a path-based scope (e.g., `"slices/01-auth"`), while `to` is described as a label (e.g., `"project"`). The handler task says `getJsonl` source `learnings.jsonl` — but which `learnings.jsonl`? The `from` path needs to be resolved to `<from>/learnings.jsonl` in the state tree (e.g., `slices/01-auth/learnings.jsonl`). Similarly, `to: "project"` needs to resolve to the root `learnings.jsonl`, and `to: "epic"` needs to resolve to `epics/<activeEpic>/learnings.jsonl`. The plan should specify: (1) how `from` resolves to a state tree path, (2) how `to` resolves (especially for `"epic"` which requires knowing the active epic name), and (3) whether the handler validates that the resolved paths exist. Without this, the implementer must guess the path resolution logic — and getting it wrong would silently write to the wrong location.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 3 status command introduces filesystem I/O (`readdir`) inside a command handler — needs clear boundary**
Round 1 merged feedback (M2) correctly identified that `assembleState()` doesn't enumerate markdown files, so direct `readdir` calls are needed for file-based artifact counts (architecture, research, brainstorm, prototypes). Phase 3 now acknowledges this but doesn't specify where this I/O lives. The status command handler calling `fs.readdirSync` directly would blur the boundary between the Commands layer and the Data Layer. The plan should clarify: either (a) add a Data Layer helper (e.g., `countFiles(projectDir, subpath)`) that the status command calls, keeping I/O in the Data Layer per architecture, or (b) explicitly note this as an acceptable pragmatic exception since status is read-only and these are not structured state files. Without guidance, the implementer may put `readdir` calls inline in the command handler, which creates a precedent for Commands-layer code doing direct filesystem access.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `decision:list` uses `loadState` but `decision:show` pattern is unspecified**
Phase 2 now clarifies (per M5) that `decision:list` uses `loadState` + `getJsonl` from the state tree, following the `epic:list` pattern. But `decision:show` is listed as "read-only" without specifying whether it also uses `loadState` + `getJsonl` (filtering by id) or `assembleState`. Since all other read-only entity commands (`epic:list`, `epic:show`) use `loadState`, `decision:show` should also use `loadState` + `getJsonl` + find-by-id. The plan should be explicit to avoid inconsistency.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 4 `commandRegistry` approach creates a parallel data structure that can drift from actual commands**
Phase 4 specifies building a `commandRegistry` map in `main.ts` alongside `defineCommand` calls rather than introspecting citty internals. This is architecturally sound (avoids reliance on private APIs), but it creates a maintenance risk: when new commands are added in future slices, developers must remember to update both the command registration and the registry. The plan should either: (a) add a verification step (test or build-time check) that ensures the registry matches actual registered commands, or (b) note this as an accepted trade-off with a comment convention. INV-006 specifically requires that schema output reflects actual command signatures — a drifted registry would violate this invariant.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10
Round 1 issues are well-addressed. The plan now correctly uses `"create-decision"` as a dedicated phase, includes the `buildBeginResult` decision branch, specifies `STATE_DUPLICATE_DECISION` error code, adds the `supersededBy` guard, and drops `learning:show` in favor of enhancing `learning:list`. The four-phase structure cleanly separates concerns (state machine, CLI, status, cross-cutting). The remaining issues are: ROLLUP_LEARNINGS path resolution ambiguity (could lead to wrong file writes), the status command's filesystem I/O boundary question, and the `commandRegistry` drift risk. To reach 9+: specify exact path resolution for ROLLUP_LEARNINGS `from`/`to` parameters, and clarify the filesystem access boundary for status artifact counting.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
