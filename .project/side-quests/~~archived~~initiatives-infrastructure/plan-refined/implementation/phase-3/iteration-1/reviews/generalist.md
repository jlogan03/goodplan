# Phase 3 Review: `/start-initiative` Skill

**Reviewer**: Generalist
**Score**: 8/10

## Summary

The SKILL.md is well-structured, thorough, and closely follows the plan. State validation covers all states with clear error messages. Both proposal and no-proposal paths are handled. The `approved.md` format includes rationale, file list, and the important note about top-level architecture not being updated. The activation rename logic is correct.

Three issues found, one critical.

## Critical (1)

### C1: Missing `architecture/` directory creation from proposal

**Location**: SKILL.md Step 5b (after "Approve and activate")

`initiative-conventions.md` Consumer Guide (line 260) states:

> `architecture/` (subsequent init) — Created by: `/start-initiative` (from proposal upon approval)

The Two-Layer Architecture Model table (line 208) also confirms:

> `/start-initiative` | Reads (baseline) | Reads proposal, **writes** `approved.md`

However, the directory structure diagram (line 92-98) shows that subsequent initiatives have an `architecture/` directory just like the first initiative, and the Consumer Guide explicitly says `/start-initiative` creates it.

The SKILL.md only writes `approved.md` — it never copies/transforms `architecture-proposal/` into `architecture/`. This means downstream skills (`/define-slices`, `/create-plan`, `/implement-plan`) that read `initiatives/<name>/architecture/` will find nothing.

The plan (line 16) correctly says "Do NOT commit changes to top-level `.project/architecture/`" but this is about the *top-level* architecture, not the *initiative-scoped* `architecture/` directory. The SKILL.md appears to have conflated these two concerns.

**Fix**: After writing `approved.md`, the skill should create `initiatives/<name>/architecture/` by materializing the target architecture from the proposal files. This could mean copying the proposal files into the architecture directory structure, or the convention needs to be updated to clarify that `architecture-proposal/` IS the architecture reference for subsequent initiatives.

## Important (1)

### I1: `Active Slice` field format may use wrong path convention

**Location**: SKILL.md Step 7

The SKILL.md sets Active Slice to `initiatives/__active__<name>`, but `state-and-flow-formats.md` shows scope/path format as `initiatives/<name>` (without prefix). The flow-log scope in the SKILL.md also correctly uses `initiatives/<name>` (no prefix) — this inconsistency within the same skill suggests the Active Slice field should also omit the `__active__` prefix.

However, this is ambiguous since `state-and-flow-formats.md` doesn't explicitly cover this case and the `__active__` prefix is the actual directory name on disk. Clarification needed on the convention.

**Fix**: Decide and document whether state.md paths use the logical name (`initiatives/<name>`) or the physical path (`initiatives/__active__<name>`). Apply consistently.

## Minor (1)

### M1: No-argument scan only finds proposal-pending and needs-architecture-proposal states

**Location**: SKILL.md Step 1

The plan says the skill "accepts optional initiative name argument — required when multiple initiatives are in proposal-pending state." The SKILL.md correctly scans for both `proposal-pending` and `needs-architecture-proposal` states when no argument is given, which matches the plan. However, if an argument IS given, the skill resolves the directory without checking the state first (state validation happens later in Step 3). This is fine functionally but means a user could pass any initiative name and get to Step 3 where they'll be told the state is wrong — a minor UX concern, not a correctness issue.
