# Software Architecture Review — Phase 1: Shared References & Agent Definitions (Iteration 2)

## Iteration 1 Fix Verification

All three IMPORTANT issues from iteration 1 have been addressed:

1. **Architecture overview line 69 (stale `skills:` reference)** — FIXED. Line 69 now correctly describes `@${CLAUDE_PLUGIN_ROOT}/path` references and mentions issue #25834. The stale `skills:` frontmatter description is gone.

2. **Reviewer agents write-vs-read-only contradiction** — FIXED. All three reviewer agents now say "Return review content inline — do not attempt to write files" and include `"filesWritten": []` in their return JSON. The synthesis agent's documentation (line 16) correctly notes "These files are written by the orchestrator from reviewer agent inline returns — the reviewers themselves do not write files."

3. **`filesWritten` contradiction between review-preamble.md and reviewer agents** — FIXED. Both review-preamble.md and all reviewer agent definitions now consistently show `"filesWritten": []` in the return format. No ambiguity remains.

## Issues

**[IMPORTANT]** Plugin manifest does not declare `agents` directory
The `scripts/build-plugin.sh` copies the `agents/` directory into the plugin dist (lines 48-51), but the plugin manifest (`plugin.json` at lines 31-42) only declares `"skills": "./skills"` — no `"agents"` field. The codebase research context (item 9) confirms the plan intended to add `"agents": "./agents"` to the manifest. The epic architecture overview (line 194) says this field is needed: `"agents": "agents/"` — a single directory path; Claude Code discovers all `.md` files within it." Without this manifest declaration, Claude Code may not discover the agent definitions at plugin load time, making every agent spawn fail silently. This is a Phase 2 (build pipeline) concern per the plan, but it bears flagging since Phase 1 agents are untestable without it.
File: scripts/build-plugin.sh:31
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Agent definitions in `agents/` diverge from architecture overview's expected file list
The architecture overview (lines 77-84) lists: `explore-phase.md`, `architecture-phase.md`, `refine-phase.md`, `slices-phase.md`, `plan-phase.md`, `implement-phase.md`, `reviewer.md`. Phase 1 creates: `plan-phase.md`, `refinement-coordinator.md`, `synthesis.md`, `editor.md`, `reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md`. The overview lists `reviewer.md` (singular) while the implementation correctly splits into domain-specific reviewers per the refinement loop design. The overview also lists agents that are out of scope for this slice (`explore-phase`, `architecture-phase`, etc.). This is expected divergence — the overview predates the detailed per-slice planning — but updating the overview to reflect the actual naming convention (domain-specific reviewers, coordinator, synthesis, editor) would keep future slice implementers aligned. Not blocking; a later slice can reconcile.
File: .goodplan/epics/simplify-data-model/architecture/_overview.md:77
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Refinement coordinator hardcodes reviewer selection heuristics
As noted in iteration 1 (carried forward as acknowledged tech debt): the coordinator's inline selection logic ("Does it define or modify module boundaries..." at line 26) is disconnected from the actual reviewer criteria in shared reference files. If reviewer capabilities change, the coordinator won't update. Acceptable for PoC scope. Documenting this as a known limitation in the coordinator agent or a TODO comment would prevent future surprises.
File: agents/refinement-coordinator.md:26
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All three IMPORTANT issues from iteration 1 are cleanly resolved. The architecture is sound: shared references composed into agent definitions via `@` injection, clear separation between read-only reviewers and write-capable agents (editor, synthesis), consistent return format contracts, and a flat agent hierarchy enforced by tool restrictions. The `review-preamble.md` extraction successfully standardizes the output format across all reviewer types. Agent definitions are appropriately sized (46-74 lines pre-expansion, well under the 500-line guideline). The one IMPORTANT remaining (manifest field) is technically a Phase 2 concern but affects testability of Phase 1 output. Fixing it would bring this to 10.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
