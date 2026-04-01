# Software Architecture Review — Simplify Data Model Epic

## Issues

**[IMPORTANT]** Phase detection inconsistency between _overview.md and conventions.md
The `_overview.md` (lines 149-155) describes phase detection using filesystem artifact existence (`explore-complete.md` exists, `architecture/_overview.md` exists, `round-N/` directories exist). The `conventions.md` (lines 77-98) explicitly contradicts this: "Phase detection uses the CLI exclusively -- no filesystem artifact checks." The conventions file provides a clean CLI-status-to-phase mapping table. The _overview.md should be updated to match the conventions.md approach, since CLI-based detection is the deeper abstraction (hides filesystem layout from the orchestrator, consistent with the "orchestrator never reads file contents" constraint).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Orchestrator "never reads file contents" constraint is stated but not enforced architecturally (2x weight: caller friction / module depth)
The constraint that the orchestrator never reads file contents appears in `_overview.md` (line 126) and `conventions.md` (lines 9-14), but no architectural mechanism prevents violation. The convention is enforced only by prompt instruction. If an orchestrator skill accidentally reads a file, there is no guard, no fitness function, and no test harness check. The existing dogfood harness (`validate.ts`) already checks for `.project/` direct access violations -- extend this pattern to detect orchestrator file reads. Define a fitness function or harness check: "orchestrator context should contain only CLI output, sub-agent return values, and user Q&A -- no Read tool calls on artifact files." This is especially important because the research (`orchestrator-context-patterns.md`) documents that a single accidental file read can cost 30K tokens.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `_overview.md` lists `explore` as both standalone and shared module but skill-model-api.md doesn't specify the sharing mechanism (2x weight: module depth)
`_overview.md` says `/gp:explore` is "also invoked internally by pipeline skills as a shared module" (line 33). The `skill-model-api.md` agent table shows `explore-phase.md` used by `create-epic`, `create-side-quest`, and `explore` (line 93). But neither file explains how the standalone `/gp:explore` skill relates to the `explore-phase.md` agent definition. Does `/gp:explore` wrap the agent (spawning it as a sub-agent), or does it contain duplicate logic? The relationship should be explicit: either `/gp:explore` is a thin wrapper that spawns `explore-phase.md`, or the explore logic lives in the skill and the agent delegates to it. The current architecture leaves this ambiguous, which creates a risk of logic duplication.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Overview consolidation has two options with no decision criteria or recommendation (2x weight: caller friction)
`data-model-changes.md` (section 3) presents Option A and Option B for overview consolidation but says "Two options to evaluate during implementation." Architecture docs should make the decision, not defer it. The slice that implements this will have to make the choice anyway, and deferring it means the architecture doesn't constrain the implementation. Option A (single `overview.json` at root) is architecturally cleaner -- it eliminates path coupling between overview location and entity type, aligns with the consolidation goal, and simplifies the schema registry (one entry instead of three). Recommend making the decision here.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `reconsiderWhen` and `validUntil` checking is described but the checking mechanism is not architecturally specified (2x weight: module depth)
`data-model-changes.md` says skills that review decisions "check `reconsiderWhen` conditions against the current work context" (line 60) and similarly for `validUntil` on learnings (line 126). But: (1) What does "check" mean? An LLM reads the conditions and judges? A string match? (2) Where does the check happen -- in the orchestrator (violating the "no content reading" rule) or in a sub-agent? (3) What is "the current work context" -- the epic goal? The current slice? The git diff? This is a new module responsibility that crosses the skill/sub-agent boundary and deserves explicit specification. Without it, each skill will implement checking differently.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `conventions.md` says default model is `opus` for all agents but `_overview.md` says haiku for structural tests
`conventions.md` line 121 says "Default model is `opus` for all agents." This refers to agent definitions, not test tiers. But the test harness section in `_overview.md` (line 173) and `test-harness-api.md` use haiku for structural tests and the simulated user response interceptor. These are different contexts (agent definitions vs test execution) but the blanket "opus for all agents" statement could be misread. Add a clarifying note in `conventions.md` that the opus default applies to agent definitions, not to the test harness's model selection for simulated responses.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Agent definition `tools` field vs "do not restrict tools" convention
`conventions.md` (line 123) says "Do not restrict tools -- sub-agents inherit all parent tools by default." But the research file `sub-agent-prompt-files.md` (line 59) lists `tools` as a supported frontmatter field, and the research also notes that MCP tools add 10-20K token overhead per sub-agent turn. For reviewer agents that only need Read/Grep/Glob/Write, restricting tools could save significant context. The convention should acknowledge that tool restriction is a valid optimization for agents with known tool needs, rather than blanket prohibition.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `implement` skill absorbs slice completion but not quest completion
`skill-model-api.md` shows `/gp:implement` handles "Implementation loop, slice completion" (line 16). But quests also have implementation plans. The skill inventory doesn't show how quest plan implementation works. Does `/gp:implement` also handle quests? If so, the "slice completion" description is too narrow. If not, what implements quest plans? The current `implement-plan` skill handles both. This should be documented.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `test-harness-api.md` `simulateUserResponse` uses Messages API or Agent SDK query but doesn't specify error handling
Section 1 describes using either `query()` or direct Messages API for simulated responses, but doesn't specify what happens when the simulation fails (API error, timeout, empty response). The interceptor should have a fallback (e.g., fall back to first-option selection with a warning log) to prevent test suite hangs.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No explicit constraint on continuation file size or growth
The continuation file format (`conventions.md` lines 50-73) can grow unboundedly if a sub-agent is re-spawned multiple times (each instance appends to "Completed" and "Learnings"). Since the continuation file is read by the re-spawned sub-agent, large continuation files become context pollution in the sub-agent's window. Consider noting a size target or suggesting that re-spawned agents should summarize prior continuation content rather than accumulating it.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The architecture is well-structured overall. The orchestrator pattern is well-researched, the context discipline is sound, and the layering preserves the existing four-layer stack cleanly. The research backing (especially `orchestrator-context-patterns.md` and `sub-agent-prompt-files.md`) demonstrates thorough investigation of the design space.

However, several module boundaries are underspecified: the explore standalone/agent relationship, the `reconsiderWhen`/`validUntil` checking mechanism, and the overview consolidation decision are all deferred rather than resolved. The phase detection contradiction between files is a real source of implementer confusion. To reach 9+: resolve the overview consolidation decision, specify the `reconsiderWhen` checking mechanism, clarify the explore skill/agent relationship, fix the phase detection contradiction, and add an architectural mechanism (fitness function or harness check) for the "orchestrator never reads files" constraint.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
