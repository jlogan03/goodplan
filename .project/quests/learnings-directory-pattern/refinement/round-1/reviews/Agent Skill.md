## Issues

**[CRITICAL]** Plan violates INV-003 (state machine purity) by having transition handlers write `.md` files
Phase 1 tasks instruct `slice-complete.ts` and `quest-complete.ts` to "write the `detail` text to the `.md` file in the slice's scope directory" and "copy the `.md` file to the target's `learnings/` directory." These transition handlers are in the state machine layer, which must be pure — no I/O (INV-003). The current handlers correctly only manipulate the `ProjectState` tree via `setEntry()`. Writing `.md` files and creating directories is filesystem I/O that belongs in the RPC layer or data layer.

The fix: the state machine should add `MarkdownEntry` nodes to the state tree (e.g., `setEntry(tree, "epics/.../slices/.../learnings/slug.md", { type: "markdown", content: detail })`) and `commitState()` will materialize them to disk. The plan must restructure Phase 1 to use `setEntry` for markdown content, not direct filesystem writes. The `assembleState` walker already reads `.md` files as `MarkdownEntry` nodes, and `commitState` already writes new entries it finds in the diff — so the infrastructure is there. However, `commitState` line 101 shows `markdown` entries are currently skipped ("Markdown entries are read-only and never written"). This means the plan needs to either (a) extend `commitState` to write new markdown entries, or (b) have the RPC layer write the `.md` files after `commitState` returns.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `completion/learnings.md` (re-entry signal) conflated with project-level `learnings.md` — plan must not touch the former
The plan's Phase 3 task for `skills/complete/SKILL.md` says "The skill currently writes `completion/learnings.md` as a monolithic draft" and proposes making it optional. But `completion/learnings.md` is a re-entry detection artifact — the `/complete` skill uses `stat <scope-dir>/completion/learnings.md` to detect partial completion (Step 2, sub-step 7). The plan's grep-based Expected Behavior checks in Phase 3 (`grep -c "learnings.md" skills/complete/SKILL.md` returns 0) would require removing ALL `learnings.md` references from the complete skill, including the `completion/learnings.md` re-entry detection path, which would break the graceful stop/resume workflow.

The plan must distinguish between:
- `.project/learnings.md` (monolithic project learnings — being retired by this plan)
- `completion/learnings.md` (per-scope LLM working artifact for re-entry detection — must be preserved)

The Phase 3 Expected Behavior should grep for `\.project/learnings\.md` or the bare project-level reference, not the generic `learnings.md` pattern. All `completion/learnings.md` references in the complete skill MUST remain.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Schema registry task misunderstands how `assembleState` works — `.md` files in `learnings/` need no registry entry
Phase 1 includes a task: "Register `learnings/` directory — Add a registry entry for `learnings/*.md` so `assembleState` picks up the directory contents." The schema registry (`src/core/data/schema-registry.ts`) only governs JSON and JSONL validation. The `assembleState` function in `assemble.ts` already reads ALL `.md` files as `MarkdownEntry` nodes without any registry lookup (line 105-107: `if (name.endsWith(".md"))` goes directly to `readMarkdownFile`). Adding a registry pattern for `.md` files would have no effect. This task should be removed or replaced with whatever is actually needed to make `commitState` write new markdown entries (see the INV-003 issue above).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan misses that `commitState` skips markdown writes — new infrastructure needed
The `commitState` function (line 101 comment: "Markdown entries are read-only and never written") skips `MarkdownEntry` nodes during the diff. If Phase 1 correctly adds markdown entries to the state tree (per the INV-003 fix), `commitState` will silently drop them. The plan needs an explicit task to extend `commitState` to write new `MarkdownEntry` nodes. This is a prerequisite for the entire plan — without it, no `.md` files will ever be materialized to disk.

Alternative: the RPC layer (`complete.ts`) could write the `.md` files after calling `reduce()` but before `commitState()`. This avoids changing `commitState` but means the markdown writes happen outside the state machine's transactional boundary.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Skills audit in Phase 3 is incomplete — misses 4+ skill files that reference `learnings.md`
The plan's Phase 3 lists tasks for: `complete/SKILL.md`, `complete/references/guidance.md`, `create-slices/SKILL.md`, `create-plan/SKILL.md`, `project-status/SKILL.md`, `_shared/references/cli-interaction.md`. But the grep results show additional files referencing `learnings.md` that the plan does not address:
- `skills/audit-architecture/SKILL.md` (lines 69, 116: reads `.project/learnings.md`)
- `skills/refine-slices/SKILL.md` (line 81: reads `.project/learnings.md`)
- `skills/create-architecture/SKILL.md` (line 302: references learnings.md)
- `skills/create-architecture/references/guidance.md` (line 17: conditional learnings.md inclusion)
- `skills/_shared/references/epic-conventions.md` (lines 66, 97: directory structure diagrams showing `learnings.md`)
- `skills/migrate/references/migration-heuristics.md` (line 12: `completion/learnings.md` — this one is correct to keep)

The plan's "Audit all skills" task at the end says to `grep -r "learnings.md" skills/` but this should be elevated to explicit tasks for the known files, not left as a catch-all.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `/complete` skill's `completion/learnings.md` working artifact pattern should be explicitly preserved
Phase 3 says the `/complete` skill's `completion/learnings.md` "becomes optional" and the CLI payload is "the authoritative output." But the current workflow design is intentional: the skill writes intermediate results to disk (filesystem-backed accumulation per `cli-interaction.md` line 583-589) so that graceful stops preserve progress and re-entry detection works. Making this "optional" undermines the re-entry system. The plan should explicitly state that `completion/learnings.md` continues to be written as a working artifact and re-entry signal — only the monolithic `.project/learnings.md` is retired.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Expected Behavior checks in Phase 1 reference wrong file paths
The "Before implementation" checks grep for `"file"` and `"learnings/"` in specific source files. But `grep -c '"file"' src/schemas/records/learning.ts` would currently match the word "file" if it appeared in comments. A more precise check would grep for the actual field name pattern (e.g., `file: z.string`). Similarly, the "After implementation" checks should verify the new schema field with a more specific pattern.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 task "Remove `learnings.md` handling" may break migration of legacy projects
The task says to "Search for all references to `learnings.md` in `src/` — remove any code that reads, writes, or references the monolithic file" but immediately notes "Key locations: `src/core/rpc/migrate.ts` (may copy `learnings.md` during migration — defer to Phase 4)." This self-contradiction should be resolved by explicitly scoping Phase 2 removal to exclude `migrate.ts` from the start, not as a parenthetical deferral.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Slug collision handling in a pure state machine is complex
The plan says the slug utility should check "if the slug already exists in the target `learnings/` directory, append `-2`, `-3`, etc." In the pure state machine, this means walking the state tree to check for existing entries, which is doable but adds complexity. The plan should note this is a tree lookup (checking for existing keys in the directory's `contents` map), not a filesystem operation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10
Two critical issues (INV-003 violation and completion/learnings.md conflation) would cause the plan to produce broken code if implemented as written. The INV-003 issue is fundamental — the plan's core mechanism (state machine writing files) violates the system's most important architectural invariant. The completion/learnings.md conflation would break the graceful stop/resume workflow that is central to the `/complete` skill. Multiple important issues around missing infrastructure (commitState markdown writes) and incomplete skill audit add further risk. To reach 9+: fix the INV-003 violation by routing through setEntry + commitState (or RPC-layer writes), clearly distinguish the two different `learnings.md` files throughout, add the commitState extension task, and complete the skills audit.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
