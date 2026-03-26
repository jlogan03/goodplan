# Plan: Dogfooding CLI-Integrated Skills

## Overview

Exercise the complete CLI-integrated skill suite on a real project — a nondeterministic eval library (`nondet-eval`) — to surface friction, fix gaps, and verify the convention doc matches reality. The eval project is built through two full epics plus quests, exercising empty-state and non-empty-state paths for all entity types.

**Slug:** `dogfood`

**Target project:** `~/Repos/nondet-eval` — a TypeScript eval framework built on Promptfoo for measuring skill quality via Monte Carlo execution.

**Key decisions:**
- Skills installed in-project (`.claude/skills/`) not user-level, so goodplan's old-format skills remain usable in this repo
- Full fidelity: every skill run includes refinement loops to maximize friction discovery
- Two epics: Epic 1 (core provider + basic execution) exercises empty-state flows; Epic 2 (LLM-as-judge scoring) exercises non-empty-state flows with architecture proposal + `epic:activate`
- Quests: at least one deliberate + organic ones from `/complete`
- Friction tracked in a running log, fixed inline when possible, deferred to Phase 5 when not

**Friction log:** `.project/epics/__active__skills-cli-integration/slices/06-dogfooding/friction-log.md` — append entries as discovered: `| # | Phase | Skill | Issue | Severity | Status | Fix commit |`

## Phases

| Phase | Name | Description |
|-------|------|-------------|
| 01 | project-bootstrap | Create repo, install skills, `goodplan init`, `/create-epic` on empty state |
| 02 | first-epic-lifecycle | Full workflow cycle: explore → architecture → slices → plan → implement → complete |
| 03 | quests | Exercise quest lifecycle (organic + deliberate) |
| 04 | second-epic-lifecycle | `/create-epic` on non-empty state, architecture proposal, `epic:activate`, full cycle |
| 05 | verification-and-fixes | Cross-skill grep, convention doc review, accumulated friction fixes |
