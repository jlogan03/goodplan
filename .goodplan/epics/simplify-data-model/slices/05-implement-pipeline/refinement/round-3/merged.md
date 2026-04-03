# Merged Feedback — Slice 05 Implement Pipeline (Round 3)

Reviewers: holistic (9/10), software-architecture (8/10), agent-skill (8/10)

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. `implementationPhase` data model change needs explicit guard semantics and CLI command specification**
Sources: holistic, software-architecture, agent-skill (all three flagged)

The plan hedges on the CLI command name ("e.g., `slice:update --implementation-phase N`") and omits transition guard details. All three reviewers agree this must be pinned down:
- **Guard semantics (software-architecture):** (1) Event valid only when slice status is `implementing`, (2) value must be >= current `implementationPhase` (monotonic), (3) `BEGIN_IMPLEMENTATION` initializes to 0, (4) `COMPLETE_IMPLEMENTATION` does not clear (field is historical). Add transition row to the plan.
- **CLI command name (holistic, agent-skill):** Commit to a specific command. `slice:update` does not exist in `src/commands/`. Decide whether it's a new top-level command or a flag on an existing command. Agent-skill notes existing `start-implementation`/`submit-implementation` live in `src/commands/subagent/`, so consider that namespace. Specify the full invocation (e.g., `$GP slice:update --slice <name> --implementation-phase 1`).
- **Sub-tasks (holistic):** If a new command, add explicit sub-tasks for new file in `src/commands/`, registration in `main.ts`, and schema entries.

Fix: Expand Phase 2 task 4 with guard semantics, concrete command name, namespace placement, and any needed new sub-tasks for command registration.

**I2. `completion-phase` rename risks partial updates — enumerate all references and verify**
Sources: software-architecture, agent-skill

Phase 1 updates `skill-model-api.md` and `conventions.md`, but doesn't enumerate all locations:
- `skill-model-api.md` has two references (line 24 and line 119)
- `conventions.md` line 58 lists `completion-phase` in `reconsiderWhen` ownership
- 28 grep hits exist across the repo (mostly `.goodplan/` state files, not executable code)

Fix: (1) Enumerate all three doc locations explicitly in the Phase 1 task. (2) Add a verification sub-task: `grep -r "completion-phase" agents/ skills/` should return 0 hits after the rename. State files in `.goodplan/` don't need updating.

## MINOR Issues

**M1. Phase 3 `reviewer-registry.md` destination not specified**
Sources: software-architecture, agent-skill

The task says "port from `skills/implement-plan/references/`" but doesn't state the destination. `iteration-loop.md` line 46 expects `references/reviewer-registry.md` relative to the skill directory.

Fix: Explicitly state: "Create `skills/implement/references/` and copy `reviewer-registry.md` into it."

**M2. Phase 4 changed-files aggregation mechanism unspecified**
Source: holistic

The orchestrator commits per-phase but then needs to pass "changed files from all phases" to `completion-slice`. The plan doesn't specify how to accumulate these (list variable vs `git diff`).

Fix: Specify the mechanism — e.g., accumulate `filesChanged` arrays across phase iterations into a running list, or use `git diff --name-only` against the pre-implementation commit.

**M3. Phase 5 `complete-epic` trigger phrases incomplete**
Source: agent-skill

Plan lists "complete epic", "finish epic", "epic completion" but architecture spec also requires "close epic" and "wrap up epic". Claude tends to under-trigger on description matches.

Fix: Add "close epic" and "wrap up epic" to the description field trigger phrases.

**M4. Phase 5 artifact promotion should be idempotent**
Source: software-architecture

`cp` without dedup check means re-entry could overwrite previously promoted artifacts.

Fix: Use `cp -n` (no-clobber) for artifact promotion to ensure idempotency.

**M5. Phase 5 `decision:list --json` and `learning:list --json` not verified**
Source: holistic

Phase 5 references these CLI commands but doesn't verify they exist and return expected fields, unlike other CLI commands in the plan.

Fix: Add verification that these commands exist and return `reconsiderWhen`/`validUntil` fields.

**M6. Phase 6 re-entry test fixture dependency on Phase 2 CLI command should be concrete**
Sources: software-architecture, agent-skill

The fixture says "set `implementationPhase` to 1 via the CLI command added in Phase 2" with a referential dependency. If Phase 2's command changes, this breaks silently.

Fix: Include the exact CLI invocation in the fixture setup. Add a note that fixture setup should verify the command succeeds before proceeding.

**M7. Phase 7 before-check sequencing could confuse implementer**
Source: holistic

The "before" check references `bun tools/dogfood/test-implement.ts` exiting non-zero, but that script is created in Phase 6. Clarify that this validates the test detects incomplete integration, not that the script doesn't exist.

Fix: Add clarifying note to Phase 7 before-check.

**M8. Phase 1 `conventions.md` update location unclear**
Source: holistic

The task says to update `conventions.md` `reconsiderWhen` ownership list "similarly" but doesn't confirm the exact location. If the section doesn't mention `completion-phase` by name, the implementer will waste time searching.

Fix: Confirm exact line/section in `conventions.md` (line 58 per software-architecture review).

## DIRECTLY_ACTIONABLE

All issues above are directly actionable. Priority order:
1. I1 — `implementationPhase` guards + CLI command specification
2. I2 — `completion-phase` reference enumeration + verification step
3. M1 — `reviewer-registry.md` destination
4. M3 — Missing trigger phrases
5. M2, M4, M5, M6, M7, M8 — Clarifications and idempotency

## RESEARCH_NEEDED

None.

## Contradictions Resolved

None — all three reviewers were in agreement. The holistic, software-architecture, and agent-skill reviews raised the same core issues (I1 and I2) from different angles, which have been merged above.

## Unresolved (USER_INPUT required)

None.
