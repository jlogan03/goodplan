# API Contract Review: Task Capture Plan (Round 2)

## Issues

**[IMPORTANT]** BeginPhase names "drop" and "convert" are too generic — will collide when other entities need drop/convert

The plan adds `"drop"` and `"convert"` to the `BeginPhase` union. However, these names are entity-agnostic. If epics or quests ever gain a "drop" or "convert" operation, the phase name is already taken. The established pattern for entity-specific phases is prefixed naming: `"create-decision"` (not just `"create"` for decisions), `"add-verification"`, `"update-verification"`. The `"abandon"` phase is shared across epic/slice/quest, which works because all three entities support it with the same semantics (reason-based lifecycle termination). Drop and convert are task-specific operations with task-specific semantics.

Rename to `"drop-task"` and `"convert-task"` for consistency with the `"create-task"` phase already in the plan. This requires updating `BeginPhase`, `BeginPayloadMap`, `buildBeginEvent()`, `mapToBeginPhase()`, and `resolveForBeginPhase()` references. Alternatively, document that `"drop"` and `"convert"` are intentionally generic (like `"abandon"`) with the expectation they could be shared across entity types in the future — but that seems unlikely given the semantics.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** task:convert mixes flags and stdin in a non-standard way

The plan says `task:convert` uses `--task <name> --to quest|epic` flags for scalars and reads optional stdin (`taskConvertInputSchema`) for `name`/`goal` overrides. No other command in the codebase mixes flag-based and stdin-based inputs this way. Commands either use flags only (`quest:abandon`, `epic:abandon`) or stdin only (`quest:create`, `epic:create`). The mixed approach creates ambiguity about which input source takes precedence and complicates `schema` command documentation (INV-006).

Two cleaner options: (a) All via stdin: `echo '{"to":"quest","name":"override","goal":"override"}' | goodplan task:convert --task <name> --json` — `to` moves to stdin alongside `name`/`goal`. This aligns with `quest:create` pattern where the complex payload is in stdin. (b) All via flags: `--task <name> --to quest --name override --goal override` — everything is flags. Since `name` and `goal` are optional overrides of auto-derived values, flags work well and eliminate the need for `taskConvertInputSchema` entirely. Option (b) is cleaner given that `quest:abandon` already demonstrates the flag-only pattern for task-targeted operations.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** task:list JSON output shape diverges from quest:list

`quest:list` returns `{ items: [...] }`. The plan says `task:list` returns `{ items: [...], filter: "open" | "all" }`. Adding the `filter` field is additive and useful, but the plan should document this as an intentional divergence so consumers know to expect it. The `filter` field sets a precedent that future list commands may follow (e.g., `quest:list --status completed`). Consider whether `quest:list` and other list commands should also gain filter metadata for consistency — but that is a future enhancement, not a blocking concern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** task:create stdin schema includes `context` but callers should not populate it

`taskCreateInputSchema` includes `context?: taskContextSchema`. The plan says the `/capture` skill auto-collects context from `goodplan status --json` and `git branch`. If the caller (skill or human) provides `context` in stdin, it is passed through to the state event. This is correct and useful. However, the schema documentation should clarify that `context` is optional and typically auto-populated by the `/capture` skill — direct callers of `task:create` may not know what fields to fill. The `schema --command task:create` output will show the full `context` object shape, which could confuse human callers.

No code change needed — add a doc comment on `taskCreateInputSchema.context` noting it is typically auto-populated by the `/capture` skill and may be omitted for direct CLI usage.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan verification for Phase 2 says "integration tests" but tasks describe unit tests

Phase 2 Verification says "all tests pass including new integration tests" but the Tasks section says "Tests use `reduce()` directly (unit tests, not integration — no integration test pattern exists yet)." This is an internal contradiction. The Verification section should say "unit tests" to match the Tasks section. Similarly, the test file path in Tasks is `tests/unit/commands/task/task-commands.test.ts` (unit directory), which is consistent with the description but not the Verification claim.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's CRITICAL and IMPORTANT issues are all addressed. The plan now has explicit `name` in `taskCreateInputSchema`, flag-based `task:drop`, schema registration, convert overrides, standard `BeginResult`, `init.ts` update, and overview `title` field. The remaining issues are about naming consistency (BeginPhase names) and a non-standard mixed input pattern on `task:convert`. To reach 9+: rename `"drop"`/`"convert"` to `"drop-task"`/`"convert-task"` and simplify `task:convert` to either all-flags or all-stdin.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
