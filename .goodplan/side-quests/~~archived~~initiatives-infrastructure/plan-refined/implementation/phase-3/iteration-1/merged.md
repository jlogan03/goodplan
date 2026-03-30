# Merged Review: Phase 3 — `/start-initiative` Skill

**Reviewers**: Generalist (8/10), Software Architecture (5/10), Agent Skill (6/10)
**Merged score**: 6/10

## Critical (1)

### C1: Missing `architecture/` directory creation from proposal upon approval

**Raised by**: All three reviewers (unanimous)
**Location**: SKILL.md between Step 5b and Step 6
**Resolution**: DIRECTLY_ACTIONABLE

`initiative-conventions.md` Consumer Guide (line 260) and the directory structure comment (line 90) both state that `architecture/` for subsequent initiatives is "Created by `/start-initiative` (from proposal upon approval)." The SKILL.md writes `approved.md` and renames to `__active__`, but never creates `initiatives/<name>/architecture/`. This breaks the two-layer architecture model — downstream skills (`/define-slices`, `/create-plan`, `/implement-plan`) read from `initiatives/<name>/architecture/` and will find nothing.

**Fix**: Add a step between Step 5b and Step 6 that:
1. Creates `initiatives/<name>/architecture/` directory
2. Copies `_overview.md` from the proposal
3. Transforms `<subsystem>-changes.md` and `new-<subsystem>.md` into target architecture format (merging with top-level architecture files where applicable)
4. If architecture-proposal was skipped (Step 4b path), copies top-level `.project/architecture/` as the baseline instead

## Important (3)

### I1: State validation misses `needs-initiative-completion` state

**Raised by**: Software Architecture
**Location**: SKILL.md Step 3
**Resolution**: DIRECTLY_ACTIONABLE

The shared state machine defines "Needs initiative completion" (vertical-slices/sequencing.md exists AND all slices complete, no completion/). Step 3 lists invalid states but omits this one. An initiative past activation should not be startable.

**Fix**: Add `needs-initiative-completion` to the invalid-state checks in Step 3.

### I2: Active-initiative check (Step 4) runs too late — reorder for fail-fast

**Raised by**: Software Architecture
**Location**: SKILL.md Step 4
**Resolution**: DIRECTLY_ACTIONABLE

Step 3 validates initiative state (reading many files), then Step 5 presents the full proposal, but Step 4 checks for an existing active initiative and hard-stops if found. This does unnecessary work before discovering activation is blocked.

**Fix**: Move the active-initiative check to run immediately after resolving the initiative in Step 1, before state validation.

### I3: Description under-specifies trigger phrases for subsequent initiatives

**Raised by**: Agent Skill
**Location**: SKILL.md line 3 (description)
**Resolution**: DIRECTLY_ACTIONABLE

The description says "The approval/activation gate for subsequent initiatives" but omits natural user phrases like "review architecture proposal", "ready to build", "let's build this initiative", "activate this". This risks under-triggering.

**Fix**: Add trigger phrases to the description.

## Minor (4)

### M1: Active Slice field format inconsistency (`__active__` prefix)

**Raised by**: Generalist, Agent Skill
**Location**: SKILL.md Step 7
**Resolution**: CODEBASE_EXPLORATION

Step 7 sets Active Slice to `initiatives/__active__<name>`, but flow-log scope in the same step uses `initiatives/<name>` (no prefix). `state-and-flow-formats.md` examples also omit the prefix. Need to check what `/create-initiative` Mode A uses and pick a consistent convention.

**Fix**: Check existing convention and make Active Slice field consistent with flow-log scope.

### M2: `approved.md` template unclear on skip-path content

**Raised by**: Software Architecture, Agent Skill (overlapping)
**Location**: SKILL.md Step 5b
**Resolution**: DIRECTLY_ACTIONABLE

When reached via Step 4b (skip architecture), the `approved.md` template references "Architecture Proposal Files" and "proposal content" in the Rationale section, but neither exists on the skip path. The template has an "N/A" fallback but the flow between paths is unclear.

**Fix**: Add a brief note at Step 5b clarifying which path produces which content, and that rationale on the skip path draws only from user confirmation and initiative goal.

### M3: No re-entry / partial-completion handling

**Raised by**: Software Architecture
**Location**: SKILL.md (whole file)
**Resolution**: DIRECTLY_ACTIONABLE

Other skills handle partial completion and re-entry. If `/start-initiative` fails after writing `approved.md` but before renaming, there is no way to resume.

**Fix**: Detect partial state (e.g., `approved.md` exists but no `__active__` prefix) and offer to resume.

### M4: No explicit handling of `__active__initial` as argument

**Raised by**: Agent Skill
**Location**: SKILL.md Step 1
**Resolution**: DIRECTLY_ACTIONABLE

If a user passes `__active__initial`, Step 1 normalization could strip the prefix and fail to find the directory. The `__active__` check in Step 3 would eventually catch it, but with a confusing error.

**Fix**: Add normalization rule: if name starts with `__active__`, tell user the initiative is already active and stop.
