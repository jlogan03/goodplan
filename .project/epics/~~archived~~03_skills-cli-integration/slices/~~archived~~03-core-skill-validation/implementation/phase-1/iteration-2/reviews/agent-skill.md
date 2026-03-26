# Review: agent-skill

Phase: Phase 1: create-epic Migration
Iteration: 2
Reviewer: agent-skill

---

## Issues

**[IMPORTANT]** Error handling inline summary misquotes exit code semantics

The SKILL.md inline summary at the bottom of Step 1 says:

> exit code 1 = validation error (fix input), exit code 2 = state conflict (e.g., duplicate epic name — inform user, adjust), exit code 3 = internal error (report and stop)

The authoritative table in `cli-interaction.md` section 10 has the opposite mapping:

| Exit code | Meaning |
|---|---|
| 1 | Internal/unexpected error — present to user, stop |
| 2 | Validation/usage error — fix invocation (skill bug) |
| 3 | State machine error — parse error code, apply recovery pattern |

The inline summary has exit 1 and exit 2 swapped, and calls exit 3 "internal error" when it is actually the state machine / transition error code. This is iteration 2 and the plan calls out "fixes for error handling reference" — this error is still present in the current file. An agent following the summary would mishandle `DATA_NO_PROJECT` (exit 1, not exit 3) and would misclassify a duplicate-name state conflict as a validation error rather than a state machine error that needs the recovery pattern.

Fix: either remove the inline summary entirely (the reference file is already cited), or replace it with a table that matches section 10 of `cli-interaction.md` exactly.

File: skills/create-epic/SKILL.md:30
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Wrap-up early-exit wording lost signal about partial coverage being acceptable

The original had: "If the user signals they want to wrap up early ('that's enough', 'just write what you have', etc.), proceed immediately — all five areas need not be covered."

The rewrite has: "If the user signals they want to wrap up early, proceed immediately."

The phrase "all five areas need not be covered" was load-bearing — it explicitly tells the agent not to block and not to prompt for remaining checklist areas. Without it, an agent could interpret "proceed immediately" as "proceed to the next checklist item" rather than "skip all remaining checklist items." The detail about examples of early-exit language also helped trigger recognition. Brevity is good, but not when it removes the permission to skip remaining coverage.

Fix: restore "proceed immediately without completing the coverage checklist" or equivalent phrasing.

File: skills/create-epic/SKILL.md:64
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 8 Confirm verifies wrong field name

Step 8 says: "Check `status === "created"`."

The `epic:create` response shape (per `cli-interaction.md` section 12 migration example) returns `{ "entity": "my-epic", "phase": "create", "previousStatus": "none", "newStatus": "created" }`. The field is `newStatus`, not `status`. An agent checking `status === "created"` on a mutation response will find no such field and may behave unpredictably (silently pass, or flag an error).

Fix: change to "Check `newStatus === "created"`" or verify the field names against the actual `epic:show` response shape (since Step 8 uses `epic:show`, not the create response — `epic:show` likely returns a flat object with a `status` field; if so, this is fine but Step 8 should clarify it's reading from the `epic:show` output, not the `epic:create` output).

File: skills/create-epic/SKILL.md:113-115
Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Mode B does not check `DATA_NO_PROJECT` explicitly as an error path for Step B5 confirm

Step B5 uses `goodplan status --json` to confirm the new epic appears. But the skill already used `goodplan status --json` in Step 2 and routed success to Mode B. Step B5's confirm call can fail with any of the standard exit codes, and the skill gives no guidance. This is low risk (if creation succeeded in B3, status will succeed), but inconsistent with how error handling is handled in Step 2 (which explicitly names the fail condition). This is minor because the error handling reference is already cited in Step 1.

File: skills/create-epic/SKILL.md:185-188
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Step 3b expertise calibration step 4 drops the `AskUserQuestion` call signal

Original: "use AskUserQuestion: 'This project involves [X] and [Y]...'"
Rewrite: "ask: 'This project involves [X] and [Y]...'"

This is acceptable conciseness, but the original explicitly told the agent which tool to use for the question. Without it, an agent might ask inline instead of via AskUserQuestion. This matters for UX (AskUserQuestion blocks and collects the response cleanly). Whether this is an issue depends on whether the referenced `expertise-tracking.md` file specifies the tool — if it does, this is harmless. It's flagged as a minor concern.

File: skills/create-epic/SKILL.md:73
Resolution: CODEBASE_EXPLORATION

---

## Score: 8/10

The migration is well-executed: all direct `.project/` structured-state access is eliminated, CLI commands are used correctly, the skill is within the 200-line target (196 lines), the `requires:` frontmatter is present, and the interactive dialogue quality is preserved. The `activeEpic` warning in Mode B is correctly placed before the goal capture loop. Step B3 correctly uses stdin piping for `epic:create`.

The main issue holding this from 9+ is the exit code summary in Step 1, which has exit codes 1 and 2 swapped relative to `cli-interaction.md` section 10. This is exactly the kind of subtle inversion that causes incorrect error recovery in production. The plan for iteration 2 specifically calls out "fixes for error handling reference," which suggests this was a known concern — the fix should be straightforward.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
