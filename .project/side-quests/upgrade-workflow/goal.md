# Side Quest: Upgrade Workflow Version

## What We're Building

A skill that migrates repos with an old-version `.project/` directory to the current workflow version. Detects which conventions/files are missing, presents a gap analysis, and migrates incrementally without overwriting existing work.

## Dependencies

- **onboard-repo** quest recommended (shares detection infrastructure)
- **initiatives-infrastructure** quest must be complete (the initiative structure is a key migration target)

## What Changes

### New or Extended Skill

Handles the scenario where `.project/` exists but is missing current conventions (decisions/, expertise tracking, system-profile.md, initiatives/, etc.).

**Core flow**:
1. Detect workflow version — check which files/conventions exist vs expected
2. Present gap analysis — "Your project was set up with workflow vN. Here's what's different: [list]"
3. Migrate incrementally — for each gap, explain what it enables, let user choose
4. Preserve existing work — migration is additive, never overwrites

**Key migration: top-level vertical-slices to initiatives**:
- Repos with top-level `.project/vertical-slices/` need migration to the initiatives model
- Create `initiatives/~~archived~~01_initial/` and move existing vertical slices into it
- Set up top-level `.project/architecture/` as current reality (copy from existing architecture)
- If there are incomplete slices, create an active initiative to house them

## Success Criteria

- [ ] Gap analysis correctly identifies missing conventions
- [ ] Migration from top-level `vertical-slices/` to initiative structure supported
- [ ] Migration is additive — no existing artifacts overwritten
- [ ] User chooses which gaps to fill

## Scope Boundaries

**In scope**: Detecting workflow version gaps, incremental migration, vertical-slices-to-initiatives migration
**Out of scope**: Onboarding new repos (onboard-repo quest), complete changes (refactor-intelligence quest)
