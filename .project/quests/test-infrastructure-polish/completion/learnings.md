# Learnings: test-infrastructure-polish

## Plans referencing "all X in file Y" must verify the actual source locations
_Source: test-infrastructure-polish_

The original plan assumed all error code types lived in `src/util/errors.ts`, but `StateErrorCode` (10 of 27 members) is defined in `src/schemas/state-events.ts` and re-exported. Refinement caught this as a CRITICAL issue. Future plans that claim exhaustive coverage of a type or set should verify the actual source file locations during planning, not assume from the re-export site.
