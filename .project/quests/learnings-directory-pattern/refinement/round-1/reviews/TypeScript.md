# TypeScript Review: Learnings Directory Pattern

## Issues

**[CRITICAL]** State machine purity violation — `.md` file writes in transition handlers

The plan says Phase 1 tasks for `slice-complete.ts` and `quest-complete.ts` should "write the `detail` text to the `.md` file in the slice's scope directory" and "copy the `.md` file to the target's `learnings/` directory." This is filesystem I/O inside state machine transition handlers, which directly violates **INV-003: The state machine is pure — no I/O**. The current handlers are pure functions that operate on the `ProjectState` tree and use `setEntry()` — they never touch the filesystem.

The state tree (`tree.ts`) supports four entry types: `json`, `jsonl`, `markdown`, and `directory`. The `commitState()` function in `src/core/data/commit.ts` explicitly skips markdown entries (`"Markdown is read-only — skip"`), meaning even if you add markdown entries to the state tree, they will not be written to disk.

Fix: Either (1) extend `commitState()` to support writing new markdown entries (not just reading them), adding a new writable entry type or a flag on markdown entries, then have transition handlers use `setEntry()` with markdown entries for the `.md` files — keeping the state machine pure; or (2) move the file-writing responsibility to the RPC layer (between `reduce()` and `commitState()`), where I/O is already permitted. Option 2 is simpler and matches the existing architecture — the RPC layer already enriches events and handles side effects.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `learningEntrySchema` change breaks existing data — no migration-first approach

The plan replaces `detail: z.string().min(1)` with `file: z.string().min(1)` in `learningEntrySchema` in Phase 1, but migration is deferred to Phase 4. With `exactOptionalPropertyTypes: true` and INV-005 (schema validation on every read and write), this means: after Phase 1, `assembleState()` will fail to parse any existing `learnings.jsonl` that has `detail` instead of `file`, because `detail` is removed from the schema and `file` is required. Every `goodplan` command that loads state will break on existing data.

Fix: Make the schema transition non-breaking. Keep `detail` as `z.string().optional()` and add `file` as `z.string().optional()` during the transition period (Phases 1-3). Use a discriminated check: if `file` is present, it's new format; if `detail` is present, it's old format. The schema should accept both. Only in Phase 4, after migration runs, make `file` required and remove `detail`. Note: with `exactOptionalPropertyTypes: true`, optional properties cannot be set to `undefined` — they must be omitted entirely. Use conditional spread (`...("file" in entry ? { file: entry.file } : {})`) or `z.union([oldSchema, newSchema])` to handle both shapes.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Schema registry does not handle `learnings/*.md` — `assembleState` won't load them

The plan says to "Add a registry entry for `learnings/*.md` so `assembleState` picks up the directory contents." However, `schemaRegistry` maps file patterns to Zod schemas for JSON/JSONL validation. Markdown files don't go through schema validation — they're loaded as `MarkdownEntry` with raw string content. Looking at `commitState()`, markdown entries are explicitly read-only (`"Markdown is read-only — skip"`). The plan needs to specify: (a) how `assembleState` discovers and loads `learnings/` directories as part of the state tree, and (b) how `commitState` writes new `.md` files (currently it refuses to write markdown). The schema-registry task as described will not achieve the goal.

Fix: Remove the schema-registry task for `learnings/*.md`. Instead, update `assembleState` to discover `learnings/` directories and load their `.md` files as markdown entries in the state tree. Separately, extend `commitState` to support writing markdown entries that were added by the state machine (new entries, not pre-existing reads). Consider a new entry type like `"writable-markdown"` or a flag to distinguish read-only from CLI-generated markdown.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Slug collision handling requires filesystem access in a pure function

The plan says `deriveSlug()` should handle collisions: "if the slug already exists in the target `learnings/` directory, append `-2`, `-3`, etc." If this function is called from the state machine (which it must be, since the transition handler sets the `file` field), the collision check requires inspecting the state tree — not the filesystem. The plan should specify that collision detection uses the in-memory state tree (checking existing entries in the `learnings/` directory node or scanning existing JSONL entries for matching `file` values), not `fs.existsSync()`.

Fix: Specify that `deriveSlug()` accepts a `Set<string>` of existing slugs (extracted from the state tree's JSONL entries) rather than scanning a directory path. The transition handler builds this set from current entries, passes it in, and the function remains pure.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `rollup-learnings.ts` currently removes entries from source — plan doesn't address file copy semantics in the tree

The existing `handleRollupLearnings()` filters entries from source and appends to target. The plan says to "copy `.md` files from source `learnings/` to target `learnings/`" — but in the pure state tree, this means cloning markdown entries from one directory node to another. The plan doesn't explain how this works with `setEntry()`. The tree helpers (`getMarkdown`, `setEntry`) operate on path-keyed entries. Copying a file means reading a markdown entry from one tree path and writing it to another — which is fine in principle but requires the markdown entries to already be in the state tree. If the source scope's `learnings/` directory markdown files are loaded by `assembleState`, this works. The plan should make this data flow explicit.

Fix: Clarify that rollup in the state tree means: (1) read the markdown entry from `<source>/learnings/<slug>.md`, (2) `setEntry()` at `<target>/learnings/<slug>.md` with the same content, (3) add a new JSONL entry at the target pointing to the local path. Confirm that `assembleState` loads these markdown files so they're available for reading.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `collectLearnings` context bundling — plan says "include `file` field" but `LearningSummary` deliberately omits `detail`

The plan says to update `collectLearnings()` to "include the `file` field in the projection" and "when `--inline` is used, read the `.md` file content and include it." But `LearningSummary` in `types.ts` is a deliberate projection that omits `detail` — it's for context bundles where full detail would be too large. Adding file content on `--inline` means the function would need to read markdown entries from the state tree, which is fine, but the type needs to account for this. With `exactOptionalPropertyTypes: true`, adding an optional `detail?: string` to `LearningSummary` means callers cannot set it to `undefined` — it must be either present with a string value or omitted.

Fix: Define a separate type or use a union: `LearningSummary` (current, no detail) and `LearningSummaryWithDetail extends LearningSummary { detail: string }`. Or use conditional spread when constructing the objects. Make the `--inline` behavior explicit in the type system rather than using `detail?: string`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Slug truncation at 60 chars may produce non-unique slugs

The plan specifies truncating slugs to 60 characters. If two learnings have summaries that share the first 60 characters of their kebab-case form, they'll collide and need the `-2` suffix. This is fine since collision handling exists, but the truncation should avoid cutting mid-word (truncate at the last hyphen before 60 chars) to produce cleaner file names.

Fix: Truncate at the last hyphen boundary before 60 characters rather than at exactly 60.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 verification uses `--query '.["learnings/"]'` — jq syntax for directory entries may not work

The verification step uses `goodplan state --json --query '.["learnings/"]'` and `'."learnings/"'`. The trailing slash and dot notation may not be valid jq for state tree directory keys depending on how `assembleState` serializes directory entries. The plan should verify what key format the state tree uses for directory entries when serialized to JSON.

Fix: Verify the actual key format used by `state --json` output for directory entries and update the verification queries accordingly. Consider using `goodplan state --json | jq '.learnings'` or whatever the actual serialized key is.

Resolution: CODEBASE_EXPLORATION

## Score: 4/10

The plan has two critical issues: it violates the state machine purity invariant (INV-003) by proposing filesystem I/O in transition handlers, and it will break all existing data by removing `detail` from the schema before migration runs. The markdown read-only limitation in `commitState` is also not addressed. These are fundamental architectural gaps — the plan needs significant rework to align with the existing data flow (state machine produces tree diffs, data layer commits them). To reach 9+: fix INV-003 by moving file writes to the RPC layer or extending commitState, make the schema change backward-compatible, and clarify the markdown write path.

## Summary
- Critical: 2
- Important: 4
- Minor: 2
