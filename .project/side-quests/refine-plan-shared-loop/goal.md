# Side Quest: Refine-Plan Shared Loop Refactoring

## Goal

Refactor `/refine-plan`'s SKILL.md to reference the shared `~/.claude/skills/_shared/references/iteration-loop.md` for its iteration loop orchestration, rather than defining the full loop inline.

## Context

The `iteration-loop.md` shared reference was created during the architecture-quality side quest (Phase 4) to extract the common review-iterate-edit pattern used by both `/refine-plan` and `/refine-architecture`. Currently:

- `/refine-architecture` references `iteration-loop.md` and defines skill-specific Loop Parameters
- `/refine-plan` still has the full loop defined inline in its SKILL.md

## Scope

1. Add a **Loop Parameters** section to refine-plan's SKILL.md (matching the pattern in refine-architecture)
2. Replace inline loop orchestration details with references to `iteration-loop.md`
3. Keep all refine-plan-specific behavior (pre-review research, codebase context discovery, plan conversion, etc.)
4. Verify that refine-plan still works correctly after the refactoring

## Constraints

- Do not change refine-plan's behavior — this is a pure refactoring
- Do not modify `iteration-loop.md` — it should already cover everything refine-plan needs
- If `iteration-loop.md` is missing something refine-plan requires, add it to the shared file (and verify refine-architecture still works)

## Success Criteria

- refine-plan's SKILL.md references `iteration-loop.md` for the shared orchestration pattern
- refine-plan's SKILL.md is shorter (loop details moved to shared reference)
- Both `/refine-plan` and `/refine-architecture` use the same shared loop reference
- No behavioral changes to either skill
