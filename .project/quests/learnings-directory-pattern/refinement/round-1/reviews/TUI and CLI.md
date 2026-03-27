## Issues

**[CRITICAL]** State machine cannot write markdown files -- commitState skips them

The plan (Phase 1) instructs `slice-complete.ts` and `quest-complete.ts` to "write the `detail` text to the `.md` file in the slice's scope directory" using `setEntry(tree, path, { type: "markdown", content: detail })`. However, `commitState` in `src/core/data/commit.ts` (line 101-103) explicitly skips markdown entries: `"Markdown is read-only -- skip"`. This means any markdown entry placed into the state tree by the state machine will be silently dropped on disk. Additionally, having the state machine write `.md` files would violate INV-003 (state machine is pure, no I/O) -- the state machine only manipulates the in-memory tree, and it's the data layer's `commitState` that decides what gets written.

The fix is to move `.md` file writing to the RPC layer or data layer. Two approaches:
1. **RPC layer post-reduce hook**: After `reduce()` returns the new state, the RPC layer (which already injects timestamps and handles other I/O) writes the `.md` files to disk using `fs.writeFileSync`, similar to how `migrate.ts` handles file copies. The state machine only sets the `file` field in JSONL entries -- it never touches markdown.
2. **New entry type in commitState**: Add a `"writable-markdown"` or `"text"` entry type that `commitState` does write (unlike read-only markdown). This requires changes to the tree type system.

Approach 1 is simpler and consistent with the existing pattern where the RPC layer handles I/O concerns. The plan must be restructured so that Phase 1 transition handlers only set the `file` field on JSONL entries, and a new RPC-layer function writes the actual `.md` files.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Plan references `rollup-learnings.ts` copying `.md` files but state machine has no filesystem access

Phase 1 task for `rollup-learnings.ts` says "Update `handleRollupLearnings()` to copy `.md` files from source `learnings/` to target `learnings/`". The rollup handler is a pure state machine function (`src/core/state/transitions/rollup-learnings.ts`, line 6: "Pure function, no I/O"). It cannot copy files. It only manipulates the in-memory state tree.

The rollup handler currently moves JSONL entries between scopes in the tree. For file copying, the RPC layer must handle the filesystem operation after `reduce()` returns. The plan must split rollup into: (1) state machine updates JSONL entries with new `file` paths pointing to the target directory, (2) RPC layer copies the actual `.md` files on disk.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `learning:list` human output omits `file` path -- plan says "optionally show" but doesn't specify the format

Phase 2 says "For human mode, optionally show the file path alongside the summary." The current human output format (line 47-49 of `list.ts`) is: `{category} {summary} ({source})`. The plan doesn't specify where in this line the file path goes, or whether it should use `--verbose` to control visibility. For a CLI tool, unclear output formatting leads to broken scripts and confused users.

Recommendation: Show the file path only in `--verbose` mode (consistent with the global `--verbose` flag), or always show it as a dim suffix like `({source}) [{file}]`. Specify the exact format in the plan so the implementer doesn't have to guess.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Schema change from `detail` to `file` breaks `learning:list --json` output contract

Phase 1 replaces `detail: z.string().min(1)` with `file: z.string().min(1)` in `learningEntrySchema`. This is a breaking change to the `--json` output of `learning:list`, which currently returns entries with `detail` fields. Any existing tooling or skills parsing `learning:list --json` output will break. The plan doesn't address backward compatibility or versioning.

Options: (1) Keep both `detail` and `file` in the schema during a transition period (one required, the other optional). (2) Accept the break since this is pre-1.0 and document it. (3) Add a migration step in Phase 4 that handles both old and new formats. The plan should explicitly state which approach is taken and update Phase 2's verification to test that consumers handle the new schema.

Resolution: USER_INPUT

---

**[IMPORTANT]** `state --json --query` verification uses wrong query syntax

Phase 2 Expected Behavior uses `goodplan state --json --query '.["learnings/"]'` and the verification section uses `goodplan state --json --query '.["learnings.jsonl"]'`. These are jq expressions, but the state tree keys don't include directory entries in the way the query implies. The state tree is a recursive `DirectoryEntry` with nested `contents` objects. A query like `.["learnings/"]` would only work if `learnings/` is a top-level key in the state tree's contents -- which it would be if a `learnings/` directory exists, but the key would be `learnings` not `learnings/`. The plan should verify the actual key format before specifying these queries.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** `schema-registry.ts` task is vague about what "register `learnings/*.md`" means

Phase 1 says "Add a registry entry for `learnings/*.md` so `assembleState` picks up the directory contents." The schema registry maps path patterns to Zod schemas for validation during read/write. Markdown files are currently read into the tree as `MarkdownEntry` objects with no schema validation (they're strings). Adding a regex pattern for `learnings/*.md` to the schema registry would require a Zod schema for markdown content, which doesn't exist and doesn't make sense (markdown is free-form text). The registry is for JSON and JSONL validation only.

What the plan likely means is ensuring `assembleState` reads the `learnings/` directory into the state tree. This happens automatically -- `assembleState` recursively reads all files and directories. The task as written is either unnecessary or misdirected.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Slug collision check requires filesystem access in the state machine

Phase 1 slug derivation task says "if the slug already exists in the target `learnings/` directory, append `-2`, `-3`, etc." If slug derivation and collision detection happen in the state machine (as the plan implies by placing it in transition handlers), the state machine would need to check the state tree for existing files. This is actually possible via `hasChild()` on the in-memory tree -- but only if the `learnings/` directory is already in the state tree. For a brand-new scope (first completion), the directory won't exist in the tree yet. The plan should clarify that collision checks are against the current state tree (which includes both on-disk state loaded by `assembleState` and any entries added during the current `reduce()` call).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 skill updates reference `learnings.md` removal but `learnings.md` only appears in `migrate.ts`

Phase 2 task says "Search for all references to `learnings.md` in `src/`". The codebase search shows only one reference: `src/core/rpc/migrate.ts` line 484. The plan tasks for Phase 2 list several locations (`src/core/data/`, `src/core/context/`) but `collectLearnings()` in `src/core/context/learnings.ts` doesn't reference `learnings.md` at all -- it reads `learnings.jsonl`. The plan creates unnecessary work investigating non-existent references. Trim these tasks to match the actual codebase.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Exit code testing not mentioned for error paths

The plan's verification sections don't test exit codes for error conditions (e.g., what happens when `learning:list --source nonexistent` is called, or when slug derivation fails). Per INV-007 and the commands-api exit code contract (0 success, 1 internal, 2 validation, 3 state machine), error paths should be verified. Add exit code assertions to the test plan.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The two CRITICAL issues are fundamental architectural violations. The plan instructs the state machine to perform I/O operations (writing `.md` files, copying files during rollup) that directly conflict with INV-003 (state machine purity) and the `commitState` contract (markdown is read-only). These aren't minor oversights -- they require restructuring Phases 1 and 2 to move file writing to the RPC layer. The IMPORTANT issues around output format, breaking schema changes, and incorrect query syntax further reduce confidence. To reach 9+: fix the architectural layer violations by moving `.md` file operations to the RPC layer, specify exact CLI output formats, address the breaking schema change strategy, and verify query syntax against the actual state tree structure.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
