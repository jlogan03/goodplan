# Phase 5: Audit-Architecture Skill

Create a new `/audit-architecture` skill that compares intended architecture against actual code, evaluates whether the target architecture should evolve, and proposes side quests for gaps and improvements.

### Context

After several slices of implementation, the codebase may have drifted from the architecture files, and the team has learned things that should change the architectural target. `/audit-architecture` serves two purposes:

1. **Gap analysis**: Where does the code not match the architecture? (implementation drift)
2. **Architecture reassessment**: Given what we've learned from building, should the target architecture itself change?

Both produce actionable output: side quest proposals with specific scope, not just a report to read.

### Tasks

- [ ] Create `~/.claude/skills/audit-architecture/SKILL.md` with:
  1. **Usage**: `/audit-architecture` (no arguments — operates on `.project/architecture/` vs actual code)
  2. **Step 1 — Load context**: Read `.project/architecture/` files, `.project/decisions/`, `.project/learnings.md`, `.project/conventions.md`. Also check recent flow-log entries for context on what's been built.
  3. **Step 2 — Gap analysis**: Spawn an exploration sub-agent (model: "opus") that:
     - Reads each architecture file to understand the intended structure
     - Systematically explores the codebase: file structure, imports, module boundaries, API surfaces, dependency graph
     - For each architecture file, compares intended vs actual:
       - **Coupling between subsystems**: imports crossing documented boundaries
       - **Interface depth**: are modules deep or shallow in practice? (uses Phase 1 criteria)
       - **Pattern divergence**: code uses patterns not described in architecture
       - **Missing subsystems**: code exists that no architecture file describes
       - **Dead architecture**: architecture describes subsystems that don't exist in code
     - Returns structured findings with evidence (specific files, import paths, pattern examples)
  4. **Step 3 — Architecture reassessment**: Based on gap analysis findings + learnings.md + decisions/ + the conversation, evaluate:
     - Are any architectural boundaries in the wrong place? (evidence: high cross-boundary coupling, frequent boundary violations in the same direction)
     - Are there missing abstractions that implementation revealed? (evidence: duplicated patterns across modules that should be centralized)
     - Have project goals or constraints shifted in ways that the architecture should reflect?
     - Are there deep module opportunities? (evidence: shallow modules with many callers that could absorb related complexity)
     - Present findings with agent recommendation for each: "I recommend changing X because [evidence]. This would require [scope of change]."
  5. **Step 4 — Propose side quests**: For each finding the user wants to address:
     - **For gaps** (code doesn't match architecture): draft a side quest `goal.md` to bring code in line with the target architecture. Include: which files/modules need changing, what the target state looks like, estimated scope.
     - **For architecture improvements** (target should change): first update the architecture files to reflect the new target (with user approval + decision written to `decisions/`). Then draft a side quest `goal.md` to refactor code to match the updated architecture. Include: what changed in the architecture, which code needs to follow, estimated scope.
     - Write approved side quests to `.project/side-quests/<name>/goal.md`
  6. **Step 5 — Write audit report**: Write findings to `.project/architecture/audit-<date>.md` with: findings summary, side quests created, architecture files updated, findings deferred.
  7. **Step 6 — State write-back**: Update state.md and flow-log.

- [ ] Create `~/.claude/skills/audit-architecture/references/` with:
  - `guidance.md` — exploration strategy (what to grep for, how to detect boundary violations, how to assess module depth from code), finding severity levels, side quest proposal format
  - `sub-agent-prompts.md` — exploration agent prompt (reads architecture, explores codebase, returns structured findings)

- [ ] Create the skill's frontmatter (name, description, common triggers like "audit the architecture", "check for architecture drift", "compare architecture vs code")

- [ ] Add decisions/ loading and expertise check steps

- [ ] **Note for slice-quality-and-health quest**: system-profile.md (qualitative system snapshot) is deferred to that quest. When system-profile.md is implemented, audit-architecture should refresh it as part of Step 5. Add this to the slice-quality-and-health goal.md.

### Verification

- `ls ~/.claude/skills/audit-architecture/` shows SKILL.md and references/
- Read SKILL.md — confirm both gap analysis and architecture reassessment functions exist
- Gap analysis uses sub-agent exploration of actual codebase
- Architecture reassessment evaluates the target architecture itself, not just code compliance
- Side quest proposals are specific (files, modules, scope) not generic
- Architecture improvements update the architecture files first, then propose code refactoring quests
- Decisions written when architecture files are updated
- Audit report written to architecture/ directory
- Decisions loading and expertise check present
