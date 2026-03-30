# Phase 5: Audit-Architecture Skill

Create a new `/audit-architecture` skill that compares intended architecture against actual code, evaluates whether the target architecture should evolve, and proposes side quests for gaps and improvements.

### Context

After several slices of implementation, the codebase may have drifted from the architecture files, and the team has learned things that should change the architectural target. `/audit-architecture` serves two purposes:

1. **Gap analysis**: Where does the code not match the architecture? (implementation drift)
2. **Architecture reassessment**: Given what we've learned from building, should the target architecture itself change?

Both produce actionable output: side quest proposals with specific scope, not just a report to read.

**Note**: audit-architecture does NOT use the shared `iteration-loop.md` from `_shared/references/`. Its loop pattern (parallel exploration sub-agents, reconciliation, reassessment) is structurally distinct from the review-iterate loop used by refine-plan and refine-architecture.

**Sequencing with refine-architecture**: Run `/audit-architecture` first to identify what needs changing, then `/refine-architecture` on the updated architecture files. Running refine-architecture before audit risks optimizing files that are about to be invalidated by audit findings. The audit report should note if a `/refine-architecture` pass is recommended after architecture updates are applied.

### Tasks

- [x] Create `~/.claude/skills/audit-architecture/SKILL.md` with:
  1. **Usage**: `/audit-architecture` (no arguments — operates on `.project/architecture/` vs actual code)
  2. **Step 1 — Load context**: Read `.project/architecture/` files, `.project/decisions/`, `.project/learnings.md`, `.project/conventions.md`. Also check recent flow-log entries for context on what's been built.
  3. **Step 2 — Gap analysis**: Spawn one exploration sub-agent per architecture file (model: "opus"), running in parallel. Each sub-agent is scoped to a single architecture file and the codebase areas it describes. This prevents context limit issues on non-trivial codebases and matches Phase 4's parallel reviewer pattern. Each sub-agent:
     - Reads its assigned architecture file to understand the intended structure
     - Explores only the codebase areas described by that file: file structure, imports, module boundaries, API surfaces
     - Compares intended vs actual using dimensions aligned with Software Architecture reviewer criteria (to avoid divergence):
       - **Coupling between subsystems**: imports crossing documented boundaries (aligns with reviewer criterion 2: dependency direction)
       - **Interface depth**: are modules deep or shallow in practice? (aligns with reviewer criteria 8-11: deep module evaluation from Phase 1)
       - **Pattern divergence**: code uses patterns not described in architecture
       - **Missing subsystems**: code exists that no architecture file describes
       - **Dead architecture**: architecture describes subsystems that don't exist in code
     - Returns structured findings with evidence (specific files, import paths, pattern examples)
  4. **Step 2b — Reconcile findings**: Merge findings from all gap-analysis sub-agents. Deduplicate overlapping observations (e.g., the same boundary violation reported from both sides). Resolve contradictions where sub-agents scoped to different architecture files reached conflicting conclusions about the same codebase area — use the architecture file with more specific ownership as the authority. Present the reconciled findings list before proceeding.
  5. **Step 3 — Architecture reassessment**: Based on reconciled gap analysis findings + learnings.md + decisions/ + the conversation, evaluate:
     - Are any architectural boundaries in the wrong place? (evidence: high cross-boundary coupling, frequent boundary violations in the same direction)
     - Are there missing abstractions that implementation revealed? (evidence: duplicated patterns across modules that should be centralized)
     - Have project goals or constraints shifted in ways that the architecture should reflect?
     - Are there deep module opportunities? (evidence: shallow modules with many callers that could absorb related complexity)
     - Present findings with agent recommendation for each: "I recommend changing X because [evidence]. This would require [scope of change]."
  6. **Step 4 — Propose side quests**: For each finding the user wants to address:
     - **For gaps** (code doesn't match architecture): draft a side quest `goal.md` with `type: gap` to bring code in line with the target architecture. Include: which files/modules need changing, what the target state looks like, estimated scope. Gap quests go straight to `/create-plan` (no architecture changes needed).
     - **For architecture improvements** (target should change): first update the architecture files to reflect the new target (with user approval + decision written to `decisions/`). Then draft a side quest `goal.md` with `type: improvement` to refactor code to match the updated architecture. Include: what changed in the architecture, which code needs to follow, estimated scope. Improvement quests should run `/refine-architecture` first, then `/create-plan`.
     - Write approved side quests to `.project/side-quests/<name>/goal.md`
  7. **Step 5 — Write audit report**: Write findings to `.project/audits/architecture-<date>.md` (not in `architecture/` — audit reports are operational artifacts, not canonical design). Audit reports serve as historical record and are explicitly excluded from skill context loading (skills read `architecture/`, not `audits/`). No automatic cleanup — old reports accumulate as a decision log. Include: findings summary, side quests created, architecture files updated, findings deferred.
  8. **Step 6 — Graceful stop**: Audit-architecture supports graceful stop at any point. If stopped during gap analysis (Step 2), write partial findings to the audit report with a "partial — interrupted during gap analysis" marker. If stopped during reassessment (Step 3) or quest proposal (Step 4), write completed findings and note which steps were not reached. On resume, glob `.project/audits/architecture-*.md` and check the most recent for a `partial — interrupted` marker; if found, continue from where it left off.
  9. **Step 7 — State write-back**: Update state.md and flow-log.

- [x] Create `~/.claude/skills/audit-architecture/references/` with:
  - `guidance.md` — exploration strategy (what to grep for, how to detect boundary violations, how to assess module depth from code), finding severity levels, side quest proposal format
  - `sub-agent-prompts.md` — exploration agent prompt. **Must be fully self-contained**: include architecture file path, codebase exploration scope, comparison dimensions (aligned with criteria 1-11), and output format — so the sub-agent can execute without reading SKILL.md or other reference files

- [x] Create the skill's frontmatter with draft description and trigger phrases:
  - Name: `audit-architecture`
  - Description: "Compare intended architecture against actual code, evaluate whether the target architecture should evolve, and propose side quests for gaps and improvements."
  - Triggers: "audit the architecture", "check for architecture drift", "compare architecture vs code", "is the code matching the architecture", "architecture audit", "audit architecture", "how does the code compare to the architecture", "check architecture alignment"

- [x] Add decisions/ loading and expertise check steps

- [x] Update `decisions-format.md` Writer and Reader lists to include audit-architecture as both a Writer (writes decisions when architecture files are updated) and Reader (reads decisions for context)

- [x] Update `.project/idea.md` skill inventory to include both new skills (refine-architecture, audit-architecture)

- [x] **Note for slice-quality-and-health quest**: system-profile.md (qualitative system snapshot) is deferred to that quest (already tracked in goal.md lines 80, 98). When system-profile.md is implemented, audit-architecture should refresh it as part of Step 5. Add a TODO comment in SKILL.md Step 5: `<!-- TODO: When system-profile.md is implemented (slice-quality-and-health quest), refresh it here -->`

### Verification

- `ls ~/.claude/skills/audit-architecture/` shows SKILL.md and references/
- Read SKILL.md — confirm both gap analysis and architecture reassessment functions exist
- SKILL.md frontmatter has description and 8+ trigger phrases
- Gap analysis spawns one sub-agent per architecture file (parallel, scoped)
- Architecture reassessment evaluates the target architecture itself, not just code compliance
- Side quest proposals are specific (files, modules, scope) not generic
- Architecture improvements update the architecture files first, then propose code refactoring quests
- Decisions written when architecture files are updated
- `decisions-format.md` lists audit-architecture in Writer and Reader sections
- Audit report written to `.project/audits/` directory (not `architecture/`)
- Graceful stop handling covers all states (mid-gap-analysis, mid-reassessment, mid-quest-proposal)
- Decisions loading and expertise check present
- `.project/idea.md` skill inventory includes both new skills
