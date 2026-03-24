# Software Architecture Review

## Issues

**[CRITICAL]** Phase 3 quest lifecycle skips required plan-refined state and plan-refined.md guard

The plan says Phase 3 should "Skip `/refine-plan` for the quest (tests direct plan-to-implement path)." However, the quest transition tables show that `BEGIN_QUEST_IMPLEMENTATION` requires `plan-refined` status AND the guard `hasChild(state, "quests/<name>", "plan-refined.md")`. There is no skip path from `plan-created` directly to `implementing`. The state machine will reject this transition with `STATE_CONTENT_MISSING`. The plan must either: (a) include `/refine-plan` in the quest lifecycle, or (b) explicitly plan to write a `plan-refined.md` and call `quest:refine-plan` to advance through `refining` -> `plan-refined` before implementation. This will cause a hard failure at runtime.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Plan/harness conflates plan "phases" with goodplan phases, creating naming confusion

The plan refers to "Phase 1", "Phase 2", "Phase 3", "Phase 4" at the plan level, but the existing harness code already uses "Phase 2" internally to mean the first epic lifecycle, and Phase 2 tasks include steps like `phase2Explore()`, `phase2Architecture()` etc. Meanwhile, the plan's "Phase 1" is titled "Core Harness + Explore Validation" but the harness code already refers to "Phase 2 steps" for explore. The naming collision between plan phases and harness phase numbers (which map to goodplan workflow phases) creates confusion about what "Phase 2" means in any given context. The plan should use distinct terminology for its own phases (e.g., "Step 1: Core Harness", "Step 2: Full Pipeline", "Step 3: Quest Lifecycle") or align the numbering explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `canUseTool` and `disallowedTools` create conflicting AskUserQuestion strategies

The plan's Phase 1 tasks call for implementing `canUseTool` callback to intercept `AskUserQuestion`, while also keeping the system prompt append as a "soft guard." However, the Agent SDK research shows a third option (`disallowedTools: ["AskUserQuestion"]`) that completely removes the tool. The plan should pick one primary strategy and document why. Currently, Phase 1 says "use `canUseTool`" but the research's recommended configuration uses `disallowedTools`. These are mutually exclusive at the SDK level -- if `AskUserQuestion` is in `disallowedTools`, `canUseTool` will never fire for it. The plan should clarify: use `canUseTool` to intercept and auto-respond (capturing the questions in the friction log), and do NOT use `disallowedTools` for `AskUserQuestion`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No error recovery or state-check between steps in Phase 1

Phase 1 wires up `runSkill()` and `phase2Explore()` but the "state recovery" pattern (check if state transitioned, attempt manual CLI transition, log friction) is deferred to Phase 2 tasks. However, Phase 1 already exercises the explore step end-to-end and the existing harness code in `phase2Explore()` already has manual recovery logic. The plan should explicitly state whether Phase 1's `phase2Explore()` rewrite includes the existing recovery logic or strips it. As written, the Phase 1 tasks don't mention preserving the existing manual `submit-explore` fallback that's already in the harness code.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 architecture proposal approval assumes manual filesystem operations outside the state machine

Phase 4 says: "Manual approval: copy `architecture-proposal/` to `architecture/`, write `approved.md`". This is a filesystem operation that bypasses the state machine and the CLI's `submit-architecture` command. Per INV-001 (every state mutation goes through the state machine), the harness should use CLI commands for state transitions rather than raw filesystem manipulation. The plan should clarify whether this copy operation is a deliberate test of the "proposal path" (which may require specific CLI commands not yet implemented) or whether the existing `submit-architecture` / `epic:define-architecture` commands handle this flow. If the CLI doesn't support the proposal path yet, this needs to be flagged as a dependency.

Resolution: CODEBASE_EXPLORATION

---

**[IMPORTANT]** `goodplanJson()` does not handle non-JSON output or parse errors

The existing harness code has `goodplanJson()` that does `JSON.parse(result.stdout)` without error handling. If a CLI command returns non-JSON output (e.g., an error message without `--json`, or an empty string on certain failure modes), this will throw an unhandled exception and crash the harness. The plan doesn't address hardening this helper, but it's used extensively throughout all phases. At minimum, wrap the parse in try/catch with a meaningful error message including the raw stdout.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Log directory uses fragile hardcoded path tied to active epic slice structure

The existing harness code puts logs in `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/harness-logs`. The plan moves logs to `.project/quests/dogfood-harness/harness-logs/` (implied by the Expected Behavior check `ls .project/quests/dogfood-harness/harness-logs/`). The plan should include an explicit task to update the `LOG_DIR` and `FRICTION_LOG` constants, since this is a known issue from the codebase context doc but not called out as a task.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 verification says code "doesn't need to compile" but this undermines the harness's value

Phase 2 verification says "nondet-eval has actual TypeScript code (even if Haiku-quality -- doesn't need to compile)." If the goal is to validate the full workflow lifecycle, accepting non-compiling code means the verification step (`verificationPassed: true`) is a lie. The harness should at minimum attempt `bun tsc --noEmit` and log the result (pass or fail) in the friction log, even if it doesn't block the harness from continuing. This is especially relevant since the verification criterion added in `phase2Activate()` is literally "All slices pass bun tsc --noEmit and tests."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No budget/cost tracking across the full run

Individual `runSkill()` calls have `maxBudgetUsd` limits, but there's no aggregate budget tracking. The `SDKResultSuccess` message includes `total_cost_usd` -- the harness should accumulate this across all skill runs and report it at the end. This is especially important for the `all` command in Phase 3, which could run 10+ skill invocations. Without aggregate tracking, cost surprises are invisible.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has a critical flaw (quest lifecycle skip violates state machine guards) that would cause a hard runtime failure. It also has several important issues around strategy clarity (canUseTool vs disallowedTools), INV-001 compliance (Phase 4 manual filesystem ops), and missing error hardening. The plan demonstrates good understanding of the Agent SDK and the goodplan workflow, but needs tightening on state machine transition correctness and defensive coding patterns. To reach 9+: fix the quest lifecycle skip, clarify the AskUserQuestion strategy, add error hardening to `goodplanJson()`, address the Phase 4 INV-001 concern, and add cost tracking.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
