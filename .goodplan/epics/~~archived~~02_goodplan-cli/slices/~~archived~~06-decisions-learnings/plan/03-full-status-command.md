# Phase 3: Full Status Command

Replace the tracer bullet status stub with real artifact counting, active entity detection, and context-aware recommendations.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] After setup (init, epic, slice, decisions): `bun run src/index.ts status --json | jq '.artifacts.decisions'` — returns null or 0 (stub doesn't count real artifacts)

**After implementation** (should pass / show presence):
- [ ] After same setup: `bun run src/index.ts status --json` returns StatusResult with non-zero `artifacts.decisions`, populated `activeEpic` with name and status
- [ ] `bun run src/index.ts status` — human-readable formatted display with sections and colors

### Tasks

- [ ] Expand `StatusResult` schema in `src/schemas/commands/status.ts` per commands-api.md: `project` (name, version), `activeEpic` (name, status — nullable), `activeSlice` (name, status — nullable), `activeQuest` (name, status — nullable), `artifacts` (architectureFiles, researchFiles, brainstormFiles, prototypeFiles, decisions, learnings, completedSlices, totalSlices), `recommendations: string[]`, `warnings: string[]`.
- [ ] Rewrite status command handler in `src/commands/global/status.ts`: load state via `assembleState`, walk tree to count artifacts by type. Read `project.json` for active pointers, look up active entities for name+status. Count slice overview items for completed/total. Count `decisions.jsonl` and `learnings.jsonl` entries. Count markdown files under `architecture/`, `research/`, `brainstorm/`, `prototypes/` directories.
- [ ] Generate recommendations based on state: next action for active slice (e.g., "Active slice 01-auth is in planning — run start-plan"), epic progress summary ("Epic my-epic: 3/5 slices complete"), stale warnings (active entity with no recent activity-log entry).
- [ ] Human-readable output: use picocolors for section headers, status indicators, and severity coloring. Sections: Project, Active Work (epic/slice/quest), Progress, Artifacts, Recommendations/Warnings.
- [ ] Preserve existing `--query` support — ensure it works with the new `StatusResult` shape (the `applyQuery` function in status.ts still handles this; Phase 4 will lift it to shared output).
- [ ] Write tests: artifact counting accuracy against a known fixture state, active entity detection (with/without active epic/slice/quest), recommendations generation logic, `--query` on new StatusResult shape, `--json` vs human-readable output modes.

### Verification
`bun test tests/unit/commands/global/` passes. Status command returns accurate counts when run against a temp project with known artifact counts. Human-readable output verified visually.
