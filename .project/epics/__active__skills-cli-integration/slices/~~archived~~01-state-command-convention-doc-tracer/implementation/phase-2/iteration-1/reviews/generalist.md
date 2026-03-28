# Generalist Review — Phase 2: Convention Doc

**Score: 9/10**

## Summary

The convention doc is comprehensive, well-structured, and faithfully adapted from the architecture source material. All 12 required sections are present. CLI examples use correct flag names. The deprecation note is properly placed.

## Critical Issues (0)

None.

## Important Issues (1)

1. **Architecture source includes `start-complete` in the worked example (section 5, lines 207-214) but the convention doc correctly excludes it per plan requirements.** However, the architecture source's "Interactive Orchestrator" worked example references `start-complete --slice my-slice --inline --json` — the convention doc should note this discrepancy or flag it to the architecture maintainer. Currently the convention doc is correct but the architecture source is not updated, which could cause confusion if someone reads both. **Recommendation:** Add a comment or note in the architecture source, or flag for cleanup in a future pass. Not blocking since the convention doc itself is correct.

## Minor Issues (3)

1. **Section 4 `start-*` list may be incomplete or over-specific.** The doc lists 8 `start-*` commands by name (line 113). If new `start-*` commands are added, this list becomes stale. Consider adding "including but not limited to" or referencing `schema --json` for the authoritative list.

2. **`--inline` example inconsistency.** In section 8 (line 347), the "with --inline" example puts `--json` after `--inline` and omits the `--json` flag from the initial `goodplan state --query` invocation: `goodplan state --query '.architecture["_overview.md"]' --inline --json`. While functionally equivalent (state always returns JSON), the earlier text says to "always include `--json` for consistency." The example without `--json` first, then with it, could confuse skill authors. Recommend consistent flag placement across all examples.

3. **Missing `--quiet` handling note.** The plan's Phase 1 tasks document that the `state` command handles `--quiet` specially (bypasses `output()`). The convention doc doesn't mention `--quiet` behavior for `state`. This is minor since `--quiet` is described as "for human operators" in section 4 of the architecture source and skills shouldn't use it, but a brief note would be thorough.

## Completeness Checklist (per plan requirements)

| Requirement | Present | Notes |
|---|---|---|
| Binary detection | Yes | Section 1 |
| Invocation patterns | Yes | Section 4 |
| State orientation | Yes | Section 6 |
| Error handling | Yes | Section 10 |
| Completion payload shapes | Yes | Section 9 |
| Correct flag names (entity-specific) | Yes | `--slice`, `--epic`, `--quest` used throughout |
| `stdin: ""` documented with explicit callout | Yes | Section 4, lines 103-109 |
| `start-*` always-JSON behavior | Yes | Section 4, line 76 and section heading |
| `--inline[=<bytes>]` documented | Yes | Section 8, with future budget note |
| Migration example (before/after) | Yes | Section 12 |
| Error recovery patterns | Yes | Section 10 |
| `start-complete` absence noted | Yes | Sections 4 and 9 |
| Deprecation note on state-and-activity-formats.md | Yes | Line 1-3 of that file |
| `state` always-JSON exception documented | Yes | Section 8 |
| `--offset`/`--limit` semantics | Yes | Section 8 |
| `--inline` type-change warning | Yes | Section 8, with concrete examples |
| Section 7 marked "Available after slice 02" | Yes | Section 7 |
| 12 sections total | Yes | All present |

## Accuracy Spot-Check

The convention doc's CLI examples are consistent with the Phase 1 implementation (state command, version --json). Flag names match the registered command schema. Exit code semantics match the architecture spec.

## Verdict

Ship as-is. The important issue is about the architecture source being stale (not this doc), and the minor issues are polish. The convention doc accurately captures the CLI interaction contract and will serve skill authors well.
