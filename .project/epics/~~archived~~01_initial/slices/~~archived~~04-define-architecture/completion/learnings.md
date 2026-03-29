# Learnings — 04-define-architecture

## Skills that propose tools/libraries need a research step

When an interactive skill drafts content that includes specific tool names, library versions, or framework recommendations, the model will default to training data — which may be months or years stale. This leads to confident-sounding but incorrect version numbers and potentially outdated tool choices.

**Fix:** Before drafting, spawn a sub-agent to WebSearch current versions and alternatives. The research results feed into the draft so the user sees accurate, current information on first presentation.

**Applies to:** Any skill that proposes a tech stack, dependency list, or version-pinned configuration. Currently affects `/define-architecture` (conventions phase). May also affect `/create-plan` if it specifies dependency versions.

## Reference file splitting works well

Splitting reference material into focused files (architecture-logic.md for the decision table, architecture-logic-templates.md for file templates, guidance.md for conversation patterns, formats.md for state formats) kept each file small and purpose-specific. SKILL.md loads only what it needs at each step.

## Re-loading reference files in long interactive sessions

After a long interactive session (conventions phase + multiple architecture files), reference files loaded at Step 1 may have been pushed out of the model's effective context. The solution is to re-load key reference files at the point of use (e.g., re-load guidance.md before the CLAUDE.md update step, load formats.md only at the state write-back step).

## Graceful stop needs case-by-case state handling

A single "write state on stop" instruction isn't enough. Each graceful stop case needs its own state.md string and flow-log behavior:
- No files written → don't touch state at all
- Partial work → list exactly what was written in the state string
- This prevents confusing state entries that claim work was done when it wasn't.
