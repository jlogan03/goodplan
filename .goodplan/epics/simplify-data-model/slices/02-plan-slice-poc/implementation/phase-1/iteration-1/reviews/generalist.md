# Phase 1 Review: Shared References & Agent Definitions

## Issues

**[IMPORTANT]** Reviewer agents instruct themselves to write files but will be denied Write permission at runtime
The three reviewer agents (`reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`) each say "Write your full review (Issues, Score, Summary sections) to the review output path provided in your task prompt" and list `filesWritten: ["<review-output-path>"]` in their return JSON. However, the plan (Phase 3) specifies reviewers get `allowedTools: ["Read", "Grep", "Glob"]` only -- no Write access. The plan also explicitly says "reviewers are read-only -- no Write in allowedTools" and "Orchestrator writes each reviewer's output to `<tmpdir>/reviews/<domain>.md`". These agent definitions will cause runtime failures or confusion when the agent tries to write and can't. The agents should return review content via their JSON return value (not file writes), and `filesWritten` should be `[]`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Reviewer agent return format contradicts injected review-preamble return format
The `review-preamble.md` (lines 85-90) defines the return format with `"filesWritten": []`, but each reviewer agent's body overrides this with `"filesWritten": ["<review-output-path>"]`. When the `@` reference is expanded, the agent sees two conflicting return format examples in the same prompt -- one from the preamble saying empty, one from the agent body saying populated. This creates ambiguity about whether the agent should write files. Resolve by making both consistent: preamble and agent bodies should both show `filesWritten: []` for reviewers, and the review content should be returned inline in the JSON (e.g., a `reviewText` field) or the preamble template should be parameterized.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Synthesis agent `filesWritten` inconsistency with return format
The synthesis return JSON shows `"filesWritten": ["<synthesis-output-path>"]` which is correct (synthesis has Write access). However, the field name in the summary string includes the path placeholder rather than describing the actual behavior. This is cosmetic but worth noting for consistency with the other agents' return format documentation.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No `shared-preamble.md` exists to adapt from
The plan task says review-preamble.md should be "adapted from existing `skills/_shared/references/shared-preamble.md`". That file does not exist (confirmed by Read returning "File does not exist"). The review-preamble.md was created from scratch, which is fine -- the content is complete and well-structured. The plan's reference to adapting from a non-existent file is a stale reference in the plan itself, not an implementation error.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan-phase agent uses PARTIAL status but plan says PoC should use COMPLETE/ERROR only
The plan (Phase 3, optional task) says "For PoC, agents should return COMPLETE or ERROR only; PARTIAL support can be added in a subsequent slice." The plan-phase agent definition includes a full PARTIAL return example with `questions` and `continuationFile`. This isn't wrong per se (the agent definition is forward-looking and will work regardless of orchestrator support), but it's worth noting the inconsistency. The editor agent similarly includes PARTIAL. Since these are agent definitions that will persist beyond the PoC, keeping PARTIAL is reasonable.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Strong implementation that correctly creates all 7 agent definitions and 5 shared reference files with proper structure. The `@` reference paths are all correct and resolve to real files. Frontmatter is valid across all agents (name, description, model: opus). The review-preamble scoring rubric is complete and unambiguous. The architecture file edit correctly replaces the stale `skills:` frontmatter reference with the `@` reference mechanism. The plan-format.md is an exact copy of the original (verified via diff). All files are well under the 500-line limit.

The two IMPORTANT issues both stem from the same root cause: the reviewer agents are written as if they will have Write access, but the plan's orchestrator design (Phase 3) explicitly makes them read-only. This needs to be resolved before Phase 3 implementation to avoid runtime failures. Either: (a) change the reviewer agents to return review content in their JSON and set `filesWritten: []`, or (b) change the Phase 3 design to give reviewers Write access. Option (a) aligns better with the plan's stated design intent.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
