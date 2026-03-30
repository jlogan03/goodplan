# Software Architecture Review — audit-docs-and-tests Plan

## Issues

**[IMPORTANT] Missing `install-skills.sh` update task**
The plan creates two new skill directories (`skills/audit-docs/` and `skills/audit-tests/`) but neither phase includes a task to add them to the `SKILL_DIRS` array in `scripts/install-skills.sh`. Without this, `bun run install:skills` will not copy the new skills to `~/.claude/skills/`. The confirmed goal explicitly states "Done means both skills installed via `bun run install:skills`" — so this is a gap against the goal.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Inconsistent side quest creation mechanism**
The plan says both skills should use `goodplan quest:create` for proposing side quests (Phase 1 Step 4, Phase 2 Step 5). This is correct per the CLI-managed convention. However, the plan should note that the existing `audit-architecture` skill uses the older filesystem approach (`mkdir -p .project/side-quests/<name>` + write `goal.md` directly). The new skills should use the CLI command, but the plan's Step 4/Step 5 should include the exact CLI invocation pattern (matching `complete` skill's guidance: `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`) rather than the vague "propose as side quest via `goodplan quest:create`". Without the concrete invocation, the implementer may copy the older filesystem pattern from `audit-architecture`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Plan does not follow audit-architecture's full structural pattern**
The plan's step numbering and structure diverge from the established `audit-architecture` pattern in ways that will create inconsistency. Specifically:
- **Missing Step 0 version check details**: `audit-architecture` reads `../_shared/references/cli-interaction.md` and checks version compatibility. The plan mentions "Standard CLI version check" but doesn't specify reading the shared reference.
- **Missing context loading**: `audit-architecture` has a thorough Step 1 (load decisions, learnings, conventions, activity log, expertise, resume detection, guidance reference). The plan's `/audit-docs` jumps straight to "Discover Documentation Sources" and `/audit-tests` to "Load Testing Context" without loading the standard project context that all audit skills should share.
- **Missing graceful stop protocol**: `audit-architecture` has a dedicated step for partial-report handling at each step boundary. Neither new skill includes this.
- **Missing expertise check**: `audit-architecture` ends with an expertise check step. Neither new skill includes this.
- **Missing audit report writing**: `audit-architecture` writes to `.project/audits/<type>-<date>.md`. Neither new skill writes a persistent audit report.
- **Missing project-health refresh**: `audit-architecture` refreshes `.project/project-health.md`. Neither new skill does this.

These are established conventions from the audit pattern, not optional features. Omitting them creates architectural inconsistency across the audit skill family.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Sub-agent model not specified**
The `audit-architecture` skill explicitly specifies `model: "opus"` for sub-agents. The plan mentions "Spawn Reviewer Sub-Agents" but does not specify the model. This should be explicit to ensure consistent behavior.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] No resume detection for interrupted audits**
`audit-architecture` checks for partial audit reports and offers to resume. Neither new skill includes this capability. While this could be deferred to a follow-up, it should at minimum be noted as a known gap so it doesn't get lost.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Reference file naming inconsistency**
The plan names the sub-agent prompt file `reviewer-prompts.md` while `audit-architecture` uses `sub-agent-prompts.md`. The plan also adds a `doc-discovery-patterns.md` / `test-patterns.md` where `audit-architecture` uses `guidance.md` for strategy and heuristics. The naming should be consistent across the audit skill family — either adopt `audit-architecture`'s convention (`sub-agent-prompts.md` + `guidance.md`) or justify the divergence.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan correctly identifies the two skills needed and their core responsibilities, and correctly chooses the skill-only approach (no CLI changes). However, it significantly under-specifies the structural pattern by omitting most of the shared audit conventions established by `audit-architecture` — version check details, context loading, graceful stop, expertise check, audit report persistence, project-health refresh, and resume detection. These aren't optional embellishments; they're the architectural pattern that makes audit skills consistent and reliable. The plan also misses the `install-skills.sh` update, which is explicitly part of the confirmed goal. To reach 9+: adopt the full `audit-architecture` step structure as a template (Steps 0, 1, N-2 through N+2), add the `install-skills.sh` task, specify concrete CLI invocations for side quest creation, and align reference file naming.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
