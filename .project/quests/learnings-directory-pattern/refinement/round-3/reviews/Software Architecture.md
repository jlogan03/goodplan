## Issues

**[IMPORTANT]** RPC layer writing `.md` files post-reduce but pre-commitState creates a partial-write window

Phase 1 RPC layer task specifies the sequence: (1) derive slug, map to `LearningEventEntry`, (2) build event + `reduce()`, (3) write `.md` files to disk, (4) `commitState()`. This correctly avoids orphan files if `reduce()` fails (Round 2 fix). However, if the process crashes between step 3 (writing `.md` files) and step 4 (`commitState()`), the `.md` files exist on disk but the JSONL entries referencing them do not. On re-run, `assembleState()` will pick up these `.md` files as `MarkdownEntry` nodes in the state tree (dangling files), but no JSONL entry points to them. Conversely, if `commitState()` succeeds but the `.md` write for one of several learnings fails mid-batch, the JSONL has a `file` field pointing to a non-existent `.md` file.

The existing crash-recovery model for `commitState()` (documented in data-layer-api.md) relies on the state cache being written last -- stale cache triggers full `assembleState()` which reconciles from individual files. But `.md` files written by the RPC layer sit outside this reconciliation mechanism because `commitState()` never writes markdown (it's read-only for markdown entries).

Two options: (a) Write `.md` files _after_ `commitState()` -- this means JSONL entries briefly reference non-existent files, but on crash the next `assembleState()` will have correct JSONL and the skill can re-run completion to recreate the files. Or (b) write `.md` files _before_ `commitState()` as planned but document the recovery invariant: dangling `.md` files without JSONL references are harmless (ignored by all code paths that read learnings via JSONL), and JSONL entries with missing `.md` files are detected at read time. Option (b) is what the plan currently describes and is the simpler path -- just add a note about the recovery semantics.

Fix: Add a brief note to the Phase 1 RPC layer task acknowledging the partial-write window and stating that it is acceptable because: (1) dangling `.md` files without JSONL references are inert (all learning reads go through JSONL), and (2) JSONL entries with missing `.md` files will be caught by `assembleState()` as missing `MarkdownEntry` references. Migration (Phase 4) can also clean up orphans.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `commitState()` skips markdown entries -- RPC layer needs explicit `fs.writeFileSync` for learnings `.md` files but plan doesn't specify the write mechanism

The plan says "the RPC layer writes `.md` files to disk in the scope's `learnings/` directory (creating the directory on-demand)." Looking at the actual codebase, `commitState()` explicitly skips markdown entries (`commit.ts` line 101-103: `if (newEntry.type === "markdown") { debug('skip markdown (read-only)'); }`). This means the RPC layer cannot use `setEntry()` to add `MarkdownEntry` nodes to the state tree and rely on `commitState()` to write them -- it must use direct `fs.writeFileSync` calls.

This is architecturally significant: it means the RPC layer needs a direct `fs` import for writing learnings `.md` files, which is a new pattern. Currently the RPC layer delegates all filesystem I/O to the Data Layer via `commitState()`. The plan should explicitly acknowledge this architectural departure and specify the mechanism: (a) use `fs.writeFileSync` + `fs.mkdirSync` directly in the RPC layer (simple, pragmatic, but breaks the RPC-delegates-to-Data-Layer contract), or (b) add a `writeMarkdown(projectDir, treePath, content)` function to the Data Layer that the RPC layer calls (preserves layering). Option (b) is more aligned with the 4-layer architecture.

For rollup, the same issue applies: the RPC layer needs to _copy_ `.md` files between scope directories. This is another filesystem operation that bypasses `commitState()`.

Fix: Add a task to Phase 1 specifying the file-write mechanism. Recommend adding a Data Layer helper (e.g., `writeMarkdownFiles(projectDir, files: Array<{path: string, content: string}>)` and `copyMarkdownFiles(projectDir, copies: Array<{from: string, to: string}>)`) so the RPC layer stays I/O-free except through Data Layer calls. This preserves the dependency direction: RPC -> Data Layer -> Filesystem.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `LearningEventEntry` type introduced but not added to `StateEvent` union in `state-events.ts`

Phase 1 introduces `LearningEventEntry` (with `file` instead of `detail`) for use in state event payloads. Currently `COMPLETE_SLICE` and `COMPLETE_QUEST` events carry `learnings: LearningInput[]` (state-events.ts lines 76, 99). The plan says "the RPC layer maps `LearningInput` to `LearningEventEntry` before building events" -- this means the `StateEvent` union must change from `learnings: LearningInput[]` to `learnings: LearningEventEntry[]`. The plan's Phase 1 task for `slice-complete.ts` correctly says "receives `LearningEventEntry[]` with `file` already set" but there is no explicit task to update `state-events.ts` to change the `learnings` field type on `COMPLETE_SLICE` and `COMPLETE_QUEST` events.

Fix: Add a task to Phase 1 to update `src/schemas/state-events.ts` -- change the `learnings` field on `COMPLETE_SLICE` and `COMPLETE_QUEST` from `LearningInput[]` to `LearningEventEntry[]`. This is the type-level expression of the architectural decision that events carry `file` (not `detail`).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 task for `assembleState` verification is low-value -- `.md` files in a `learnings/` directory are already handled

The plan includes a task: "Verify `assembleState` picks up `learnings/*.md` automatically... the existing `.md` file handling (line 105-107) already does this." This is a verification-only task that the plan already answers in the same sentence. It adds no code change. It's fine to keep as a checklist item but should be marked as a verification step, not a code task, to avoid confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All critical issues from Rounds 1 and 2 have been correctly resolved: state machine purity is preserved (slug derivation is in RPC, not state machine), the post-reduce write sequence is specified, `file` is scope-relative so rollup entries copy verbatim, the Zod discriminated union approach is sound, and `completion/learnings.md` is properly distinguished from the retired monolithic file. The remaining issues are about implementation specifics that the plan leaves implicit: the mechanism for writing `.md` files (since `commitState()` skips markdown), the partial-write recovery semantics, and a missing task to update `state-events.ts`. These are straightforward fixes. To reach 10: specify the Data Layer helper for markdown writes and add the `state-events.ts` update task.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
