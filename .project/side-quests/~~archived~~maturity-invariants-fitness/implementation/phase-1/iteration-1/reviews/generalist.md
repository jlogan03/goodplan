# Generalist Review — Phase 1: Shared Convention File

**Score: 9/10** | Critical: 0, Important: 0, Minor: 2

## What Was Done

New file `~/.claude/skills/_shared/references/maturity-conventions.md` (203 lines) defining maturity levels, table format, promotion criteria, system invariants format, fitness function convention, and consumer guide. Plan checkbox marked.

## Strengths

- **Complete coverage.** All 6 sections present with TOC linking each one. Every element from the plan's task list is addressed.
- **Spec fidelity.** The 4-level maturity table, "what maturity captures" bullets, invariant examples (all 4 from the spec), fitness function examples (all 4), and consumer guide table all match the design spec precisely.
- **Consuming-skill clarity.** Each section includes field-level definitions (tables with Field/Description columns), canonical file locations, format examples with rendered Markdown, and lifecycle rules. A skill reading this file can implement without ambiguity.
- **Good additions beyond minimum.** "Core purpose" summary for maturity (line 34), "Maturity table pointer" bridging paragraph for fitness functions (line 177), and file-location annotations in the consumer guide table all add value without bloating.

## Minor Issues

1. **Demotion triggers could reference `/audit-architecture`.** The demotion criteria list (lines 83-88) describes when subsystems regress but doesn't mention which skill surfaces demotion signals. The promotion section correctly names `/complete` and `/audit-architecture` as suggesters — the demotion section would benefit from the same specificity. Low impact since consuming skills will follow the consumer guide table, not this paragraph.

2. **Invariants lifecycle "Add" scope is slightly narrow.** Line 141 says invariants are added "during `/define-architecture` (first initiative) or initiative architecture proposals (subsequent initiatives)." The design spec (line 227) also says "refined over time," which could include side quests surfacing new invariants. This is an edge case — the current wording is defensible since side quests don't typically define new invariants, but a parenthetical "(or when a side quest reveals a cross-cutting constraint)" would close the gap.

## Verdict

Delivers exactly what the plan specified. The file is well-structured, accurate against the design spec, and precise enough for consuming skills. No changes required to proceed.
