# Agent Skill Review — Simplify Data Model Epic Architecture

Reviewer: agent-skill
Iteration: 3
Scope: All architecture files

## R2 Issue Disposition

All R2 issues from this reviewer have been addressed:

- **I-1 (agent loading research):** `_overview.md` line 188 now cites the research validation in `.goodplan/epics/simplify-data-model/research/sub-agent-prompt-files.md`, confirming plugin `agents/` directories are discovered at priority 4. Build verification step added for agent `.md` files. The `plugin.json` `"agents"` field format is documented.
- **I-2 (reconsiderWhen/validUntil integration spec):** `conventions.md` now has a dedicated "reconsiderWhen / validUntil Evaluation" section specifying: (1) ownership by three phase agents (architecture-phase, plan-phase, completion-phase), (2) orchestrator loads conditions via CLI (`decision:list --json`, `learning:list --json`), (3) `triggeredConditions` field added to sub-agent return format with `entityType`, `title`, and `condition` fields.
- **M-3 (complete-epic spawning pattern):** `skill-model-api.md` now includes "Agent usage" note: spawns `completion-phase` agent, does not use the refinement loop.
- **M-4 (reviewer tool restriction):** `conventions.md` now lists the minimum tool set: Read, Grep, Glob, Write, Bash (needed for `gp status --json` queries).
- **M-5 (init mode detection):** `skill-model-api.md` now documents auto-detection heuristic (source code files) and `--mode` override flags.

## Issues

**[IMPORTANT]** Orchestrator token budget estimate may undercount the longest pipeline

The architecture states "~25K tokens typical orchestrator context (Q&A + summaries), ~96K max for longest pipeline (~10% of 1M window)" and adds "Agent spawn overhead (tool definitions, system prompt injection) adds ~2-3K per spawn; a full pipeline with 20+ spawns may add 40-60K total spawn overhead across the session." However, the `create-epic` pipeline with refinement loops can accumulate significant context beyond Q&A + summaries:

- 6 phases with 3 interactive Q&A blocks (goal capture, architecture Q&A with broad+deep design tree, slices Q&A)
- 2 refinement loops (architecture + slices), each with coordinator return, N reviewer summaries, synthesis return, potentially 2-3 iterations
- Re-spawning sub-agents for PARTIAL status adds continuation file paths + resolved answers to the orchestrator context
- Each sub-agent return JSON adds ~200-500 tokens

A worst-case `create-epic` run with deep design tree Q&A (~15K) + 2 refinement loops x 3 iterations x (coordinator + 5 reviewers + synthesis + editor returns) could push orchestrator context well beyond 96K. The 96K estimate should either be validated against a realistic scenario or adjusted upward. This matters because if the orchestrator exceeds ~200K, the remaining budget for tool definitions and system prompts becomes constrained.

Resolution: DIRECTLY_ACTIONABLE

Add a worked example or breakdown to the budget note: e.g., "Worst-case create-epic: ~15K Q&A + ~5K CLI status calls + ~30K sub-agent return summaries (30 spawns x 1K avg) + ~60K spawn overhead = ~110K total session context." Adjust the 96K figure if the breakdown shows it's low, or document the assumptions that keep it at 96K (e.g., refinement typically converges in 1-2 rounds).

---

**[MINOR]** `explore-phase` agent is shared across skills but pipeline skills don't invoke `/gp:explore`

The architecture correctly notes that pipeline skills spawn `explore-phase.md` directly rather than invoking `/gp:explore`. The standalone `/gp:explore` skill is described as a "thin wrapper that spawns `explore-phase.md` as a sub-agent." This design is clean, but the skill-model-api.md table lists `explore` as "Used by" `create-epic, create-side-quest, explore` without distinguishing invocation patterns. An implementer might mistakenly have pipeline orchestrators invoke the `/gp:explore` skill (adding an unnecessary indirection layer) rather than spawning the agent directly.

Resolution: DIRECTLY_ACTIONABLE

In the agent definitions table (skill-model-api.md), add a parenthetical: `explore-phase.md` — Used by: create-epic (direct spawn), create-side-quest (direct spawn), explore (skill wrapper). Or add a footnote clarifying that pipeline skills spawn the agent directly while the standalone skill wraps it.

---

**[MINOR]** `implement` skill has no interactive phases but the re-entry protocol assumes all pipeline skills offer "continue/go-back"

The `_overview.md` re-entry protocol section says: "Phase detection uses the CLI exclusively... The orchestrator queries... and maps the status field to the corresponding pipeline phase." The conventions.md phase detection tables cover re-entry for create-epic, plan-slice, and create-side-quest. But `/gp:implement` is listed as a pipeline skill with zero interactive phases. Its re-entry scenario ("If `implementing`, check which plan phases have commits") is qualitatively different from the other pipelines -- there's no "go back to an earlier phase" option since there are no interactive phases to go back to. The re-entry protocol in `_overview.md` should acknowledge this variant.

Resolution: DIRECTLY_ACTIONABLE

Add a note to the re-entry protocol section: "For `/gp:implement`, re-entry resumes from the last incomplete plan phase (detected via commit history or CLI status). There is no 'go back' option since all phases are autonomous."

## Score: 9/10

All R2 issues are resolved. The architecture is well-structured: the orchestrator pattern is clearly specified with appropriate context discipline, the agent definition mechanism has research backing, the `reconsiderWhen`/`validUntil` evaluation is properly integrated with specific agent ownership and return format, and the `_shared/references/` migration table provides clear disposition for each reference file. The remaining IMPORTANT issue (token budget undercount) is a robustness concern for the most complex pipeline -- addressing it with a worked example would complete the architecture's operational readiness. The two MINOR issues are documentation clarity improvements that would prevent implementation mistakes.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
