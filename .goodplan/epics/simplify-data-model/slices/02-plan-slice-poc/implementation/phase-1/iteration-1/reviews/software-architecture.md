# Software Architecture Review — Phase 1: Shared References & Agent Definitions

## Issues

**[IMPORTANT]** Architecture overview line 69 still describes `skills:` frontmatter as the agent content injection mechanism
The plan task correctly updated line 135 of `.goodplan/epics/simplify-data-model/architecture/_overview.md` to reference `@` injection. However, line 69 still reads: "The `skills:` frontmatter field lists named skills whose full SKILL.md bodies are injected into the agent's context at startup. Each injectable reference (review preamble, output format, CLI conventions) must therefore be a skill directory with a SKILL.md file (`user-invocable: false`)." This directly contradicts the key decision (issue #25834) and the actual agent implementations, which all use `@${CLAUDE_PLUGIN_ROOT}/path` references. The plan task note says "~line 69 already correctly describes the `@` reference mechanism — no change needed there" but this is factually wrong — line 69 describes the broken `skills:` mechanism, not `@` references. This stale paragraph will mislead future implementers of agents for subsequent slices.
File: .goodplan/epics/simplify-data-model/architecture/_overview.md:69
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Reviewer agent definitions instruct agents to write review output to disk, but plan specifies reviewers as read-only
All three reviewer agents (`reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`) instruct the agent to "Write your full review (Issues, Score, Summary sections) to the review output path provided in your task prompt" and include `"filesWritten": ["<review-output-path>"]` in their return JSON. However, the plan (Phase 3, sub-agent tool restrictions) explicitly specifies: `allowedTools: ["Read", "Grep", "Glob"]` for reviewer agents — no Write tool. The plan also says "reviewers are read-only — no Write in allowedTools" and "Orchestrator writes each reviewer's output to `<tmpdir>/reviews/<domain>.md`". This means at runtime, the agent will be told to write a file but won't have the Write tool available. Two resolution paths: (a) remove the "write to file" instruction from reviewer agents and have them return the full review content in their JSON return, with the orchestrator writing it to disk; or (b) add Write to reviewer allowedTools and remove the "read-only" constraint from Phase 3. Path (a) is more consistent with the stated design intent (minimal agent capabilities) but increases orchestrator context consumption. Path (b) is simpler and lets agents be self-contained.
File: agents/reviewer-holistic.md:30
File: agents/reviewer-software-architecture.md:30
File: agents/reviewer-agent-skill.md:30
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Contradiction between review-preamble.md and reviewer agent definitions on `filesWritten` return field
The shared `review-preamble.md` (injected via `@` reference into all reviewer agents) specifies `"filesWritten": []` in the return format. But each reviewer agent's own Output section specifies `"filesWritten": ["<review-output-path>"]`. After `@` injection, the agent's prompt will contain both instructions, creating ambiguity about whether to populate `filesWritten` or leave it empty. This must be reconciled — either the preamble or the agent-level override should be canonical, not both.
File: skills/_shared/references/review-preamble.md:87
File: agents/reviewer-holistic.md:36
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Refinement coordinator lacks `@` reference injection for shared content
The `refinement-coordinator.md` agent is the only agent (apart from `synthesis.md` and `editor.md`) that doesn't inject any `@` reference. This is architecturally fine for synthesis and editor (they consume structured output, not review criteria). But the coordinator needs to understand what reviewers are capable of to select them intelligently. Currently it has a brief inline description ("Does it define or modify module boundaries..." etc.). If reviewer capabilities change in shared reference files, the coordinator's selection logic won't update. This is acceptable for the PoC but worth noting — a later slice should consider having the coordinator read reviewer metadata rather than hardcoding selection heuristics.
File: agents/refinement-coordinator.md:26
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Agent frontmatter includes `model: opus` but no documentation on override semantics
All agent definitions include `model: opus` in frontmatter. The plan mentions (Phase 4) that `--model` flag overrides this via "systemPrompt.append pattern." However, the agent definitions themselves don't document this override behavior, and the `model:` frontmatter semantics aren't described in any shared reference. For the PoC this is fine (Phase 4 handles testing), but it creates a hidden coupling between agent frontmatter and orchestrator spawn logic that isn't documented anywhere the agent author would see.
File: agents/plan-phase.md:4
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan-phase agent accepts both "inline context" and "reference paths" but doesn't specify precedence
The `plan-phase.md` agent receives both "Inline context — key content from `ContextBundle.inline`" and "Reference paths — `ContextBundle.references` file paths." The instructions say "Use the inline context directly — it's already in your task prompt" and "Read... any reference paths." There's no guidance on what to do when inline context and reference paths contain overlapping content, or on the expected size/budget of each. This is a minor documentation gap since the orchestrator controls what's passed, but an agent author reading the definition wouldn't know the expected contract.
File: agents/plan-phase.md:18
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The implementation delivers all planned files with correct structure, valid frontmatter, proper `@` reference syntax, and clear separation of concerns. The architectural pattern (shared references composed into agent definitions via `@` injection) is sound and aligns with the epic architecture's design intent. However, the reviewer write-vs-read-only contradiction is a significant design inconsistency that will cause runtime failures when Phase 3 restricts reviewer agents to read-only tools, and the stale `skills:` reference in the architecture overview will mislead future agent implementers. Fixing the two IMPORTANT issues (stale architecture doc, reviewer write behavior) and reconciling the `filesWritten` contradiction would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
