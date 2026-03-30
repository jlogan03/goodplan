# Learnings: consistent-skill-output

## Shared template base should be the intersection, not the union
_Source: consistent-skill-output_

When consolidating near-identical templates from multiple skills, the shared base should contain only what ALL consumers share (intersection). Skill-specific sections become documented extension points. The union approach would force every consumer to handle "omit this section" conditionals for fields they don't use — the intersection approach keeps the base clean and puts variance in the consumer's SKILL.md where it's visible.

## Audit the full consumer set before planning template consolidation
_Source: consistent-skill-output_

The initial plan identified 3 consumers per template group. Review found 2 more Done Summary consumers (explore, create-architecture) and 1 more Completion Summary consumer (implement-plan). Missing consumers leaves the same drift problem the consolidation was meant to solve. Always grep for the inline markers across ALL skill files before scoping.
