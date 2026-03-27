## Issues

**[CRITICAL]** State machine writing .md files violates INV-003 (state machine purity)

The plan says Phase 1 tasks modify `slice-complete.ts`, `quest-complete.ts`, and `rollup-learnings.ts` (all in `src/core/state/transitions/`) to "write `.md` files" and "create the `learnings/` directory if it doesn't exist." These are state machine transition handlers. INV-003 states: "The reducer and all transition functions are pure. No filesystem access, no network calls, no side effects." The state machine currently has zero `fs` imports (verified by grep). Writing files from transition handlers would break this invariant and the `state-machine-purity.test.ts` fitness function.

The correct approach: the state machine should add `MarkdownEntry` nodes to the state tree (e.g., `setEntry(tree, "epics/.../learnings/schema-registry-changes.md", { type: "markdown", content: detailText })`). Then `commitState()` in the data layer would need to be updated to write markdown entries that were newly created (currently it skips all markdown as read-only). This is the established pattern: the state machine manipulates the in-memory tree, `commitState()` materializes changes to the filesystem.

However, this introduces a second issue: `commitState()` currently treats all markdown as read-only (`skip markdown (read-only)` at line 101-103 of `commit.ts`). The plan must include a task to update `commitState()` to distinguish between LLM-owned markdown (still read-only) and CLI-owned markdown (written by `commitState`). A possible approach: use the schema registry or a naming convention (e.g., files in `learnings/` directories) to identify CLI-owned markdown.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Schema change from `detail` to `file` is a breaking change with no migration path in Phase 1

Phase 1 replaces `detail: z.string().min(1)` with `file: z.string().min(1)` in `learningEntrySchema`. This schema is used by `commitState()` validation (INV-005) and `assembleState()` parsing. The moment this change lands, every existing `learnings.jsonl` file (which has `detail` fields, not `file` fields) will fail Zod validation on read. The CLI will be broken for any project with existing learnings until migration runs in Phase 4.

The phases must be reordered or the schema must support both formats during the transition. Options: (a) make the schema accept both `detail` and `file` with a discriminated union or `.or()`, with Phase 4 migration converting old entries; (b) move migration to Phase 1 so it runs before schema enforcement; (c) use `.optional()` on both fields with a refinement that requires at least one.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `commitState()` does not write markdown -- plan does not address this gap

The plan adds `.md` files to `learnings/` directories but never mentions updating `commitState()`. Currently, `commitState()` explicitly skips markdown entries (line 101-103 of `commit.ts`: `"Markdown is read-only -- skip"`). Even if the state machine correctly adds `MarkdownEntry` nodes to the tree, they will never be written to disk.

The plan needs an explicit task in Phase 1 to update `commitState()` to write markdown entries for CLI-owned content. This is a data layer change that affects a Developing subsystem -- deliberate but expected.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Registering `learnings/*.md` in schema registry is incorrect -- markdown is not schema-validated

Phase 1 task says: "Add a registry entry for `learnings/*.md` so `assembleState` picks up the directory contents." The schema registry (`schema-registry.ts`) maps path patterns to Zod schemas for JSON/JSONL validation. Markdown files are not validated by schemas -- they use `MarkdownEntry` with raw string content. `assembleState` already picks up `.md` files as `MarkdownEntry` when it scans directories; no schema registry entry is needed. Adding one would cause `commitState()` to attempt Zod validation on raw markdown text, which would fail.

The task should be removed or rephrased to: "Verify that `assembleState` picks up `learnings/*.md` files as `MarkdownEntry` nodes -- no schema registry change needed since markdown is not schema-validated."

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `rollup-learnings.ts` file copy semantics conflict with pure state tree approach

The plan says to "copy `.md` files from source `learnings/` to target `learnings/`" in `rollup-learnings.ts`. This handler is a state machine transition (pure, no I/O). File copying is an I/O operation. Instead, the handler should: (1) read the `MarkdownEntry` content from the source path in the state tree, (2) add a new `MarkdownEntry` at the target path in the state tree with the same content. `commitState()` then handles the actual file write. The plan should describe this as "duplicate the MarkdownEntry in the state tree from source to target path" rather than "copy files."

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `COMPLETE_QUEST` event uses `Learning[]` type, not `LearningInput[]`

The plan says Phase 1 should mirror `slice-complete.ts` changes for `quest-complete.ts`. However, looking at the `StateEvent` type definition, `COMPLETE_SLICE` uses `learnings: LearningInput[]` while `COMPLETE_QUEST` uses `learnings: Learning[]`. The plan tasks treat them as identical. Verify whether `Learning` and `LearningInput` are the same type or different, and ensure the quest handler uses the correct type. If they differ, the transformation logic may need adjustment.

Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Phase 2 removes `learnings.md` handling before Phase 4 migration exists

Phase 2 task says "Remove `learnings.md` handling: Search for all references to `learnings.md` in `src/`... remove any code that reads, writes, or references the monolithic file." But Phase 4 is the migration phase. If `learnings.md` handling is removed in Phase 2, the migration code in Phase 4 won't be able to read the old `learnings.md` to convert it. The plan acknowledges this parenthetically ("defer to Phase 4") for `migrate.ts` but doesn't clearly protect the `assembleState` read path that migration will need.

Either: (a) keep the `learnings.md` read capability in `assembleState` until after migration, or (b) have the migration code read `learnings.md` directly from the filesystem (bypassing assembleState) since migration already has its own `buildMigrationState()`. Clarify which approach in the plan.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Slug collision handling in state machine requires directory scanning (I/O)

The plan says slug derivation should include "collision handling: if the slug already exists in the target `learnings/` directory, append `-2`, `-3`." In the pure state machine, this can be done by checking the state tree's directory contents (not filesystem I/O). The plan should clarify that collision detection uses `hasChild(state, learningsDir, slugCandidate)` on the in-memory tree, not filesystem `existsSync` calls. The wording "target `learnings/` directory" is ambiguous.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 skill changes reference non-existent CLI command

Phase 3 tells `create-slices/SKILL.md` to use `goodplan learning:list --json` to get learnings. This command exists (verified in `src/commands/learning/list.ts`), but the skill currently reads `learnings.md` directly. The plan should verify that `learning:list` returns enough context for slice creation -- specifically, whether summaries alone suffice or if the skill needs the full detail text (which would require passing `--inline` or similar to get `.md` file contents).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `assembleState` directory structure task in Phase 2 is vague

Phase 2 says "Ensure `assembleState` handles `learnings/` directories. The schema registry changes from Phase 1 should make this automatic." As noted above, the schema registry changes are incorrect for markdown. Additionally, `assembleState` already recursively scans directories and creates `MarkdownEntry` nodes for `.md` files. The `learnings/` directory will be picked up automatically as long as `commitState()` creates it (from the `DirectoryEntry` in the state tree). This task should be rephrased as a verification step rather than an implementation task.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has the right goal but fundamentally misunderstands the system's layering. The most critical issue is that it directs file I/O operations into pure state machine handlers (INV-003 violation). The schema breaking change with no transition path would make the CLI unusable on existing projects between Phase 1 and Phase 4. These are not minor adjustments -- they require restructuring how the plan approaches the state machine vs data layer boundary. To reach 9+: (1) restructure all file operations to work through the state tree + `commitState()` pattern, (2) add a `commitState()` task for writing CLI-owned markdown, (3) handle schema evolution so both old and new formats work during transition, (4) clarify phase ordering to prevent breaking existing projects.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
