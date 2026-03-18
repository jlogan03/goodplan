# Side Quest: Refactor Intelligence

## What We're Building

Upgrade `/complete-slice` Step 9 from a generic "want a cleanup pass?" to proactive identification of specific refactoring opportunities with scope/risk classification and side quest proposals.

## Dependencies

- None (operates on existing complete-slice infrastructure)

## What Changes

### Updated Skill: `/complete-slice` — Step 9

Replace the generic cleanup question with:

1. **Analyze what was built** — implementation artifacts, review feedback, codebase changes
2. **Identify specific refactors** — duplicated code, pattern divergence, warranted abstractions (rule of three), deferred tech debt from reviews
3. **For each refactor**: what (files/patterns), why (improvement), scope (inline fix vs side quest), risk (low/medium/high)
4. **Propose side quests** for medium+ refactors with drafted goal.md
5. **Skip silently** when nothing found

## Success Criteria

- [ ] Step 9 identifies concrete refactors with specific files/patterns
- [ ] Medium+ refactors proposed as side quests with drafted goal.md
- [ ] Skips silently when no refactors identified

## Scope Boundaries

**In scope**: Complete-slice Step 9 upgrade
**Out of scope**: Onboarding (onboard-repo quest), workflow upgrades (upgrade-workflow quest)
