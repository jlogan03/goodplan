# Codebase Context for Create-Epic Pipeline

## CLI Command Surface -- Verified

All epic commands exist in `src/commands/epic/`:
- `epic:create`, `epic:explore`, `epic:define-architecture`, `epic:define-slices`
- `epic:refine-architecture`, `epic:refine-slices`
- `epic:show`, `epic:list`, `epic:activate`, `epic:complete`, `epic:abandon`
- `epic:add-verification`, `epic:update-verification`

All subagent commands exist in `src/commands/subagent/`:
- `submit-explore`, `submit-architecture`, `submit-slices`
- `submit-refine-architecture`, `submit-refine-slices`
- `start-explore`, `start-architecture`, `start-slices` (context bundling)
- `start-refine-architecture`, `start-refine-slices`

**Key finding**: The plan references `slice:create` for creating slices in Phase 6. This command exists at `src/commands/slice/create.ts`. The plan's stdin format `{"name":"<name>","goal":"<goal>"}` should be verified against the actual command schema.

## Context Bundling Commands

`start-explore`, `start-architecture`, `start-slices` all call `startContext()` from `core/context/` and return a `ContextBundle` JSON. The plan does NOT use these -- it has agents reading files directly via temp dirs. **Discrepancy**: the orchestrator could use `gp start-explore --epic <name>` to get structured context for agents instead of manually assembling file paths. The plan-slice orchestrator (slice 02) does not use `start-plan` either, so this is consistent with the established pattern, but worth noting as an optimization opportunity.

## Existing Skill Patterns to Reuse

**create-epic skill** (197 lines): Two modes (new project vs add epic). Key reusable content: Q&A wrap-up heuristic (3+ exchanges, 5 coverage areas), expertise calibration step, CLAUDE.md update logic. The pipeline replaces this entirely but should preserve Mode A's project-init flow for slice 06 (`/gp:init`).

**explore skill** (245 lines): Research/brainstorm/prototype loop with user-controlled exit via AskUserQuestion ("Keep exploring" / "Done"). The plan's explore-phase agent correctly mirrors this as PARTIAL returns. Key detail: explore skill uses sub-agents for parallel research (cap at 5) -- the agent definition should preserve this.

**create-architecture skill** (100+ lines): Design tree with broad + deep passes, conventions-first ordering, re-entrant file detection. Architecture path resolution uses `epic:define-architecture` response's `paths.architecture` field -- the plan should use this rather than hardcoding paths.

**create-slices skill** (100+ lines): Tracer-bullet framing, re-entry check (add/revise/start fresh), sequential ordering. Writes `sequencing.md` + per-slice `goal.md`.

**plan-slice orchestrator** (proven pattern): Context discipline, phase table, re-entry via status query, Agent tool spawning, PARTIAL handling. This is the template for create-epic's orchestrator.

## Existing Agents (7 from slice 02)

`agents/`: editor, plan-phase, refinement-coordinator, reviewer-agent-skill, reviewer-holistic, reviewer-software-architecture, synthesis. Plan targets 13 total (7 + 3 phase agents + 3 reviewers).

## Epic Transition Table -- Verified

Plan's phase-status mapping matches transition tables exactly:
- created -> exploring -> explored -> defining-architecture -> architecture-defined -> refining-architecture -> architecture-refined -> defining-slices -> slices-defined -> refining-slices -> slices-refined

Skip paths exist (created -> explored, explored -> architecture-defined, etc.) but the plan correctly does not use them for the primary pipeline flow.

## Shared References

`skills/_shared/references/` has 22 files. Relevant for new reviewers: `review-preamble.md`, `review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md` exist as templates. `reviewers-cross-cutting.md` (31KB) contains source material for the 3 new domain reviewers.

## Discrepancies / Risks

1. **No `reviewers-language.md`**: Plan Phase 2 references "existing `reviewers-language.md`" for TypeScript reviewer source material, but this file does not exist in `_shared/references/`. The TypeScript content may be in `reviewers-cross-cutting.md` or elsewhere.
2. **`paths.architecture` field**: Plan Phase 4 hardcodes architecture path as `.goodplan/epics/<name>/architecture/`. The `epic:define-architecture` response includes a `paths.architecture` field that should be used instead.
3. **`start-*` context bundling**: Available but unused by the plan -- consistent with plan-slice pattern but could reduce orchestrator complexity.
