# Merged Review — Phase 7, Iteration 1

Reviewers: Generalist (9/10), Software Architecture (7/10), Agent Skill (9/10)

## Issues

**[IMPORTANT] Stale detection algorithm duplicated in three files with no shared extraction**
The core detection logic (git log date comparison, stat fallback, scaffold skip) appears in `create-plan/SKILL.md` Step 3b, `create-plan/references/guidance.md`, and `refine-plan/SKILL.md` Step 2b. The output/action differs intentionally per skill, but the detection algorithm itself is copy-pasted. If a new skip condition is added, three files must change in sync. Consider extracting the detection algorithm to `_shared/references/stale-detection.md` with each skill referencing it and defining its own action.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] Redundant initiative-architecture conflict detection in refine-plan (orchestrator + reviewers both check)**
`refine-plan/SKILL.md` Step 2b has the orchestrator detect initiative architecture conflicts and write them to the codebase context summary. Separately, `refine-plan/references/shared-preamble.md` tells each reviewer to independently discover and check initiative architecture. Both paths run, risking duplicate or conflicting findings. Clarify division of labor: either the orchestrator summarizes conflicts (reviewers trust it) or reviewers discover independently (orchestrator skips).
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Create-plan architecture loading order unclear for initiative slices**
Step 3 item 3 loads `.project/architecture/` unconditionally, then item 4 reframes it as secondary for initiative slices. Merging items 3 and 4 into a single "Load architecture" step that branches by scope type would be clearer.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Scaffold marker `<!-- scaffold -->` has no write-side enforcement**
Stale detection skips scaffold files via this marker, but no skill (`/define-architecture`, `/create-initiative`, etc.) is confirmed to write it. If never written, the skip is dead code.
Sources: Software Architecture
Resolution: CODEBASE_EXPLORATION

**[MINOR] `stat` fallback platform branching exposed to agent**
Both skills instruct the agent to choose between `stat -f %m` (macOS) and `stat -c %Y` (Linux). Since the environment is macOS, this could be simplified. Alternatively, use `git log --diff-filter=A` for cross-platform first-appearance date. The generalist notes that `guidance.md` omits the specific flags (only says "use stat fallback") — if stat is kept, guidance.md should match SKILL.md's specificity.
Sources: Software Architecture, Generalist
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `guidance.md` references `initiative-conventions.md` without a load path**
The Two-Layer Architecture section says "see initiative-conventions.md" but doesn't give the agent a path. The guidance is self-contained enough to not block execution, but could confuse a less capable model. Adding the path (`~/.claude/skills/_shared/references/initiative-conventions.md`) would help.
Sources: Agent Skill
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Scaffold detection scope — initiative-level `_overview.md` not addressed**
The scaffold check targets "the top-level `_overview.md`" only. Initiative-level `architecture/_overview.md` is not mentioned. Likely intentional (initiative arch is authored explicitly), but could be stated explicitly to remove ambiguity.
Sources: Generalist
Resolution: DIRECTLY_ACTIONABLE

## Dropped

- Agent Skill MINOR about "scope" vs "slice" wording — reviewer self-resolved as no action needed.
- Generalist positive-only note about `__active__` glob consistency — not an issue.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Important | 2 |
| Minor | 5 |

The two IMPORTANT issues are architectural: (1) stale detection logic is duplicated across three files with no shared extraction, and (2) refine-plan has redundant initiative-conflict checking in both orchestrator and reviewer paths. Five MINOR items cover loading order clarity, scaffold marker provenance, platform-specific stat flags, missing reference paths, and scaffold scope ambiguity. No functional correctness issues found — all seven plan tasks are implemented correctly.
