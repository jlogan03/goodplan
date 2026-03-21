# Commands: Mutation & Sub-Agent Surface

## What We're Building
All mutation CLI commands (create, plan, complete, abandon per entity namespace) and sub-agent commands (start-*/submit-*). This completes the full CLI surface. A complete workflow is exercisable end-to-end via the compiled binary.

## Behavior
1. Entity mutation commands route through RPC → State Machine: `epic:create`, `epic:activate`, `epic:complete`, `epic:abandon --reason "..."`, `slice:plan`, `slice:complete`, `quest:create`, etc.
2. Sub-agent commands: `start-plan --slice 01-auth --json --inline` returns context. `submit-plan --slice 01-auth` reads plan content from stdin, triggers COMPLETE_PLAN.
3. All sub-agent start-* commands return context bundles (with --inline for content). All submit-* commands read content from stdin and trigger state transitions.
4. `decision:create` and `decision:update` route through state machine (CREATE_DECISION, UPDATE_DECISION events).
5. `learning:rollup --from slices/01-auth --to project` triggers ROLLUP_LEARNINGS.
6. `--override` on refinement completions bypasses score thresholds.
7. stdin handling: consumes shared stdin infrastructure from slice 01 (TTY detection, size limits, empty-stdin handling). Integration tests for stdin behavior with mutation commands live here.
8. All mutations require explicit target flags (--epic, --slice, --quest). No implicit state.

## Success Criteria
- [ ] Full epic lifecycle via CLI: `epic:create` → `epic:activate` → `epic:complete` — verify state changes via `status --json` after each step
- [ ] Full slice lifecycle via CLI: `slice:create` → `slice:plan` → `start-plan` → `submit-plan` (mandatory, advances to plan-created) → `start-refinement` → `submit-refinement` (advances to plan-refined) → `start-implementation` → `submit-implementation` → `slice:complete` with verificationPassed
- [ ] Quest lifecycle mirrors slice: same commands with --quest flag
- [ ] `epic:abandon --epic test --reason "changed direction"` sets abandoned status with reason
- [ ] `submit-plan --slice 01-auth` with heredoc stdin writes plan and advances state to plan-created
- [ ] `start-plan --slice 01-auth --json --inline` returns context bundle with inlined content
- [ ] `decision:create` with stdin JSON creates a decision entry
- [ ] `learning:rollup --from slices/01-auth --to project` appends marked learnings to project-level JSONL
- [ ] `slice:refine-plan --slice 01-auth --override` bypasses score threshold
- [ ] Missing --slice flag returns exit 2, VALIDATION_MISSING_FLAG
- [ ] Running mutation on empty stdin (TTY) returns helpful error, not hang
- [ ] Mutation commands not explicitly listed above (explore, architecture, remaining entity permutations) are structurally identical — one test each deferred to slice 08 integration tests

## Verification
1. In a temp directory, run a complete mini-workflow via the compiled binary with numbered assertions:
   1. `goodplan init --name test` — assert: exit 0, `.project/project.json` exists
   2. `echo '{"name":"test-epic","goal":"Test epic goal"}' | goodplan epic:create` — assert: exit 0, epic.json created
   3. `goodplan epic:activate --epic test-epic` — assert: exit 0, `status --json` shows activeEpic = "test-epic"
   4. `echo '{"name":"01-test","goal":"Test slice"}' | goodplan slice:create --epic test-epic` — assert: exit 0, slice directory created
   5. `goodplan slice:plan --slice 01-test` — assert: exit 0, `goodplan status --json` shows slice status = "planning" (not yet "plan-created")
   6. Pipe plan content to `submit-plan --slice 01-test` — assert: exit 0, plan file written; `goodplan status --json` shows slice status = "plan-created" (submit-plan is the causal mechanism for state advance)
   7. `goodplan status --json` — assert: slice status = "plan-created"
   8. `goodplan start-refinement --slice 01-test --json` — assert: exit 0, returns context bundle
   9. Pipe refinement result to `submit-refinement --slice 01-test` with scores above threshold — assert: exit 0, slice status = "plan-refined"
   10. `goodplan start-implementation --slice 01-test --json` — assert: exit 0, returns context bundle
   11. Pipe implementation result to `submit-implementation --slice 01-test` — assert: exit 0
   12. `goodplan slice:complete --slice 01-test` with `verificationPassed: true` — assert: exit 0, slice status = "done"
2. Verify abandon: `goodplan slice:abandon --slice 01-test --reason "testing"` — assert: status = "abandoned", reason recorded.
3. Verify override: set up a refining slice, call submit-refinement with low scores + --override — assert: plan-refined state reached despite low scores.
4. Verify stdin TTY detection: run a mutation command in a terminal without piping — assert: helpful error instead of hang.

## Prerequisites
- `learning:rollup` routes through `ROLLUP_LEARNINGS` per `commands-api.md`, but `transition-tables.md` currently has no `ROLLUP_LEARNINGS` event (learnings rollup is handled implicitly via `COMPLETE_SLICE`/`COMPLETE_QUEST`/`COMPLETE_EPIC` responses). **Before slice 03 begins:** resolve whether `learning:rollup` is a standalone state-triggered command (add `ROLLUP_LEARNINGS` event to `transition-tables.md`) or a Data Layer direct operation (remove RPC routing assumption from this slice). This routing decision must be settled to avoid retroactive changes to slices 03 and 04.

## Scope Boundaries
**In scope:** All entity mutation commands per commands-api.md, all sub-agent commands (start-*/submit-*), decision commands, learning rollup (routing TBD — see Prerequisites), --override, stdin integration tests (consuming shared infrastructure from slice 01), target flag enforcement.
**Out of scope:** Read commands (slice 05), integration test suite (slice 08), stdin infrastructure definition (slice 01).
