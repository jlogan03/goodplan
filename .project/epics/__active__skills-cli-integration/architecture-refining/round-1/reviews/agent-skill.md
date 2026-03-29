# Agent Skill Review

Reviewer perspective: How well does the architecture support agent skill integration — the interaction patterns between LLM orchestrator skills and the CLI, sub-agent workflows, context bundling, and the convention document that skills will follow.

## Issues

### 1. CRITICAL — No concrete examples of full skill rewrite patterns
**File**: `cli-interaction-conventions.md`
**Resolution**: Add a "Migration Example" section

The convention doc defines interaction patterns abstractly but never shows a complete before/after for a single skill. Current skills are deeply structured (see `create-epic/SKILL.md` — 280 lines of step-by-step instructions with inline bash commands, file-existence checks, manual activity-log appending, and state.md writes). The convention doc should include at least one concrete migration example showing a representative skill section (e.g., create-epic's "Mode A — Write Back State" steps) rewritten to use CLI commands. Without this, the first 2-3 skill updates will reinvent the migration pattern independently, which the learnings file already warns against ("Convention-first ordering enables consistent cross-skill infrastructure").

### 2. CRITICAL — Interactive orchestrator skills and the begin/submit split
**File**: `cli-interaction-conventions.md` Section "Interaction Patterns by Skill Role"
**Resolution**: Add "Interactive Orchestrator" as a distinct pattern

The architecture defines orchestrator skills (manage state transitions, compact context) and sub-agent skills (deep content, disposable context). But several core skills are **interactive orchestrators** that need deep content AND manage state transitions in a single session: `/create-epic` (captures idea via conversation, writes goal.md, initializes project), `/create-plan` (researches, asks questions, writes plan), `/complete` (loads all artifacts, synthesizes learnings, proposes architecture changes). These skills don't fit cleanly into either category:

- They can't delegate content to a sub-agent because the content requires interactive user dialogue.
- They need `start-*` level context (goal, architecture, conventions) but also call mutation commands.
- The `start-*` commands are described as sub-agent commands, but orchestrators doing interactive work need them too.

The convention doc should explicitly describe this third pattern: "Interactive Orchestrator" — skills that call `begin` to initiate a phase, use `state --json --query` or `start-*` for context loading, do interactive work with the user, then call `submit-*` or entity mutation commands to persist results. This is likely the most common pattern given the skill inventory.

### 3. IMPORTANT — `create-epic` Mode A has no CLI equivalent for project initialization
**File**: `commands-api.md`, `cli-interaction-conventions.md`
**Resolution**: Document `init` usage in convention doc's skill patterns section

`create-epic` Mode A creates the entire `.project/` directory structure, writes `idea.md`, `activity-log.jsonl`, `state.md`, updates `.gitignore`, and creates the first epic. The `goodplan init` command exists but the convention doc never mentions it. The migration path for Mode A needs to be explicit: `goodplan init --name <name>` creates the structure, then `goodplan epic:create` creates the first epic. But `idea.md` is free-form markdown — who creates it? The CLI creates the directory, the LLM writes the content? This needs to be spelled out, especially since `init` is the very first CLI command a new user/skill encounters.

### 4. IMPORTANT — Missing guidance on `state.md` elimination in interactive skills
**File**: `cli-interaction-conventions.md` Section "State Orientation"
**Resolution**: Add "Replacing state.md Reads" subsection with per-pattern guidance

The overview says `state.md` is eliminated, replaced by `status --json`. But current skills use `state.md` in nuanced ways:
- `project-status` reads all 4 sections (Current Phase, Active Slice, Work Stack, Next Step) and treats it as a fast resume hint
- `complete` reads Active Slice for auto-detect and Work Stack for conflict warnings
- `create-plan` reads Active Slice to resolve scope when no argument is given

The convention doc says `status --json` replaces this, and the `_overview.md` maps each section to its replacement. But the convention doc doesn't show HOW skills should handle the nuanced cases. For example: "Work Stack" is eliminated (one active entity at a time), but `complete` currently warns about concurrent slices using Work Stack. Is this warning eliminated? Or does `status --json` expose concurrent-work information differently? The `StatusResult` type has `recommendations` and `warnings` arrays that seem to cover this, but the convention doc should explicitly bridge from current `state.md` usage patterns to the new CLI equivalents.

### 5. IMPORTANT — Graceful stop patterns have no CLI equivalent
**File**: `cli-interaction-conventions.md`
**Resolution**: Add "Graceful Stop" section describing partial-completion handling

Current skills have elaborate graceful stop handling (see `complete/SKILL.md` — 6 distinct graceful stop cases, each with specific state.md and activity-log writes). After migration, skills must NOT write state.md or activity-log directly. But the CLI's state machine transitions are atomic — you're either in a state or you're not. How does a skill record "learnings written but architecture review pending" (graceful stop case b in `/complete`)? The state machine would need intermediate states, or the skill would need to track its own progress differently. This is a workflow gap that needs architectural guidance.

### 6. IMPORTANT — `submit-*` stdin payload shapes not fully documented in convention doc
**File**: `cli-interaction-conventions.md` Section "Sub-Agent Skills"
**Resolution**: Add stdin payload examples for each `submit-*` command

The convention doc shows `submit-plan` with a brief `{"plan":"..."}` example, but `commands-api.md` reveals that `submit-plan` actually carries no content payload (plan is written to filesystem, submit is a pure state trigger). Meanwhile `submit-refinement` requires `{"scores": {...}}`. The convention doc's examples are misleading. Each `submit-*` command should have its correct stdin shape documented in the convention doc, or the doc should reference the schema command with a concrete example: `goodplan schema --command submit-plan --json`.

### 7. IMPORTANT — No guidance on skill reference file loading via CLI
**File**: `cli-interaction-conventions.md`
**Resolution**: Add section on non-`.project/` file access

Skills currently load reference files from `~/.claude/skills/_shared/references/` and their own `references/` directory using the Read tool. These are not `.project/` files and the CLI has no opinion on them. The convention doc should explicitly state that reference file loading remains unchanged — skills continue using the Read tool for their own reference files. This may seem obvious, but the strong prohibition on direct file access ("Skills MUST follow these conventions") could confuse skill authors into thinking ALL file access must go through the CLI.

### 8. IMPORTANT — Missing error recovery examples for common failures
**File**: `cli-interaction-conventions.md` Section "Error Handling in Skills"
**Resolution**: Add worked examples for each exit code

The error handling section lists 3 exit codes with brief guidance. But skills need concrete recovery patterns:
- Exit 3 `STATE_INVALID_TRANSITION`: When an orchestrator calls `slice:plan` but the slice is already in `planning` state (idempotent re-entry), should the skill treat this as success? Current skills have elaborate re-entry detection.
- Exit 3 `STATE_QUEST_ALREADY_ACTIVE`: When starting a quest but one is already active, should the skill offer to abandon the active quest?
- Exit 2 validation errors: Should the skill ever retry with different input, or always stop?

These patterns will be rediscovered by each skill author without guidance.

### 9. MINOR — `--inline` budget guidance missing for different skill types
**File**: `cli-interaction-conventions.md`
**Resolution**: Add budget sizing guidance

The convention doc mentions `--inline` uses ~20-30KB default but doesn't advise when to use a custom budget. Orchestrator skills with long-running interactive sessions (create-plan, complete) may want smaller budgets to preserve context for the conversation. Sub-agents doing focused work (plan writing, implementation) may want larger budgets. A brief sizing table ("orchestrator: default or smaller; sub-agent: default or --inline=50000") would prevent trial-and-error.

### 10. MINOR — Version check adds latency to every skill invocation
**File**: `cli-interaction-conventions.md` Section "Binary Detection and Version Compatibility"
**Resolution**: Consider caching or making version check optional for known-compatible environments

Every skill starts with `goodplan --version --json`. In a workflow with 5-6 skill invocations per session, this adds noticeable overhead. Consider guidance on when to skip (e.g., "if the orchestrator already verified the version, sub-agents spawned in the same session may skip the check").

### 11. MINOR — `activity:list` marked "not yet implemented" but used in convention examples
**File**: `commands-api.md` line 124, `cli-interaction-conventions.md` line 104
**Resolution**: Either implement or remove from examples

`activity:list --limit 5 --json` appears in the convention doc's orchestrator examples, but `commands-api.md` notes it as "not yet implemented." The convention doc also shows `goodplan state --json --query '.["activity-log.jsonl"]'` as the replacement. Decide which is canonical and be consistent.

### 12. MINOR — Convention doc doesn't address the 15 skill files' shared patterns
**File**: `cli-interaction-conventions.md`
**Resolution**: Add "Common Skill Patterns" section with reusable snippets

Multiple skills share patterns: scope resolution (6+ skills), expertise check (3+ skills), decisions loading (5+ skills), graceful stop (4+ skills). After migration, these become CLI command patterns. A "Common Patterns" section with copy-pasteable CLI command sequences for these shared patterns would accelerate the mechanical rollout of the remaining ~12 skills after the initial 3 are validated.

## Score: 7/10

The architecture is well-designed at the system level — the 4-layer stack, entity-namespaced commands, start/submit split, and context bundling are sound. The convention doc covers the major interaction patterns and has clear prohibitions. However, it falls short as a practical skill-author reference in several ways: (1) no migration examples showing before/after for real skill code, (2) interactive orchestrator skills are the most common pattern but aren't explicitly addressed, (3) graceful stop handling has no CLI-level solution, and (4) several patterns are under-specified (submit payloads, error recovery, state.md elimination details).

To reach 9+: Address the two CRITICAL issues (migration example + interactive orchestrator pattern), resolve the graceful stop gap (either CLI state machine support or explicit "skills manage their own progress" guidance), and add the missing submit payload documentation. The remaining IMPORTANT issues are quality-of-life improvements that would prevent repeated discovery during the mechanical rollout.

## Summary
- Critical: 2
- Important: 6
- Minor: 4
