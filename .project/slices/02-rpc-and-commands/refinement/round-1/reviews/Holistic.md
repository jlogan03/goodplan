# Holistic Review — Slice 02: RPC and Commands

## Issues

**[IMPORTANT]** `show.ts` hardcodes `slices/${name}` paths but plan only says "derive epic for path resolution"
The plan lists `src/commands/slice/show.ts` with the note "derive `epic` for path resolution (from `--epic` or active epic)" but `show.ts` has two hardcoded `slices/${args.slice}/...` paths on lines 36 and 42 that must change to `epics/${epic}/slices/${args.slice}/...`. Unlike the mutation commands that route through `resolveEntityDir()` in `paths.ts`, `show.ts` is a read-only command that builds state-tree paths directly. The plan task is too vague — it should specify the two concrete path changes needed (the `getJson` call on line 36 and the `getDir` call on line 42), plus adding an `--epic` flag to the command args and resolving the epic from `project.json.activeEpic` when absent.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `list.ts` reads from `slices/overview.json` — plan task is vague on the actual change
The plan says `list.ts` should "read `epics/overview.json`, find epic entry, return its `slices` array" and add `--epic`/`--all` flags. But `list.ts` currently reads `slices/overview.json` on line 36. The plan should specify: (1) the state-tree path change from `slices/overview.json` to `epics/overview.json`, (2) how to extract slices from the new structure (iterate epic entries, collect embedded `slices` arrays), (3) the default behavior when no `--epic` flag (active epic only vs all), (4) the `--all` flag behavior (aggregate across epics). This is the most complex command change and deserves explicit sub-tasks, not a one-liner.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete.ts` `buildSliceCompleteResult` has 6 hardcoded `slices/` paths — plan says "update all 6 path references" but doesn't list them
Lines 176-177 (`slices/${sliceName}/slice.json`), 188 (`slices/overview.json`), 208-209 (`slices/${item.name}/slice.json`), and 259 (`slices/${sliceName}/architecture-deltas.jsonl`) all need updating to use `epics/${epic}/slices/...`. The function currently takes `sliceName: string` as parameter — it will also need the epic name. The plan mentions this but the task description is insufficiently detailed for an implementer to act without re-discovering the paths. Each path reference should be listed explicitly with its line number and the target path pattern.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `priorities.ts` line 67 has a second hardcoded `slices/overview.json` not covered by the plan task
The plan's Context Layer task only mentions `entityDir()` (the TODO on line 17). But `completeSources` on line 67 also has `{ key: "slices-overview", path: "slices/overview.json", sourceType: "markdown" }` which must change to read from `epics/overview.json`. This is a separate code location from the TODO and will be missed if the implementer only follows the plan's explicit instructions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `submit.test.ts` constructs slice Targets without `epic` — not listed in test tasks
Line 141 of `tests/unit/rpc/submit.test.ts` has `{ type: "slice", name: "s1" }` without `epic`. The plan's test section lists `begin.test.ts`, `complete.test.ts`, `paths.test.ts`, `status.test.ts`, `schema.test.ts`, and a catch-all "any other unit test files" but does not explicitly list `submit.test.ts`. Given that `submit.ts` is one of the core RPC files being changed (3 annotations), its test file should be explicitly listed.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not include a task for updating `rpc-layer-api.md`
The research file explicitly flags `rpc-layer-api.md` as stale — it still shows the old Target type without `epic` on line 59. The epic architecture docs mention a "Documentation Update Phase." While this could be deferred, the plan's goal is to fully wire nested paths, and stale documentation creates a trap for future implementers. A documentation task should be added or explicitly deferred.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `complete.ts` `overview.items.filter` assumes flat overview — needs update for embedded structure
On line 190, `buildSliceCompleteResult` does `overview.items.filter((item) => item.epic === newSlice.epic)`. If the overview structure changes from `slices/overview.json` (flat list with `epic` field) to `epics/overview.json` (epic entries with embedded `slices` arrays), this filter logic changes fundamentally — you'd look up the epic entry and iterate its `slices` array directly. The plan mentions "read sibling slices from `epics/overview.json` embedded array" but doesn't describe the new access pattern clearly enough.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Before-check grep pattern may not catch all annotations
The before-check uses `grep -rc "@ts-expect-error.*slice" src/` which would also match any `@ts-expect-error` comment that happens to contain "slice" in a different context. A more precise pattern like `@ts-expect-error.*slice.02` would be safer. Similarly, the after-check should verify `grep -rc "TODO(slice-02)" src/` returns exactly 0 (not just a lower number).
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan correctly identifies all 22 annotations and the right files to modify. The single-phase structure is appropriate given the mechanical, interdependent nature of the changes. However, several tasks lack the specificity needed for an implementer to act without re-exploring the codebase — particularly `show.ts`, `list.ts`, `complete.ts`, and `priorities.ts` line 67. The missing `submit.test.ts` reference is a gap. To reach 9+: (1) expand `show.ts`, `list.ts`, and `complete.ts` tasks with explicit path changes, (2) add `priorities.ts` line 67 to the Context Layer task, (3) explicitly list `submit.test.ts` in the test tasks, (4) clarify the `epics/overview.json` access pattern for both `list.ts` and `complete.ts`.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
