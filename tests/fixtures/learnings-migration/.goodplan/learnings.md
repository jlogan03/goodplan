# Learnings

Accumulated across all completed slices.

## Schema registry changes are load-bearing for reads
_Source: 01-first-slice_

The schema registry pattern drives getJson Zod parsing. Updating the registry must happen atomically with any code writing new fields.

## Cross-entity handlers need shared builder helpers from the start
_Source: task-capture_

CONVERT_TASK's inlined entity creation duplicated quest/epic shapes until review extracted shared builders.

## Convention-doc-first enables consistent cross-cutting migrations
_Source: skills-cli-integration (epic)_

Writing the shared reference before migrating any consumers meant 15 skills coded against the same contract.
