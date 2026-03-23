# Architecture Refinement Guidance

Architecture-specific evaluation priorities and conflict resolution for the refine-architecture skill.

## Evaluation Priorities

Architecture review has different priorities than plan review. These guide reviewer weighting and conflict resolution.

### Primary Concerns (block completion if unresolved)

1. **Module depth**: Are modules deep (small interface hiding significant complexity) or shallow (large interface with thin implementation)? Deep modules are the single strongest indicator of good architecture. Weight deep module criteria (8-11) at 2x relative to other criteria.

2. **Subsystem boundary quality**: Do boundaries align with areas of likely change? A good boundary isolates a dimension of change so that modifications in one subsystem don't ripple across others.

3. **API surface area**: Is each subsystem's public API as small as possible while remaining useful? Large APIs suggest the boundary is in the wrong place or the module is too shallow.

4. **Separation of concerns**: Does each subsystem have a single, well-defined responsibility? Mixed responsibilities create coupling that makes future changes expensive.

### Secondary Concerns (should address, may early-exit with warnings)

5. **Decision alignment**: Does the architecture respect all active decisions in `.project/decisions/`? Conflicts must be resolved — either the architecture changes or the decision is marked `revisiting`.

6. **Completeness**: Does the architecture cover all capabilities described in `idea.md`? Missing coverage is acceptable only if explicitly deferred with rationale.

7. **Data flow clarity**: Is it clear how data moves between subsystems? Ambiguous data flow leads to implementation surprises.

8. **Testability**: Does the architecture support testing at appropriate granularity? Subsystems should be testable in isolation.

### Tertiary Concerns (nice to have, don't block)

9. **Naming clarity**: Do subsystem and module names communicate purpose?
10. **Documentation completeness**: Are all architecture files internally consistent?
11. **Extension points**: Can the architecture evolve without major rewrites?

## Conflict Resolution

When reviewers disagree on architecture:

| Conflict Type | Resolution |
|---|---|
| Boundary placement | Trust Software Architecture reviewer |
| Module depth assessment | Trust Software Architecture reviewer |
| Domain-specific patterns (e.g., DB schema) | Trust the domain specialist |
| Cross-domain contradictions | Flag as USER_INPUT |
| API design vs implementation feasibility | Spawn CODEBASE_EXPLORATION to check |
| Holistic vs specialist on architecture | Trust the specialist on structural issues, Holistic on completeness |
| Maturity assessment | Trust Software Architecture reviewer for structural evidence, USER_INPUT for business-context promotions |

## Maturity Evaluation

During review, the Software Architecture reviewer evaluates maturity levels as part of its standard structural assessment. This is not a separate review pass — it integrates with existing boundary/depth analysis.

### Evaluation Questions by Level

**Experimental** — Is the subsystem still actively being shaped? Are there zero or few dependents? If it has gained dependents or stabilized, it may be ready for promotion.

**Developing** — Is the design direction clear? Are changes still expected but becoming more deliberate? Are dependents starting to rely on stable parts of the interface? If stability has increased and fitness function candidates are identified, consider promotion.

**Maturing** — Are most edge cases handled? Do multiple dependents rely on it? Are fitness functions in place and passing? If fitness functions cover key properties and no significant design changes have occurred over recent slices, consider promotion.

**Foundational** — Is the subsystem battle-tested with deeply relied-upon interfaces? Are all key fitness functions passing? Has there been no significant rework? If fitness functions have broken, confidence has dropped, or significant rework has occurred, consider demotion.

### What to Check

- **Maturity-evidence alignment**: Is the claimed maturity level appropriate given the evidence (number of dependents, stability over recent slices, fitness function coverage)?
- **Promotion candidates**: Propose promotions with justification when evidence supports a higher level.
- **Demotion candidates**: Propose demotions when subsystems have regressed (new gaps, broken fitness functions, reduced confidence).
- **Maturity-fitness gap**: Flag subsystems that claim Maturing or Foundational maturity but lack fitness functions — high maturity without automated property verification is a risk.

## Architecture vs Plan Review

Key differences from plan refinement:

| Aspect | Plan Refinement | Architecture Refinement |
|---|---|---|
| Files being reviewed | Plan documents | Architecture .md files in `.project/architecture/` |
| Edit strategy | Working copy (`-refining`) | In-place with backup |
| Primary quality signal | Implementation readiness | Module depth and boundary quality |
| Fewer iterations needed | Max 12 | Max 8 (architecture files are shorter) |
| Score thresholds | Full: 9+, Early: 8+ after 5 | Full: 9+, Early: 8+ after 4 |
| Research step | Pre-review (Step 2) | On-demand during loop only |
| Reviewer weighting | Equal weight | Deep module criteria (8-11) at 2x |
