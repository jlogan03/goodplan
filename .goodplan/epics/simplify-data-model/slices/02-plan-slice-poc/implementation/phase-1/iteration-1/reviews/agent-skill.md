# Agent Skill Review — Phase 1: Shared References & Agent Definitions

## Issues

**[IMPORTANT]** Epic architecture `_overview.md` line 69 still contains stale `skills:` frontmatter reference
The plan task explicitly says: "remove stale `skills:` frontmatter reference at ~line 135 ... and replace with the `@` reference mechanism." Line 135 was fixed (confirmed via git diff). However, line 69 still reads: "The `skills:` frontmatter field lists named skills whose full SKILL.md bodies are injected into the agent's context at startup. Each injectable reference (review preamble, output format, CLI conventions) must therefore be a skill directory with a SKILL.md file (`user-invocable: false`)." This directly contradicts the established key decision (issue #25834 — `skills:` injection from plugin agents to plugin skills silently fails). The plan task says "~line 135" but the stale reference is actually at line 69 — the implementation fixed the wrong line (or rather, fixed one of two stale references). Line 69 needs to be updated to describe the `@${CLAUDE_PLUGIN_ROOT}/path` mechanism instead.
File: .goodplan/epics/simplify-data-model/architecture/_overview.md:69
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Reviewer agents lack explicit tool restriction guidance in their definitions
The epic architecture (critical constraints) and the `review-agent-skill.md` shared reference (criterion #7) both specify that reviewer agents should be read-only (Read, Grep, Glob) with no Agent tool access (enforces flat hierarchy). None of the three reviewer agent definitions (`reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`) mention tool restrictions. While the orchestrator is responsible for setting `allowedTools`/`disallowedTools` at spawn time, the agent definitions themselves should reinforce expectations — an agent that doesn't know it's read-only might attempt Write calls that silently fail or produce confusing errors. Adding a brief "You have read-only access to the codebase (Read, Grep, Glob). You cannot modify files or spawn sub-agents." line to each reviewer agent would make them self-contained.
File: agents/reviewer-holistic.md:9
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Editor agent lacks explicit tool restriction guidance
The editor agent needs Write access but should NOT have Agent tool access (flat hierarchy). The definition doesn't mention tool constraints. Adding "You have Read, Grep, Glob, Write, and Edit access. You cannot spawn sub-agents." clarifies capabilities and prevents unexpected Agent tool attempts.
File: agents/editor.md:9
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Synthesis agent doesn't specify whether it should read the artifact itself
The synthesis agent instructions say to "Read all reviewer outputs" but don't clarify whether it should also read the original artifact being reviewed. For deduplication and contradiction resolution, the synthesis agent may need to understand the artifact's content to judge which reviewer position is better supported. If the artifact is not needed (synthesis operates purely on reviewer outputs), state that explicitly to avoid unnecessary context consumption. If it is needed, add the artifact path to the inputs section.
File: agents/synthesis.md:19
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan-phase agent receives both inline context and reference paths but the boundary is unclear
The inputs section mentions both "Inline context — key content from `ContextBundle.inline`" and "Reference paths — `ContextBundle.references` file paths." This implies the orchestrator implements a context budgeting system (`ContextBundle`) that doesn't exist yet and isn't part of this slice. For the PoC, the plan-phase agent should receive concrete file paths to read (architecture files, Q&A output, conventions) — the `ContextBundle` abstraction can be introduced when needed. Simplify the inputs section to match what the Phase 3 orchestrator will actually pass.
File: agents/plan-phase.md:19
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Review-preamble.md `filesWritten` in return format example is empty array, but reviewer agents write review files
The return format in `review-preamble.md` (line 87) shows `"filesWritten": []` but all three reviewer agent definitions show `"filesWritten": ["<review-output-path>"]`. The preamble should show the populated version to avoid confusion if an agent follows the preamble example over its own definition.
File: skills/_shared/references/review-preamble.md:87
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The agent definitions are well-structured, follow the `@` reference pattern correctly, and implement the orchestrator architecture faithfully. The shared reference files are clean, well-organized, and properly self-identifying with headers. The `plan-format.md` extraction is a clean copy. However: the stale `skills:` reference in `_overview.md` line 69 is a significant documentation accuracy issue (contradicts the key decision this entire architecture is built on), and the lack of tool restriction guidance in agent definitions means they don't fully implement the context discipline and flat hierarchy requirements from the epic architecture. Fixing the two IMPORTANT issues and simplifying the ContextBundle reference in plan-phase.md would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
