# Learnings: initiatives-infrastructure

## Convention-first implementation ordering works well for cross-skill infrastructure

Phase 1 (initiative-conventions.md) gave every subsequent phase a shared reference to code against. Reviewers caught inconsistencies by comparing each skill's implementation against the convention file. Without this, each phase would have invented its own conventions and required reconciliation later.

## Integration review catches gaps that per-phase reviews miss

The final integration review found 5 IMPORTANT issues (implement-plan and create-plan initiative-blindness) that no per-phase reviewer flagged — because each phase's scope was correct in isolation. Cross-cutting concerns like "does implement-plan read initiative architecture?" only surface when you look at the whole system.

## Scope resolution preambles (Step 0) emerged as a pattern through review feedback

The plan didn't prescribe Step 0 preambles — reviewers in Phase 8 requested one for complete-slice, and it was retrofitted. By the end, every initiative-aware skill uses the same pattern: detect active initiative → set $VARIABLES → reference them throughout. This should be a documented convention for future skill updates.

## Renaming a skill directory has a long cross-reference tail

Phase 2 (start-project → create-initiative) required updating 11 files across 7 skills plus repo files. The integration review still found a residual reference in idea.md. Grep-based verification after renames should be standard practice with a "zero remaining" threshold.

## Shared algorithm extraction reduces maintenance burden

Stale detection was initially copy-pasted across 3 files. Reviewers flagged this in Phase 7, and extracting to initiative-conventions.md was a clear win. The principle from existing learnings ("loading protocols belong in the convention file") applies equally to algorithms consumed by multiple skills.
