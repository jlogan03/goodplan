# Brainstorm: Orchestrator and Sub-Agent Patterns

## Core Principle

**If it doesn't need the LLM, it belongs in the CLI.** The CLI is testable, deterministic, and fast. The skill prompt is non-deterministic and hard to test. Anything that's pure mechanics (counting, tracking, validating, enforcing rules) should be in the CLI.

## Three-Bucket Responsibility Model

### 1. CLI — Deterministic Mechanics

- State transitions and validation
- Refinement loop management: round tracking, score history, trend detection, circuit breaker (hard stop after 10 rounds)
- Implementation phase management: phase tracking, iteration counting, escalation rule (surface to user after 5 iterations)
- Mode enforcement: if user said "plan only," CLI blocks transition to implementation
- Context bundling with progressive disclosure
- Score arithmetic (averages, per-reviewer history)
- Prerequisite validation before transitions
- Activity log, timestamps, bookkeeping

### 2. LLM (Orchestrator) — Routing + Judgment

- Selecting which reviewers to spawn (based on plan content and affected subsystems)
- Synthesizing reviewer feedback (nuanced severity assessment, not just score averaging)
- Deciding whether scores are "good enough" to pass (informed by CLI data but ultimately a judgment call)
- Handling unexpected issues (deciding what to surface to the user)
- All user-facing interaction (interviews, presenting options, collecting decisions)
- Calling `begin`/`complete` and interpreting the CLI's responses
- Spawning and coordinating sub-agents

### 3. LLM (Sub-Agents) — The Actual Work

- Writing plans, goals, architecture content
- Reviewing code, scoring, writing feedback
- Implementing code phase by phase
- Updating plans based on reviewer feedback
- Writing learnings and architecture update proposals

## Orchestrator Flow for `/build`

```
Orchestrator:
  1. goodplan status --json → structured state
  2. User picks target
  3. goodplan begin plan --slice 01-auth --json → transition info
  4. goodplan context plan --slice 01-auth --json → full working context
  5. Orchestrator interviews user directly
  6. Orchestrator writes the plan (can ask follow-ups during writing)
  7. goodplan complete plan --slice 01-auth (stdin: plan content + decisions)

  --- context may compact here; orchestrator re-reads state if needed ---

  8. goodplan begin refinement --slice 01-auth --json
     → { round: 1, reviewers: [...candidates...], threshold: 9, circuitBreaker: {...} }
     (CLI provides reviewer candidates; orchestrator selects which to actually spawn)

  9. Refinement loop (orchestrator manages):
     a. Orchestrator selects reviewers for this round
     b. Spawns reviewer sub-agents in parallel
        Each reviewer:
          - goodplan context refinement --slice 01-auth (gets plan + arch + conventions)
          - Reviews, scores, returns feedback to orchestrator
     c. Orchestrator synthesizes reviews (LLM judgment on severity + priority)
     d. goodplan complete refinement-round --slice 01-auth
        stdin: { scores: {...}, synthesis: "..." }
        → { status: "continue"|"passed"|"circuit-breaker", round: N, trend: "...", ... }
     e. If "continue":
        - Spawns plan-updater sub-agent with synthesized feedback
          Sub-agent: reads plan, applies feedback, writes updated plan via CLI
        - Loop back to (a)
     f. If "passed":
        - goodplan complete refinement --slice 01-auth (stdin: final scores + refined plan)
     g. If "circuit-breaker":
        - Present options to user (accept as-is, revise manually, abandon)

  --- context may compact here ---

  If plan-only mode → stop (CLI enforces this via begin returning an error)

  10. goodplan begin implementation --slice 01-auth --json
      → { phases: [...], currentPhase: 1, maxIterations: 5 }

  11. For each phase (orchestrator manages):
      a. goodplan begin implementation-phase --slice 01-auth --phase N
         → { phaseContext: {...}, iteration: 1, maxIterations: 5 }
      b. Spawns implementer sub-agent
         Sub-agent: reads context, implements, commits, returns summary
      c. Spawns reviewer sub-agent
         Sub-agent: reviews implementation, returns verdict + feedback
      d. goodplan complete implementation-phase-iteration --slice 01-auth --phase N
         stdin: { verdict: "pass"|"fail", feedback: "..." }
         → { status: "passed"|"continue"|"escalate", iteration: N, ... }
      e. If "continue": loop back to (b) with feedback
      f. If "escalate": surface to user
      g. If "passed": move to next phase

  12. goodplan complete implementation --slice 01-auth

  --- context may compact here ---

  13. goodplan context complete --slice 01-auth --json
  14. Orchestrator interacts with user:
      - Presents architecture update proposals
      - Reviews remaining slices
      - Curates learnings (marks rollup flag)
  15. goodplan complete slice --slice 01-auth
      stdin: { learnings: [...], archUpdateApprovals: [...] }
```

## Context Protection Strategy

The orchestrator's context is precious — it persists across the entire flow. Strategy:

- **Orchestrator never holds full plan or implementation content.** Sub-agents write results directly to the CLI. They return only brief summaries to the orchestrator.
- **CLI bundles context per phase.** Sub-agents call `goodplan context <phase>` to get what they need — the orchestrator doesn't relay content.
- **Natural compaction is OK.** After each major phase, the orchestrator can lose prior context because all state is in the filesystem. The skill prompt instructs: "If context has been compacted, call `goodplan status --json` to re-orient before proceeding."
- **The `/build` skill prompt loads the full workflow** so the orchestrator has a global view. Sub-agent prompts (reviewer criteria, implementer instructions) are in referenced files loaded only when spawning.

## The `begin`/`complete` Response Pattern

CLI responses are structured data, not natural language summaries:

```json
// goodplan begin refinement --slice 01-auth --json
{
  "status": "ok",
  "phase": "refinement",
  "target": { "type": "slice", "name": "01-auth" },
  "round": 1,
  "threshold": 9,
  "circuitBreaker": { "maxRounds": 10, "remaining": 10 },
  "previousScores": null
}

// goodplan complete refinement-round --slice 01-auth --json
// stdin: { "scores": { "architecture": 9, "holistic": 9, "testing": 8 } }
{
  "status": "continue",
  "round": 1,
  "scores": { "architecture": 9, "holistic": 9, "testing": 8 },
  "belowThreshold": ["testing"],
  "trend": "first-round",
  "nextAction": "begin refinement-round"
}
```

The orchestrator doesn't need to encode loop logic — it calls `begin`, does the work, calls `complete`, and acts on `status` and `nextAction`.

## `/create-epic` Follows the Same Pattern

```
Orchestrator:
  1. goodplan begin explore --epic goodplan-cli --json
  2. Orchestrator runs explore loop (interactive)
  3. goodplan complete explore (stdin: summary, artifact list)
  4. goodplan begin architecture --epic goodplan-cli --json
  5. Orchestrator interviews user on architecture
  6. Writes architecture files directly (LLM-managed)
  7. goodplan complete architecture
  8. goodplan begin refine-architecture --epic goodplan-cli --json
  9. Spawns reviewer sub-agents, manages loop (same pattern as refinement)
  10. goodplan complete refine-architecture
  11. goodplan begin slices --epic goodplan-cli --json
  12. Orchestrator interviews user on slice breakdown
  13. goodplan complete slices (stdin: slice definitions)
  14. goodplan begin refine-slices --epic goodplan-cli --json
  15. Review/refine loop
  16. goodplan complete refine-slices
```

## Open Questions

- Can skills programmatically trigger context compaction? If not, relying on natural compaction + re-read-from-CLI is the fallback.
- Should the CLI return a "suggested sub-agent prompt" in its `begin` responses? This would standardize how orchestrators spawn sub-agents and reduce skill prompt complexity.
- How does the orchestrator handle a sub-agent that fails or hangs? Timeout + retry? Surface to user?
