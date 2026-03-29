# Software Architecture Review — Integration (All 4 Phases)

## Issues

**[MINOR]** Inconsistent `await` usage on synchronous `begin()` calls

Two new commands (`decision:update` and `learning:rollup`) call `begin()` without `await`, while `decision:create` and all pre-existing commands use `await begin()`. The `begin()` function returns synchronously, so `await` on a non-Promise is a no-op — both patterns work. However, the inconsistency creates confusion about whether `begin()` is async. If `begin()` ever becomes async, the non-awaited calls will silently produce incorrect behavior (operating on a Promise object instead of the result).

File: src/commands/decision/update.ts:49
File: src/commands/learning/rollup.ts:37
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `commands-api.md` still lists `learning:show --id <id>` but the command was explicitly dropped

The architecture spec at `commands-api.md` line 119 documents `learning:show --id <id>`, but this command was dropped during refinement per user decision. The implementation correctly omits it, but the spec is now stale. This gap means an LLM reading the architecture docs would believe `learning:show` exists, potentially generating invalid commands.

File: .project/epics/__active__goodplan-cli/architecture/commands-api.md:119
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `countFiles` in status command bypasses the state tree for artifact counting

The `status` command calls `countFiles()` (which does raw `readdirSync`) to count architecture, research, brainstorm, and prototype files, instead of navigating the `ProjectState` tree from `assembleState()`. The state tree already has the directory contents loaded. This works correctly but creates a parallel read path that bypasses the state tree — every other read-only command reads exclusively from the assembled state. The comment says "use countFiles helper to keep filesystem I/O in Data Layer" which is reasonable, but it means the status command combines two read approaches (state tree for JSONL, raw filesystem for directories).

File: src/commands/global/status.ts:126
Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

The four phases form a well-integrated whole. The implementation follows the 4-layer architecture strictly: new state machine handlers (decision.ts, rollup-learnings.ts) are pure with no I/O imports; RPC layer properly maps phases to events; commands are thin routing layers; and the O(n^2) learnings rollup fix in slice-complete and quest-complete correctly batch-collects entries before writing. Key architectural highlights:

- **INV-001 preserved**: All mutations (CREATE_DECISION, UPDATE_DECISION, ROLLUP_LEARNINGS) go through reduce() via the RPC layer. No direct state writes.
- **INV-003 preserved**: New transition handlers import only from schemas and tree types — no I/O.
- **INV-005 preserved**: DecisionEntry schema validates on read/write; the decision schema with enum status values is well-defined.
- **INV-006 preserved**: The schema command's parallel registry includes all new commands (decision:create/list/show/update, learning:list/rollup), with drift-detection tests ensuring sync.
- **INV-007 preserved**: New error codes (STATE_DUPLICATE_DECISION) are added to StateErrorCode; all error paths produce structured errors.
- **Cross-phase integration is clean**: Phase 1 (state machine) provides handlers consumed by Phase 2 (CLI commands); Phase 3 (status) builds on Phase 1's decision/learning data; Phase 4 (query/schema) adds universal capabilities that all prior commands benefit from.
- **O(n^2) fix correctly implemented**: Both slice-complete and quest-complete now batch-collect rollup entries and do single getJsonl + concat + setEntry per target scope.
- **Rollup handler design is sound**: Deduplication by summary+source prevents duplicates when manual rollup overlaps with auto-rollup during COMPLETE_SLICE/COMPLETE_QUEST. Source entries are removed after rollup for idempotency.
- **Transition table compliance**: Decision transitions match transition-tables.md exactly (active->active/revisiting/superseded, revisiting->active/superseded, superseded is terminal).
- **Module depth is good**: The rollup-learnings handler hides target path resolution, filtering, deduplication, and source cleanup behind a single reduce() call.

The three minor issues are all low-impact. Adding `await` to two calls and updating the spec would bring this to 10/10.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
