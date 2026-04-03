# Codebase Context for Plan-Slice PoC

## Fresh Documentation (reliable references)

| Document | Last Modified | Notes |
|---|---|---|
| Epic architecture `_overview.md` | 2026-04-01 | Same day as goal.md. Source of truth for orchestrator pattern, agent definitions, refinement loop, sub-agent yield protocol. |
| Epic architecture `conventions.md` | 2026-04-01 | Fresh. Status-to-phase mapping, context discipline rules. |
| Epic architecture `skill-model-api.md` | 2026-04-01 | Fresh. Skill consolidation 19 -> 12 details. |
| Epic architecture `test-harness-api.md` | 2026-04-01 | Fresh. Simulated user, per-test model, artifact verification. |
| `.goodplan/architecture/invariants.md` | 2026-03-30 | Stable. INV-001 through INV-007. Key for plan: INV-001 (all mutations through state machine), INV-004 (stateless commands with target flags). |
| `skills/_shared/references/` (16 files) | 2026-03-29 to 2026-03-30 | Stable shared references. `reviewers-cross-cutting.md` exists but plan proposes new reviewer files (`review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md`) — no name collision. |
| Installed reviewer prompts at plugin cache | 2026-04-01 (v1.0.3) | `reviewers-always.md`, `reviewers-ai-tooling.md`, `shared-preamble.md` exist at installed location. These are the content sources for the new shared reference files the plan creates. |

## Stale Documentation (flagged)

No stale documentation detected. The goal.md and all epic architecture files share the same modification date (2026-04-01). Base architecture files (2026-03-30) are stable — this epic does not modify the four-layer CLI stack, so they remain valid references.

## Recent Development Activity

Heavy activity in the last month across plan-relevant areas:

**`tools/dogfood/` (high churn)**: 40+ commits in the last month. Major test harness overhaul in slice-01 (test-harness): Agent SDK persistent sessions, simulated user, shared utilities, integration tests. Key files all modified today (2026-04-01). The plan's Phase 4 builds on this work.

**`scripts/build-plugin.sh` (moderate churn)**: Plugin scaffold, HMAC signatures, skill packaging, namespace prefixing, and validation all added in the last month. The script is 173 lines and already has agent directory copying (lines 48-51) but no agent validation.

**`skills/_shared/references/` (moderate churn)**: Iteration loop, output templates, audit conventions, CLI interaction reference all added/updated. No changes in last 2 days — stable.

## Key Decisions and Constraints

1. **`@` references, NOT `skills:` frontmatter**: Issue #25834 means `skills:` injection from plugin agents to plugin skills silently fails. The plan correctly uses `@${CLAUDE_PLUGIN_ROOT}/path` injection. Verified via prototype per epic architecture.

2. **`agents/` directory exists but is empty**: Created 2026-04-01, no files yet. Plan Phase 1 populates it with 7 agent `.md` files. Build script already copies it (lines 48-51).

3. **`skills/plan-slice/` does not exist yet**: Plan Phase 3 creates it.

4. **Existing reviewer content**: Installed v1.0.3 has `reviewers-always.md` (holistic reviewer), `reviewers-ai-tooling.md` (agent skill reviewer + MCP reviewer), and `shared-preamble.md`. The plan's new shared references (`review-preamble.md`, `review-holistic.md`, `review-agent-skill.md`, `review-software-architecture.md`) extract and restructure this content for `@`-injection into agent definitions.

5. **Existing `plan-format.md`**: Lives at `skills/create-plan/references/plan-format.md`. Plan proposes extracting to `skills/_shared/references/plan-format.md` — the existing file is the source to extract from.

6. **`createMinimalFixture()` signature**: Accepts `{ dir?, epicName?, sliceName?, withSource? }`. Plan Phase 4 proposes extending with `sliceGoal`, `numSlices`, `architectureFiles` — all optional, backward compatible. No conflicts with existing callers.

7. **`runSkillSession()` and `verifyEntityStatus()`**: Both exist and exported from `tools/dogfood/utils.ts`. `verifyOrchestratorDiscipline()` does NOT exist yet — plan Phase 4 creates it.

8. **Build-plugin.sh validation gap**: Agent validation section does not exist. Skill validation (lines 88-145) validates frontmatter `name:` and `description:`. Plan Phase 2 adds analogous validation for agents — pattern is clear to follow.

9. **Plugin manifest**: Currently has `name`, `version`, `description`, `author`, `skills` fields. Plan adds `"agents": "./agents"`. The manifest template is at lines 33-43 of build-plugin.sh.

10. **Refinement loop exit conditions**: Architecture specifies all scores >= 9 to exit. Hard cap 10 iterations. Warn if net score doesn't rise between adjacent rounds. Stop after 2 adjacent no-improvement rounds or 2 rounds (any position) with net score reduction.

## Subsystem Maturity Relevant to This Plan

| Subsystem | Maturity | Impact on Plan |
|---|---|---|
| Skills | Experimental | New orchestrator pattern — high risk, this slice is the tracer bullet. |
| Test Harness | Experimental | Just overhauled in slice-01. Foundation is fresh but unproven at scale. |
| Data Layer | Developing (modified) | Not touched by this slice. |
| State Machine | Developing (modified) | Not touched by this slice. |
| Commands | Developing (modified) | Uses existing commands (`start-plan`, `submit-plan`, `slice:show`, `status`). |

All other subsystems (RPC, Context, Plugin) unchanged.

## Areas of Active Churn vs Stability

**Active churn** (exercise caution, check latest state before implementing):
- `tools/dogfood/` — all files modified today. Slice-01 just completed. APIs may have shifted since plan was written.
- `scripts/build-plugin.sh` — 10+ commits in last month. Structure is settling but still being extended.
- `agents/` — empty directory, ready for population.

**Stable** (safe to reference without re-checking):
- `skills/_shared/references/` — last changes 2026-03-30, well-established patterns.
- `.goodplan/architecture/` — base architecture stable since 2026-03-30.
- Existing skill directory structure — no changes since 2026-03-30.
- CLI command surface (`start-plan`, `submit-plan`, `slice:show`, `status`) — stable since entity restructuring epic.
- Installed reviewer prompt content — v1.0.3 is the extraction source.
