# Codebase Context: Maturity, Invariants, Fitness Functions Plan

## Relevant Documentation

| File | Description |
|---|---|
| `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` | Primary design spec — defines maturity levels, invariants, fitness functions, maturity table format, and all integration points. The plan's tasks should be cross-checked against this. |
| `workflow.md` | Master workflow description; recently rewritten to include initiatives, maturity, and post-MVP lifecycle. |
| `CLAUDE.md` | Project-level instructions; recently modified (in-progress per git status). |
| `.project/idea.md` | Project goal and skill inventory (in-progress per git status). |

## Skill File Inventory

### `/define-architecture` (`~/.claude/skills/define-architecture/`)

**SKILL.md — Steps:**

| Step | What it does |
|---|---|
| 1 | Load references (architecture-logic.md, architecture-logic-templates.md, guidance.md, decisions-format.md) |
| 2 | Load context (idea.md, exploration dirs, existing architecture, decisions/) |
| 3 | Re-entry check — handles 4 cases based on what already exists |
| 4 | Conventions phase — draft/iterate/write .project/conventions.md |
| 5 | Design tree: broad pass |
| 6 | Design-it-twice (placeholder — not yet implemented) |
| 7 | Design tree: deep pass |
| 8 | Architecture phase — 8a: propose file list, 8b: write files in order, 8c: subsystem APIs, 8d: custom files, 8e: graceful stop |
| 9 | CLAUDE.md update |
| 9b | Expertise check |
| 10 | Write back state |
| 11 | Done summary |

**References:**
- `references/architecture-logic-templates.md` — templates for conventions.md and all architecture files (`_overview.md`, `conventions.md`, `data-model.md`, `flows.md`, `information-architecture.md`, `ui-ux.md`, `<subsystem>-api.md`). The `_overview.md` template currently has: System Summary, Subsystems, Key Dependencies, Deployment Model. **No Subsystem Maturity section yet** — Phase 2 adds this.
- `references/architecture-logic.md` — applicability table (not read for this context but referenced by SKILL.md Step 1)
- `references/guidance.md` — CLAUDE.md Project Context format, conversation guidance for conventions and architecture phases, early stop instructions
- `references/design-tree.md` — loaded on demand at Steps 5 and 7
- `references/design-it-twice.md` — loaded on demand at Step 6

**Insertion point for Phase 2:** The plan adds Steps 9b/9c/9d. However, 9b already exists (expertise check). The plan's numbering will collide — the plan's "Step 9b" (maturity table) conflicts with the existing "Step 9b" (expertise check). **This is a numbering collision the plan must resolve** — either renumber existing 9b to 9e, or use different labels (e.g., 9a-maturity, 9a-expertise).

**File write ordering in Step 8b:** `_overview.md` first, then `conventions.md`, then optional files in table order, then subsystem API files. The maturity table lives in `_overview.md` — meaning the plan's Step 9b (post-write maturity population) comes after all architecture files are written, which is the right sequencing.

### `/refine-architecture` (`~/.claude/skills/refine-architecture/`)

**SKILL.md — Steps:**

| Step | What it does |
|---|---|
| 0 | Load and prepare — read architecture files, load decisions, prerequisite check (verifies deep module criteria 8-11 exist in reviewers-cross-cutting.md), resume detection, create backup, read iteration-loop.md |
| 1 | Verify goal — read idea.md and conventions.md, state what good architecture means, confirm with user, write goal.md |
| 2 | Refinement loop — determine reviewer scope, create iteration dirs, spawn reviewers in parallel, synthesize, display summary, check completion, categorize feedback, handle USER_INPUT, do research, apply feedback, iterate |
| 3 | Final verification — goal drift check comparing backup vs current |
| 4 | Finalize — delete backup, write state, retain architecture-refining/ as record |
| 4b | Expertise check |

**Reviewer selection:** Software Architecture (always) + Holistic (always) + domain specialists (conditional). The Software Architecture reviewer gets a **weighting preamble** from `references/sub-agent-prompts.md` injecting 2x weight for deep module criteria 8-11.

**Context loading in Step 0:** Reads all `architecture/` files. Since `_overview.md` is loaded there and contains the maturity table, maturity data is already in context — Phase 3's task to "add maturity context loading" means adding the `maturity-conventions.md` load (the definitions/promotion criteria reference), not the maturity table data itself.

**References:**
- `references/reviewer-registry.md` — lists always-on (Software Architecture, Holistic) and conditional specialists; routes each to prompt files
- `references/guidance.md` — evaluation priorities (module depth primary, decision alignment secondary); conflict resolution table; architecture vs plan review differences
- `references/sub-agent-prompts.md` — reviewer weighting preamble, architecture editor prompt, editor guardrails

**Key constraint:** Step 0 has a prerequisite check that halts if criteria 8-11 are missing from `reviewers-cross-cutting.md`. Any changes to that file must preserve these criteria headings.

### `/audit-architecture` (`~/.claude/skills/audit-architecture/`)

**SKILL.md — Steps:**

| Step | What it does |
|---|---|
| 1 | Load context — glob architecture files, load decisions, learnings, conventions, recent flow-log, expertise, resume detection, read guidance.md |
| 2 | Gap analysis — one exploration sub-agent per architecture file in parallel; each checks coupling, interface depth, pattern divergence, missing/dead subsystems |
| 2b | Reconcile findings — deduplicate, resolve contradictions, merge |
| 3 | Architecture reassessment — evaluate boundary placement, missing abstractions, goal/constraint shifts, deep module opportunities |
| 4 | Propose side quests — gap quests (type: gap) or improvement quests (type: improvement) |
| 5 | Write audit report to `.project/audits/architecture-<date>.md` |
| 5b | Refresh system profile (system-profile.md) |
| 6 | Graceful stop handling |
| 7 | State write-back |

**Insertion points for Phase 3:** The plan adds Steps 3b (fitness function audit), 3c (invariant compliance check), 3d (maturity promotion suggestions) between Step 3 and Step 4. This is clean — no renumbering of existing steps needed. The graceful stop section (Step 6) needs new cases for 3b/3c/3d interruption.

**Does NOT use iteration-loop.md** — structurally distinct from the review-iterate pattern. This matters for how changes are applied: there is no editor sub-agent loop here; findings flow to side quest proposals instead.

**References:**
- `references/guidance.md` — exploration strategy (boundary violations, pattern divergence, module depth, missing/dead subsystems), finding severity levels, side quest proposal format (gap and improvement quest templates), system profile refresh mappings
- `references/sub-agent-prompts.md` — self-contained exploration agent prompt template

### Shared and Cross-Skill Files

**`~/.claude/skills/_shared/references/reviewers-cross-cutting.md`**

Contains sections for: UX & IA Reviewer, Software Architecture Reviewer, Repo/Tooling/Docs Reviewer, API Contract Reviewer, TUI and CLI Reviewer, CI & GitHub Workflows Reviewer.

Software Architecture Reviewer currently has criteria 1-11:
- 1-7: Standard structural criteria (boundaries, dependency direction, coupling, layering, extension, data flow, testability)
- 8-11: Deep module criteria (module depth, caller friction, test boundary alignment, deepening opportunities)

Phase 4 adds criterion 12 (maturity awareness) and a Codebase Exploration Focus addition. **The refine-architecture prerequisite check (Step 0) verifies criteria 8-11 by heading name** — new criterion 12 does not interact with this check.

**`~/.claude/skills/refine-plan/references/reviewers-always.md`**

Contains the Holistic Reviewer prompt. Currently has 11 evaluation criteria (goal alignment, clarity, completeness, phase ordering, success criteria, direct verification, test coverage, documentation, code cleanup, database backup, simplicity). Phase 4 adds invariant compliance and fitness function awareness.

**`~/.claude/skills/refine-plan/references/shared-preamble.md`**

Generic preamble used by all reviewer sub-agents (for both refine-plan and refine-architecture). Contains: Plan Location, Confirmed Goal, Available Research, Team Defaults, Codebase Exploration, Output format. Phase 4 adds to the Codebase Exploration section.

**`~/.claude/skills/_shared/references/` — other relevant files:**
- `iteration-loop.md` — shared orchestration pattern used by refine-architecture (and refine-plan); not modified by this plan
- `decisions-format.md` — decisions format and loading protocol
- `system-profile-format.md` — referenced by audit-architecture Step 5b

## Key Structural Findings

### Where Each New Artifact Lives

| Artifact | Canonical location | Created by | How it gets into reviewer context |
|---|---|---|---|
| Maturity table | `architecture/_overview.md` § Subsystem Maturity | define-architecture Step 9b (new) | Already loaded when architecture files are read |
| `architecture/invariants.md` | Standalone architecture file | define-architecture Step 9c (new) | Loaded as part of `architecture/` glob; reviewers must explicitly read it |
| Fitness function candidates | Architecture files (per-subsystem) or `_overview.md` section | define-architecture Step 9d (new) | Already loaded with architecture files |
| `maturity-conventions.md` | `~/.claude/skills/_shared/references/` | Phase 1 creates | Must be explicitly loaded (added to Step 1 of each consuming skill) |

### Step Numbering Collision in define-architecture

The existing SKILL.md already uses "Step 9b" for Expertise Check. The plan introduces new Steps 9b/9c/9d for maturity table, invariants, and fitness candidates. When implementing Phase 2, one of the following approaches must be chosen:

- Renumber the existing Step 9b (Expertise Check) to Step 9e (or Step 10, shifting current Steps 10-11)
- Label the new steps differently (e.g., 9-maturity, 9-invariants, 9-fitness) before the existing 9b
- Insert the new steps as 8f/8g/8h within the Architecture Phase

The most natural fit per the plan's description ("After architecture files are written") is to insert before the existing Step 9 (CLAUDE.md Update) or between Steps 9 and 9b — but the plan as written says "After architecture files are written (Step 9)" which is ambiguous about whether "Step 9" means Step 8 (architecture writing) or the current Step 9 (CLAUDE.md update).

### reviewer-registry.md Scope

The refine-architecture reviewer registry (`references/reviewer-registry.md`) references the Holistic Reviewer from `~/.claude/skills/refine-plan/references/reviewers-always.md`. Phase 4's updates to that file automatically apply to architecture review as well — not just plan review. This is consistent with the design, but reviewers should note that invariant compliance criteria added to Holistic will also run during `/refine-architecture`, not just `/refine-plan`.

### Shared Preamble Scope

The `shared-preamble.md` is used by both `/refine-plan` and `/refine-architecture` (as documented in refine-architecture's reviewer-registry.md: "Shared preamble: Use `~/.claude/skills/refine-plan/references/shared-preamble.md` — the preamble is generic enough for both plan and architecture review"). Phase 4's Codebase Exploration addition to the shared preamble will therefore affect architecture reviewers too — a good thing, since `invariants.md` is relevant to architecture review as well.

### Fitness Functions in Architecture Files vs Centralized

The plan says fitness function candidates go "in the relevant architecture file or as a section in `_overview.md` — whichever is simpler." This leaves format ambiguous. The design spec says they are "documented in the architecture files alongside the subsystem they protect." The maturity table's "Fitness Functions" column contains a reference (test file path or "candidate — not yet written") — this implies the column is a pointer, not a container. The `maturity-conventions.md` (Phase 1) should clarify exactly where the full fitness function entry lives vs what the maturity table column contains.

### audit-architecture Has No Template for Fitness Function or Invariant Findings

The existing `references/guidance.md` for audit-architecture has severity levels and side quest proposal templates (gap quest, improvement quest). Phase 3's new steps (3b fitness audit, 3c invariant compliance) produce a new category of findings — not gaps or improvements, but compliance failures or stale documentation. The plan tasks say to update `guidance.md` with audit strategy, but there is no existing template structure for reporting these new finding types. The updated guidance should either create new finding categories or explain how these map to existing gap/improvement types for side quest generation.

## Areas of Active Churn vs Stability

### Active churn (recently modified per git status)

- `CLAUDE.md` — modified
- `.project/idea.md` — modified
- `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` — modified
- `workflow.md` — modified (rewritten in commit `008fc8f` with initiatives, maturity, post-MVP lifecycle)
- Untracked: `initiatives-infrastructure/`, `maturity-context-loading/`, `complete-rename/` side quests

### Recently completed / stable

- `archived-prefix-migration` side quest — completed (commit `ad55035` renamed `__done__` to `~~archived~~`)
- The skill SKILL.md files for define-architecture, refine-architecture, audit-architecture — no recent commits in git history (the skills directory at `~/.claude/skills/` is not tracked by the goodplan repo's git)

### No git history on skill files

The `~/.claude/skills/` directory is not inside a git repository tracked from `~/.claude/` or `/Users/iwhite/`. The git history check returned no results. This means:
- Cannot determine which skill files were recently modified
- Cannot confirm whether any of the target files have in-progress changes
- Stability assessment must rely on reading file contents, not commit history

### Stable patterns (based on file structure)

- The reviewer sub-agent infrastructure (shared-preamble.md, reviewer-registry.md, iteration-loop.md) is mature and used consistently across skills
- The `{review_context}` placeholder pattern in reviewer prompts is consistently applied
- The criteria numbering convention (sequential numbered list) is consistent across all reviewer prompts
- The graceful stop pattern in audit-architecture (partial markers + resume detection) is established

## Summary for Reviewers

The plan's approach is structurally sound: additive steps that don't change existing behavior. The main risks to evaluate:

1. **Step numbering collision** in define-architecture — "Step 9b" is already taken by Expertise Check. Implementing Phase 2 requires a decision on renumbering.

2. **Maturity table insertion timing** — the plan adds a new step after Step 9 (CLAUDE.md Update). However, CLAUDE.md Update references the architecture files to build its "Also check" entries. If maturity-related files are added after CLAUDE.md Update, they won't be included in the CLAUDE.md Project Context automatically. Consider inserting the new steps before Step 9.

3. **Fitness function finding category gap** — audit-architecture's guidance has no template for fitness function or invariant compliance findings. Phase 3 must address this or findings will be ad-hoc.

4. **Cross-skill reach of shared-preamble changes** — Phase 4's shared-preamble addition affects all reviewer types in both refine-plan and refine-architecture, not just plan reviewers. This is correct behavior but reviewers should confirm this is intentional and that architecture reviewers evaluating `invariants.md` during refine-architecture is desired.

5. **invariants.md loading in refine-architecture** — the file will be loaded because refine-architecture reads all `architecture/` files in Step 0. The Holistic reviewer (via Phase 4 update) will also be directed to read it via the updated shared-preamble. This is consistent. No additional loading step needed in refine-architecture SKILL.md for `invariants.md` itself.
