# Phase 3: Define-Architecture — Design-It-Twice

Add multi-option design generation between the two design tree passes: spawn sub-agents with different design philosophies, present lightweight comparison artifacts, include agent recommendation, let user choose or synthesize.

### Context

After the broad design tree pass (Phase 2), the agent has enough structure (subsystems, communication patterns, constraints) to generate meaningfully different designs. Design-it-twice presents 2-3 options per major architectural area, each with a different design philosophy. The user sees concrete trade-offs before committing.

**Lightweight artifacts**: Each design option includes interface signatures, usage examples, what it hides internally, and trade-offs — not full architecture file drafts. The chosen design gets fleshed out in the deep design tree pass (Step 7).

### Tasks

- [ ] Write Step 6 — Design-it-twice:
  1. From the broad design tree output, identify major architectural areas that have meaningful design choices (e.g., overall system shape, subsystem boundaries, key APIs, data access patterns). Not every area needs multiple options — only areas where different approaches have real trade-offs.
  2. For each area, spawn 2-3 sub-agents (model: "opus") in parallel, each with a different design constraint:
     - "Minimize API surface — aim for deep modules with 1-3 methods each"
     - "Maximize flexibility — support many use cases and extension points"
     - "Optimize for the most common case — make the 80% path trivial"
     - Optional: "Take inspiration from [specific paradigm/library the user mentioned]" (only if the broad pass surfaced a specific reference)
  3. Each sub-agent produces a lightweight design artifact:
     - Interface signatures (types, method names, parameters)
     - 1-2 usage examples showing how callers interact
     - What complexity is hidden internally
     - Key trade-offs: what this design makes easy vs hard
  4. Present all options side by side with a comparison:
     - Interface simplicity (method count, parameter count)
     - General-purpose vs specialized
     - Implementation efficiency
     - Depth (small interface hiding significant complexity = good)
     - Ease of correct use vs ease of misuse
  5. Include agent's recommendation with rationale grounded in the project's specific context (idea.md goals, constraints from the broad design tree, user expertise level).
  6. Use AskUserQuestion: "Which design do you prefer? You can also synthesize elements from multiple options."
  7. Record the chosen design approach as a decision in `.project/decisions/`.
  8. Pass the chosen design to Step 7 (deep design tree pass).

- [ ] Create a reference file `~/.claude/skills/define-architecture/references/design-it-twice.md` containing:
  - The sub-agent prompt template for design generation (design constraint + context from broad pass + output format)
  - The comparison framework (dimensions to compare on)
  - Guidance on when to skip design-it-twice for an area (only one reasonable approach, or the area is too small to warrant multiple options)

- [ ] Update the skill's reference loading (Step 1) to include the new reference file
- [ ] Ensure design-it-twice integrates cleanly with the broad pass output and deep pass input

### Verification

- Read updated `define-architecture/SKILL.md` — confirm Step 6 exists between the two design tree passes
- Read `define-architecture/references/design-it-twice.md` — confirm sub-agent prompt template, comparison framework, and skip guidance
- Step 6 takes broad pass output (subsystems, constraints) as input
- Step 6 output feeds into Step 7 (deep pass) as the chosen design to flesh out
- Agent recommendation is required (not optional) and must cite project-specific rationale
