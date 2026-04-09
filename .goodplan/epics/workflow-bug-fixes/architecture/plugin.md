# Plugin Architecture

The plugin layer is external to the CLI. Skills, agents, reviewers, rubrics, and hooks live in `plugin/` and interact with the CLI exclusively through shell commands. They never import `src/` directly.

## Directory Structure

```
plugin/
  skills/
    workflow-guide/SKILL.md    # always-on orientation
    status/SKILL.md            # query state + briefing
    init/SKILL.md              # project bootstrap
    upgrade/SKILL.md           # v1->v2 migration
    task/SKILL.md              # quick finding capture
    explore/SKILL.md           # research/brainstorm loop
    create-epic/SKILL.md       # P1+P3+P4+P5 pipeline
    start-epic/SKILL.md        # P6 activation
    plan-slice/SKILL.md        # P7+P8+P9 pipeline
    implement-slice/SKILL.md   # P10+P11 (renamed from implement)
    land-slice/SKILL.md        # P12 (new)
    create-side-quest/SKILL.md # S0+S1
    implement-side-quest/SKILL.md  # S2 (new)
    land-side-quest/SKILL.md       # S3 (new)
    audit/SKILL.md             # invariants + events audit
    _references/               # shared skill references
      cli-interaction.md       # CLI command patterns (rewrite)
      epic-conventions.md      # directory layout (rewrite)
      iteration-loop.md        # refinement via gp refine:* (rewrite)
      output-templates.md      # user-facing messages (update)
      plan-pipeline.md         # plan shape + R2 (rewrite)
      reviewer-registry.md     # routing + relevance (rewrite)
      explore-phase-pattern.md # exploration loop (update)
      decisions-format.md      # decision format (keep)
      expertise-tracking.md    # user expertise (keep)
      orchestrator-discipline.md   # R1 + steering (rewrite)
      orchestrator-error-handling.md  # error handling (keep)

  agents/
    # Phase agents
    explore-phase.md
    plan-phase.md
    architecture-phase.md
    slices-phase.md
    implement-phase.md
    onboard-phase.md
    pressure-test-phase.md     # new: P4 adversarial analysis
    verifier-phase.md          # new: chunk verification

    # Editor / synthesis
    editor.md
    synthesis.md

    # Completion agents
    completion-slice.md
    completion-epic.md
    completion-side-quest.md   # new

    # Audit agents
    audit-architecture-phase.md
    audit-docs-phase.md
    audit-tests-phase.md

    _references/
      review-preamble.md      # shared preamble (rewrite for structured output)
      plan-format.md           # plan doc format (rewrite for R2)
      maturity-conventions.md  # 4-level maturity (update)
      audit-conventions.md     # event-log audit (update)
      sub-agent-return-format.md  # typed payloads (rewrite)

  reviewers/                   # new top-level directory
    reviewer-holistic.md
    reviewer-invariant-checker.md      # new
    reviewer-context-transport.md      # new
    reviewer-software-architecture.md
    reviewer-plan.md                   # new
    reviewer-verification-plausibility.md  # new
    reviewer-goal.md                   # new
    reviewer-slice-set.md              # new
    reviewer-typescript.md
    reviewer-data-layer.md
    reviewer-tui-cli.md
    reviewer-agent-skill.md
    reviewer-api-contract.md
    reviewer-performance.md
    reviewer-reliability.md            # new
    reviewer-security.md               # new
    reviewer-domain-correctness.md     # new
    reviewer-test-meaningfulness.md    # new
    reviewer-code-style.md             # new
    reviewer-verification-spot-check.md  # new
    # ... remaining current reviewers carry forward

  rubrics/                     # new top-level directory
    holistic.yaml
    plan.yaml
    architecture.yaml
    goal.yaml
    slice-set.yaml
    code.yaml
    # ... per-artifact-type rubrics

  hooks/
    hooks.json                 # hook registration
    protect-state.sh           # blocks direct writes to integrity files
    warn-bash-state.sh         # warns on bash writes to .goodplan/
```

## Skill-CLI Interaction Model

Skills orchestrate workflows by calling CLI commands. They never read or write `.goodplan/` directly.

### Orchestrator Context Discipline

**Skills are orchestrators. They route file paths between sub-agents — never file contents.** This keeps the orchestrator's context window clean and prevents it from becoming a bottleneck as artifacts grow.

- **Orchestrator sees:** CLI command output (structured JSON), sub-agent return values (structured JSON with `filesWritten` paths), user Q&A responses
- **Orchestrator does NOT see:** architecture docs, plan content, review text, source code, research files
- **Sub-agents read files** themselves (via Read tool) and write results to files (via Write tool)
- **Handoff between sub-agents** is via file paths, not content: reviewer writes `round-N/reviews/holistic.md` → orchestrator passes that path to synthesis agent → synthesis writes `round-N/merged.md` → orchestrator passes that path to editor agent
- **Context bundles** from CLI commands contain inline content intended for sub-agents, not for the orchestrator. The orchestrator passes the bundle to the spawned agent.
- **File copying** (e.g., agent output to CLI-managed paths) uses shell `cp` via Bash tool — not Read+Write, which would pull content into orchestrator context

This discipline is enforced by `orchestrator-discipline.md` (skill reference) which prohibits the Read tool on artifact content files.

### Pattern

```
Skill receives user intent
  -> Calls gp commands to read state (gp status --json, gp epic:show)
  -> Determines current phase and valid actions
  -> For collaborative phases: engages user in design-tree interviewing
  -> For autonomous phases: checks steering preference
  -> Spawns agents with file paths (not content)
  -> Agents read files, do work, write results to files
  -> Agents return structured JSON with filesWritten paths
  -> Skill passes output paths to next agent (reviewer → synthesis → editor)
  -> Skill calls gp commands to commit artifacts (gp epic:goal-commit)
  -> CLI runs extractors, checks invariants, appends events
  -> Skill reads updated state, proceeds to next phase
```

### Phase Mode Awareness

Every skill must know its phase mode:

| Mode | Skill Behavior |
|---|---|
| Collaborative | Use design-tree interviewing. Wait for user input. Cannot proceed without user. |
| Autonomous | Check steering preference. Proceed or pause per preference. Respect R1 triggers. |
| Checkpoint | Present summary. Wait for explicit approval or auto-shape per steering. |
| Mixed | Follow substep-level mode rules (e.g., P12: substeps 1-3 autonomous, substep 4 user review). |

### R1 Pause Discipline

During autonomous phases, skills pause when: "If the user knew this, would they want to reconsider?"

**Pre-flight:** Before entering autonomy, the skill commits to what would make it pause.

**Five reactive triggers** (override steering preference — always pause):
1. `blocking-finding-captured` — blocking discovery
2. `assumption-invalidated` — key assumption proven wrong
3. `stuck` — >=2 rounds without progress
4. `unverifiable-chunk` — chunk cannot be verified
5. `non-convergence` — circuit breaker tripped

**On pause:** Emit `pause-entered` event, write briefing (`briefing-written` event, enforced by invariant).

## Agent Return Format

All agents must return structured JSON matching this envelope:

```typescript
// Generic over the SUCCESS payload type. Callers narrow by the agent type
// they invoked: AgentReturn<ReviewerPayload> for reviewers,
// AgentReturn<EditorPayload> for editors, etc.
//
// Discriminated union on `status` — each variant carries only its relevant fields.
// PARTIAL is split into two variants: continuation (agent needs another round)
// and needs-input (agent needs user/skill input to proceed).
type AgentReturn<P = unknown> =
  | {
      status: "SUCCESS";
      summary: string;
      filesWritten: string[];
      payload: P;
    }
  | {
      status: "PARTIAL_CONTINUATION";
      summary: string;
      filesWritten: string[];
      continuationFile: string;  // path to continuation state
    }
  | {
      status: "PARTIAL_NEEDS_INPUT";
      summary: string;
      filesWritten: string[];
      question: string;  // what the agent needs answered
    }
  | {
      status: "FAILED";
      summary: string;
      filesWritten: string[];
      reason: string;  // why it failed
    };
```

### Typed Payloads

```typescript
// Reviewer agents
interface ReviewerPayload {
  dimensions: Array<{
    name: string;
    score: number;
    threshold: number;
    passed: boolean;
  }>;
  findings: Array<{
    severity: "BLOCKING" | "CRITICAL" | "IMPORTANT" | "MINOR";
    description: string;
    location?: string;
  }>;
  rationale: string;
}

// Editor agents
interface EditorPayload {
  diffPaths: string[];
}

// Synthesis agents
interface SynthesisPayload {
  aggregatedPath: string;
  disagreements: string[];
}

// Completion agents
interface CompletionPayload {
  learnings: string[];
  architectureDelta?: string;       // path to delta proposal
  maturityTransitions?: Array<{ subsystem: string; from: string; to: string }>;
  sideQuestProposals?: string[];    // paths to proposed side quests
}
```

## v1-to-v2 Agent Return Migration

The v1 agent return format uses a flat bag of optional fields. v2 introduces typed payloads per agent type. This table maps v1 fields to their v2 equivalents:

| v1 Return Field | v2 Typed Payload | Notes |
|---|---|---|
| `score` + `review` | `ReviewerPayload.dimensions` + `findings` | Structured scoring replaces freeform review text |
| `triggeredConditions` | Optional field on all payload types | Folded into each payload as `triggeredConditions?: string[]` |
| `redGreenResults` | `ImplementPayload.chunkResults` | Per-chunk red/green/verify outcomes |
| `slices` | `SlicesPayload` | Slice set definition output |
| `onboardSummary` | `OnboardPayload` | Onboarding agent output |
| `recommendations` | `CompletionPayload.recommendations` | Epic/slice completion recommendations |

During migration (Layer 3), agent prompt rewrites adopt the new typed payloads. The `gp schema --agent-return` command exposes the full `AgentReturn<P>` schema for agent authors.

## Hook Protection Model

Hooks protect integrity files from direct LLM writes. Updated for v2:

### `protect-state.sh` (PreToolUse Edit/Write)

Blocks direct writes to integrity files. See [conventions.md](./conventions.md#integrity-files-hook-protected) for the canonical list of protected files and allowed exceptions.

### `warn-bash-state.sh` (PreToolUse Bash)

Warns via `additionalContext` when bash commands write under `.goodplan/`. Reads are silent.

### Migration Note

Update hooks in Layer 0 (immediately when `events.jsonl` is introduced) to protect the new integrity files. Do not defer to Layer 3.

## Cross-References

- Reviewer structured output format: [trust.md](./trust.md#structured-reviewer-output)
- CLI command tree: [commands.md](./commands.md)
- Refinement loop commands: [commands.md](./commands.md#refinement-commands-gp-refine)
