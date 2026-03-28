# Agent Skill Review: Phase 2 — Convention Doc

Reviewer: Agent-Skill
Files reviewed: `skills/_shared/references/cli-interaction.md`, `skills/_shared/references/state-and-activity-formats.md`

## Issues

**[IMPORTANT] Inconsistency with epic architecture on `start-complete` existence**
The convention doc (section 4, line 113) lists `start-complete` among `start-*` sub-agent commands, then contradicts itself in section 9 (line 115-116) by stating "`start-complete` does not exist as a command." The epic architecture also has an inconsistency: `commands-api.md` does NOT list `start-complete` in the sub-agent commands table, but `cli-interaction-conventions.md` uses `start-complete` in a worked example (line 206). The convention doc should pick one position and be internally consistent. Given that `commands-api.md` (the authoritative command surface) omits `start-complete`, the correct position is that it does not exist. Section 4's `start-*` enumeration in parentheses (line 113) lists it — remove it from that list.
File: skills/_shared/references/cli-interaction.md:113
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `state` command's `--json` exception not documented as `start-*` are**
Section 4 documents two exceptions to the "always use `--json`" rule: `start-*` commands (always JSON) and `state` (always JSON). But the `start-*` exception explicitly says "the `--json` flag is accepted but has no effect." The `state` exception in section 8 says the same thing — good. However, section 4's initial statement "All CLI queries from skills must use `--json`" combined with the two exceptions creates ambiguity: should skills pass `--json` to `state` for consistency? The `start-*` section answers this ("You should still include `--json` for consistency") but the `state` exception doesn't give the same guidance. The query examples in section 8 inconsistently include `--json` (some have it, some don't — line 347 omits it in the `--inline` example). Standardize: always include `--json` in all examples, and add the same "include for consistency" guidance to the `state` exception.
File: skills/_shared/references/cli-interaction.md:287
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Section 4 `start-*` list includes `start-complete` alongside confirmed non-existence**
Related to the first issue but specifically: in line 113, the parenthetical list reads `start-plan`, `start-refinement`, `start-implementation`, `start-explore`, `start-architecture`, `start-slices`, `start-refine-architecture`, `start-refine-slices`. This is correct and matches `commands-api.md`. But section 9 (line 115) says "Important: `start-complete` does not exist" — this callout is good but the juxtaposition suggests it was once in the list and removed. Confirm the list in section 4 line 113 is accurate (it is) and keep the section 9 callout.
File: skills/_shared/references/cli-interaction.md:113
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Section 8 query example uses `--json` inconsistently with `--inline`**
Line 347 shows: `goodplan state --query '.architecture["_overview.md"]' --inline --json` — note `--json` comes after `--inline`. In all other examples, `--json` comes immediately after `state`. While flag order doesn't matter functionally, consistency in documentation reduces cognitive load for agents. Standardize all examples to `goodplan state --json --query ...`.
File: skills/_shared/references/cli-interaction.md:347
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Missing table of contents for a 517-line reference file**
The file is 517 lines — above the 100-line threshold where large reference files should have a table of contents (per progressive disclosure criterion). Adding a TOC at the top allows agents to jump to relevant sections without reading the entire file.
File: skills/_shared/references/cli-interaction.md:1
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `state-and-activity-formats.md` deprecation notice could be stronger**
The deprecation notice added to `state-and-activity-formats.md` correctly points to the new convention doc. However, the `state.md` format section is still fully documented below the deprecation notice. Consider adding a note that the `state.md` section is retained only for migration reference and will be removed in a future slice, to prevent agents from accidentally following the old format.
File: skills/_shared/references/state-and-activity-formats.md:3
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Section 7 `artifacts` field documented as "available after slice 02" but used in examples**
Section 7 correctly notes that the `artifacts` field on `show --json` doesn't exist until slice 02. But the workaround guidance ("use `status --json` for the entity status and `state --json --query` for file-existence checks where needed") is good. No issue here functionally — the temporal caveat is well-placed. Just note: skills reading this doc in slice 01 context will see `artifacts` documented and might try to use it. The "Available after slice 02" callout is sufficient.
File: skills/_shared/references/cli-interaction.md:253
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The convention doc is well-structured, comprehensive, and covers the key interaction patterns thoroughly. The migration example, error handling section, and completion command payloads are particularly well done. The deprecation of `state-and-activity-formats.md` is handled correctly. The main deduction is for the internal inconsistency around `start-complete` (mentioned in the `start-*` list context but then said not to exist) and the inconsistent `--json` flag usage in examples. Adding a TOC would improve progressive disclosure. Fixing the `start-complete` inconsistency and standardizing `--json` usage in examples would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 5
