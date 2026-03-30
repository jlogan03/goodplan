# Learnings — 06-create-plan

## Interactive Q&A produces better plans than draft-then-present

The conversation-driven approach (restate goal → propose phases → per-phase deep dive → readiness gate) produces plans that are more aligned with what the user actually wants. The key is the AskUserQuestion gates between stages — they prevent the agent from charging ahead with assumptions.

## Research belongs in the slice directory, not /tmp/

Moving research from /tmp/plan-research/ to the slice's research/ directory means it persists across sessions and is available to refine-plan and implement-plan. The check-before-research pattern (project-level + scope-level) prevents duplicate work. This required updating 10 files across refine-plan and implement-plan.

## Review iterations should also persist in the slice directory

Moving review iterations from /tmp/plan-review/ to refinement/ and implementation/ directories preserves the review history. Useful for cross-session debugging and understanding why decisions were made during review.

## Architectural awareness as a cross-cutting concern

The pattern of pausing to discuss cross-boundary architectural changes (with agent recommendation + rationale) applies to create-plan, implement-plan, and potentially any skill that changes the system. Making the implementation sub-agent read architecture files and report changes in a structured section works well.

## Plan format convention should be documented once and shared

Having plan-format.md as a reference file means the format is explicit rather than implicit. Both the plan author (create-plan) and consumers (refine-plan, implement-plan) can reference the same convention.
