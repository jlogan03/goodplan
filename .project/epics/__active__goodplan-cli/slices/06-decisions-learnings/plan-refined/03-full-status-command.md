# Phase 3: Full Status Command

Replace the tracer bullet status stub with real artifact counting, active entity detection, and context-aware recommendations.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts status --json | jq '.artifacts'` — returns `{}` or minimal stub shape (current stub behavior, independent of Phase 2 state)

**After implementation** (should pass / show presence):
- [ ] After same setup: `bun run src/index.ts status --json` returns StatusResult with non-zero `artifacts.decisions`, populated `activeEpic` with name and status
- [ ] `bun run src/index.ts status` — human-readable formatted display with sections and colors

### Tasks

- [ ] Expand `StatusResult` schema in `src/schemas/commands/status.ts` per commands-api.md: `project` (name, version), `activeEpic` (name, status — nullable), `activeSlice` (name, status — nullable), `activeQuest` (name, status — nullable), `artifacts` (architectureFiles, researchFiles, brainstormFiles, prototypeFiles, decisions, learnings, completedSlices, totalSlices — all fields required with default 0 to satisfy `exactOptionalPropertyTypes`), `recommendations: string[]`, `warnings: string[]`.
- [ ] Rewrite status command handler in `src/commands/global/status.ts`: use `assembleState` (not `loadState`) — deliberately chosen because it handles fresh/zero-state projects gracefully. Walk state tree to count structured artifacts (decisions, learnings, slices). Read `project.json` for active pointers, look up active entities for name+status. Count slice overview items for completed/total (`completedSlices` = items where `status === "completed"`, `totalSlices` = all items regardless of status). Count `decisions.jsonl` and `learnings.jsonl` entries. For file-based artifact counts (architecture, research, brainstorm, prototypes), add a Data Layer helper (e.g., `countFiles(projectDir, subpath, glob)` in `src/core/data/files.ts`) to keep filesystem I/O in the Data Layer — `assembleState` only reads structured state (JSON/JSONL), not markdown files. The command handler calls the helper, not `readdir` directly.
- [ ] Generate recommendations based on state: next action for active slice (e.g., "Active slice 01-auth is in planning — run start-plan"), epic progress summary ("Epic my-epic: 3/5 slices complete"), stale warnings (active entity with no recent activity-log entry).
- [ ] Human-readable output: use picocolors for section headers, status indicators, and severity coloring. Sections: Project, Active Work (epic/slice/quest), Progress, Artifacts, Recommendations/Warnings. Empty line between sections (matching existing stub convention). Empty sections use the existing "No active work" pattern rather than verbose zero-filled tables — omit sections with no data.
- [ ] Preserve existing `--query` support — ensure it works with the new `StatusResult` shape (the `applyQuery` function in status.ts still handles this; Phase 4 will lift it to shared output).
- [ ] Write tests: artifact counting accuracy against a known fixture state, active entity detection (with/without active epic/slice/quest), recommendations generation logic, `--query` on new StatusResult shape, `--json` vs human-readable output modes.

### Verification
`bun test tests/unit/commands/global/` passes. Status command returns accurate counts when run against a temp project with known artifact counts. Human-readable output verified visually.
