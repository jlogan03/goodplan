# Plan: Initiatives Infrastructure

## Overview

Add initiative support to the workflow skills. Initiatives are the primary container for large bodies of work — each has its own exploration, architecture, and vertical slices. This quest creates the initiative directory conventions, renames `/start-project` to `/create-initiative`, adds a new `/start-initiative` skill (the approval/activation gate), and updates 7 existing skills to work within initiative scope.

**Slug**: `initiatives-infra`

**Approach**: Convention file first (Phase 1), then new skills (Phases 2-3), then existing skill updates (Phases 4-8). Each skill update is additive — new initiative-aware paths inserted without changing existing behavior for side quests.

**Key design decisions**:
- `/create-initiative` replaces `/start-project` — handles both project setup (first use) and new initiative creation
- `/start-initiative` is the "pull the trigger" gate — reviews architecture proposal, writes `approved.md`, activates with `__active__` prefix
- First initiative is auto-named "initial" and starts as `__active__` (no approval needed)
- Two-layer architecture: top-level = current reality, initiative = target
- Initiative state machine lives in a shared convention file, per-slice state machine stays in `status-logic.md`
- State machine includes a formal transition table for completeness verification

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | Initiative Conventions | Shared reference: directory structure, `__active__` prefix, state machine with transition table, two-layer architecture, archive numbering |
| 02 | `/create-initiative` Skill | Rename from `/start-project`. Mode A: project setup + first initiative. Mode B: new initiative on existing project |
| 03 | `/start-initiative` Skill | New skill: review architecture proposal, approve, activate initiative |
| 04 | `/project-status` Update | Initiative state machine, `__active__` detection, initiative-level reporting |
| 05 | `/explore` + `/define-architecture` + `/refine-architecture` + `/audit-architecture` Updates | Initiative-scoped exploration, architecture definition, refinement, and auditing. Top-level scaffold for first initiative |
| 06 | `/define-slices` Update | Work within initiative's `vertical-slices/` |
| 07 | Stale Assumption Detection + Two-Layer Architecture | `/create-plan` and `/refine-plan` stale checks. Side quest dual-layer reading |
| 08 | `/complete-slice` + `/refine-slices` Scope Resolution | Update both skills to resolve initiative-scoped slices |

**Status**: COMPLETE
**Completed**: 2026-03-18
