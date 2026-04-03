# Phase 1 Merged Review: Shared References & Agent Definitions

## Merged Score: 7.5/10

## Issues

### IMPORTANT

**[I-1] Reviewer agents instruct file writes but plan specifies read-only tools**
All three reviewer agents instruct themselves to "Write your full review... to the review output path" and show `filesWritten: ["<review-output-path>"]`. The Phase 3 plan restricts reviewers to `allowedTools: ["Read", "Grep", "Glob"]` — no Write. This will cause runtime failures. Fix: remove write instructions from reviewer agents, have them return review content inline in their JSON return, and set `filesWritten: []`. The orchestrator writes the output to disk.
Raised by: generalist, software-architecture, repo-tooling (partial)
Files: `agents/reviewer-holistic.md`, `agents/reviewer-software-architecture.md`, `agents/reviewer-agent-skill.md`
Resolution: DIRECTLY_ACTIONABLE

**[I-2] `review-preamble.md` and reviewer agent return formats contradict on `filesWritten`**
The preamble shows `"filesWritten": []`; each reviewer agent shows `"filesWritten": ["<review-output-path>"]`. After `@` injection, the agent prompt contains both, creating ambiguity. This is the same root cause as I-1 — once I-1 is fixed (agents return content inline, `filesWritten: []`), the preamble and agents will be consistent. No separate fix needed beyond I-1.
Raised by: generalist, agent-skill, software-architecture, repo-tooling
Files: `skills/_shared/references/review-preamble.md:87`, all reviewer agents
Resolution: RESOLVED_BY I-1

**[I-3] Architecture overview line 69 still describes stale `skills:` frontmatter mechanism**
Line 135 was correctly updated to describe `@` references. But line 69 still describes the broken `skills:` frontmatter injection. The plan note says "~line 69 already correctly describes the `@` reference mechanism" — this is factually wrong. Line 69 must be rewritten to describe the `@${CLAUDE_PLUGIN_ROOT}/path` mechanism.
Raised by: agent-skill, software-architecture
File: `.goodplan/epics/simplify-data-model/architecture/_overview.md:69`
Resolution: DIRECTLY_ACTIONABLE

**[I-4] Reviewer and editor agent definitions lack explicit tool restriction guidance**
Reviewer agents don't state they are read-only; the editor agent doesn't state it lacks Agent tool access. While the orchestrator enforces tool restrictions at spawn time, self-contained agents should know their constraints to avoid confusion. Add a one-liner to each: reviewers get "Read, Grep, Glob only — no file writes, no sub-agents"; editor gets "Read, Grep, Glob, Write, Edit — no sub-agents."
Raised by: agent-skill
Files: `agents/reviewer-holistic.md`, `agents/reviewer-software-architecture.md`, `agents/reviewer-agent-skill.md`, `agents/editor.md`
Resolution: DIRECTLY_ACTIONABLE

**[I-5] Build pipeline does not validate agent definitions or declare them in plugin.json**
Agents are copied but not validated (no frontmatter checks). `plugin.json` has no `"agents"` field. The plan defers this to Phase 2 by design, so this is a known gap — not blocking, but worth tracking as a risk if Phase 2 slips.
Raised by: repo-tooling
File: `scripts/build-plugin.sh:31`
Resolution: DEFERRED_TO_PHASE_2

### MINOR

**[M-1] Plan-phase agent references `ContextBundle` abstraction that doesn't exist yet**
The inputs section mentions `ContextBundle.inline` and `ContextBundle.references` — an abstraction not part of this slice. For the PoC, simplify to concrete file paths that the Phase 3 orchestrator will actually pass.
Raised by: agent-skill, software-architecture
File: `agents/plan-phase.md:18`
Resolution: DIRECTLY_ACTIONABLE

**[M-2] `plan-format.md` is duplicated with no divergence guard**
`skills/_shared/references/plan-format.md` is byte-identical to `skills/create-plan/references/plan-format.md`. This is acknowledged as temporary. Consider adding a comment noting the relationship or a build-time check.
Raised by: repo-tooling
Resolution: DIRECTLY_ACTIONABLE

**[M-3] No documentation for the new `agents/` top-level directory**
No README, CLAUDE.md entry, or conventions doc mentions the new `agents/` directory. A brief line in CLAUDE.md or conventions would help discoverability.
Raised by: repo-tooling
Resolution: DIRECTLY_ACTIONABLE

**[M-4] Synthesis agent doesn't specify whether it should read the original artifact**
Instructions say "Read all reviewer outputs" but don't clarify whether the artifact itself is needed for deduplication. Make this explicit either way.
Raised by: agent-skill
File: `agents/synthesis.md:19`
Resolution: DIRECTLY_ACTIONABLE

**[M-5] Plan-phase agent includes PARTIAL status but PoC should use COMPLETE/ERROR only**
The plan says PARTIAL support is deferred, but the agent definition includes a full PARTIAL example. Keeping it is forward-looking and harmless — no fix required for PoC.
Raised by: generalist
Resolution: ACCEPTABLE

**[M-6] `model: opus` frontmatter semantics and override behavior are undocumented**
All agents include `model: opus` but the override mechanism (Phase 4's `--model` flag) isn't documented in agent-visible locations.
Raised by: software-architecture
Resolution: DEFERRED_TO_PHASE_4

**[M-7] Refinement coordinator hardcodes reviewer selection heuristics**
Inline descriptions may drift from shared reference files. Acceptable for PoC; later slice should consider dynamic reviewer metadata.
Raised by: software-architecture
Resolution: ACCEPTABLE_FOR_POC

## Contradictions Resolved

1. **repo-tooling says preamble should show populated `filesWritten`; generalist/software-architecture say agents should return content inline with empty `filesWritten`.** Resolution: the plan's design intent is read-only reviewers with orchestrator-managed output. Agents should return content inline, both preamble and agents show `filesWritten: []`. This aligns with 3 of 4 reviewers and the plan's stated architecture.

2. **agent-skill says add tool restrictions to agent definitions; generalist/software-architecture focus on the write-vs-read-only contradiction but don't explicitly request inline tool docs.** Resolution: both are valid — fix the write behavior (I-1) AND add tool restriction guidance (I-4). They are complementary.

## Summary

| Severity | Count | Actionable Now |
|----------|-------|----------------|
| Critical | 0 | — |
| Important | 5 (3 unique after dedup) | 3 (I-1, I-3, I-4) |
| Minor | 7 (4 actionable) | 4 (M-1, M-2, M-3, M-4) |

**Top 3 fixes for this iteration:**
1. **I-1**: Remove file-write instructions from reviewer agents; return review content inline via JSON; set `filesWritten: []` everywhere (also fixes I-2)
2. **I-3**: Rewrite architecture overview line 69 to describe `@` reference mechanism
3. **I-4**: Add one-liner tool restriction guidance to reviewer and editor agents
