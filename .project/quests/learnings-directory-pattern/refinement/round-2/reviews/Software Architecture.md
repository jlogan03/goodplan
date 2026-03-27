## Issues

**[IMPORTANT]** State machine derives slugs and sets `file` paths -- but slug derivation requires I/O-adjacent logic

Phase 1 tasks say `slice-complete.ts` and `quest-complete.ts` should "derive slug from `summary`" and "set `file` to `learnings/<slug>.md`." Slug derivation itself is pure (string manipulation), but the plan also says the RPC layer derives the slug and writes the `.md` file. This creates a duplication: slug derivation happens in both the state machine (to set the `file` field in JSONL) and the RPC layer (to write the `.md` file). If the two implementations diverge, the JSONL `file` field won't match the actual filename on disk.

Looking at the plan overview, the intent is clear: "The RPC layer extracts `detail`, derives the slug, writes the `.md` file to disk, and constructs the `StateEvent` with `file` instead of `detail`." But the Phase 1 tasks for `slice-complete.ts` and `quest-complete.ts` contradict this by saying the state machine should "derive slug from `summary`" and "set `file` to `learnings/<slug>.md`." The state machine should receive the `file` field already populated in the event (set by the RPC layer), not derive it internally.

Fix: Remove slug derivation from the `slice-complete.ts` and `quest-complete.ts` task descriptions. The state machine simply stores whatever `file` value is on the event payload. The RPC layer is the single owner of slug derivation + `.md` file writing + constructing the event with the correct `file` path.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `rollup-learnings.ts` task says "update JSONL entries only" but must also remap `file` paths

The Phase 1 task for `rollup-learnings.ts` says: "Update `handleRollupLearnings()` to create JSONL entries at the target scope with `file` paths pointing to the target's `learnings/` directory." This is correct conceptually, but the current `handleRollupLearnings()` (line 72-103) simply copies `LearningEntry` objects from source to target without modifying field values. When entries are rolled up with a `file` field like `learnings/schema-changes.md`, the state machine would need to rewrite the `file` path to point to the target scope's `learnings/` directory (e.g., from `epics/foo/slices/bar/learnings/schema-changes.md` to `epics/foo/learnings/schema-changes.md`). But `file` is a relative path within the scope (just `learnings/<slug>.md`), not an absolute tree path -- so the filename portion doesn't change, only the scope context changes.

The plan should clarify: (a) `file` is a scope-relative path (always `learnings/<slug>.md`), so the state machine can copy entries verbatim -- the `file` path is the same at every scope level, and (b) the RPC layer handles the actual file copy from the source scope's filesystem directory to the target scope's filesystem directory. If `file` is scope-relative, this is clean. But this means the plan's task description "create JSONL entries at the target scope with `file` paths pointing to the target's `learnings/` directory" is misleading -- the file paths don't change, only their location in the tree changes.

Fix: Clarify that `file` is scope-relative (e.g., `learnings/schema-changes.md`), so rolled-up JSONL entries keep the same `file` value. The RPC layer copies the actual `.md` file between scope directories on disk. Add this clarification to the overview.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 RPC layer task describes writing `.md` files *before* `reduce()` -- but event needs `file` field

The RPC layer task says: "(1) extracts `detail` from the input payload, (2) derives the slug, (3) writes the `.md` file to disk ... (4) constructs the `StateEvent` with `file` instead of `detail`." This means the `.md` file is written to disk *before* `reduce()` is called. If `reduce()` returns a `StateError` (e.g., verification failed), the `.md` file is already on disk as an orphan. The current RPC pattern is: load state -> build event -> reduce -> commit. Writing files pre-reduce breaks this pattern.

Two viable approaches: (a) Write `.md` files pre-reduce and clean up on error (adds complexity, breaks the clean pattern), or (b) have the RPC layer derive the slug and set the `file` field on the event but defer the actual `.md` file write to after `reduce()` succeeds. The `detail` text is still available in the input payload at that point.

Fix: Reorder the RPC layer steps: (1) derive slug, (2) build event with `file` field (no disk write yet), (3) call `reduce()`, (4) on success, write `.md` files to disk, then (5) `commitState()`. This preserves the existing load-reduce-commit pattern and avoids orphan files.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `slice-complete.ts` and `quest-complete.ts` are listed as separate tasks but the learnings processing is identical

Both handlers transform `LearningInput[]` to `LearningEntry[]` using the same pattern (verified: both use `LearningInput[]` in the event type). The plan could note that a shared helper function (e.g., in `transitions/helpers.ts`) would reduce duplication. The current code already has shared helpers like `appendActivityLog`. This isn't blocking but is a missed deepening opportunity.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 schema tightening step has no rollback path

Phase 4 says "make `file` required and remove the `detail` optional field." If migration misses an entry (e.g., a corrupted scope), this will cause INV-005 validation failures on the next CLI invocation. The plan should include a verification step between migration and schema tightening: validate all JSONL files pass the tightened schema before committing the schema change.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The revised plan successfully addresses all critical issues from Round 1. The 4-layer architecture is now respected: `.md` file writing is in the RPC layer (not the state machine), the schema transition is non-breaking, and `completion/learnings.md` is properly distinguished from the retired monolithic file. The remaining issues are about internal consistency within the plan -- the overview correctly describes the RPC-layer-owns-file-writing pattern, but individual Phase 1 task descriptions for state machine handlers still contain slug derivation logic that contradicts the overview. The pre-reduce file write ordering also needs a minor adjustment. To reach 9+: (1) align Phase 1 task descriptions with the overview's stated architecture, (2) clarify that `file` is scope-relative so rollup semantics are clear, (3) reorder RPC file writes to post-reduce.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
