# Learnings — refine-plan-shared-loop

## Refinement adds more value than net line change suggests

The plan went from vague "remove inline content" to sentence-level precision with a behavioral equivalence mapping table. The final SKILL.md only shrank by 7 lines, but the structural improvement (shared pattern, explicit parameters) is the real value — not line count.

## Small refactorings benefit from precise plans

Even though this was a ~7-line-net change, the plan's sentence-level spec for what stays vs. goes prevented accidental behavioral changes. Without it, an implementer might have removed the Synthesis model-selection row (which isn't in iteration-loop.md) or broken the a-m lettering.

## Pointer stubs preserve navigability

Fully removing sub-steps (3h, 3j) broke lettering continuity. Keeping them as 1-sentence stubs preserves the ability to scan the skill top-to-bottom. Reusable pattern for any refactoring that extracts shared content.
