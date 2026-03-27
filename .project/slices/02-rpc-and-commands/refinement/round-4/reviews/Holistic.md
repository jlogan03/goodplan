# Holistic Review — Slice 02: RPC and Commands (Round 4)

## Issues

**[MINOR]** `show.ts` plan task omits `detectArtifacts` path on line 42
The plan (line 69) says to update `getJson` (line 36) and `getDir` (line 42) from `slices/${args.slice}/...` to `epics/${epic}/slices/${args.slice}/...`. Both paths are correctly identified. However, the `detectArtifacts` call on line 42 passes `getDir(state, \`slices/${args.slice}\`)` — this is the same `getDir` call the plan references. No issue with correctness — just confirming the plan accounts for it. The plan's description is accurate.
Resolution: DIRECTLY_ACTIONABLE

No issues found beyond the minor note above. All round-3 issues have been addressed:

- **4 missing test files**: Now explicitly listed (lines 93-96) with instance counts — `slice-commands.test.ts` (32), `learning-commands.test.ts` (7), `start-commands.test.ts` (4), `collect.test.ts` (1).
- **`complete.ts` deferred loop per-item epic**: Lines 42-43 now explicitly describe flattening to `{ epicName, ...sliceItem }` tuples and clarify that each deferred target needs its own epic for path construction.
- **`architecture-deltas.jsonl` path**: Line 41 now has a dedicated sub-bullet calling out line 259 as structurally different and easy to miss.
- **`--all` flag**: Line 68 now explicitly says "Add `--all` flag to the args definition."

### Evaluation against criteria

1. **Goal alignment**: Every task directly serves clearing the 22 annotations and wiring nested paths. The `requireActiveEpic` helper, `--all` flag, and `show.ts --epic` flag are minimal necessary additions. No scope creep.

2. **Clarity**: Tasks are specific — file paths, line numbers, exact field additions, path string transformations. The deferred routing restructure (the most complex task) now has clear structural guidance with tuple strategy and scoping notes.

3. **Completeness**: All 22 annotations accounted for. All 9 test files with slice Targets explicitly listed with instance counts. Context layer paths, status command, documentation update included.

4. **Phase ordering**: Single phase is appropriate — changes are mechanical and interdependent. No parallelization opportunity lost.

5. **Success criteria**: Clear — 0 annotations, all tests pass, build succeeds, CLI e2e verification with specific commands.

6. **Verification-first completeness**: Before checks verify exact annotation counts (20 + 2). After checks include `tsc --noEmit`, `bun test`, `bun run build`, CLI e2e with `--json`, grep for zero annotations. Both concrete and falsifiable.

7. **Documentation**: `rpc-layer-api.md` update explicitly listed (line 102).

8. **Code cleanup**: No dead code introduced — this is wiring existing types through existing call sites. `slices/overview.json` reads are replaced with `epics/overview.json` reads. No unused code left behind.

9. **Database backup**: N/A — no database changes.

10. **Simplicity**: The `requireActiveEpic` helper centralizes a repeated pattern (6 commands). The deferred routing refactor uses tuple flattening — straightforward, no over-engineering.

11. **Invariant compliance**: INV-001 (state machine mutations) — respected; all writes go through RPC/state machine. INV-004 (stateless commands) — `requireActiveEpic` reads from `project.json` state, not ambient state. INV-005 (schema validation) — noted in research; all reads/writes go through validated state. INV-007 (no silent errors) — `requireActiveEpic` throws with clear message. No invariant violations.

12. **Fitness function awareness**: Commands subsystem has `stateless-commands.test.ts` and `schema-output-accuracy.test.ts`. The plan adds `--epic` to `show.ts` and `--all` to `list.ts` — `schema-output-accuracy.test.ts` will automatically pick these up since it reads from command definitions (INV-006). No explicit fitness function update needed.

## Score: 9/10

The plan is thorough, well-specified, and addresses all round-3 feedback. Every annotation is mapped to a specific fix. Test coverage is explicit with instance counts. The deferred routing restructure — the highest-risk task — has clear structural guidance. The only gap preventing a 10 is minor: the `show.ts` task description (line 69) could note that the epic defaults to `activeEpic` when the `--epic` flag is absent (the verification section on line 111 confirms this behavior, but the task itself doesn't specify fallback logic). This is a readability nit, not a correctness gap.

## Summary
- Critical: 0
- Important: 0
- Minor: 1
