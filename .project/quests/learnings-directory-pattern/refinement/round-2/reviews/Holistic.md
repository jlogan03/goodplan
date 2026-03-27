## Issues

**[IMPORTANT]** Phase 1 puts slug derivation in the state machine, violating INV-003

The plan says in Phase 1, task for `slice-complete.ts`: "derive slug from `summary`" and "set `file` to `learnings/<slug>.md` in the JSONL entry." This means the state machine transition handler calls `deriveSlug()` — a string computation that is itself pure, but the resulting `file` path is a filesystem path concept that couples the state machine to storage layout. More critically, the plan also says "The RPC layer extracts `detail`, derives the slug, writes the `.md` file to disk, and constructs the `StateEvent` with `file` instead of `detail`." These two descriptions contradict each other: either the RPC layer derives the slug and puts `file` into the event (correct per INV-003), or the state machine derives the slug inside the transition handler (incorrect per INV-003 spirit, and contradicts the RPC layer doing the same work).

Resolution: Clarify that slug derivation and `file` field construction happen exclusively in the RPC layer (`src/core/rpc/complete.ts`). The RPC layer transforms `LearningInput[]` (with `detail`) into entries with `file` fields before constructing the `StateEvent`. The state machine tasks in `slice-complete.ts` and `quest-complete.ts` should simply pass through the `file` field that's already on the event's learning entries — no slug derivation in transition handlers. Update the `rollup-learnings.ts` task similarly: the state machine only remaps the path prefix for the target scope, and the RPC layer handles the actual file copy.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `LearningInput` schema change not addressed — `file` needs to flow through the event

The `COMPLETE_SLICE` and `COMPLETE_QUEST` events carry `learnings: LearningInput[]` where `LearningInput` has `detail: z.string()`. If the RPC layer is supposed to derive slugs and construct `file` paths before building the event, then `LearningInput` is the wrong type for the event payload — it doesn't have a `file` field. The plan needs to either: (a) introduce a new intermediate type (e.g., `LearningEventEntry`) with `file` instead of `detail` for the state event, or (b) have the RPC layer transform `LearningInput[]` into `LearningEntry[]` (adding `source`, `rollup`, and `file`) before the event, and change the event type to carry `LearningEntry[]`. The current plan leaves this type gap unresolved.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 Expected Behavior "before" check is not falsifiable

The "before" check `goodplan state --json --query '.learnings["foo.md"]'` returning null doesn't test something that doesn't exist yet — `assembleState` already picks up `.md` files in directories. If a `learnings/` directory with `foo.md` existed today, it would appear in the state tree. The "before" check should test something that actually changes, e.g., verifying that `learning:list --json` does NOT include a `file` field on entries (which is the actual change Phase 2 makes).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 `rollup-learnings.ts` task is inconsistent with the RPC layer approach

The task says "Update `handleRollupLearnings()` to create JSONL entries at the target scope with `file` paths pointing to the target's `learnings/` directory." But `handleRollupLearnings()` currently copies entries as-is (just filtering by `rollupTo`) and doesn't modify the `file` paths. If a learning at `slices/foo/learnings/some-slug.md` rolls up to epic scope, the `file` field would need to change to `learnings/some-slug.md` (relative to the epic). This path remapping is a filesystem-layout concern. The plan should clarify: does the `file` field store a path relative to the scope, or relative to `.project/`? If relative to scope, the state machine needs to strip and re-prefix. If relative to `.project/`, no remapping is needed but the rollup file copy in the RPC layer needs to handle the path correctly.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 task list is thorough but some skills may not reference learnings.md

The plan lists `skills/create-architecture/SKILL.md` and `skills/create-architecture/references/guidance.md` as needing updates. From codebase exploration, `create-architecture/SKILL.md` line 302 references `learnings.md` in the context of checking if the file exists for CLAUDE.md generation, and `guidance.md` line 17 has a comment "Add learnings.md line only if that file exists." These are template instructions about CLAUDE.md content, not direct reads of `.project/learnings.md`. The plan should distinguish between: (a) skills that read `.project/learnings.md` for learning content (need CLI replacement), and (b) skills that mention `learnings.md` in CLAUDE.md template instructions (need path update to `learnings/` directory reference). The current plan treats both the same way ("Replace `.project/learnings.md` reference") which could cause confusion during implementation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 schema tightening order risk

Phase 4 tightens the schema first ("make `file` required and remove the `detail` optional field") and then adds migration logic. If the schema is tightened before migration runs, existing `.project/` data with `detail`-only entries will fail validation on `assembleState()`. The tasks should be reordered: migration logic first, schema tightening last (or at least explicitly noted that migration must run before any `assembleState()` call with tightened schema).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "before" grep patterns may false-positive

`grep -c 'file: z.string' src/schemas/records/learning.ts` — the pattern `file: z.string` could match other schemas in the same directory if files are added. More importantly, the "after" check `grep -c 'deriveSlug' src/core/rpc/` is checking the RPC directory, but the plan also puts slug derivation in `src/util/slug.ts`. A more precise after-check would be `grep -c 'deriveSlug' src/util/slug.ts` for the utility existence and `grep -c 'deriveSlug' src/core/rpc/complete.ts` for RPC layer usage.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing cleanup of monolithic `learnings.md` from `PROJECT_MARKDOWN_FILES` in migrate.ts

The plan's Phase 4 migration task says "Remove the `learnings.md` copy from the migration artifact list." This refers to `PROJECT_MARKDOWN_FILES` at line 484 of `src/core/rpc/migrate.ts`. However, this removal should be done carefully — existing migrations that haven't been re-run would lose the file copy. The plan should note that `learnings.md` is removed from the copy list because migration now converts it to per-file format instead of copying it verbatim. This is implicit but worth making explicit for the implementer.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with good phase ordering and comprehensive task coverage. The round-1 fixes (RPC layer file writing, non-breaking schema, completion/learnings.md preservation) are correctly applied. However, the fundamental data flow for slug derivation and `file` field construction has contradictory descriptions — both the state machine and RPC layer are described as deriving slugs, and the type system gap (`LearningInput` vs entries with `file`) is not addressed. These are not showstoppers but would cause confusion during implementation. Fixing the two IMPORTANT issues about slug derivation ownership and event type would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
