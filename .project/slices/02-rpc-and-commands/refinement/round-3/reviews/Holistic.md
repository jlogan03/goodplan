# Holistic Review — Slice 02: RPC and Commands (Round 3)

## Issues

**[IMPORTANT]** Plan omits 4 test files that construct slice Targets without `epic`
The plan's Tests section explicitly lists `begin.test.ts`, `complete.test.ts`, `paths.test.ts`, `submit.test.ts`, `status.test.ts`, `schema.test.ts`, `startContext.test.ts`, `tree.test.ts`, and `state.test.ts`. It also has a catch-all bullet: "Update any other unit test files that construct slice Targets or events without `epic`." However, the following test files construct `{ type: "slice", name: "..." }` without `epic` and are not listed:
- `tests/unit/commands/slice/slice-commands.test.ts` — 32 instances (highest count of any test file)
- `tests/unit/commands/learning/learning-commands.test.ts` — 7 instances
- `tests/unit/commands/subagent/start-commands.test.ts` — 4 instances
- `tests/unit/context/collect.test.ts` — 1 instance

The catch-all bullet is insufficient because an implementer following the plan sequentially will update only the listed files, then run `bun test` and discover 40+ failures in unlisted files. At minimum, `slice-commands.test.ts` (32 instances) and `learning-commands.test.ts` (7 instances) should be explicitly called out since they represent the bulk of the remaining work.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `complete.ts` has 6 hardcoded `slices/${sliceName}/...` paths but plan only addresses the `epicName` parameter addition for those
The plan (line 40) correctly identifies the need to add `epicName: string` to `buildSliceCompleteResult` and update "all 6 internal path references (lines 176-177, 188, 208-209, 259)." However, lines 208-209 are inside the deferred routing loop and use `item.name` (not `sliceName`) — they iterate over *other* slices via `overview.items`. After the migration to `epics/overview.json` with embedded slices, these paths must use each item's parent epic name, not a single `epicName` parameter. The plan's instruction to "add `epicName: string` parameter" and "update all 6 internal path references" implies a uniform substitution, but the deferred loop paths need per-item epic resolution. The plan does address the deferred routing restructuring in the next sub-bullet (lines 41-42 about flattening all epics' slice arrays), but the connection between that restructuring and the path updates on lines 208-209 should be explicit — the implementer needs to track each item's epic during iteration to construct the correct path.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `complete.ts` line 259 (`architecture-deltas.jsonl` path) also needs epic-qualified path
The plan lists lines 176-177, 188, 208-209, 259 as the 6 path references to update. Line 259 reads `slices/${sliceName}/architecture-deltas.jsonl`. This should become `epics/${epicName}/slices/${sliceName}/architecture-deltas.jsonl`. The plan accounts for this in the "6 internal path references" count but doesn't call it out separately. Since the architecture-deltas path is structurally different from the slice.json paths (it's a JSONL file, not entity JSON), worth a brief note to avoid it being overlooked.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `list.ts` `--all` flag is referenced in plan but doesn't exist in current code
The plan (line 67) says "For `--all`: flatten all epics' slice arrays" and verification (line 105) tests `goodplan slice:list --all --json`. But the current `list.ts` (lines 23-28) only defines `--epic` as an arg — there is no `--all` flag. The plan's task for `list.ts` should explicitly include adding the `--all` flag to the args definition, not just describe the behavior. Currently, the task reads as if `--all` already exists.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Before-check `grep` commands may produce incorrect counts if annotations were added/removed since research
The Expected Behavior before-checks (lines 16-17) assert exact counts: `@ts-expect-error.*slice.02` = 20, `TODO(slice-02)` = 2. I verified these are correct as of now (20 + 2 = 22). However, the grep pattern on line 16 uses `slice.02` which matches any character in place of the dot (e.g., `slice-02`, `slice_02`, `slice.02`). This is fine for the current codebase since all annotations use `slice.02`, but worth noting for robustness. Not actionable — just an observation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 2 issues were substantially addressed: null guards for `activeEpic` in `status.ts` are explicit, `--all` verification added, `show.ts` verification is now a separate line, `list.ts` human-readable output mentions removing `epicStr` and adding epic headers for `--all`. The deferred routing in `complete.ts` is now well-specified with the flatten-all-epics strategy and `DeferredItem.targetEpic` handling. The main remaining gaps are: (1) 4 test files with 44 slice Target instances are not explicitly listed, (2) the `complete.ts` deferred loop path resolution needs the per-item epic name made explicit, and (3) the `--all` flag needs to be called out as a new addition. To reach 9+: explicitly list the 4 missing test files (especially `slice-commands.test.ts` with 32 instances), and clarify that deferred loop paths use per-item epic names.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
