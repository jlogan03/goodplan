# Reviewer Registry — Architecture Refinement

The orchestrator reads this file to understand the available reviewers for architecture review. Fewer reviewers than plan refinement — architecture review focuses on structural quality, not implementation readiness.

## review_context Value

For all reviewers in this skill: `{review_context}` = `project architecture files`

## Cross-Cutting Reviewer Prompts

Shared reviewer prompts live at: `../../_shared/references/reviewers-cross-cutting.md`

The Software Architecture reviewer section in that file includes criteria 8-11 (deep module criteria). For architecture review, these are weighted at 2x via the weighting preamble in `references/sub-agent-prompts.md`.

## Always-On

Always selected for every architecture review iteration.

| Reviewer | Focus | Prompt File | Section | Context | Notes |
|---|---|---|---|---|---|
| Software Architecture | Module boundaries, dependency direction, coupling/cohesion, layering, data flow, testability, module depth, **maturity evaluation** | `../../_shared/references/reviewers-cross-cutting.md` | `## Software Architecture Reviewer` | `{review_context}` = `project architecture files` | **Inject weighting preamble** from `references/sub-agent-prompts.md` § "Reviewer Weighting Preamble" into bootstrap context. Deep module criteria (8-11) weighted 2x for architecture review. **Also evaluates maturity levels** as part of its standard review — checks evidence alignment, proposes promotions/demotions, flags maturity-fitness gaps. See `references/guidance.md` § "Maturity Evaluation" for criteria. |
| Holistic | Overall architecture completeness, goal alignment, consistency across files, gap detection, simplicity | `../../refine-plan/references/reviewers-always.md` | `## Holistic Reviewer` | | Evaluates the architecture as a whole — are all subsystems covered? Do files tell a coherent story? |

## Domain Specialists — Conditional

Select when the architecture content covers the specialist's domain. The orchestrator decides based on its understanding of the architecture files — no keyword matching required.

| Reviewer | When to Include | Prompt File | Section | Context |
|---|---|---|---|---|
| Data Layer | Architecture includes persistent storage, database schemas, or data models | `../../refine-plan/references/reviewers-web.md` | `## Data Layer Reviewer` | `{review_context}` = `project architecture files` |
| Backend | Architecture includes API services, server-side logic, or service-to-service communication | `../../refine-plan/references/reviewers-web.md` | `## Backend Reviewer` | `{review_context}` = `project architecture files` |
| Frontend | Architecture includes UI components, client-side state, or user-facing interfaces | `../../refine-plan/references/reviewers-web.md` | `## Frontend Reviewer` | `{review_context}` = `project architecture files` |
| API Contract | Architecture defines public APIs or inter-subsystem contracts | `../../_shared/references/reviewers-cross-cutting.md` | `## API Contract Reviewer` | `{review_context}` = `project architecture files` |
| DevOps and Infra | Architecture includes deployment, infrastructure, or CI/CD concerns | `../../refine-plan/references/reviewers-web.md` | `## DevOps and Infra Reviewer` | `{review_context}` = `project architecture files` |
| Agent Skill | Architecture covers agent skills or skill infrastructure | `../../refine-plan/references/reviewers-ai-tooling.md` | `## Agent Skill Reviewer` | `{review_context}` = `project architecture files` |
| MCP Server | Architecture includes MCP server design | `../../refine-plan/references/reviewers-ai-tooling.md` | `## MCP Server Reviewer` | `{review_context}` = `project architecture files` |

## Reviewer Spawn Notes

- **Shared preamble**: Use `../../refine-plan/references/shared-preamble.md` — the preamble is generic enough for both plan and architecture review. The `{review_context}` placeholder distinguishes the review type.
- **Weighting preamble**: Only injected for the Software Architecture reviewer. Append it after the shared preamble content in the bootstrap prompt.
- **Model selection**: Default `model: "opus"`. Downgrade to `model: "sonnet"` when all previous scores were 8+ and only MINOR issues remain.
- **Re-evaluation**: After each iteration where the editor modified files, reassess which domain specialists are relevant — architecture edits may introduce or remove content in a specialist's domain.
