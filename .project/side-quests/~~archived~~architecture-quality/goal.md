# Side Quest: Architecture Quality

## What We're Building

Upgrade the architecture workflow from one-shot definition to a multi-option exploration with iterative refinement. Add a standalone architecture audit skill. Embed the deep module principle as an evaluation criterion across all review-based skills.

## Dependencies

- **decisions-and-expertise** side quest must be complete (decisions/ convention, expertise tracking, cross-cutting guidance)

## What Changes

### Updated Skill: `/define-architecture` — Major Rework

The current flow (load context → conventions phase → propose files → write files) becomes:

1. **Load context + decisions** (existing, expanded to include `.project/decisions/`)
2. **Conventions phase** (existing — tech stack, style, tooling)
3. **Design tree interrogation** — systematic Q&A to surface constraints, dependencies between decisions, and non-obvious requirements. Inspired by the "grill-me" and design tree concepts. The agent:
   - Walks down decision branches: "Your system has these subsystems. How do they communicate? Synchronous or async? If async, ordering guarantees?"
   - Each answer may raise follow-up questions — pursue them immediately
   - Tracks which decision branches are resolved vs. open
   - Uses the user's expertise profile (from CLAUDE.md) to calibrate explanation depth — explain unfamiliar patterns in detail, reference familiar ones casually
   - Records durable decisions to `.project/decisions/` as they're made
4. **Design-it-twice** — for each major architectural area (overall system shape, subsystem boundaries, key APIs), spawn sub-agents with different design constraints:
   - "Minimize API surface — aim for deep modules with 1-3 methods each"
   - "Maximize flexibility — support many use cases and extension points"
   - "Optimize for the most common case — make the 80% path trivial"
   - Optional: "Take inspiration from [specific paradigm/library the user mentioned]"
   Present each design with: interface signatures, usage examples, what it hides internally, trade-offs. Compare on: interface simplicity, general-purpose vs specialized, implementation efficiency, depth (small interface hiding significant complexity = good), ease of correct use vs ease of misuse. Include agent's recommendation with rationale grounded in system knowledge and project goals. Let user choose or synthesize elements from multiple options.
5. **Design tree resolution** — walk through the chosen approach, resolving every detail branch until the architecture is fully specified
6. **Write architecture files + decisions** (existing write flow, enriched with design-it-twice output)
7. **Deep module principle** embedded as a quality bar throughout — when proposing or reviewing any subsystem interface, evaluate: is this a deep module (small interface hiding significant complexity) or a shallow module (large interface with thin implementation)?

### New Skill: `/refine-architecture`

Iterative review loop for architecture files, using the same reviewer infrastructure as `/refine-plan` (registry, bootstrap, synthesis).

**How it works**:
1. Load architecture files + decisions + exploration output + idea.md
2. Spawn reviewers in parallel (same infrastructure as refine-plan)
3. Reviewers evaluate against:
   - Deep module principle (small interface hiding complex implementation)
   - Subsystem boundary quality (coupling, cohesion)
   - API surface area (minimal, well-defined contracts)
   - Separation of concerns (each subsystem has a single responsibility)
   - Alignment with decisions from explore phase and design tree
   - Completeness (gaps between what idea.md describes and what architecture covers)
4. Synthesize feedback, apply fixes, re-review
5. Iterate until all reviewer scores ≥ 9
6. Output: updated architecture files

**Reviewer selection**: Software Architecture (always) + any domain specialists relevant to the architecture (e.g., Data Layer if there's a database, Backend if there's an API). Reuse the existing reviewer registry — no new reviewer types needed, but the Software Architecture reviewer gets enhanced evaluation criteria.

### Updated: Software Architecture Reviewer

Add deep module evaluation criteria to `~/.claude/skills/refine-plan/references/reviewers-cross-cutting.md` (and the implement-plan copy):

- Are modules "deep" (small interface, complex implementation) or "shallow" (large interface, thin implementation)?
- Where do callers experience friction? (Bouncing between files, complex interfaces, tightly-coupled logic)
- Are test boundaries aligned with module boundaries? (Tests coupled to implementation = red flag)
- What would deepening these modules enable?

This makes the deep module principle available to refine-plan, implement-plan, refine-architecture, and refine-slices — any skill using the reviewer infrastructure.

### New Skill: `/audit-architecture`

Standalone skill comparing intended architecture (`.project/architecture/`) against actual code. Run on-demand when the user senses drift.

**How it works**:
1. Read `.project/architecture/` files (intended architecture)
2. Read actual codebase (file structure, imports, module boundaries, API surfaces)
3. Evaluate:
   - Coupling between subsystems (imports crossing boundaries)
   - Interface depth (are modules deep or shallow in practice?)
   - Pattern divergence (code uses patterns not described in architecture)
   - Missing subsystems (code exists that no architecture file describes)
   - Dead architecture (architecture describes subsystems that don't exist in code)
4. Produce prioritized recommendations
5. Refresh `.project/system-profile.md` with current assessment
6. User decides what to act on — may spawn side quests for significant refactors

## Success Criteria

- Run `/define-architecture` on a test project:
  - Design tree interrogation surfaces hidden constraints and dependencies
  - Design-it-twice presents meaningfully different options (not minor variations)
  - Agent includes recommendations with rationale
  - Decisions are written to `decisions/`
  - Communication depth calibrated to user expertise
- Run `/refine-architecture`:
  - Iterative review loop scores and improves architecture
  - Deep module principle applied in evaluation
  - Scores reach 9+
- Run `/audit-architecture` on a project with implemented code:
  - Compares architecture files against actual code
  - Identifies divergences with actionable recommendations
  - Updates system-profile.md

## Verification

- [ ] `/define-architecture` presents multiple design options before writing files
- [ ] Design tree interrogation tracks resolved vs. open decision branches
- [ ] Decisions written to `.project/decisions/` during architecture definition
- [ ] `/refine-architecture` iterates to 9+ scores using reviewer infrastructure
- [ ] Software Architecture reviewer evaluates deep module principle
- [ ] `/audit-architecture` compares architecture files against actual code
- [ ] `/audit-architecture` produces actionable recommendations

## Scope Boundaries

**In scope**: define-architecture rework, refine-architecture (new), audit-architecture (new), Software Architecture reviewer enhancement

**Out of scope**: Slice-related changes (tracer bullets, refine-slices, system-profile update in complete-slice) — those are in slice-quality-and-health side quest
