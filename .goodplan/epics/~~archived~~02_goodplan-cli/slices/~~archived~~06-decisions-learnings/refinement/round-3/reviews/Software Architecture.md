# Software Architecture Review — Round 3

## Issues

**[IMPORTANT] Phase 1 UPDATE_DECISION event payload type mismatch between plan and architecture spec**
The plan (Phase 1, first task) specifies `UPDATE_DECISION` payload as `{ id, changes: Partial<Omit<DecisionEntry, "id" | "date">>, ts }`. However, the architecture spec in `state-machine-api.md` (line 75) defines it as `{ type: 'UPDATE_DECISION'; id: string; changes: Partial<DecisionEntry>; ts: string }` — no `Omit`. The plan introduces a restriction (`Omit<..., "id" | "date">`) that the architecture doesn't specify. This is likely intentional (preventing callers from changing a decision's id or date makes sense), but it's an undocumented deviation from the architecture spec. Either: (a) update `state-machine-api.md` to match the plan's `Omit` constraint (preferred — the architecture spec should be the source of truth), or (b) match the architecture spec exactly and enforce the id/date immutability via a guard instead. Without alignment, the implementer has two conflicting sources.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 1 ROLLUP_LEARNINGS idempotency approach removes entries from source — may surprise callers**
The plan specifies that after rolling up matching entries to the target, matching entries are removed from the source `learnings.jsonl`. This makes the operation idempotent (good), but it means `learning:list --source slices/01-auth` will no longer show rolled-up entries at their original scope. This is a design choice, not a bug, but the plan doesn't document this side-effect in the CLI output or user-facing docs. Phase 2's `learning:list` command will silently return fewer entries after a rollup. Consider adding: (a) a note in the `learning:rollup` human-readable output (e.g., "Rolled up N learnings from slices/01-auth to project (removed from source)"), or (b) mention in Phase 2's `learning:list` description that rolled-up entries only appear at the target scope.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 3 `countFiles` Data Layer helper needs scoping guidance**
Round 2 identified the filesystem I/O boundary concern, and this iteration correctly specifies a Data Layer helper (`countFiles(projectDir, subpath, glob)`). This is the right approach — it keeps `readdir` in the Data Layer per architecture. However, the plan doesn't specify where in the Data Layer this lives. The existing Data Layer modules are `src/core/data/assemble.ts`, `src/core/data/commit.ts`, `src/core/data/load.ts`, `src/core/data/project.ts`. A file-counting utility doesn't fit naturally in any of these. The plan should specify the target file (e.g., `src/core/data/files.ts` or add to an existing module). This is minor because the implementer can reasonably choose a location, but explicit guidance prevents decision-making during implementation.
Resolution: DIRECTLY_ACTIONABLE

No issues found with:
- **Layer compliance**: All 3 new events are pure state machine operations with no I/O. The O(n^2) fix is correctly scoped to existing handlers. ROLLUP_LEARNINGS path resolution (added in this round) is thorough — `from` resolves via relative path, `to` resolves via label with active epic lookup from `project.json`.
- **Module boundaries**: New files (`decision.ts`, `rollup-learnings.ts` in transitions, command files in `src/commands/decision/` and `src/commands/learning/`) follow existing one-file-per-handler and one-file-per-command conventions.
- **Dependency direction**: Commands -> RPC -> State Machine + Data Layer flow is preserved. Read-only commands (`decision:list`, `decision:show`, `learning:list`) correctly bypass RPC and use `loadState` directly.
- **Phase 4 drift detection**: The `commandRegistry` now includes a unit test ensuring every citty command has a matching registry entry — this satisfies INV-006 and addresses the round 2 drift concern.
- **`buildBeginResult` decision branch**: Phase 2 correctly identifies that decisions live in JSONL (not individual JSON files) and adds a `target.type === "decision"` branch to extract `previousStatus`/`newStatus` from the JSONL entry.
- **Cross-cutting `--query` integration**: Lifting `applyQuery` to `src/util/output.ts` and integrating into the shared `output()` function is clean — all commands get `--query` without per-command changes. The precedence rule (`--query` overrides `--quiet`) is specified.
- **Maturity alignment**: All subsystems are Experimental — no maturity escalation concerns.
- **Testability**: Each phase specifies unit tests through public APIs. Phase 1 tests decision guards through `reduce()`, Phase 2 tests CLI through `begin()`, Phase 3 tests status through `buildStatusResult()`, Phase 4 tests `--query` through `output()`.
- **Verification approach**: Phase 1 uses `bun test` + `tsc --noEmit`, Phase 2 uses CLI commands in temp dir, Phase 3 uses fixture state with known counts, Phase 4 uses E2E walkthrough + binary regression. All appropriate for their domains.

## Score: 9/10
Round 2 issues are well-addressed: ROLLUP_LEARNINGS path resolution is now fully specified, the filesystem I/O boundary is resolved with a Data Layer helper, `decision:show` explicitly uses `loadState`, and the `commandRegistry` has drift detection via unit test. The remaining issues are: the `UPDATE_DECISION` payload type mismatch between plan and architecture spec (important because it's a source-of-truth conflict), and two minor documentation/guidance gaps. To reach 10: align the UPDATE_DECISION payload with the architecture spec (or vice versa).

## Summary
- Critical: 0
- Important: 1
- Minor: 2
