# Side Quest: Slice Quality & System Health

## What We're Building

Upgrade slice definition to use tracer bullet methodology with multi-lens evaluation, add iterative review of slice goals, and strengthen the completion step to track system health over time.

## Dependencies

- **decisions-and-expertise** side quest must be complete (decisions/ convention, expertise tracking, cross-cutting guidance)
- **architecture-quality** side quest recommended but not required (refine-architecture and deep module criteria enhance slice evaluation, but slices can be defined without them)

## What Changes

### Updated Skill: `/define-slices` — Tracer Bullet Framing

The current flow already requires each slice to be a complete end-to-end flow with a Verification section. This upgrade strengthens the ordering strategy and evaluation.

**New capabilities**:

1. **Tracer bullet framing**: Explicit language in the skill that each slice is a "tracer bullet" — a thin vertical cut through all integration layers, end-to-end, demoable/verifiable on its own. The first slice proves the architecture works before building the rest. Each subsequent slice adds a new verifiable flow building on the last. Slices should avoid producing large amounts of unexercised code.

2. **Three-lens evaluation**: After proposing slices, evaluate the ordering against three lenses:
   - **Tracer bullet quality**: Is each slice a complete e2e flow the agent can exercise? If a slice can't be verified by running code, it's too thin or too abstract — merge or redefine.
   - **Risk front-loading**: Are high-risk unknowns (things that could change architecture or impact the project goal) scheduled early? Do we explore those before committing to the initial architecture guess?
   - **Observability front-loading**: Does early work include logging, debugging infrastructure, or tooling that makes later slices more verifiable and debuggable?

   Present the evaluation to the user. If the slicing is weak on any lens, propose an alternative ordering and let the user choose.

3. **Avoiding integration failures**: The skill should explicitly warn against orderings that would produce many slices of code without executing it end-to-end. The goal: every slice ends with running code, not just passing tests. Having to do a dramatic refactor right after initial implementation is a sign the slicing was wrong.

### New Skill: `/refine-slices`

Lightweight iterative review of slice goals. Fewer iterations and reviewers than refine-plan — this is about coherence and completeness, not detailed implementation planning.

**How it works**:
1. Load all slice goal.md files + sequencing.md + architecture + decisions
2. Spawn 2-3 reviewers:
   - **Architecture alignment**: Do slices map cleanly to subsystem boundaries? Are dependencies between slices consistent with architecture?
   - **Tracer bullet quality**: Is each slice independently verifiable end-to-end? Does the verification section describe something the agent can actually execute?
   - **Risk/dependency analysis**: Are unknowns front-loaded? Are there circular dependencies? Is the ordering robust?
3. Synthesize feedback, apply fixes, re-review
4. Iterate until scores ≥ 9 (expect fewer iterations than refine-plan — 2-3 typically)
5. Output: updated goal.md files + sequencing.md

**Reviewer infrastructure**: Reuse the same registry/bootstrap/synthesis machinery as refine-plan. The reviewers above could be custom prompts within the existing `reviewers-cross-cutting.md` or standalone reviewer definitions.

### New File Convention: `.project/system-profile.md`

Qualitative snapshot of the system, complementing the structural architecture files:

```markdown
## System Profile

### Health
- **Well-tested**: [subsystems with good coverage]
- **Undertested**: [subsystems with gaps]
- **Known fragile**: [areas with known issues]

### Performance Characteristics
- [Key metrics and bottlenecks]

### Extensibility
- **Easy to extend**: [areas with plugin patterns or clear extension points]
- **Hard to extend**: [tightly coupled areas]

### Technical Debt
- [Known shortcuts, deferred refactors, pattern divergence]

### Recent Changes (last 3 slices)
- [What changed and why]
```

Updated by `/complete-slice` and `/audit-architecture`. Not a repeat of architecture files (those are structural) — this is the qualitative complement.

### Updated Skill: `/complete-slice` — System Health Tracking

Strengthen the existing skill to:

1. **Update `system-profile.md`**: After synthesizing learnings, update the system profile with what changed in this slice:
   - Health: which areas were tested, which have gaps
   - Performance: any characteristics observed during verification
   - Extensibility: did the implementation reveal areas that are easy or hard to extend?
   - Technical debt: any shortcuts taken, patterns that won't scale
   - Recent changes: add this slice's changes to the rolling list

2. **Explicit debt evaluation**: After architecture review (Step 6), explicitly ask: "Did this slice reveal architectural debt?" If yes, assess: is it localized (propose fix now) or systemic (propose a side quest with goal.md)?

3. **Signal tracking across slices**: Check recent flow-log entries. If review iteration counts, implementation deviations from plans, or architectural changes are trending upward across the last 2-3 slices, surface this to the user: "The last few slices have required increasing numbers of architectural changes during implementation. Consider running `/audit-architecture`."

## Success Criteria

- Run `/define-slices` on a test project:
  - Slices are framed as tracer bullets with explicit e2e verification
  - Three-lens evaluation catches ordering issues (risk not front-loaded, observability deferred)
  - Alternative ordering proposed when evaluation is weak on a lens
- Run `/refine-slices`:
  - Slice goals are strengthened by review
  - Architecture alignment, tracer bullet quality, and risk analysis all evaluated
  - Scores reach 9+
- Run `/complete-slice` after implementing 2+ slices:
  - system-profile.md exists with non-placeholder content after first run
  - system-profile.md updated with new content after second run
  - Debt evaluation happens and proposes side quests when warranted
  - Signal tracking fires when architectural changes trend upward

## Verification

- [ ] `/define-slices` evaluates ordering against three lenses and explains trade-offs
- [ ] Three-lens evaluation catches known-bad orderings (e.g., putting observability last)
- [ ] `/refine-slices` iterates to 9+ scores with 2-3 reviewers
- [ ] `.project/system-profile.md` created after first `/complete-slice` run
- [ ] system-profile.md updated meaningfully after subsequent slices
- [ ] Debt evaluation distinguishes localized vs. systemic debt
- [ ] Signal tracking detects upward trends in architectural changes

## Scope Boundaries

**In scope**: define-slices upgrade (tracer bullets, three-lens), refine-slices (new), complete-slice upgrade (system-profile, debt detection, signal tracking), system-profile.md convention

**Out of scope**: Architecture definition/refinement/audit (those are in architecture-quality side quest), decisions/ and expertise infrastructure (those are in decisions-and-expertise side quest)
