## Issues

**[IMPORTANT]** Missing `completion` boolean in Phase 1 artifact detection
The epic architecture spec (`cli-interaction-conventions.md` line 238) shows a `completion` boolean in the slice artifact shape: `goal`, `exploreComplete`, `plan`, `planRefined`, `implementation`, `completion`, `abandoned`. The plan's Phase 1 task list only includes 6 fields, omitting `completion`. The research file (section "Conflicts / Gaps" item 6) explicitly flags this discrepancy. Add `completion` (check for `completion/` directory existence) to the slice/quest `ArtifactFlags` schema and `detectArtifacts()` implementation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `VERSION_MAJOR_MISMATCH` exit code mismatch with error routing
Phase 4 says exit code 2 for `VERSION_MAJOR_MISMATCH`. The current `exitCodeForError()` in `src/util/output.ts` maps `VALIDATION_*` to 2, `STATE_*` to 3, and everything else to 1. The plan places the new error code in `src/util/errors.ts` but doesn't specify which namespace — and `VERSION_MAJOR_MISMATCH` doesn't start with `VALIDATION_` or `STATE_`. It would default to exit code 1, not 2. Either: (a) name it `VALIDATION_VERSION_MAJOR_MISMATCH` to get exit code 2, or (b) add a `VERSION_*` mapping to `exitCodeForError()`, or (c) add a new error namespace. Option (a) is simplest and consistent with the existing convention (validation/usage errors = exit 2). The plan should specify this explicitly.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 version stamp on `commitState()` violates INV-001 separation of concerns
The task "Update `project.json.version` on writes — stamp on `commitState()` if the CLI version is newer" places version logic inside the Data Layer's `commitState()`. Per INV-001, state mutations go through the state machine, and per the architecture overview, the Data Layer handles "entity CRUD and all filesystem I/O" — not workflow logic. Stamping the version is a policy decision, not I/O. This should happen in the RPC layer (where other cross-cutting concerns like activity logging live) before calling `commitState()`, or as part of the state machine event payload. Move the version stamp to the RPC layer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `formatStatusHuman()` not mentioned in tasks
The research file (section "Implementation Risks" item 5) notes that `formatStatusHuman()` in `src/commands/global/status.ts` (lines 301-324) references `artifacts.architectureFiles`, `artifacts.researchFiles`, etc. The Phase 2 task list updates the schema, the data helper, the status builder, and tests — but does not include a task to update `formatStatusHuman()`. This function accesses `status.artifacts.architectureFiles > 0` (line 302-306) and `status.artifacts.architectureFiles` (line 313) — these will fail to compile after the schema rename. Add a task to update `formatStatusHuman()` to use the new `artifacts.architecture.count` shape.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 task references `src/core/data/artifacts.ts` but tree helpers are in `src/core/tree.ts`
The plan says to create `src/core/data/artifacts.ts` and use `import type` for tree types. The `hasChild()` and `getDir()` helpers needed for artifact detection are exported from `src/core/tree.ts` (re-exported via `src/core/data/tree.ts`). The plan should specify which import path to use. Since artifact detection walks the state tree (pure data, no I/O), placing it in `src/core/data/` is acceptable but the import should come from `../tree.js` (the canonical source), not `./tree.js` (the re-export). Alternatively, place it at `src/core/artifacts.ts` as a peer of `tree.ts` since it's pure logic with no I/O dependency.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 `resolvePathReferences` mapping is incomplete for some phases
The mapping lists `slice:complete` / `quest:complete` returning `{ completion: "<dir>/completion/" }`, but there is no `completion/` directory concept in the current codebase. The existing completion flow writes learnings to `learnings.jsonl`, architecture deltas to `architecture-deltas.jsonl`, and deferred items to the entity JSON. There are no completion-specific directories. The `paths` for complete should either be `{}` or reference the actual output locations (entity JSON path, learnings file, etc.). Verify what the epic architecture spec expects for complete paths.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 4 skips `schema` command but not `state` command
Phase 4 says to skip version compat checking for `--version`, `--help`, `init`, `schema`. The `state` command (added in slice 01) is also a read command that accesses `.project/` — it should work normally with version checking. But the skip-list is missing from the plan as a concrete list that the implementer can reference. Consider specifying the full skip-list (commands that don't read `.project/` state) to avoid ambiguity.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The plan covers all four features and has reasonable phasing, but has several gaps that would cause implementation issues: a missing field from the epic spec (`completion` boolean), an exit code routing bug, a Data Layer/RPC boundary violation, and a missing task for updating the human formatter. The verification sections are concrete and falsifiable with real CLI commands. To reach 9+: fix the four IMPORTANT issues (missing `completion` field, exit code namespace, version stamp layer placement, `formatStatusHuman` task) and clarify the MINOR items.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
