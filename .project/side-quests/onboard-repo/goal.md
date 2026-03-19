# Side Quest: Onboard Existing Repo

## What We're Building

A skill that brings existing repos (with code but no `.project/`) into the goodplan workflow. Extracts information from the repo itself (README, code structure, git history, config files, schemas) rather than making the user re-explain everything from scratch. Scaffolds `.project/` with real content, detects conventions, surfaces in-flight migrations and tech debt, and extracts the domain model.

## Dependencies

- **decisions-and-expertise** side quest must be complete (for decisions/ convention and expertise tracking)
- **initiatives-infrastructure** side quest must be complete (for initiative directory structure)

## What Changes

### New Skill: `/onboard-repo` (or extend `/start-project`)

Handles the scenario where a repo has code but no `.project/` directory. Skill design decision (new skill vs extend start-project) to be made during planning.

**Core flow**:
1. Understand what exists — README, repo structure, docs, git history
2. Collect what's missing — through conversation, fill gaps that can't be inferred (goals, constraints, team context, motivation, pain points, timeline)
3. Detect conventions — naming, structure, code patterns, testing, git conventions. Write to conventions.md as "how this repo actually works" (not aspirational)
4. Detect in-flight migrations — pattern coexistence analysis + git timeline correlation. Present for user confirmation. Pre-create migration side quests.
5. Surface tech debt — dead code, inconsistent patterns, config drift, dependency staleness, test gaps, coupling violations. User triages; approved items become side quests.
6. Extract domain model — entities, relationships, business rules, terminology. Goes into architecture files.
7. Detect deployment/runtime context — Docker, K8s, serverless, service topology, external deps, local dev setup.
8. Identify hot spots — churn × complexity analysis. Informs slice prioritization.
9. Scaffold `.project/` — idea.md, state.md, flow-log.jsonl, create first initiative (`initiatives/__active__initial/`) with architecture extracted from existing code
10. Top-level `.project/architecture/` populated from existing code (this IS the current reality). Initiative architecture represents where we're headed (may be same as current if no changes planned yet).

**Key principle**: Extract and organize information that already exists in the repo. Only ask the user about things that can't be inferred.

## Success Criteria

- [ ] `.project/idea.md` populated from existing repo artifacts
- [ ] First initiative created (`initiatives/__active__initial/`) — not top-level `vertical-slices/`
- [ ] Top-level architecture populated from existing code (current reality)
- [ ] User only asked about information that couldn't be inferred
- [ ] Conventions detected from code and written to conventions.md
- [ ] In-flight migrations detected via pattern coexistence + git timeline
- [ ] Migration side quests pre-created with old→new pattern and remaining scope
- [ ] Tech debt detected, categorized, and user-triaged into side quests
- [ ] Domain model extracted into architecture files
- [ ] Deployment/runtime context documented
- [ ] Hot spots identified and inform slice prioritization
- [ ] Stale docs flagged with specific discrepancies

## Scope Boundaries

**In scope**: Onboarding repos with no `.project/` directory, convention detection, migration detection, debt surfacing, domain extraction, deployment detection, hot spot analysis

**Out of scope**: Upgrading repos with old `.project/` (upgrade-workflow quest), complete refactor intelligence (refactor-intelligence quest), changes to the core workflow
