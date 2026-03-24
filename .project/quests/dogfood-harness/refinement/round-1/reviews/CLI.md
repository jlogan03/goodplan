# TUI and CLI Review — Dogfood Test Harness Plan

## Issues

**[CRITICAL]** Harness does not differentiate CLI exit codes (1/2/3) in error handling

The `goodplan()` helper collapses all non-zero exits into `{ ok: false }`. The CLI defines three distinct exit codes per INV-007 and `cli-interaction-conventions.md`: exit 2 (validation/usage — skill bug, fix invocation), exit 3 (state machine — may be idempotent re-entry, recoverable), exit 1 (internal — stop and present to user). The plan's "state recovery" task (Phase 2) says "check if state transitioned, if not attempt manual CLI transition" but doesn't specify parsing the exit code or error JSON to distinguish recoverable vs fatal failures. Without this, the harness will attempt manual recovery on internal errors (exit 1) and miss the idempotent re-entry pattern for exit 3 (`STATE_INVALID_TRANSITION` means "already past this phase" — not an error).

Phase 1 tasks should update the `goodplan()` helper to expose the exit code and parsed error JSON, and Phase 1/2 state-recovery logic should branch on exit code per the documented conventions.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 quest lifecycle uses wrong CLI commands

Phase 3 tasks say "Run quest lifecycle: `quest:plan` -> `/create-plan` -> `/implement-plan` -> `/complete`". Per the transition tables, quests have their own distinct events (`BEGIN_QUEST_PLAN`, `COMPLETE_QUEST_PLAN`, `BEGIN_QUEST_REFINEMENT`, etc.) and the submit commands require `--quest` to disambiguate: `submit-plan --quest <name>`, `submit-implementation --quest <name>`. The plan doesn't mention these quest-specific submit commands — the skill prompts need to reference the correct `--quest` flag. Also, `quest:plan` sets `activeQuest` in project.json, and there's a `STATE_QUEST_ALREADY_ACTIVE` guard — the harness should check for and handle this.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No `--json` flag on all CLI calls in the harness

The CLI interaction conventions doc states: "All CLI queries from skills must use `--json` for structured, parseable output." The existing harness code already uses `--json` on most calls, but the plan's Phase 1 `reset` command description says "Runs `goodplan init --name nondet-eval`" and "Runs `epic:create`" without mentioning `--json`. The `reset` task should explicitly specify `--json` on all CLI calls and parse responses for error detection. Similarly, Phase 3/4 task descriptions omit `--json` from several commands (`quest:create`, `quest:show`, `epic:create`).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Missing stdin piping for commands that require it

Per `cli-interaction-conventions.md`: "Always pipe empty stdin even when no input is needed — the compiled binary reads stdin and will block if nothing is piped." The existing harness's `goodplan()` helper correctly sends `input: opts.stdin ?? ""` (empty string default), so the code is fine. But the plan's task descriptions for Phase 1 `reset` say "Runs `epic:create` with core-provider name/goal" without specifying the stdin JSON payload shape. The `epic:create` command requires stdin: `{"name": "core-provider", "goal": "..."}`. Phase 3's `quest:create` similarly needs stdin. The plan should document the expected stdin payloads for these commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `reset` command has no error handling or idempotency

The Phase 1 `reset` task lists steps (delete `.project/`, run `init`, run `epic:create`, write `goal.md`, verify via `status --json`) but doesn't address: (1) What if `nondet-eval` directory doesn't exist? (2) What if `goodplan init` fails? (3) What if `epic:create` fails? (4) `goal.md` — is this an epic goal written via CLI or a direct file write? Per data ownership conventions, the epic goal is stored in `epic.json` via the `epic:create` stdin payload, not a separate `goal.md` file. The plan should clarify whether `goal.md` is the epic-level goal (which is CLI-owned JSON, set via `epic:create` stdin) or a free-form research/brainstorm file.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Harness exit codes not specified for harness itself

The plan defines Expected Behavior with "exits 0" for success but doesn't specify what exit code the harness produces on failure. A CLI testing tool should follow standard conventions: 0 for all steps passed, non-zero for failures with a summary of what failed. The current harness code has no top-level try/catch and no explicit exit code on failure — errors in individual phases just log and the harness continues (or crashes with an unhandled exception). The plan should add a task for structured harness exit codes and a final summary report.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 `complete` skill prompt is ambiguous about target entity

Phase 2 has two `complete` calls: `phase2SliceCycle` calls `/complete` for a slice, and `phase2EpicComplete` calls `/complete` for the epic. But the existing harness prompts say "Use the Skill tool to invoke the 'complete' skill for slice X" and "Use the Skill tool to invoke the 'complete' skill. Complete the epic." The `/complete` skill needs to know which entity type and name to target. Per `commands-api.md`, `slice:complete --slice <name>` and `epic:complete --epic <name>` are different commands with different stdin payloads (`slice:complete` requires `verificationPassed`, `deferred`, `learnings`, `architectureDelta`; `epic:complete` requires `verificationResults`). The plan should ensure the prompts pass correct entity identification and the harness constructs appropriate completion payloads.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Log directory path is fragile and hardcoded to active epic slice

The codebase context doc already flags this: "Logs hardcoded to `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/` (fragile path)". The plan's Phase 1 says to use `.project/quests/dogfood-harness/harness-logs/` which is correct, but it should explicitly note that the existing hardcoded path needs to be updated. The friction log path also points to the old location.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No `--help` or usage text testing

The harness is a CLI tool itself, but the plan doesn't include any verification of its own `--help` output or usage text quality. The existing code has basic usage text (lines 386-400) but no test for it. Given this is a developer-facing tool, this is minor — but a quick smoke test of the help output would be good practice.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 architecture proposal approval is direct file manipulation

Phase 4 says "Manual approval: copy `architecture-proposal/` to `architecture/`, write `approved.md`". This bypasses the CLI's state machine. Per `cli-interaction-conventions.md`, skills must not create `.project/` subdirectories or manage state files directly. The plan should clarify whether this proposal-to-architecture copy is something the CLI supports (via a command like `submit-architecture`) or whether this is a known gap that should be logged as friction.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a solid high-level structure and correctly uses the Agent SDK. However, it has significant gaps in CLI interaction correctness: exit code handling is absent, quest-specific CLI commands are not differentiated, stdin payloads are unspecified for several commands, and entity completion payloads don't match the documented schemas. These are not theoretical concerns — the harness will fail at runtime when it hits state machine guards, blocks on stdin, or misinterprets recoverable errors as failures. Addressing the CRITICAL and IMPORTANT issues would bring this to 8+. Adding explicit stdin payload examples and exit-code branching logic to each phase's tasks would bring it to 9+.

## Summary
- Critical: 1
- Important: 6
- Minor: 3
