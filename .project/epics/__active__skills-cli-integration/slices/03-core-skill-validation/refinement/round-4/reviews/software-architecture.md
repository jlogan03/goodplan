# Software Architecture Review — Round 4

## Issues

**[IMPORTANT] Phase 2, Step 10: `slice:complete` requires `--slice` flag but plan omits it from the command invocation**
The plan describes constructing the stdin payload and piping it to `slice:complete`, but the command requires `--slice <name>` as a flag (see `completeSliceInputSchema` which merges `slice` from the flag). The Phase 2 Step 10 description says "Call the appropriate CLI command" without specifying the full invocation pattern including the `--slice` flag. Phase 3's smoke test (task 7, step 8) says "Construct and pipe `slice:complete` payload" but also omits the flag. Compare with `epic:complete` which does show `--epic <name>`. The implementer could infer this, but the plan should be explicit about the full command shape for all three completion variants: `echo '<payload>' | goodplan slice:complete --slice <name> --json`, `echo '<payload>' | goodplan quest:complete --quest <name> --json`, `echo '<payload>' | goodplan epic:complete --epic <name> --json`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Phase 2, Step 4: Deriving `<slice-dir>` uses incorrect path convention**
The plan says: "Derive `<slice-dir>` from `slice:show --json` fields `epic` and `name` using the deterministic convention: `.project/epics/<epic>/slices/<name>/`". However, the actual data layer uses a flat `slices/<name>/` path within the `.project/` tree (see `resolveEntityJsonPath` in `src/core/rpc/types.ts` line 224: `slices/${target.name}/slice.json`, and `resolveEntityDir` in `src/core/rpc/paths.ts` line 144: `path.join(projectDir, "slices", target.name)`). The filesystem path for a slice is `.project/slices/<name>/`, NOT `.project/epics/<epic>/slices/<name>/`. The epic name is a field on the slice entity but doesn't appear in the filesystem path. This is a critical path error that would cause the skill to write `completion/` artifacts to a non-existent directory.
Resolution: CODEBASE_EXPLORATION

**[MINOR] Phase 2, Step 6d: Activity-log `.phase` field is confirmed, not a placeholder**
The plan says "the `.phase == "complete"` filter is a placeholder" and instructs the implementer to verify the entry shape first. However, the `activityEntrySchema` at `src/schemas/records/activity-log.ts` clearly shows `phase: z.string().min(1)` as a required field. The plan could simply document the confirmed schema (`{ ts, phase, scope, status, summary, detail? }`) and provide the correct jq filter directly, removing the exploratory task. The early verification task is not harmful but adds unnecessary ceremony for round 4 of a plan.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1, Mode A: `goodplan init --name <name> --json` response shape documentation is redundant with codebase**
The plan parenthetically notes `response is { name, version, projectDir } -- no paths record`. This is accurate per `src/core/rpc/init.ts` (the `InitResult` type), but the parenthetical about "no `paths` record" could confuse implementers since it suggests `paths` was expected. The `init` command routes through `rpcInit()` which returns `InitResult`, not `BeginResult`. Simply documenting the response shape without the negative assertion would be cleaner.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with thorough verification steps and correctly documents most CLI surface details. However, the incorrect slice directory path convention (IMPORTANT #2) is a real bug that would cause the `complete` skill to write filesystem-backed accumulation artifacts to wrong paths. The missing `--slice`/`--quest` flags on completion commands (IMPORTANT #1) is less severe but could cause implementation confusion. Fixing both IMPORTANT issues and the two MINOR cleanups would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
