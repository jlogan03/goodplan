# RPC Core

## What We're Building
The RPC layer that wires the state machine and data layer together. Implements begin(), complete(), submit(), startContext(), and status() — the five operations that all workflow commands route through. Handles the load → reduce → commit cycle, context bundling with --inline budget, activity logging (via state machine output), state diff debug logging, and dry-run mode.

## Behavior
1. `begin(phase, target, options)` — loads state, builds the appropriate StateEvent, calls reduce(), commits new state, returns metadata + optional context bundle.
2. `complete(phase, target, input, options)` — same pattern but with completion-specific logic: verification gate, deferred work routing, learnings rollup, architecture path returns.
3. `submit(phase, target, content, options)` — writes LLM content (plans, goals) to the CLI-owned path AND triggers the corresponding state event (e.g., submit-plan triggers COMPLETE_PLAN). One atomic commitState for both.
4. `startContext(phase, target, options)` — read-only. Returns context bundle for sub-agents with --inline support.
5. Context bundling: ranks content by relevance per phase (priority order from `architecture/transition-tables.md` context rows), inlines up to budget, remaining as file path references.
6. `--debug` state diff: logs which state keys changed, which files will be written, JSONL entries being appended.
7. `--dry-run`: runs full reduce→diff pipeline but skips commitState. Returns what would change.
8. `status(target, options)` — loads state, returns current status for the target entity without triggering any state transition. Used by the `status` CLI command which routes through RPC.
9. Error propagation: StateError and DATA_CONCURRENT_MODIFICATION pass through with original codes.

## Success Criteria
- [ ] `begin('plan', { type: 'slice', name: '01-auth' })` on a fixture project: loads state, calls reduce with BEGIN_PLAN, commits, returns result with correct new status
- [ ] `complete('slice', ...)` with verificationPassed: true updates slice, routes deferred to target slice, rolls up learnings, returns architecture paths
- [ ] `complete('slice', ...)` with verificationPassed: false returns STATE_VERIFICATION_FAILED without changing state
- [ ] `submit('plan', { type: 'slice', name: '01-auth' }, planContent)` writes plan content AND advances slice to plan-created in one commit
- [ ] `startContext('plan', { type: 'slice' }, { inline: true })` returns inlined content within default budget + references
- [ ] `startContext` with `inline: 50000` uses custom budget
- [ ] `startContext` without `inline` returns references only
- [ ] Context priority: for plan phase, entity goal inlined before architecture before conventions (matches transition-tables.md)
- [ ] `--dry-run` returns diff without writing files (verify no file changes on disk)
- [ ] `--debug` outputs state diff to stderr showing changed keys
- [ ] StateError from reduce propagates with original error code
- [ ] DATA_CONCURRENT_MODIFICATION from commitState propagates
- [ ] `status({ type: 'epic', name: 'test' })` returns current epic status without triggering state transitions
- [ ] Context priority ordering tested for each phase configuration defined in transition-tables.md (all 9 phases)
- [ ] Activity log entries produced by reduce appear in activity-log.jsonl after commit

## Verification
1. Run `bun test tests/unit/rpc/` and `bun test tests/integration/rpc/` — all pass.
2. Integration test: set up fixture .project/, call begin → submit → complete for a slice, verify all file changes.
3. Dry-run test: call begin with dry-run, verify diff in response but no files changed.
4. Context budget test: create .project/ with large files, call startContext with inline=5000, verify inlined content under 5KB.
5. Debug: set GOODPLAN_DEBUG=1, call begin, verify stderr shows state diff.
6. Binary smoke test: compile binary (`bun build --compile`), run `goodplan status --json` — verify it returns correct JSON with the full RPC layer wired (state machine + data layer integrated).

## Scope Boundaries
**In scope:** RPC functions (begin, complete, submit, startContext, status), load→reduce→commit cycle, context bundling with phase priorities from transition-tables.md (all 9 phase configurations with explicit priority ordering tests), state diff logging, dry-run, error propagation, learnings rollup.
**Out of scope:** CLI command definitions (slices 05-06). RPC tested programmatically.
