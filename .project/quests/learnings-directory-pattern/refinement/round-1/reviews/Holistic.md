## Issues

**[CRITICAL]** State machine writing .md files violates INV-003 (purity) and commitState rejects markdown writes

The plan proposes that the state machine transition handlers (slice-complete.ts, quest-complete.ts, rollup-learnings.ts) write `.md` files by setting markdown entries in the state tree. This has two fatal problems:

1. **INV-003 violation**: The state machine is pure — no I/O. Adding `setEntry(tree, "learnings/<slug>.md", { type: "markdown", content: detail })` to transition handlers means the state machine is now producing filesystem side-effects through the tree, which breaks the pure reducer contract.

2. **commitState skips markdown**: `src/core/data/commit.ts` line 101-103 explicitly skips `type: "markdown"` entries with `debug("skip markdown (read-only)")`. Even if the state machine placed markdown entries in the tree, they would never be written to disk. The Data Layer treats markdown as read-only.

The plan needs a different architecture. The `.md` file writing must happen in the **RPC layer** (which coordinates between the state machine and data layer), or a new entry type (e.g., `type: "file"` or `type: "managed-markdown"`) must be added to the tree and commitState. The state machine can set the `file` field in the JSONL entry — that's pure data. But the actual file I/O must happen in the RPC layer after `commitState`, or commitState must be extended to handle a new writable entry type.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** Phase 1 tasks conflate state machine and data layer responsibilities

Tasks in Phase 1 say "Write `.md` files" in `slice-complete.ts` and `quest-complete.ts`. These are state machine files — they cannot do I/O (INV-003). The slug derivation function also needs filesystem access for collision detection ("if the slug already exists in the target `learnings/` directory, append `-2`, `-3`"), which is I/O and cannot live in a pure state machine handler.

The plan must restructure the layering:
- **State machine**: Receives learnings with `detail`, produces tree with JSONL entries containing `file` fields (slug derived from summary, collision handled via existing tree state — not filesystem). The `detail` text must be represented in the tree in a way that commitState will write it.
- **RPC layer or Data Layer**: Handles the actual `.md` file writing (either by extending commitState or as a post-commit step in the RPC layer).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Schema registry task for `learnings/*.md` is architecturally misplaced

The plan says to register `learnings/*.md` so `assembleState` picks up directory contents. But `assembleState` uses the schema registry to **validate** entries on read. Markdown files have no schema to validate against — they're read as raw `MarkdownEntry` objects. Looking at the current registry, it only has JSON/JSONL patterns with Zod schemas. There's no mechanism for registering markdown file patterns.

The real question is: does `assembleState` already pick up `.md` files in new directories? If yes, no registry change is needed. If not, the fix is in `assembleState`'s directory walking logic, not the schema registry. This needs codebase exploration to determine the actual mechanism.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** Phase 2 task "Remove learnings.md handling" is too aggressive and conflates two different artifacts

The plan says to "search for all references to `learnings.md` in `src/`" and remove them. But the codebase exploration shows that most `src/` references to `learnings.md` are in `migrate.ts` (the migration allowlist), not in active reading/writing code. The context bundling (`src/core/context/learnings.ts`) reads from `learnings.jsonl`, not `learnings.md`. The only `src/` reference is `migrate.ts` line 484 which copies `learnings.md` during migration.

More importantly, the plan must clearly distinguish:
- `.project/learnings.md` — the monolithic project-level file (being retired)
- `completion/learnings.md` — per-scope intermediate files written by the `/complete` skill during the completion workflow (NOT being retired — these are LLM working artifacts)

Phase 2's "remove all references" would break the `/complete` skill's working-artifact pattern if applied broadly. The task should be narrowed to: remove `learnings.md` from the migration artifact allowlist (Phase 4 handles the conversion) and verify no `src/` code reads/writes the monolithic project-level file.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 conflates `completion/learnings.md` (LLM working artifact) with project-level `learnings.md`

Multiple Phase 3 tasks reference updating the `/complete` skill to stop writing `completion/learnings.md`. But this file is an LLM-owned working artifact in the completion workflow — it's where the LLM drafts learnings before structuring them as CLI payloads. The plan's own overview says "The skill may still write it as a working artifact" — but then multiple tasks imply removing references to it.

The plan should clearly state: `completion/learnings.md` remains as an LLM working artifact. Only the project-level monolithic `learnings.md` (and any skill reads of it for context) are being retired. The `grep -c "learnings.md"` expected-behavior checks in Phase 3 will produce false positives because `completion/learnings.md` references are legitimate and should remain.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No consideration of how `detail` content reaches the `.md` file through the pipeline

The plan says `learningInputSchema` keeps `detail` as input, and the CLI transforms `detail` to `file`. But the pipeline is: skill passes JSON payload -> CLI command parses it -> RPC layer processes it -> state machine applies transition -> commitState writes to disk. At which layer does `detail` get extracted, written to a `.md` file, and replaced with a `file` path? The plan needs to specify this precisely:

1. Does `learningEntrySchema` still have `detail` (for the state machine to pass through), plus a new `file` field? Or does `detail` get removed from the entry schema entirely?
2. If `detail` is removed from `learningEntrySchema`, how does the content reach the RPC layer for file writing? The state machine can't hold it.
3. If `detail` remains in `learningEntrySchema` alongside `file`, what does `commitState` write to the JSONL — both fields? That defeats the purpose.

The clean approach: `learningInputSchema` has `detail`. The **RPC layer** (not state machine) extracts `detail`, writes the `.md` file, derives the slug, and then constructs the `StateEvent` with `file` instead of `detail` before feeding it to `reduce()`. The `learningEntrySchema` replaces `detail` with `file`. This preserves INV-003 and the current pipeline architecture.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Init.ts task to create `learnings/` directory is unnecessary for the state machine

The plan says to create a `learnings/` directory during `INIT`. But `init.ts` is a state machine handler — it can only set entries in the tree. It currently creates an empty `learnings.jsonl` as a tree entry. Creating a directory on the filesystem is Data Layer work. The `learnings/` directory should be created on-demand when the first learning is written, not at init time. This matches how other directories (e.g., `completion/`) are handled — they're created when needed.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Slug collision detection needs state-tree-aware approach, not filesystem

The plan says collision handling checks "if the slug already exists in the target `learnings/` directory." In the state machine, there's no filesystem — only the state tree. Collision detection must work against the tree (checking existing JSONL entries for duplicate `file` values, or checking the tree's directory contents). This is doable but needs to be specified as tree-based, not filesystem-based.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Expected Behavior checks reference non-existent CLI paths

`goodplan state --json --query '.["learnings/"]'` — the `learnings/` directory entries would be keyed by individual filenames inside a directory node, not as a single `learnings/` key. The jq query syntax needs to match how `assembleState` actually structures directory entries in the tree. This should be explored and corrected.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 4 migration parsing is under-specified

"Parse it into individual learning entries (split on `## ` headings, extract source from `_Source:` line)" — but the monolithic `learnings.md` format is not documented in the plan. The migration logic needs the exact format specification or a reference to where the format is defined. Without this, the implementer will have to reverse-engineer the file format.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** No documentation update task for architecture files

The plan changes the data model (adding `file` to learning entries, adding `learnings/` directories) and the data layer (new writable entry type or RPC-layer file writing). The architecture files (`data-model.md`, `data-layer-api.md`, `rpc-layer-api.md`) should be updated. Phase 3 has a CLAUDE.md update but no architecture docs task.

Resolution: DIRECTLY_ACTIONABLE

## Score: 3/10

The plan has the right goal and a reasonable high-level approach, but the implementation layering is fundamentally broken. The core issue — writing `.md` files from state machine handlers when both INV-003 (purity) and commitState (markdown is read-only) forbid it — invalidates the primary mechanism in Phases 1-2. The plan also conflates two different `learnings.md` artifacts (project-level monolithic vs. completion working artifact), which would cause Phase 3 to break the `/complete` skill workflow. To reach 9+: (1) restructure so the RPC layer handles file I/O and the state machine stays pure, (2) clearly separate the two `learnings.md` artifacts throughout, (3) specify the exact `detail` -> `file` transformation pipeline across layers, (4) fix Expected Behavior checks to match actual tree/CLI behavior.

## Summary
- Critical: 2
- Important: 5
- Minor: 4
