# Merged Feedback — Round 1

### CRITICAL Issues

**C1. State machine writing `.md` files violates INV-003 (purity) and commitState rejects markdown writes**
*Flagged by: ALL 5 reviewers*

The plan directs `slice-complete.ts`, `quest-complete.ts`, and `rollup-learnings.ts` (state machine transition handlers) to write `.md` files and copy files between directories. This violates INV-003 (state machine is pure — no I/O). Additionally, `commitState()` in `commit.ts` line 101-103 explicitly skips markdown entries: `"Markdown is read-only — skip"`. Even if markdown entries are placed in the state tree via `setEntry()`, they will never be written to disk.

**Fix**: Move `.md` file writing to the **RPC layer** (simplest, matches existing architecture where RPC handles I/O concerns). The state machine only sets the `file` field on JSONL entries. After `reduce()` returns, the RPC layer extracts `detail` from the input, writes the `.md` file to disk, and constructs the `StateEvent` with `file` instead of `detail`. Alternative: extend `commitState()` to support a new writable markdown entry type, but this is more invasive.

Resolution: DIRECTLY_ACTIONABLE

---

**C2. Schema change from `detail` to `file` breaks existing data — no migration-first approach**
*Flagged by: Software Architecture, TypeScript*

Phase 1 replaces `detail: z.string().min(1)` with `file: z.string().min(1)` in `learningEntrySchema`, but migration is deferred to Phase 4. With `exactOptionalPropertyTypes: true` and INV-005 (schema validation on every read/write), every existing `learnings.jsonl` with `detail` fields will fail Zod validation after Phase 1. The CLI will be broken for any project with existing learnings until Phase 4 migration runs.

**Fix**: Make the schema transition non-breaking. Use `z.union([oldSchema, newSchema])` or keep both fields optional during the transition period (Phases 1-3). With `exactOptionalPropertyTypes: true`, use conditional spread (`...("file" in entry ? { file: entry.file } : {})`) to handle both shapes. Only in Phase 4, after migration, make `file` required and remove `detail`.

Resolution: DIRECTLY_ACTIONABLE

---

**C3. `completion/learnings.md` (re-entry signal) conflated with project-level `learnings.md`**
*Flagged by: Holistic, Agent Skill*

The plan's Phase 3 proposes making `completion/learnings.md` "optional" and grep-based Expected Behavior checks (`grep -c "learnings.md" skills/complete/SKILL.md` returns 0) would require removing ALL `learnings.md` references from the complete skill. But `completion/learnings.md` is a re-entry detection artifact — the `/complete` skill uses `stat <scope-dir>/completion/learnings.md` to detect partial completion. Removing these references would break the graceful stop/resume workflow.

**Fix**: Clearly distinguish throughout the plan:
- `.project/learnings.md` — monolithic project learnings (being retired)
- `completion/learnings.md` — per-scope LLM working artifact for re-entry detection (MUST be preserved)

Phase 3 Expected Behavior should grep for `.project/learnings.md` specifically, not the generic `learnings.md` pattern. Explicitly state that `completion/learnings.md` continues to be written.

Resolution: DIRECTLY_ACTIONABLE

---

### IMPORTANT Issues

**I1. Schema registry task for `learnings/*.md` is architecturally misplaced**
*Flagged by: ALL 5 reviewers*

The schema registry maps path patterns to Zod schemas for JSON/JSONL validation. Markdown files are read as `MarkdownEntry` with raw string content — no schema validation. `assembleState` already reads `.md` files automatically (line 105-107: `if (name.endsWith(".md"))` -> `readMarkdownFile`). Adding a registry entry for `learnings/*.md` would have no effect or cause failures.

**Fix**: Remove the schema-registry task. Replace with a verification step: "Confirm `assembleState` picks up `learnings/*.md` files as `MarkdownEntry` nodes automatically — no schema registry change needed."

Resolution: DIRECTLY_ACTIONABLE

---

**I2. `detail` -> `file` transformation pipeline is unspecified across layers**
*Flagged by: Holistic, TypeScript*

The plan doesn't specify at which layer `detail` gets extracted, written to a `.md` file, and replaced with a `file` path. The pipeline is: skill passes JSON payload -> CLI command -> RPC layer -> state machine -> commitState.

**Fix**: Specify the clean approach: `learningInputSchema` has `detail`. The **RPC layer** extracts `detail`, derives the slug, writes the `.md` file, and constructs the `StateEvent` with `file` instead of `detail` before feeding it to `reduce()`. The `learningEntrySchema` has `file` (not `detail`). This preserves INV-003 and the pipeline architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**I3. `rollup-learnings.ts` file copy semantics conflict with pure state tree**
*Flagged by: Holistic, Software Architecture, TypeScript, TUI and CLI*

The plan says to "copy `.md` files from source `learnings/` to target `learnings/`" in `rollup-learnings.ts`. This handler is pure — no I/O. File copying is a filesystem operation.

**Fix**: Split rollup into: (1) state machine updates JSONL entries with new `file` paths pointing to the target directory, (2) RPC layer copies the actual `.md` files on disk after `reduce()` returns. Alternatively, if using the tree approach: read `MarkdownEntry` from source path in tree, `setEntry()` at target path with same content — but this still requires `commitState` to write markdown.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. Phase 2 "Remove learnings.md handling" is too aggressive and conflates artifacts**
*Flagged by: Holistic, Software Architecture, TUI and CLI*

Most `src/` references to `learnings.md` are in `migrate.ts` (migration allowlist), not active read/write code. The plan says "remove all references" but also parenthetically defers `migrate.ts` to Phase 4. This self-contradiction should be resolved. Additionally, `completion/learnings.md` references are legitimate and must remain.

**Fix**: Narrow Phase 2 scope: only verify that no `src/` code reads/writes the monolithic project-level `learnings.md`. Explicitly exclude `migrate.ts` (needed for Phase 4) and all `completion/learnings.md` references.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. Phase 2 removes `learnings.md` handling before Phase 4 migration exists**
*Flagged by: Software Architecture*

If `learnings.md` handling is removed in Phase 2, the Phase 4 migration code won't be able to read the old file. Either keep the read capability until after migration, or have migration read directly from the filesystem (bypassing assembleState).

**Fix**: Clarify that Phase 4 migration reads `learnings.md` directly from the filesystem (migration already has its own `buildMigrationState()`), so Phase 2 removal of `assembleState` references is safe. Or defer removal to after Phase 4.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. `COMPLETE_QUEST` event may use different type than `COMPLETE_SLICE`**
*Flagged by: Software Architecture*

`COMPLETE_SLICE` uses `learnings: LearningInput[]` while `COMPLETE_QUEST` may use `learnings: Learning[]`. The plan treats them identically. Verify whether the types differ and adjust transformation logic accordingly.

Resolution: CODEBASE_EXPLORATION

---

**I7. Skills audit in Phase 3 is incomplete — misses 4+ skill files**
*Flagged by: Agent Skill*

The plan's Phase 3 lists explicit tasks for some skills but misses:
- `skills/audit-architecture/SKILL.md` (reads `.project/learnings.md`)
- `skills/refine-slices/SKILL.md` (reads `.project/learnings.md`)
- `skills/create-architecture/SKILL.md` (references learnings.md)
- `skills/create-architecture/references/guidance.md` (conditional learnings.md inclusion)
- `skills/_shared/references/epic-conventions.md` (directory structure diagrams)

**Fix**: Elevate these to explicit tasks in Phase 3. The catch-all grep at the end is insufficient — known files should have individual tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**I8. `collectLearnings` context bundling type needs update for `file` field**
*Flagged by: TypeScript*

`LearningSummary` deliberately omits `detail`. Adding file content on `--inline` requires a type change. With `exactOptionalPropertyTypes: true`, adding `detail?: string` means callers cannot set it to `undefined`.

**Fix**: Define `LearningSummaryWithDetail extends LearningSummary { detail: string }` as a separate type, or use conditional spread when constructing objects.

Resolution: DIRECTLY_ACTIONABLE

---

**I9. Init.ts task to create `learnings/` directory is unnecessary**
*Flagged by: Holistic*

`init.ts` is a state machine handler — it can only set entries in the tree. The `learnings/` directory should be created on-demand when the first learning is written, matching how other directories are handled.

**Fix**: Remove the init-time directory creation task. Create `learnings/` on-demand.

Resolution: DIRECTLY_ACTIONABLE

---

**I10. `learning:list` output format and `--json` contract changes unspecified**
*Flagged by: TUI and CLI*

Replacing `detail` with `file` in the schema is a breaking change to `learning:list --json` output. The human output format for the file path is also unspecified. The plan should state whether `--verbose` controls file path visibility and specify the exact format.

Resolution: USER_INPUT

---

### MINOR Issues

**M1. Slug collision detection must use state tree, not filesystem**
*Flagged by: Holistic, Software Architecture, TypeScript, TUI and CLI, Agent Skill*

The plan says collision handling checks "the target `learnings/` directory" — ambiguous between filesystem and tree. Must be tree-based (checking existing JSONL entries or directory contents in the in-memory tree).

**Fix**: Specify `deriveSlug()` accepts a `Set<string>` of existing slugs from the state tree.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Phase 2 verification uses wrong jq query syntax for directory entries**
*Flagged by: Holistic, TypeScript, TUI and CLI*

`goodplan state --json --query '.["learnings/"]'` — the trailing slash and key format may not match how `assembleState` serializes directory entries. Needs verification.

Resolution: CODEBASE_EXPLORATION

---

**M3. Phase 4 migration parsing is under-specified**
*Flagged by: Holistic*

The monolithic `learnings.md` format is not documented. Migration logic needs the exact format specification or a reference to where it's defined.

Resolution: CODEBASE_EXPLORATION

---

**M4. No architecture documentation update task**
*Flagged by: Holistic*

The plan changes the data model and data layer but includes no task to update architecture files (`data-model.md`, `data-layer-api.md`, `rpc-layer-api.md`).

**Fix**: Add architecture doc update tasks to the appropriate phase.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Slug truncation should avoid cutting mid-word**
*Flagged by: TypeScript*

Truncating at exactly 60 characters may cut mid-word. Truncate at the last hyphen boundary before 60 chars for cleaner filenames.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Phase 3 skill changes reference `learnings.md` removal but most `src/` references don't exist**
*Flagged by: TUI and CLI*

`collectLearnings()` reads `learnings.jsonl`, not `learnings.md`. The only `src/` reference is `migrate.ts`. Phase 2 creates unnecessary investigation work for non-existent references.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Phase 1 Expected Behavior grep patterns are imprecise**
*Flagged by: Agent Skill*

`grep -c '"file"'` would match comments containing the word "file". Use more specific patterns like `file: z.string`.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. Exit code testing not mentioned for error paths**
*Flagged by: TUI and CLI*

Per INV-007 and the commands-api exit code contract, error paths should have exit code assertions in the test plan.

Resolution: DIRECTLY_ACTIONABLE

---

### DIRECTLY_ACTIONABLE (for loop exit)

1. **C1** — Move `.md` file writing from state machine to RPC layer
2. **C2** — Make schema transition non-breaking with union/optional fields
3. **C3** — Distinguish `completion/learnings.md` from project-level `learnings.md`
4. **I1** — Remove schema-registry task; replace with verification
5. **I2** — Specify `detail` -> `file` transformation pipeline (RPC layer)
6. **I3** — Split rollup into state-machine JSONL updates + RPC-layer file copies
7. **I4** — Narrow Phase 2 removal scope
8. **I5** — Clarify Phase 4 migration reads filesystem directly
9. **I7** — Add explicit tasks for 4+ missing skill files
10. **I8** — Define proper types for `LearningSummaryWithDetail`
11. **I9** — Remove init-time directory creation; use on-demand
12. **M1** — Specify slug collision as tree-based with `Set<string>`
13. **M4** — Add architecture doc update tasks
14. **M5** — Truncate slugs at word boundaries
15. **M6** — Remove phantom `src/` reference investigation tasks
16. **M7** — Use precise grep patterns in Expected Behavior
17. **M8** — Add exit code assertions

Count: 17

### RESEARCH_NEEDED

None.

### Contradictions Resolved

1. **commitState extension vs RPC-layer writes**: Software Architecture and Agent Skill suggest extending `commitState()` to write a new entry type (e.g., `writable-markdown`). Holistic, TypeScript, and TUI and CLI favor RPC-layer writes after `reduce()`. Both are viable. The RPC-layer approach is simpler (no tree type system changes, no commitState modification) and consistent with the existing pattern where the RPC layer handles I/O concerns. **Resolved**: recommend RPC-layer approach as primary, note commitState extension as alternative.

2. **Phase 2 removal timing**: Holistic says "remove from migration allowlist only." Software Architecture says "keep read capability until after migration or have migration bypass assembleState." These are compatible — Phase 2 should leave `migrate.ts` untouched (not remove from allowlist yet), and Phase 4 migration reads directly from filesystem. **Resolved**: both approaches combined.

### Unresolved (USER_INPUT required)

None — all resolved.

### USER_INPUT Resolved

1. **I10 — Breaking change to `learning:list --json` output**: User decision: **Accept the break.** CLI is pre-1.0, output contract not yet stabilized. Just swap `detail` for `file`.

### Available Research

**I6 — COMPLETE_QUEST vs COMPLETE_SLICE types**: Both events use identical `learnings: LearningInput[]` type. No adjustment needed — they are symmetric.

**M2 — assembleState directory entry key format**: Directory entries are nested objects, not flat keys. `learnings/foo.md` appears as `["learnings"]["foo.md"]` in the JSON tree. Correct jq query: `.learnings["foo.md"]` not `."learnings/"`. Markdown entries are `true` without `--inline`, raw string with `--inline`.

**M3 — Monolithic learnings.md format**: Each entry is an H2 heading (summary text), followed by `_Source: <name>_` on its own line, then the detail body paragraphs. Entries separated by blank lines. The file starts with `# Learnings` and a subtitle. Source attribution may include update notes like `(updated by <slice>)` or `(epic)` suffixes.
