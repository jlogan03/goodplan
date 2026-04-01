# Plan-Slice Proof of Concept

## What We're Building
Build the agent infrastructure (agents/ directory, build pipeline changes, shared references, reviewer agents) and the `plan-slice` orchestrator skill as a proof-of-concept for the orchestrator pattern. This is the core tracer bullet — plan-slice is the simplest pipeline (2 phases: interactive plan Q&A → autonomous draft + refinement) but exercises all key mechanisms: interactive Q&A in orchestrator, agent spawning via Agent tool, refinement-coordinator → reviewers → synthesis → editor loop, sub-agent return format parsing, and @ reference injection in plugin agents.

## Behavior
1. Create `agents/` directory at the plugin root with agent definition `.md` files: `plan-phase.md`, `refinement-coordinator.md`, `synthesis.md`, `editor.md`.
2. Create reviewer agent definitions: `reviewer-holistic.md`, `reviewer-software-architecture.md`, `reviewer-agent-skill.md` (minimum viable set — more added in later slices).
3. Create shared reference files for injection via `@` references: `review-preamble.md` (output format, severity levels, score rubric), `review-holistic.md`, `review-software-architecture.md`, `review-agent-skill.md` (domain criteria).
4. Update `build-plugin.sh` to copy `agents/` into dist. Add build verification that all referenced agent `.md` files exist. Note: `build-plugin.sh` and `plugin.json` already exist from the plugin-distribution epic — no need to create them.
5. Verify whether `plugin.json` requires an explicit `"agents"` field or Claude Code auto-discovers `agents/` directories. Per research: auto-discovery works by default; explicit field only needed for non-default paths. Add `"agents": "agents/"` only if needed for clarity.
6. Build the `plan-slice` orchestrator skill (`skills/plan-slice/SKILL.md`):
   - Phase 1 (interactive): Query slice status via CLI. Ask user about approach, phasing, expected behavior. Write structured Q&A output to disk.
   - Phase 2 (autonomous): Spawn `plan-phase` agent with Q&A output path + architecture file paths. Receive draft. Spawn `refinement-coordinator` → parse spawn plan → spawn reviewer agents in parallel → spawn `synthesis` → check scores → if needed spawn `editor` → loop.
   - Re-entry: if slice already has plan, offer to refine or view.
7. Sub-agents return structured JSON (status, summary, filesWritten, score, etc.) per the conventions.
8. Orchestrator context discipline: never reads full artifact files — only CLI output, sub-agent returns, user Q&A, and lightweight summaries. Do NOT use `skills:` frontmatter for shared content injection — use `@` references per verified prototype.
9. Extend `tools/dogfood/utils.ts` (created in slice 01) with `verifyOrchestratorDiscipline()` — a test utility that filters tool calls for `Read` on architecture/plan/source files and fails if any are found. Used in verification for this slice and all subsequent pipeline slices.

## Verification
- [ ] Run `bun run build:plugin` — dist includes `agents/` directory with all `.md` files
- [ ] Run `bun tools/dogfood/test-plan-slice.ts` (new harness script) — plan-slice pipeline completes: Q&A phase runs, plan draft is written, refinement loop runs at least one iteration, final plan is written
- [ ] After test run, `gp slice:show --slice <name> --json` returns status `plan-refined`
- [ ] Automated orchestrator discipline check: `verifyOrchestratorDiscipline()` filters tool calls for `Read` on architecture/plan/source files and fails if any are found (add to test harness utils)
- [ ] Inspect orchestrator log — no Read calls on architecture files, plans, or source code (only CLI queries and sub-agent spawns)
- [ ] Verify `@` references in agent definitions resolve correctly — agent bodies contain injected shared content (check by reading a loaded agent's effective prompt in the test log)

Build the plugin with `bun run build:plugin` and verify the dist contains `agents/` with all expected `.md` files. Create a minimal fixture with a slice in `created` status. Run `test-plan-slice.ts` end-to-end. Verify the plan Q&A collects user input (simulated), the plan-phase agent drafts a plan, the refinement loop runs (coordinator selects reviewers, reviewers score, synthesis merges, editor applies feedback if needed), and the final plan is written. Check that `gp slice:show` reports `plan-refined`. Review the test log to confirm the orchestrator never made Read calls on full artifacts.

## Scope Boundaries
**In scope:** `agents/` directory and all agent definitions listed above, build pipeline changes, `skills/plan-slice/SKILL.md` orchestrator, `tools/dogfood/test-plan-slice.ts` harness script, shared reference files for reviewer injection, sub-agent return format implementation
**Out of scope:** Remaining reviewer agents beyond the 3 core ones (added per-slice as needed). Other pipeline skills (create-epic, create-side-quest, implement).

**Note:** If this slice proves too large during implementation, agent infrastructure (agents/ dir, build pipeline, shared references) could be split from the plan-slice orchestrator into a separate slice.
