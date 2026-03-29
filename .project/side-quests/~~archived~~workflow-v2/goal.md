# Side Quest: Workflow V2 — Design Quality & Human Mental Model

> **Status: Superseded** — split into three focused side quests:
> - `decisions-and-expertise/` — decisions/ convention, expertise tracking, cross-cutting guidance, workflow.md update
> - `architecture-quality/` — define-architecture rework, refine-architecture, audit-architecture, deep module criteria
> - `slice-quality-and-health/` — define-slices upgrade, refine-slices, complete-slice upgrade, system-profile.md
>
> This file is preserved for historical context. The three new quests collectively cover everything here.

## What We're Building

A comprehensive upgrade to the goodplan workflow that improves architectural quality, strengthens vertical slice definition, and keeps the human's mental model of the system accurate and current throughout the development process.

## Motivation

After building and using the initial skill set (start-project through create-plan), several gaps emerged:

1. **Decisions get lost** — durable decisions made during brainstorming don't surface reliably in later phases
2. **Architecture is one-shot** — no iterative refinement, no multi-option exploration, no deep interrogation of the design space
3. **Slices aren't true tracer bullets** — need stronger e2e verifiability, risk front-loading, and observability front-loading
4. **The human's mental model drifts** — the agent changes the system but doesn't systematically keep the human informed about architectural implications
5. **Technical debt accumulates silently** — no built-in mechanism to detect and address it

## What Changes

### New File Conventions

- **`.project/decisions/`** — one file per durable decision. Each file has: the decision, rationale, date/context, status (`active` | `superseded by <link>` | `revisiting`). A decision belongs here if reversing it would require changes across multiple files or phases. Superseded decisions link to their replacement (preserves reasoning chain).

- **`.project/system-profile.md`** — qualitative snapshot of the system: health (well-tested vs. undertested areas), performance characteristics, extensibility (easy vs. hard to extend), technical debt, recent changes. Updated by `/complete-slice` and `/audit-architecture`. Not a repeat of architecture files (structural) — this is the qualitative complement.

### New Skills

- **`/refine-architecture`** — iterative review loop for architecture files, using the same reviewer infrastructure as `/refine-plan` (registry, bootstrap, synthesis). Evaluates against: deep module principle, subsystem boundary quality, API surface area, separation of concerns, alignment with decisions and exploration output. Iterates until reviewers score 9+.

- **`/refine-slices`** — lightweight iterative review of slice goals. 2-3 reviewers (architecture alignment, tracer bullet quality, risk/dependency analysis). Checks that each slice is a complete e2e flow, unknowns are front-loaded, observability is front-loaded. Fewer iterations than refine-plan.

- **`/audit-architecture`** — standalone skill comparing intended architecture (`.project/architecture/`) against actual code. Evaluates coupling, interface depth, pattern divergence. Produces prioritized recommendations. Refreshes `system-profile.md`. Run on-demand when the user senses drift.

### Updated Skills

- **`/start-project`** — after capturing the idea, ask calibration questions about the user's domain expertise for areas the idea touches. Write observations to user-level CLAUDE.md (not per-project). Check existing expertise notes first — don't re-ask what's already known.

- **`/explore`** — write durable decisions to `.project/decisions/` as they emerge during brainstorming. At the end of an exploration session, summarize any decisions made and confirm with the user before writing.

- **`/define-architecture`** — major rework of the interactive flow:
  1. Load context + decisions (existing)
  2. Conventions phase (existing)
  3. **Design tree interrogation** — systematic Q&A to surface constraints, dependencies between decisions, and non-obvious requirements. Track which decision branches are resolved vs. open. Follow up on answers that raise new questions. Use the user's expertise profile to calibrate explanation depth.
  4. **Design-it-twice** — for each major architectural area (system shape, subsystem boundaries, key APIs), spawn sub-agents with different design constraints. Present options with trade-offs. Include agent's recommendation with rationale grounded in system knowledge and project goals. Let user choose or synthesize.
  5. **Design tree resolution** — walk through the chosen approach, resolving every detail branch until the architecture is fully specified.
  6. Write architecture files + decisions
  7. Deep module principle embedded as a quality bar throughout

- **`/define-slices`** — tracer bullet framing:
  - Each slice = complete end-to-end flow that the agent can exercise (not just test)
  - Three-lens evaluation of proposed slicing: tracer bullet quality, risk front-loading (unknowns that could change architecture), observability front-loading (infrastructure that makes later slices more debuggable)
  - Present the evaluation to the user; if weak on any lens, propose alternative ordering
  - Each subsequent slice adds a new verifiable flow building on the last
  - Slices should avoid producing large amounts of unexercised code

- **`/create-plan`** — already has architectural change detection. Add: when discussing changes, include agent's recommendation with rationale. Calibrate explanation depth to user expertise.

- **`/implement-plan`** — already has architectural awareness. Add: when flagging changes, include recommendation with rationale. Calibrate to expertise.

- **`/complete-slice`** — strengthen to:
  - Update `system-profile.md` with what changed (health, debt, performance, extensibility)
  - Explicitly evaluate: did this slice reveal architectural debt? Localized (fix now) or systemic (propose side quest)?
  - Track signals across slices: if review iterations, implementation deviations, or architectural changes are trending upward, suggest `/audit-architecture`

- **Software Architecture reviewer** — add deep module evaluation criteria (small interface hiding complex implementation). Available to refine-plan, implement-plan, refine-architecture, and refine-slices.

### Cross-Cutting Guidance

- **All skills** load `.project/decisions/` as context alongside architecture files
- **All skills that can change system shape**: pause, explain what's changing, present options with trade-offs, include agent recommendation with rationale, decide together with user, write decision to `decisions/`
- **Expertise tracking (progressive disclosure)**:
  - **User-level CLAUDE.md**: Brief `## Expertise` section (~5 bullet points) with summary assessment. References specific memory files for detail. Always loaded, minimal context cost.
  - **Auto memory**: Detailed observations with dates, context, and trajectory. Loaded on demand when a specific topic comes up.
  - **Read on start**: All interactive skills check CLAUDE.md expertise summary to calibrate communication depth.
  - **Update opportunistically**: All interactive skills (start-project, explore, define-architecture, define-slices, create-plan, complete-slice) update both CLAUDE.md summary and memory if they observe expertise changes during conversation. Not a formal step — just "before you finish, if you noticed something, update it."
  - **Start-project**: Checks existing expertise notes first. Only asks calibration questions for domains not already covered. Updates, doesn't re-ask.
  - **Trajectory tracking**: Memory notes progression over time ("initially unfamiliar, now comfortable"). Never downgrades without evidence.

### Updated Workflow

```
start-project (+ expertise calibration)
  → explore (+ decisions/)
  → define-architecture (design tree + design-it-twice + deep modules)
  → refine-architecture (iterative review)
  → define-slices (tracer bullets, three-lens eval)
  → refine-slices (iterative review)
  → [per slice: create-plan → refine-plan → implement-plan → complete-slice (+ system-profile, + debt detection)]

Standalone: /audit-architecture (run when needed)
```

## Success Criteria

- Run `/define-architecture` on a test project — verify design tree interrogation surfaces hidden constraints, design-it-twice presents meaningfully different options with recommendations, decisions are written to `decisions/`
- Run `/refine-architecture` — verify iterative review loop scores and improves architecture
- Run `/define-slices` — verify three-lens evaluation catches ordering issues, slices are true tracer bullets
- Run `/refine-slices` — verify slice goals are strengthened by review
- Run `/complete-slice` — verify system-profile.md is created/updated with meaningful content
- Decisions from `/explore` are loaded and weighted by `/define-architecture`
- Architectural conversations include agent recommendations calibrated to user expertise
- User expertise observations accumulate in user-level CLAUDE.md across sessions

## Verification

- [ ] `ls .project/decisions/` shows decision files after running explore + define-architecture
- [ ] `.project/system-profile.md` exists after first complete-slice run and contains non-placeholder content
- [ ] User-level CLAUDE.md has expertise observations after start-project
- [ ] `/define-architecture` presents multiple design options before writing files
- [ ] `/refine-architecture` iterates to 9+ scores
- [ ] `/define-slices` evaluates ordering against three lenses and explains trade-offs
- [ ] `/audit-architecture` compares architecture files against actual code and produces actionable recommendations
- [ ] Software Architecture reviewer checks for deep module principle

## Scope Boundaries

**In scope:**
- All skill updates listed above
- workflow.md update
- New file conventions (decisions/, system-profile.md)
- Three new skills (refine-architecture, refine-slices, audit-architecture)

**Out of scope:**
- Changes to the refine-plan or implement-plan reviewer *infrastructure* (registry, bootstrap, synthesis) — we reuse it as-is
- Automated refactoring — audit-architecture produces recommendations, user decides what to act on
- Formal expertise assessment — lightweight calibration questions and observation, not testing
