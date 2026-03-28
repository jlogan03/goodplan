# Plan: Architecture Quality

Status: COMPLETE
Completed: 2026-03-17

## Overview

Upgrades the architecture workflow from one-shot definition to multi-option exploration with iterative refinement. Adds two new skills (`/refine-architecture`, `/audit-architecture`) and reworks `/define-architecture` with design tree interrogation and design-it-twice. Embeds the deep module principle as an evaluation criterion across all review-based skills.

**Approach**: Start with the reviewer enhancement (foundation everything builds on), then rework define-architecture in two phases (design tree + design-it-twice), then build the two new skills. Each phase is independently testable.

**Key decisions**:
- Deep module criteria added as new items (8-11) to the existing Software Architecture reviewer, not integrated into existing criteria. Reviewer file consolidated to `_shared/references/` to avoid duplication.
- Design tree interrogation has two passes: broad (surface constraints before design-it-twice) and deep (flesh out the chosen design)
- Design-it-twice produces 2-3 lightweight artifacts (interface signatures + trade-offs), not full architecture file drafts
- `/refine-architecture` is a separate skill (not a mode of `/refine-plan`), sharing the iteration loop skeleton via `_shared/references/iteration-loop.md` with architecture-specific parameters. Edits happen in-place on `architecture/` with a timestamped backup (no separate working copy directory)
- `/audit-architecture` has two functions: gap analysis (per-architecture-file parallel sub-agents) and architecture reassessment (should the target change?)
- Audit findings become proposed side quests — gaps get quests to align code, architecture improvements get quests to refactor after updating the target
- system-profile.md deferred to slice-quality-and-health side quest

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Software Architecture reviewer enhancement | Add deep module evaluation criteria (items 8-11) to reviewer prompt in both refine-plan and implement-plan |
| 02 | Define-architecture — design tree interrogation | Add two-pass design tree (broad + deep) to the define-architecture flow |
| 03 | Define-architecture — design-it-twice | Add multi-option design generation between the two design tree passes |
| 04 | Refine-architecture skill | New skill for when the architecture needs improvement — iteratively review and refine architecture files using the reviewer infrastructure |
| 05 | Audit-architecture skill | New skill for checking architecture health — compare architecture vs code, evaluate whether the target should evolve, propose side quests for gaps and improvements |
