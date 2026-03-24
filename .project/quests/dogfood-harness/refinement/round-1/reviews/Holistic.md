# Holistic Review — Dogfood Harness Plan

## Issues

**[CRITICAL]** Plan Phase 1 "Before" check references wrong command signature
The "Before implementation" check says `bun tools/dogfood/harness.ts 2 explore` should "fail or produce no useful output (current draft doesn't use canUseTool, uses wrong model)." But the existing harness already has a working `phase2Explore()` wired up — it will actually run (possibly succeeding, possibly failing for unrelated reasons). The "before" check is not falsifiable as stated because the harness already exists and handles `2 explore`. A true before/after needs to test the specific new behavior (e.g., `canUseTool` intercepting AskUserQuestion, model being haiku). Suggest: change before-checks to assert specific absent behaviors — e.g., verify no `canUseTool` callback in source, verify model defaults to opus/sonnet, verify no `reset` subcommand.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `reset` command deletes `.project/` but plan doesn't specify how `epic:create` and `goal.md` get the right content
Phase 1 says reset should "Run `epic:create` with core-provider name/goal" and "Write `goal.md` for the epic" but doesn't specify what content goes into the goal, what flags `epic:create` needs, or what format `goal.md` requires. The existing `epic:create` command needs `--name` and `--goal` flags (or stdin JSON). The plan should include the specific CLI invocation and goal content so an implementer doesn't have to guess.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Existing tool call counter is broken — plan doesn't address it
Line 139 of harness.ts checks `message.subtype === "tool_use"` to count tool calls, but per the Agent SDK research, there is no `tool_use` subtype on system messages. Tool use is visible via `message.type === "assistant"` with `tool_use` content blocks. The plan's "Improve logging" task mentions logging `SDKAssistantMessage` content summaries but doesn't explicitly call out fixing this existing bug. The tool call counter will always be zero.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 (plan) has no before-checks that test something absent
The "Before implementation" check says `bun tools/dogfood/harness.ts 2` "fails after explore (architecture step not wired up or crashes)." But the existing harness already has `phase2Architecture()`, `phase2RefineArchitecture()`, `phase2Slices()`, etc. fully wired. The before-check is false — the code already exists. The plan needs honest before-checks that test something actually missing in Phase 2's scope (e.g., state recovery after failed skill runs, which doesn't exist yet).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 quest lifecycle uses nonexistent CLI commands
Phase 3 says to run `quest:plan` but the actual CLI has separate commands for quest lifecycle. Looking at the command files: `quest:create`, `quest:plan`, `quest:implement`, `quest:complete` all exist. However, the plan references `/create-plan` and `/implement-plan` skills for quests — need to verify these skills work for quests (not just slices). The plan should note this as a risk and include a verification step.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Log directory path is fragile and plan doesn't fully address it
The codebase context notes that log paths are "hardcoded to `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/` (fragile path)." The plan says to log to `.project/quests/dogfood-harness/harness-logs/` (Expected Behavior section), but no task explicitly says "change LOG_DIR and FRICTION_LOG constants." The plan should have an explicit task to relocate these paths.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 "skip /refine-plan for quest" lacks justification
The plan says "Skip `/refine-plan` for the quest (tests direct plan-to-implement path)" but doesn't explain whether the CLI state machine actually supports this transition. Does `slice:implement` (or its quest equivalent) allow jumping from "planned" to "implementing" without going through "refined"? If not, this will fail. Need to verify the transition tables.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Missing `model` override propagation to sub-agents
The plan says to add a `model` option defaulting to `claude-haiku-4-5` and append to system prompt to force sub-agents to use haiku. But the research doc notes that `maxTurns` only applies to the main thread — sub-agents have their own limits. Similarly, the `model` parameter to `query()` may not propagate to sub-agents spawned by skills. The system prompt append is the only mechanism mentioned but it's documented as "unreliable." If sub-agents use opus/sonnet, costs could be 10-50x higher than expected. The plan should document this as an accepted risk or add budget monitoring per-step.
Resolution: RESEARCH_NEEDED
Research: Check if `@anthropic-ai/claude-agent-sdk` query()'s `model` option propagates to sub-agents spawned via the Agent/Task tool. If not, what mechanisms exist to force sub-agent model selection? Source: claude-agent-sdk source/docs, platform.claude.com SDK reference.

**[MINOR]** `goodplanJson` has no error handling for invalid JSON
Line 57-60 of the existing harness calls `JSON.parse(result.stdout)` without checking `result.ok`. If the command fails, `result.stdout` may contain error text, not JSON. The plan doesn't address hardening this helper, though it will be exercised heavily. Consider adding a guard.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No documentation update tasks
The plan doesn't include tasks for updating any documentation. At minimum, the harness should have a brief README or header comment explaining how to run it, what it expects (nondet-eval repo at ~/Repos/nondet-eval), and what outputs it produces.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 architecture proposal path is under-specified
Phase 4 says "Run explore -> architecture (proposal path, not direct write)" and "Manual approval: copy `architecture-proposal/` to `architecture/`, write `approved.md`." The plan doesn't specify what CLI commands trigger the "proposal path" vs the "direct write" path, or whether `approved.md` is a convention the CLI enforces or just a file the harness writes. An implementer would need to dig into CLI internals to figure this out.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No database backup concern (not applicable)
No production databases involved. This is a test harness operating on local filesystem state. No backup steps needed.

## Score: 5/10

The plan has a solid high-level structure (phased approach, incremental building, friction logging) and the goal is clear. However, it has two critical issues: the "before" verification checks are not falsifiable because they describe conditions that don't match the actual codebase state (the harness already has most Phase 2 wiring). Multiple important issues around under-specified tasks (reset command details, log path migration, quest skill compatibility, sub-agent model propagation) would leave an implementer guessing. To reach 9+: fix all before-checks to be truly falsifiable against current code, add explicit tasks for the log path relocation and goodplanJson error handling, specify the exact CLI invocations for the reset command, and document the sub-agent model propagation risk.

## Summary
- Critical: 2
- Important: 5
- Minor: 4
