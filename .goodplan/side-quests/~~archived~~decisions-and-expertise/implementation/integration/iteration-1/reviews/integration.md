# Integration Review: Decisions & Expertise Infrastructure

**Reviewer**: Holistic Integration
**Score**: 8/10

## Summary

The implementation faithfully delivers the plan across all 6 phases. Shared references consolidated, decisions format and expertise tracking conventions defined, all target skills updated, and workflow.md reflects the new capabilities. The architecture is clean: two well-defined convention files, consistent loading protocols, and clear writer/reader separation. Two issues prevent a 9.

## Phase-by-Phase Verification

### Phase 0: Shared References Consolidation

**Status**: PASS

- 7 files present in `~/.claude/skills/_shared/references/`: README, state-and-flow-formats, dependency-research, team-defaults, codebase-context-discovery, decisions-format, expertise-tracking.
- No SKILL.md files reference the old `references/formats.md` path.
- 6 skills reference `_shared/references/state-and-flow-formats.md`: complete-slice, create-plan, define-architecture, define-slices, explore, start-project.

### Phase 1: Decisions Convention

**Status**: PASS

`decisions-format.md` contains all required sections:
- File format with template
- Decision threshold with examples and counter-examples
- Status lifecycle (active/superseded/revisiting) with transitions
- Loading protocol (glob, skip superseded, flag revisiting)
- Confirmation requirement
- Extension policy
- Writer/reader lists

### Phase 2: Expertise Tracking Convention

**Status**: PASS

`expertise-tracking.md` contains all required sections:
- Two-layer system (CLAUDE.md summary + auto memory files)
- CLAUDE.md `## Expertise` section format with rules
- Auto memory file convention with path, naming, and example
- Update triggers: `/start-project` calibration step + all interactive skills end-of-run check
- Calibration depth table (comfortable/actively learning/less familiar)
- Extension policy

### Phase 3: Decisions in Skills

**Status**: PASS with one MINOR issue

- 9 skills reference `decisions-format.md`: complete-slice, create-plan, define-architecture, define-slices, explore, implement-plan, project-status, refine-plan, start-project.
- `/explore` SKILL.md: loads decisions in Step 1 (reader), writes decisions in Step 4b2 (writer). Correct.
- `/project-status` SKILL.md: loads decisions in Step 2, counts active decisions for status report (Steps 8 Format A and B). Correct.
- `/complete-slice` references/guidance.md: uses reference to `decisions-format.md` instead of inline format. Correct.

**Writer/reader list match against `decisions-format.md`**:
- Writers listed: explore, define-architecture, define-slices, create-plan, complete-slice. All 5 have decision-writing steps. MATCH.
- Readers listed: all writers + project-status, start-project, refine-plan, implement-plan. All 9 load decisions. MATCH.

### Phase 4: Expertise in Skills

**Status**: PASS

- 6 skills reference `expertise-tracking.md`: complete-slice, create-plan, define-architecture, define-slices, explore, start-project.
- `/start-project` SKILL.md: Step 4b is a dedicated calibration step that reads existing expertise, identifies uncovered domains, asks the user, and writes updates. Correct.
- `/create-plan` SKILL.md: Step 4 says "Follow calibration depth guidance" and Step 6b is the expertise check. Correct.
- `/project-status` SKILL.md: Step 7b loads expertise summary from CLAUDE.md for display. Does not reference `expertise-tracking.md` directly (reads the summary only, not the protocol). This is correct behavior -- it only displays, it doesn't write.

**Consumer list in expertise-tracking.md**: Lists `/project-status` (display). Technically project-status doesn't load the reference file itself, but the listing is accurate as a conceptual consumer. Acceptable.

### Phase 5: workflow.md

**Status**: PASS with one IMPORTANT issue

- `decisions/` present in file structure with description and writer/reader annotation.
- Expertise tracking described in Core Principles section with two-layer system.
- Phase Flow annotations include decisions and expertise behavior at each relevant phase.
- Shared Skill References section describes `_shared/references/`.
- Key Distinctions section explains `decisions/` purpose.
- No unimplemented skills mentioned.

## Cross-Cutting Checks

### Orphaned References

| Finding | Severity | Location |
|---------|----------|----------|
| `references/formats.md` referenced in explore-logic.md line 3 | MINOR | `~/.claude/skills/explore/references/explore-logic.md` |

This is a stale "See also" note in a sub-reference file. The actual SKILL.md correctly points to `_shared/references/state-and-flow-formats.md`. The orphaned reference is informational only (a comment/note, not a Read instruction), so it won't cause a functional failure, but it could confuse a reader.

### Terminology Consistency

Consistent across all files:
- "durable decision" used for threshold language
- "Loading Protocol" used consistently for the glob/skip/flag pattern
- "expertise check" used for end-of-run steps
- "calibration" used for start-project's initial step
- Writer/reader terminology matches between convention files and skill implementations

### Naming Format Mismatch

| Finding | Severity | Location |
|---------|----------|----------|
| workflow.md file structure shows `<NNNN>-<slug>.md` for decision filenames but decisions-format.md specifies `<YYYY-MM-DD>-<slug>.md` | IMPORTANT | workflow.md line 76 |

The authoritative format is in `decisions-format.md` (`<YYYY-MM-DD>-<slug>.md` with example `2026-03-17-adopt-event-sourcing.md`). The workflow.md file structure tree uses `<NNNN>-<slug>.md` which suggests a numeric prefix pattern. All skills that write decisions reference `decisions-format.md`, so the correct format will be used in practice, but workflow.md is the canonical workflow document and should be accurate.

## Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | IMPORTANT | Decision filename pattern in workflow.md (`<NNNN>-<slug>.md`) doesn't match decisions-format.md (`<YYYY-MM-DD>-<slug>.md`) | workflow.md line 76 |
| 2 | MINOR | Orphaned `references/formats.md` "See also" note in explore-logic.md | `~/.claude/skills/explore/references/explore-logic.md` line 3 |

## Verdict

The implementation is thorough and well-integrated. All skills correctly load and write decisions per the protocol. Expertise tracking is properly wired with calibration in start-project and conditional checks in all interactive skills. workflow.md comprehensively documents both new capabilities. The naming mismatch in workflow.md should be fixed to avoid confusion when someone reads the file structure tree as a specification.

**Critical: 0 | Important: 1 | Minor: 1**
