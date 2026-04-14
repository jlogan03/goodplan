# Delta: Current Codebase vs goodplan v2 Spec (08)

The concrete change plan. For each subsystem: what stays, what changes, what's new, what's retired, and migration notes.

**Source documents:**
- 01 (First Principles) — ideal flow, mechanisms
- 08 (Ideal Implementation) — the spec
- 09 (Walkthroughs) — end-to-end user journeys
- 10 (North Star) — target overview, risks
- Codebase inventory (research/2026-04-08_codebase-inventory_a7k2z.md) — current state

---

## 1. Behavioral Mechanisms & Collaboration Model

This section has no "current" counterpart — these mechanisms are either absent from the current system or implicit. They are first-class in v2 and affect every other subsystem.

### 1.1 Collaborative vs. Autonomous Phases

The spec introduces a foundational structural principle: **front-loaded collaboration, back-loaded autonomy**. Every phase is either collaborative (user must be present) or autonomous-with-checkpoint (LLM proceeds independently, pauses at defined checkpoints).

| Phase | Mode | Rationale |
|---|---|---|
| P1 Epic-capture | Collaborative | User's intent seeds the epic |
| P2 Explore | Collaborative | User's domain knowledge drives brainstorming; research portions autonomous |
| P3 Shape: architecture | Collaborative | User shapes subsystem boundaries, API decisions |
| P4 Shape: pressure-test | Autonomous | Mechanical adversarial analysis |
| P5 Shape: slice set | Autonomous with checkpoint | LLM proposes, user reviews at shape checkpoint |
| P6 Epic-activate | Checkpoint | User approval gate |
| P7 Slice-plan-draft | Collaborative | User and LLM build plan together |
| P8 Slice-plan-shape-checkpoint | Checkpoint | User approves plan before autonomous refinement |
| P9 Slice-plan-refine | Autonomous | Reviewers iterate mechanically |
| P10 Slice-implement | Autonomous | Red-green-verify per chunk |
| P11 Slice-code-refine | Autonomous | Code reviewers iterate |
| P12 Slice-land | Mixed | Substeps 1–3 autonomous, substep 4 user review |
| Between-slice review | Optional checkpoint | Steering-preference-gated |
| S0–S3 Side-quest | Compressed version of slice path | Same trust gates, lower ceremony |

**Key rule:** Collaborative phases (P2, P3, P7) cannot proceed without the user. If the user is away, they wait. Autonomous phases respect the steering preference. This distinction does not exist in the current system — all current skills proceed identically regardless of whether the user is present.

**Impact on skills:** Every skill must know its phase mode. Collaborative skills use design-tree interviewing and conversational patterns. Autonomous skills use the steering preference to decide when to pause vs. proceed.

### 1.2 Shape Checkpoints (Trust Handoff)

Shape checkpoints are the mechanism by which collaborative intent gets locked into an artifact that autonomous processes can then refine without losing the user's direction. They are the trust handoff between human judgment and mechanical refinement.

Three shape checkpoints exist in v2:

| Checkpoint | Gate | Events | Behavior |
|---|---|---|---|
| Architecture-shape (P3→P4) | User approves architecture-target before pressure test | `architecture-shape-checkpoint-reached`, `architecture-shape-approved` OR `-auto-shaped` | Refinement refuses to start without approval |
| Slice-shape (P5) | User approves slice definitions before activation | `slice-shape-checkpoint-reached`, `slice-shape-approved` OR `-auto-shaped` | Epic activation blocked without approval |
| Plan-shape (P8) | User approves plan before refinement | `plan-shape-checkpoint-reached`, `plan-shape-approved` OR `-auto-shaped` | Plan refinement refuses to start without approval |

The `auto-shaped` variant fires when the steering preference allows (best-guess-and-flag). The user is flagged for return review but the autonomous phase proceeds.

**Post-refinement optional checkpoints:** After architecture refinement (P4) and between slices (after P12), the user may optionally review. These respect steering preference and are not blocking gates.

**Current state:** No shape checkpoints exist. Skills move directly from draft to refinement. This is a fundamental behavioral addition.

### 1.3 Steering Preferences

Per-epic steering preference governs how autonomous phases handle checkpoints:

| Preference | Behavior at checkpoints |
|---|---|
| `always-consult` | Always pause and wait for user |
| `best-guess-and-flag` | Proceed with best guess, flag for return review |
| `ask-in-the-moment` | LLM decides per-checkpoint whether to pause or proceed |

Set via `gp epic:set-steering` (epic-scoped) or `gp project:set-steering` (default). Emits `epic-steering-preference-set` or `steering-preference-set` events.

**Current state:** No steering preference system exists.

### 1.4 R1 Pause Discipline

During autonomous work, the LLM pauses for exactly one reason: **"If the user knew this, would they want to reconsider?"** This is R1.

**Four moments when R1 fires:**
1. Pre-flight (before entering an autonomy window) — LLM commits to what would make it pause
2. Mid-flight reactive — discovery changes the deal
3. Scheduled checkpoint — phase boundary
4. End-of-autonomy — session ending, work incomplete

**Five reactive triggers:** blocking-finding-captured, assumption-invalidated, stuck (≥2 rounds without progress), unverifiable-chunk, non-convergence.

**Key invariant:** Reactive triggers ignore steering preference — if the discovery is deal-changing, pause regardless of `best-guess-and-flag`.

**On pause, the LLM must:**
1. Reconstruct the context the user doesn't have (not a puzzle — a briefing)
2. Emit `pause-entered` event
3. Write a briefing immediately (`briefing-written` event — invariant `briefing.written-at-pause`)

**Current state:** No formal pause discipline. Skills pause ad-hoc when they hit errors. No pre-flight, no structured triggers, no briefing-on-pause invariant.

### 1.5 R2 Build-Only-What-You-Can-Check

Every implementation chunk must have a verification method declared at plan time. Three options:
- `live` — execute and observe (the standard)
- `supplementary-tests` — when live observation is impractical, verified through test execution
- `impossible-with-reason` — surfaced to user as a real decision (redesign, accept approximation, or schedule human verification)

Invariant `slice.plan-chunks-decidable` enforces this: every chunk has a `verificationType` before implementation starts. Invariant `chunk.evidence-non-empty` enforces that verified events carry concrete observation.

**Current state:** Plans contain verification methods as prose but enforcement is ad-hoc. No invariant gates. No `impossible` path with user decision.

### 1.6 Refinement Loop

Every artifact boundary runs a refinement loop: dispatch specialized reviewers in parallel → synthesize scores → evaluate convergence → if not converged, edit and re-review → repeat until bar met or circuit breaker trips.

**Convergence is mechanical:** all dimensions above threshold, zero BLOCKING/CRITICAL findings. Not "does it feel done?" — the CLI computes convergence from rubric scores. **Relevance weighting** gates this: high-relevance reviewers below threshold = BLOCKING (convergence impossible); medium-relevance = CRITICAL blocks, IMPORTANT warns; low-relevance = warnings only (never blocks convergence).

**Convergence evaluator** is a new pure function in the CLI: reads `reviewer-scored` events + rubric YAML → returns CONVERGED / CONTINUE / CIRCUIT-BROKEN. Three circuit-breaker triggers: `stuck-finding` (same finding persists across rounds), `reviewer-disagreement` (reviewers contradict), `round-budget-exceeded`.

**`convergence-overridden`** escape hatch via `gp refine:override --force-override-with-reason="..."`. Emits event recording the override and reason. Never silent.

**Current state:** Refinement exists but convergence is computed by skills using simple score thresholds in transition handlers. No dedicated convergence evaluator, no circuit breaker, no override mechanism.

### 1.7 Pressure Test

Adversarial design review before code is written (P4). Five failure-mode classes: `failure-mode`, `scaling-cliff`, `optionality-loss`, `locked-in-assumption`, `error-class`. Each finding must be explicitly dispositioned (accept-with-justification or address) via `gp epic:pressure-test-finding-disposition`. Accepted findings promote into the spine as known constraints.

Invariant `pressure-test.findings-all-accepted-before-slice-set` blocks slicing until all findings are resolved.

**Current state:** No pressure test phase exists.

### 1.8 Architecture Split: Current vs. Target

**Fundamental conceptual change.** The current system has ONE architecture document (a directory at `.goodplan/architecture/`). v2 splits this into TWO documents with different semantics:

- **`architecture-current.md`** (at `.goodplan/` root) — what the codebase **IS**. Updated at every slice-land (P12) via the honest-intermediate-state rule. This is spine — always accurate, never aspirational.
- **`architecture-target.md`** (inside each epic directory) — what the codebase is **BECOMING**. Drafted during P3, refined through P4 (pressure test), committed before slicing. This is aspirational — the goal the epic is working toward.

**Propagation:**
- **Context bundles:** Which document gets inlined depends on the phase. P10 (implementation) gets architecture-current inline (the honest baseline); P3 (architecture design) gets both.
- **Spine updates:** Only `architecture-current.md` follows the honest-intermediate-state rule. `architecture-target.md` is frozen after P5.
- **Reconciliation:** At epic completion (final P12), `architecture-target.md` is reconciled into `architecture-current.md`. Gaps between target and achieved reality are surfaced as findings or side-quest proposals.
- **Multi-person:** When person A merges their epic, `architecture-current.md` changes; person B rebases and the changes flow in. Each change is small (per-slice) and well-documented.

**Current state:** Single architecture directory. No current/target distinction. No reconciliation step.

### 1.9 Context Spine & Honest-Intermediate-State Rule

The spine (`architecture-current.md`, `conventions.md`, `invariants.md`) reflects what the codebase **is**, not what it aspires to be. At every slice-land (P12), the spine is updated to reflect the honest post-slice reality. "Mid-rename is mid-rename — no pretending."

This is the **honest-intermediate-state rule** from 01. The spine is the shared context for all future work; if it's aspirational rather than accurate, every subsequent phase starts with wrong context.

**Current state:** Architecture docs exist but are not systematically updated at slice boundaries. No explicit honesty rule.

### 1.10 Discovery Ledger & Findings

Work discovered mid-epic is captured cheaply (5 seconds) via `gp finding:capture` and triaged at milestones. Classification matrix: blocking/non-blocking × in-scope/out-of-scope. Five reshape options for blocking+in-scope: expand current slice, insert slice before/after, reshape epic, promote to own epic.

Findings older than 3 epics without promotion or reference are surfaced for culling.

**Current state:** No formal discovery ledger. Findings are captured as ad-hoc notes or deferred items on slices.

### 1.11 Briefings

Written at every pause point (invariant `briefing.written-at-pause`). Contains: time context, current position (phase/slice/chunk), last action, where stopped, next action, attention items, deep links.

When the user returns, `/gp:status` reads the latest briefing so orientation is retrieval, not reconstruction.

**Current state:** No briefings. Orientation depends on `gp status` output, which has no pause-point context.

### 1.12 Slice-Land Substeps (P12)

Four mandatory substeps the workflow refuses to skip:
1. **Promote the Context Spine** — architecture-current.md, conventions.md, invariants.md updated to reflect post-slice reality (honest-intermediate-state rule)
2. **Triage the Discovery Ledger** — promote, merge, or cull findings. Allowed to be empty-handed; not allowed to be skipped.
3. **Capture learnings** — what was learned during Build (distinct from findings: learning = "we now know X"; finding = "this thing exists and we should act on it")
4. **Review with the user** — recap, surface target edits, triage proposed follow-ups

If this is the final slice, P12 auto-triggers epic completion: cross-slice synthesis, architecture reconciliation (target→current), maturity transitions, side-quest proposals.

**Current state:** `complete` skill handles some of these but they're not enforced as a mandatory sequence.

### 1.13 Design-Tree Interviewing

Used in collaborative phases (P1, P2, P3, P7). The LLM generates an alternative tree and explicitly acknowledges its limitations: *"Here's the design tree as I see it. Are there branches or alternatives I missed?"* The user becomes co-author.

Not every space is tree-shaped. When the LLM recognizes a graph, matrix, or flat structure, it adapts. The principle is systematic exploration; the tree is one structure.

**Current state:** No formal design-tree interviewing. Skills use open-ended questions.

### 1.14 Maturity as Universal Rigor Dial

Four levels (experimental → stabilizing → stable → foundational). Four uses:
1. **Pressure Test depth** — foundational subsystems get deeper adversarial analysis
2. **Refinement Loop strictness** — higher maturity = stricter thresholds
3. **R1 sensitivity** — foundational subsystems have multiplied R1 sensitivity
4. **Triggered Reshape thresholds** — more justification needed to reshape foundational subsystems

Each subsystem carries a `dependentCount` as falsifiability check: "experimental" with twelve dependents is lying.

**Current state:** Maturity exists in conventions but isn't used to calibrate rigor. No dependent count tracking.

### 1.15 Subsystem Registry

**New first-class system** with no current counterpart. Currently, subsystems are implicit mentions in architecture docs. In v2, they become a formal registry with per-subsystem `.md` files at `.goodplan/subsystems/<slug>.md`.

Each subsystem carries:
- `id` (slug), `name`, `description`
- `maturity` (experimental/stabilizing/stable/foundational)
- `dependentCount` — falsifiability check on maturity claims
- `owns` — what files/modules this subsystem owns
- `dependsOn` — other subsystems this depends on

**Impact on other systems:**
- **Reviewer routing** uses affected subsystems to select subsystem-specific reviewers
- **Pressure test** depth calibrated by maturity of affected subsystems
- **Refinement rigor** set to max(maturity) of affected subsystems
- **R1 sensitivity** multiplied for foundational subsystems
- **`gp init`** / `onboard-phase` registers subsystems at project bootstrap
- **`gp subsystem:*`** CLI commands (register, update-maturity, retire, list, show)
- **Events:** `subsystem-registered`, `subsystem-maturity-updated`, `subsystem-retired`

---

## 2. Phases

The spec defines 16 phases across two scopes: epic (P0–P12) and side-quest (S0–S3). The current system has no formal phase model — skills orchestrate transitions ad-hoc using state machine status enums.

### 2.1 Phase Catalog

| # | Phase | Scope | Owning skill | Trust gate | Entry conditions | Exit conditions |
|---|---|---|---|---|---|---|
| P0 | Project-init | project | `gp:init` | User review (no refinement at bootstrap) | Git repo, no `.goodplan/events.jsonl` | `project-initialized` event |
| P1 | Epic-capture | epic | `gp:create-epic` | Goal artifact refinement (light) | `project-initialized`, no active epic on branch | `epic-goal-committed`, `epic-steering-preference-set` |
| P2 | Explore | epic | `gp:explore` | Per-artifact light refinement | `epic-goal-committed` | User signals done OR no open high-value branches |
| P3 | Shape: architecture | epic | `gp:create-epic` | Architecture-target refinement (rigor = max maturity of affected subsystems) | `epic-goal-committed`, exploration artifacts available | `architecture-target` converged |
| P4 | Shape: pressure-test | epic | `gp:create-epic` | Pressure-test-report refinement (light) | `architecture-target-committed` | `pressure-test-committed`, all findings accepted |
| P5 | Shape: slice set | epic | `gp:create-epic` | Slice-set refinement | `pressure-test-committed` | `slice-set-committed`, all slices have committed goals |
| P6 | Epic-activate | epic | `gp:start-epic` | User approval | `slice-set-committed` | `epic-activated` |
| P7 | Slice-plan-draft | slice | `gp:plan-slice` | — (produces draft) | `epic-activated`, slice dependencies landed | `slice-plan-drafted` |
| P8 | Slice-plan-shape-checkpoint | slice | `gp:plan-slice` | User `shape-approved` event | `slice-plan-drafted` | `plan-shape-approved` OR `plan-shape-checkpoint-auto-shaped` |
| P9 | Slice-plan-refine | slice | `gp:plan-slice` | Plan artifact refinement (BLOCKING verification-plausibility) | `plan-shape-approved` or auto-shaped | `slice-plan-committed` |
| P10 | Slice-implement | slice | `gp:implement-slice` | Per-chunk `chunk-verified` or `chunk-unverifiable-decided` | `slice-plan-committed`, all chunks decidable | All chunks decided |
| P11 | Slice-code-refine | slice | `gp:implement-slice` | Code refinement convergence | All chunks decided | `code-refinement-converged` |
| P12 | Slice-land | slice | `gp:land-slice` | Spine deltas refined; findings triaged; if final: epic completion | `code-refinement-converged` | `slice-landed` (or `epic-completed` if final) |
| S0 | Side-quest-capture | side-quest | `gp:create-side-quest` | Goal refined (light) | No active side-quest on branch | `side-quest-goal-committed` |
| S1 | Side-quest-explore-plan | side-quest | `gp:create-side-quest` | Plan refinement | `side-quest-goal-committed` | `side-quest-plan-committed` |
| S2 | Side-quest-implement | side-quest | `gp:implement-side-quest` | Per-chunk verification | `side-quest-plan-committed` | All chunks decided |
| S3 | Side-quest-land | side-quest | `gp:land-side-quest` | Light refinement | Chunks decided, code refined | `side-quest-landed` |

**Phases that are NEW (no current counterpart):** P4 (pressure-test), P8 (plan-shape-checkpoint), P11 (code-refine), P12 as a distinct phase (slice-land), S2 (side-quest-implement), S3 (side-quest-land). Shape checkpoints at P3→P4 and P5 are also new behavioral gates.

**Current phases that map but change significantly:** P3 (now produces architecture-target, not just architecture docs), P10 (now chunk-level granularity with red-green-verify events).

### 2.2 Phase Events by Phase

See section 3.2 (Event Catalog) for the full event type inventory, organized by phase.

---

## 3. Trust Substrate: Events, Invariants, Extractors

### 3.1 Event Engine

**What's retired:**
- `src/core/state/types.ts`, `reduce.ts`, `transitions/*.ts` (23 files) — entire state machine
- `src/schemas/state-events.ts` in its current form — near-complete rewrite, not modification. Current `StateEvent` union has ~30 event types using `SCREAMING_CASE` names with flat payloads (e.g., `{ type: "BEGIN_EXPLORE"; epic: string; ts: string }`). The target has ~80 event types using `kebab-case` names, each wrapped in `EventEnvelope` with `id`, `scope`, `scopeRef`, `actor`, `branch`, `commitHint`, `prevId`, and typed `payload` with `ContentRef` references. Almost nothing carries over structurally.
- Entity JSON files (`epic.json`, `slice.json`, `quest.json`, `project.json`, `overview.json`) — entities no longer stored as JSON files. Entity state is derived from the event log. There is no epic JSON file in v2 — there's an event log from which you derive the epic's current phase, goal, verifications, etc.
- `.state-cache.json`, `activity-log.jsonl`, `decisions.jsonl`, `learnings.jsonl` — all replaced by event logs

**What's new:**
- **Event log engine.** Append-only JSONL writer + reader per scope (project, epic, side-quest). One JSONL file per scope at `.goodplan/events.jsonl`, `.goodplan/epics/<dir>/events.jsonl`, `.goodplan/side-quests/<dir>/events.jsonl`.
- **Event envelope** — all 10 fields: `id` (UUID v4), `ts` (ISO-8601 UTC ms), `scope` ("project"|"epic"|"side-quest"), `scopeRef` (slug, null for project), `actor` (`{ kind: "user"|"cli"|"skill"|"agent"; id: string }`), `branch` (current git branch), `commitHint` (HEAD SHA or null), `type` (kebab-case), `payload` (type-specific, Zod-validated), `prevId` (UUID of previous event in scope).
- **ContentRef type** — `{ sha: string (40-char), size: number, path: string, mediaType: string }`. Stored as git blobs via `git hash-object -w`.
- **Invariant engine** — see section 3.3.
- **Derived state computer** — streams JSONL, computes current phase per scope, valid transitions, blockers, suggested next steps. Replaces the reducer entirely.
- **Milestone system** — `gp milestone:commit` stages spine + events.jsonl, emits `milestone-committed`. Phase-completing commands trigger milestones.

### 3.2 Event Catalog (~80 event types)

**Entity lifecycle (~42):**
- Project: `project-initialized`
- Epic: `epic-created`, `epic-goal-drafted`, `epic-goal-committed`, `epic-steering-preference-set`, `epic-activated`, `epic-paused`, `epic-resumed`, `epic-completed`, `epic-abandoned`, `epic-synthesis-drafted`, `epic-synthesis-committed`
- Side-quest: `side-quest-created`, `side-quest-goal-committed`, `side-quest-plan-drafted`, `side-quest-plan-shape-approved`, `side-quest-plan-committed`, `side-quest-landed`, `side-quest-abandoned`
- Slice set: `slice-set-drafted`, `slice-set-committed`, `slice-shape-checkpoint-reached`, `slice-shape-approved`, `slice-shape-checkpoint-auto-shaped`
- Slice: `slice-created`, `slice-plan-drafted`, `slice-plan-committed`, `slice-implementation-started`, `slice-implementation-chunk-started`
- Chunk: `chunk-red-test-written`, `chunk-red-test-failed`, `chunk-green-achieved`, `chunk-verified`, `chunk-unverifiable`, `chunk-unverifiable-decided`, `chunk-impossibility-accepted`, `chunk-verification-demoted`
- Code refinement: `slice-code-refinement-started`, `code-refinement-round-started`, `code-revised`, `code-refinement-converged`
- Landing: `slice-landed`, `slice-abandoned`

**Spine updates (9+):**
- `architecture-committed`, `architecture-target-drafted`, `architecture-target-committed`, `architecture-current-reconciled`
- `architecture-shape-checkpoint-reached`, `architecture-shape-approved`, `architecture-shape-checkpoint-auto-shaped`
- `conventions-committed`, `invariants-committed`
- `subsystem-registered`, `subsystem-maturity-updated`, `subsystem-retired`

**Findings (2):** `finding-captured`, `finding-triaged`. Discovery matrix: blocking/non-blocking × in-scope/out-of-scope; 5 reshape options for blocking+in-scope.

**Exploration (5+):** `exploration-cycle-started`, `exploration-cycle-completed`, `research-captured`, `brainstorm-captured`, `prototype-captured`, `exploration-concluded`

**Refinement (7+):** `artifact-drafted`, `artifact-revised`, `refinement-round-started`, `refinement-round-completed`, `reviewer-scored`, `refinement-synthesized`, `refinement-converged`, `refinement-circuit-breaker-tripped`, `convergence-overridden`

**Pressure test (4):** `pressure-test-drafted`, `pressure-test-committed`, `pressure-test-finding-proposed`, `pressure-test-finding-accepted`

**Briefings (1):** `briefing-written`. Triggers: r1, pre-flight, end-of-autonomy, non-convergence, unverifiable-chunk, shape-checkpoint, session-pause.

**Decisions & learnings (3):** `decision-recorded` (with supersedes chain), `learning-captured`, `learning-promoted`

**Pauses & steering (3+):** `pre-flight-emitted`, `pause-entered`, `pause-resolved`, `steering-preference-set`

**Reshape (3):** `reshape-proposed`, `reshape-approved`, `reshape-applied`

**Invariant lifecycle (3):** `invariant-proposed`, `invariant-activated`, `invariant-deactivated`

**Plan-shape checkpoint (3):** `plan-shape-checkpoint-reached`, `plan-shape-revision-proposed`, `plan-shape-approved` / `plan-shape-checkpoint-auto-shaped`

**Milestone (1):** `milestone-committed`

### 3.3 Invariants (~23 core)

**Rule types:** `unique`, `count_limit`, `required`, `foreign_key`, `all_match`, `precondition`, `custom`

| ID | Type | What it enforces |
|---|---|---|
| `project.exists` | precondition | `project-initialized` before other events |
| `epic.single-active-per-branch` | count_limit | ≤1 active epic per branch |
| `epic.dir.unique` | unique | No dir collisions across history |
| `epic.goal.committed-before-explore` | precondition | Goal committed before exploration |
| `epic.architecture-target-required-before-slice-set` | precondition | Architecture target committed before slicing |
| `epic.pressure-test-required-before-slice-set` | precondition | Pressure test committed before slicing |
| `epic.architecture-shape-approval-required` | precondition | Architecture shaped before pressure test |
| `epic.slice-shape-approval-required` | precondition | Slices shaped before refinement |
| `epic.all-slices-landed-before-complete` | all_match | All slices landed/abandoned before epic completes |
| `slice.single-active-per-branch` | count_limit | ≤1 slice in P10–P11 per branch |
| `slice.plan-shape-approval-required` | precondition | Plan shaped before refinement |
| `slice.plan-converged-before-implement` | precondition | Converged plan before implementation |
| `slice.plan-chunks-decidable` | all_match | Every chunk has verificationType ∈ {live, supplementary-tests, impossible-with-reason} |
| `slice.chunks-all-decided-before-code-refine` | all_match | All chunks decided before code refinement |
| `slice.code-refinement-converged-before-land` | precondition | Code refinement converged before landing |
| `slice.deps-landed-before-start` | precondition | Dependencies landed before starting |
| `side-quest.single-active-per-branch` | count_limit | ≤1 active side quest per branch |
| `chunk.evidence-non-empty` | required | Verified events carry concrete observation |
| `chunk.red-test-failed-before-green` | precondition | TDD ordering: red before green |
| `refinement.bar-matches-rubric` | custom | Convergence computed against known rubric |
| `spine.write-only-via-milestone` | custom | Spine changes bundled into milestones |
| `event.prev-id-chain` | custom | prevId matches previous event in scope |
| `pressure-test.findings-all-accepted-before-slice-set` | all_match | Every finding accepted/dismissed before slicing |
| `briefing.written-at-pause` | precondition | Every pause immediately followed by briefing |

**Extensible invariants** — defined in `.goodplan/invariants.md` trailing YAML block. Versioned via `invariant-activated`/`invariant-deactivated` events for replay fidelity.

### 3.4 Extractor Framework

Extractors are **new CLI subsystem** with no current analog. They are pure functions that run in the CLI (not the LLM) at commit time after refinement converges. The CLI reads the artifact, parses embedded structured sections, and produces a structured payload for the event.

**Implementation approach: embedded structured sections.** Artifacts are markdown-first (preserving "artifacts are context transport"), but each artifact template includes structured data in YAML frontmatter (via `gray-matter`) and/or fenced `yaml extract` code blocks. The extractor parses these known-format sections — not arbitrary prose. This avoids both the fragility of parsing LLM-produced prose and the cost/failure-mode of an LLM-as-extractor call.

**Libraries:** `gray-matter` (~3KB, frontmatter), `remark` + `remark-gfm` + `remark-frontmatter` (~15KB, AST), `unist-util-select` (~5KB, AST queries), `yaml` (~13KB, fenced block parsing). Total ~35KB, all Bun-compatible.

**Error handling:** If a fenced block is malformed (missing closing fence, bad YAML), the CLI detects it and returns a structured error (`SCHEMA_INVALID`). The calling skill can ask the agent to fix the block — cheap retry, no re-extraction needed.

**Ten extractor types:**

| Extractor | Input | Key output fields |
|---|---|---|
| `ArchitectureExtract` | architecture-current.md | Subsystems (id, maturity, owns, dependsOn), communication patterns, invariants proposed |
| `ArchitectureTargetExtract` | architecture-target.md | Same as above, for target state |
| `PlanExtract` | plan.md | Chunks (id, description, expectation, redTest, verificationMethod, type), chunk dependencies, affected subsystems, rollback path |
| `SliceGoalExtract` | slice goal.md | Description, acceptance criteria, affected subsystems, dependencies, scope exclusions |
| `EpicGoalExtract` | epic goal.md | Description, scope, non-goals, success criteria, initial subsystems |
| `SideQuestGoalExtract` | side-quest goal.md | Description, scope, verification method, parent epic |
| `BriefingExtract` | briefing.md | Time context, current position, last action, where stopped, next action, attention items, deep links |
| `PressureTestExtract` | pressure-test.md | Failure modes, scaling cliffs, optionality ledger, error classes, locked-in assumptions, findings |
| `FindingExtract` | finding.md | Classification (blocking/non-blocking, in-scope/out-of-scope), reshape option, related subsystems |
| `SubsystemExtract` | subsystem .md | Id, name, maturity, description, owns, dependsOn, dependentCount |

### 3.5 Convergence Evaluator

**New CLI subsystem** — a pure function that reads `reviewer-scored` events + rubric YAML and determines convergence state. Invoked via `gp refine:evaluate` (read-only — does not emit events).

Returns: `CONVERGED` | `CONTINUE` | `CIRCUIT-BROKEN { reason }`

Three circuit-breaker triggers:
- `stuck-finding` — same finding persists across 2+ rounds
- `reviewer-disagreement` — reviewers produce contradictory scores on same dimension
- `round-budget-exceeded` — max rounds reached (configurable per artifact type)

**Current state:** Convergence is computed by skills using simple threshold checks in transition handlers. No dedicated evaluator, no circuit breaker.

---

## 4. CLI (`src/`)

### 4.1 Global Flags

**New/changed flags:**
- `--json` — stays
- `--query <jq>` — stays
- `--quiet` — stays
- `--verbose` — stays
- `--force` — stays. **Important:** bypasses interactive prompts, **never** bypasses invariants.
- `--force-override-with-reason=<text>` — **new**. Used on specific commands (e.g., `gp refine:override`). Emits `convergence-overridden` event with reason. Never silent.

### 4.2 Error Codes (new)

The spec (S6.13) defines a structured error output contract. All CLI errors emit JSON to stderr with a code field. This is entirely new — the current CLI uses unstructured error messages.

| Code | When |
|---|---|
| `INVARIANT_FAILED` | Invariant check blocks event append |
| `SCHEMA_INVALID` | Input fails Zod validation |
| `NOT_FOUND` | Referenced entity/artifact doesn't exist |
| `ALREADY_EXISTS` | Uniqueness constraint violated |
| `STATE_CONFLICT` | Operation invalid for current derived state |
| `EVIDENCE_MISSING` | Required evidence (verification, review score) absent |
| `HOOK_BLOCKED` | Pre-tool-use hook rejected the operation |
| `ROUTING_NO_REVIEWERS` | Routing function found no applicable reviewers |
| `CONVERGENCE_STUCK` | Circuit breaker tripped during refinement |
| `USER_ABORTED` | User cancelled interactive prompt |
| `INTERNAL` | Unexpected error (bug) |

### 4.3 Command Tree — Current → Target Mapping

**Important caveat on "Stays" labels:** Commands marked "Stays" below retain their CLI surface (flags, output shape) but every command's internals must be rewritten. The current data layer (`loadState()`, `ProjectState` tree, mutable JSON entities) is retired entirely. Every command that currently calls `loadProject()` or reads entity JSON files — which is nearly all of them — will need new internals that read from the event-log-derived state computer. "Stays" means the user-facing contract is unchanged, not that the implementation carries forward.

| Current command | Target command | Notes |
|---|---|---|
| `gp init` | `gp init` | Emits new events (`project-initialized`, `architecture-committed`, `conventions-committed`, `subsystem-registered`) |
| `gp status` | `gp status` | Output adds `suggestedNextSteps`, computed from event log |
| `gp state` | `gp state [--scope=...]` | **Stays** (spec S6.1). Dumps full derived state per scope. |
| `gp schema` | `gp schema` | Stays |
| `gp migrate` | `gp migrate` | New v1→v2 migration |
| `gp verify` | **Retired** | HMAC dropped; hooks enforce integrity |
| `gp epic:create` | `gp epic:create` | Emits `epic-created` |
| — | `gp epic:goal-draft` | **New** — drafts epic goal artifact |
| — | `gp epic:goal-commit` | **New** — commits goal after refinement |
| — | `gp epic:set-steering` | **New** — sets per-epic steering preference |
| `gp epic:show` | `gp epic:show` | Stays |
| `gp epic:list` | `gp epic:list` | Stays |
| `gp epic:explore` | **Removed from CLI** | Exploration managed by `gp:explore` skill calling `gp phase:start explore` |
| `gp epic:define-architecture` | `gp epic:architecture-draft` | Rename |
| — | `gp epic:architecture-commit` | **New** — commits architecture-target after refinement |
| `gp epic:refine-architecture` | `gp refine:start` | Merged into artifact-agnostic refinement |
| `gp epic:define-slices` | `gp epic:slices-draft` | Rename |
| — | `gp epic:slices-commit` | **New** — commits slice set after refinement |
| `gp epic:refine-slices` | `gp refine:start` | Merged into artifact-agnostic refinement |
| `gp epic:activate` | `gp epic:activate` | Stays |
| — | `gp epic:pause` | **New** — pauses active epic |
| — | `gp epic:resume` | **New** — resumes paused epic |
| `gp epic:complete` | `gp epic:complete` | Stays, auto-triggered by final slice-land |
| `gp epic:abandon` | `gp epic:abandon` | Stays |
| `gp epic:add-verification` | **Retired** | Verifications become events |
| `gp epic:update-verification` | **Retired** | Same |
| `gp slice:create` | `gp slice:create` | Stays (called by slices-draft) |
| `gp slice:list` | `gp slice:list` | Stays |
| `gp slice:show` | `gp slice:show` | Stays |
| `gp slice:plan` | `gp slice:plan-draft` | Rename |
| — | `gp slice:plan-commit` | **New** — commits plan after refinement |
| `gp slice:refine-plan` | `gp refine:start` | Merged into artifact-agnostic refinement |
| `gp slice:implement` | `gp slice:implement-start` | Rename, narrower scope (P10 only) |
| `gp slice:complete` | `gp slice:land` | Rename, expanded scope (P12) |
| `gp slice:abandon` | `gp slice:abandon` | Stays |
| `gp quest:*` (9 commands) | `gp side-quest:*` | Namespace rename + new commands. Full set: `create`, `list`, `show`, `goal-commit` (new), `plan-draft` (new), `plan-shape-approve` (new), `plan-commit` (new), `implement-start` (new), `land` (new), `abandon` |
| `gp task:*` (5 commands) | `gp finding:capture` with `kind: "task"` | **Semantic change** — tasks become a kind of finding. `gp task:create` maps to `gp finding:capture --kind=task`. Task-specific commands (drop, convert) retire; findings have their own triage lifecycle. |
| `gp decision:create` | `gp decision:record` | Rename |
| `gp decision:list` | `gp decision:list` | Stays |
| `gp decision:show` | `gp decision:show` | Stays |
| `gp decision:update` | **Retired** | Replaced by `decision:supersede` |
| — | `gp decision:supersede` | **New** — supersedes with chain reference |
| `gp learning:list` | `gp learning:list` | Stays |
| `gp learning:rollup` | `gp learning:promote` | Rename |
| — | `gp learning:capture` | **New** — creates learning with category, summary, tags, subsystems, validUntil, filePath |
| bare `start-*`/`submit-*` (16) | `gp phase:{start\|submit\|transition}` | Namespace under `phase:`. Phase names as parameters. Valid names: explore, architecture, pressure-test, slices, plan, plan-shape, refinement, implementation, code-refinement, slice-land (+ side-quest equivalents). |

**New command families:**

| Family | Commands | Purpose |
|---|---|---|
| `gp refine:*` (8) | start, score, synthesize, revise, evaluate, converge, stuck, override | Artifact-agnostic refinement loop |
| `gp phase:*` (3) | start, submit, transition | Generic phase boundaries |
| `gp epic:pressure-test-*` (3) | draft, commit, finding-disposition | Pressure test phase (P4) |
| `gp epic:architecture-shape-*` (3) | start, approve, auto | Architecture shape checkpoint |
| `gp epic:slice-set-shape-*` (3) | start, approve, auto | Slice shape checkpoint |
| `gp slice:plan-shape-*` (4) | start, revise, approve, auto | Plan shape checkpoint (P8) |
| `gp slice:chunk-*` (7) | start, red-written, red-failed, green, verify, unverifiable, decide | Chunk lifecycle |
| `gp slice:code-refine-*` (2) | start, commit | Code refinement (P11) |
| `gp reviewer:*` (2) | list, show | Reviewer registry queries |
| `gp rubric:*` (3) | list, show, validate | Rubric queries |
| `gp finding:*` (3) | capture, list, triage | Discovery ledger |
| `gp briefing:*` (2) | write, latest | Briefing management |
| `gp subsystem:*` (5) | register, update-maturity, retire, list, show | Subsystem registry |
| `gp invariant:*` (5) | list, propose, activate, deactivate, check | Invariant management |
| `gp milestone:commit` (1) | — | Milestone commits |
| `gp project:*` (2) | show, set-steering | Project-level config |
| `gp events:*` (2) | tail, query | Event log queries |
| `gp context:bundle` (1) | `--phase=<p> --scope=<ref>` | Assembles per-phase context bundle |

### 4.4 Data Layer (`src/core/data/`)

**What's retired:**
- `src/core/data/hmac.ts` — HMAC dropped
- `src/core/data/commit.ts` in current form — writes mutable JSON entity files
- `src/core/data/load.ts` in current form — loads mutable JSON entities. The current data layer operates on a `ProjectState` tree (a mutable JSON object store). This is replaced entirely by the event log engine.
- `src/core/data/serialize.ts` in current form — JSON entity serialization

**What's new:**
- Event log append function (validate schema → check invariants → write JSONL line → update prevId chain)
- Derived state computer (stream events → current state per scope)
- Content-addressed storage helpers (`git hash-object -w`, blob reference resolution)
- Extractor framework (section 3.4)
- Convergence evaluator (section 3.5)

**What stays:**
- `src/core/data/tree.ts`, `files.ts` — directory layout helpers, updated for new paths
- `src/core/data/schema-registry.ts` — schema validation, extended for event schemas

### 4.5 Context Bundles (`src/core/context/`)

**What's retired (effectively):**
- `collect.ts`, `budget.ts`, `priorities.ts` in current form — these operate on `ProjectState` tree entries (the mutable JSON object store). The v2 context bundler reads from event-log-derived state with explicit per-phase inline/reference distinctions. This is architecturally different, not a modification.

**What's new:**
- `gp context:bundle --phase=<p> --scope=<ref>` — CLI command that assembles per-phase context bundles
- Per-phase bundle specs from 08 S3.2 (e.g., P1 gets architecture-current inline, conventions inline, subsystems with maturity inline, active decisions inline; P10 gets plan inline, architecture-current reference, subsystem docs reference)
- Token budgeting per phase and per agent type (reviewer agents get smaller budgets than phase agents)
- Inline vs reference distinction per artifact per phase

### 4.6 RPC Layer (`src/core/rpc/`)

**What's retired:**
- `begin.ts`, `complete.ts`, `submit.ts` — replaced by `gp phase:*` commands built on the event engine. These are not "thin wrappers" — the new commands are built from scratch.
- `next-commands.ts` — replaced by derived state computer's suggested-next-steps
- `update-implementation-phase.ts` — replaced by chunk-level events
- `version-stamp.ts` — versioning moves to events

**What stays:**
- `paths.ts` — directory path resolution, updated for new layout

---

## 5. Skills (`plugin/skills/`)

### 5.1 Current → Target mapping

| Current skill | Target skill | Change type |
|---|---|---|
| `workflow-guide` (always-on) | `workflow-guide` | **Rewrite** — new phase catalog, collaborative/autonomous mode rules, steering preferences, R1/R2 discipline, updated write restrictions |
| `status` | `status` | **Keep/extend** — output now includes `suggestedNextSteps`, latest briefing |
| `init` | `init` | **Keep** — emits new events, registers subsystems |
| `upgrade` | `upgrade` | **Extend** — v1→v2 migration (event log, directory layout) |
| `task` | `task` | **Rewrite** — tasks become findings with `kind: "task"`. Skill calls `gp finding:capture` instead of `gp task:create`. Lightweight capture preserved but underlying model changes. |
| `explore` | `explore` | **Keep** — research/brainstorm cycle unchanged; adds collaborative-mode awareness (brainstorm waits for user) |
| `create-epic` | `create-epic` | **Rewrite** — owns P1+P3+P4+P5. Adds design-tree interviewing, pressure-test phase, architecture-shape checkpoint, architecture-target (not just architecture) |
| `start-epic` | `start-epic` | **Keep/extend** — P6, user approval of spine changes |
| `plan-slice` | `plan-slice` | **Keep/extend** — owns P7+P8+P9. Adds plan-shape checkpoint (P8), uses `gp refine:*` for refinement |
| `implement` | `implement-slice` | **Split+rename** — P10+P11 only. Chunk-level events, code refinement. Landing moves to `land-slice`. |
| — | `land-slice` | **New** — P12. Spine promotion (honest-intermediate-state), findings triage, learnings capture, user review. If final slice: epic completion (synthesis, architecture reconciliation, maturity transitions, side-quest proposals). |
| `complete-epic` | **Retired as standalone trigger** | Epic completion logic (cross-slice synthesis, architecture reconciliation, maturity transitions) runs automatically when `land-slice` detects the final slice. The user does not need to invoke `/gp:complete-epic` — but the completion substeps (synthesis, reconciliation, side-quest proposals) are visible and interactive during the final P12. The `gp epic:complete` CLI command remains for the event emission. |
| `create-side-quest` | `create-side-quest` | **Keep** — S0+S1 |
| — | `implement-side-quest` | **New** — S2. Same trust gates as slice, minimum-rigor routing. |
| — | `land-side-quest` | **New** — S3. Light landing. Findings escalate to active epic via discovery matrix. |
| `audit` | `audit` | **Rewrite** — invariants + events model, subsystem maturity queries |

### 5.2 Skill references (`plugin/skills/_references/`)

| Current reference | Fate |
|---|---|
| `cli-interaction.md` (26KB) | **Rewrite** — new command tree, event patterns, refine:*, phase:*, context:bundle |
| `epic-conventions.md` (15KB) | **Rewrite** — new directory layout, architecture-target split, date-prefix naming, shape checkpoints |
| `iteration-loop.md` (14KB) | **Rewrite** — refinement now uses `gp refine:*`, convergence CLI-computed, circuit breaker |
| `output-templates.md` (10KB) | **Update** — new status format, phase names, briefing templates |
| `plan-pipeline.md` | **Rewrite** — plan-shape checkpoint, chunk verification types (live/supplementary-tests/impossible), R2 enforcement |
| `reviewer-registry.md` | **Rewrite** — first-class CLI (`gp reviewer:list`), YAML format, routing function, relevance weighting |
| `explore-phase-pattern.md` | **Update** — collaborative mode awareness (brainstorm waits for user), event name changes |
| `decisions-format.md` | **Keep** — minor field changes |
| `expertise-tracking.md` | **Keep** |
| `orchestrator-discipline.md` | **Rewrite** — R1 pause discipline (pre-flight, reactive triggers, briefing-on-pause), steering preferences, collaborative vs autonomous mode rules |
| `orchestrator-error-handling.md` | **Keep** |

---

## 6. Agents (`plugin/agents/`)

### 6.1 Agent Return Format (Unified)

All agents must use a structured return envelope. This is a new cross-cutting contract.

```typescript
type AgentReturn = {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  summary: string;
  filesWritten: string[];
  // Type-specific payload:
  payload: ReviewerPayload | EditorPayload | SynthesisPayload | ...;
  // PARTIAL only:
  continuationFile?: string;
  question?: string;
  // FAILED only:
  reason?: string;
};
```

**Current state:** Agents return ad-hoc structured JSON. The `sub-agent-return-format.md` reference defines PARTIAL/SUCCESS/FAILED but without typed payloads per agent type.

### 6.2 Phase agents

| Current agent | Target agent | Change |
|---|---|---|
| `explore-phase.md` | `explore-phase` | **Keep** — minor event name changes, collaborative-mode awareness |
| `plan-phase.md` | `plan-phase` | **Keep** — uses new context bundle spec, structured return |
| `architecture-phase.md` | `architecture-phase` | **Extend** — produces `architecture-target.md`, design-tree interviewing support |
| `slices-phase.md` | `slices-phase` | **Keep** — minor changes |
| `implement-phase.md` | `implement-phase` | **Extend** — emits chunk-level events, structured return contract |
| `onboard-phase.md` | `onboard-phase` | **Extend** — registers subsystems with maturity, produces `architecture-current.md` at root |
| — | `pressure-test-phase` | **New** — adversarial architecture analysis (P4) |
| — | `verifier-phase` | **New** — runs verification methods per chunk, captures evidence |

### 6.3 Reviewer agents

All 20 current reviewer agents carry forward as the bootstrap set. Each must produce structured output matching the `ReviewerPayload`:

```typescript
type ReviewerPayload = {
  dimensions: Array<{ name: string; score: number; threshold: number; passed: boolean }>;
  findings: Array<{ severity: "BLOCKING"|"CRITICAL"|"IMPORTANT"|"MINOR"; description: string; location?: string }>;
  rationale: string;
};
```

**Reviewer categories (from spec S7):**
- **Always-on trio** (every artifact): `reviewer-holistic`, `reviewer-invariant-checker` (new), `reviewer-context-transport` (new)
- **Artifact-specific**: `reviewer-plan` (new), `reviewer-verification-plausibility` (new, BLOCKING), `reviewer-goal` (new), `reviewer-slice-set` (new), `reviewer-software-architecture`
- **Code-quality** (for code refinement P11): `reviewer-performance`, `reviewer-reliability` (new), `reviewer-security` (new), `reviewer-domain-correctness` (new), `reviewer-test-meaningfulness` (new), `reviewer-code-style` (new)
- **Subsystem-specific** (routed by affected subsystems): `reviewer-typescript`, `reviewer-data-layer`, `reviewer-tui-cli`, `reviewer-agent-skill`, `reviewer-api-contract`, `reviewer-verification-spot-check` (new, spawned by land-slice)

### 6.4 Extractor agents

**New agent type.** Returns `SUCCESS` with structured extract or `FAILED` if unparseable. Ten extractor types (see section 3.4).

### 6.5 Editor / Synthesis

| Current | Target | Change |
|---|---|---|
| `editor.md` | `editor` | **Extend** — returns `{ diffPaths: string[] }`, FAILED if feedback internally inconsistent |
| `synthesis.md` | `synthesis` | **Extend** — returns `{ aggregatedPath: string, disagreements: string[] }` |

### 6.6 Completion agents

| Current | Target | Change |
|---|---|---|
| `completion-slice.md` | `completion-slice` | **Extend** — findings triage (discovery matrix), architecture-delta proposal, maturity transition proposals |
| `completion-epic.md` | `completion-epic` | **Extend** — cross-slice synthesis, architecture reconciliation (target→current), maturity transitions |
| — | `completion-side-quest` | **New** — spawned by `land-side-quest`. Findings escalation to active epic. |

### 6.7 Audit agents

Stays: `audit-architecture`, `audit-docs`, `audit-tests`. Extended for event-log-derived state.

### 6.8 Agent references

| Reference | Fate |
|---|---|
| `review-*.md` (20 files) | **Rewrite** — add structured rubric YAML with dimension definitions, thresholds, scoring guidance |
| `review-preamble.md` | **Rewrite** — structured output format, relevance weighting, convergence rules |
| `plan-format.md` | **Rewrite** — chunk verification types (live/supplementary-tests/impossible), red-test requirements, R2 |
| `maturity-conventions.md` | **Update** — 4-level taxonomy, four uses, dependent count |
| `audit-conventions.md` | **Update** — event-log-based queries |
| `sub-agent-return-format.md` | **Rewrite** — typed payloads per agent type (section 6.1) |

---

## 7. Hooks (`plugin/hooks/`)

**What stays:** `hooks.json` pattern, `protect-state.sh`, `warn-bash-state.sh`.

**What changes:** `protect-state.sh` scope:
- Currently blocks: `.json`/`.jsonl` files + `learnings/*.md`
- Target blocks: `events.jsonl` (any scope), `architecture-current.md`, `conventions.md`, `invariants.md`, all `*.jsonl` files
- Target allows: artifact content files (plans, goals, research, brainstorms) — LLM-writable

**What's retired:** HMAC-related logic.

**Migration note:** Low risk. Update early (Layer 0) to protect `events.jsonl` as soon as it exists — don't wait until Layer 3.

---

## 8. Reviewers & Rubrics

### 8.1 Reviewer Registry

**What's retired:**
- Current reviewer storage: plain markdown files at `plugin/agents/_references/review-*.md` with no structured metadata

**What's new:**
- **Physical relocation:** Reviewers move to `plugin/reviewers/<id>.md` (default set shipped with plugin) with project-level overrides at `.goodplan/reviewers/<id>.md`. This is a new top-level directory, not a subdirectory of agents.
- **Format change:** Each reviewer file becomes YAML-fronted markdown (not pure markdown). YAML frontmatter: `id`, `version`, `domains`, `applies_to` (artifact types), `rubric_ref`, `score_range`, `passing_threshold_per_dimension`. Body contains the reviewer prompt.
- `gp reviewer:list` / `gp reviewer:show` — CLI-queryable registry
- **Routing function** (new CLI subsystem): given artifact type + affected subsystems + maturity, returns reviewer set with relevance weights. Currently, reviewer selection is ad-hoc in skills.
- **Relevance weighting:** high (blocks convergence), medium (CRITICAL blocks, IMPORTANT warns), low (warnings only)
- **Override mechanism:** Project-level `.goodplan/reviewers/<id>.md` overrides plugin defaults, allowing per-project threshold tuning

### 8.2 Rubrics

- YAML artifacts. `gp rubric:list`/`show`/`validate`.
- Per-dimension scoring: 1–5 or pass/fail. Each dimension has threshold.
- Convergence mechanical: all dimensions above threshold, zero BLOCKING/CRITICAL.

**Migration:** Extract rubric dimensions from current `_references/review-*.md` prose into YAML. Start with minimal dimensions (3–5 per reviewer), expand via calibration.

---

## 9. `.goodplan/` Directory Structure

### Current layout:
```
.goodplan/
  .state-cache.json          # retired
  activity-log.jsonl         # retired
  decisions.jsonl            # retired → events
  learnings.jsonl            # retired → events + per-file md
  overview.json              # retired → derived state
  project.json               # retired → events
  idea.md                    # project goal
  conventions.md             # stays
  architecture/              # retired → architecture-current.md at root
  epics/<slug>/              # changed → date-prefixed
```

### Target layout:
```
.goodplan/
  events.jsonl               # project-scope event log
  architecture-current.md    # spine: what the codebase IS
  conventions.md             # spine: conventions
  invariants.md              # spine: invariant definitions
  subsystems/                # per-subsystem docs
    <slug>.md
  epics/
    <YYYY-MM-DD>_<slug>/     # date-prefixed
      events.jsonl           # epic-scope event log
      goal.md
      architecture-target.md # what the codebase is BECOMING
      pressure-test.md
      slice-set.md
      research/<date>_<slug>_<suffix>.md
      brainstorm/<date>_<slug>_<suffix>.md
      slices/<n>_<slug>/
        goal.md
        plan.md
        evidence/            # verification evidence
  side-quests/               # renamed from quests/
    <YYYY-MM-DD>_<slug>/
      events.jsonl
      goal.md
      plan.md
  learnings/<date>_<slug>.md
  briefings/<date>_<slug>.md
  findings/<slug>.md
```

### v1→v2 migration (`gp migrate`):
1. Read `.state-cache.json` and entity JSON files
2. Generate equivalent events in `events.jsonl` (per scope)
3. Move architecture docs → `architecture-current.md` at root
4. Rename epic directories → date-prefixed format
5. Rename quest → side-quest directories
6. Convert `decisions.jsonl` entries → `decision-recorded` events
7. Convert `learnings.jsonl` entries → `learning-captured` events + per-file `.md`
8. Generate `project.json` metadata → `project-initialized` event
9. Validate prevId chain integrity
10. Write `invariants.md` (empty initial YAML block)

Build migration after event engine is stable. Test with this repo's `.goodplan/`.

---

## 10. Test Harness (`tools/dogfood/`)

**What stays:** Agent SDK harness pattern, three-world isolation.

**What changes:** All test scripts updated for new CLI commands and event shapes.

**What's new:**
- Event engine unit tests (invariant enforcement, prevId chain, derived state)
- Refinement loop tests (reviewer dispatch, synthesis, convergence, circuit breaker)
- Chunk lifecycle tests (red-green-verify sequence)
- Migration command tests (v1→v2)
- Shape checkpoint tests (approve vs auto-shape flows)

**What's retired:** State machine tests (reducer, transitions).

---

## 11. Migration Ordering

### Layer 0: Event Engine + Hooks (foundation)
1. **Event log writer/reader** — append JSONL, read/stream, prevId chain validation
2. **Event envelope schema** — Zod schemas for envelope + all event types (start with entity lifecycle, add incrementally)
3. **Invariant engine** — core invariants, check-before-append
4. **Derived state computer** — stream events → current state, phase detection, blocker identification, suggested next steps
5. **Hook updates** — protect `events.jsonl` and spine files immediately

### Layer 1: Core CLI + Bootstrap Trust Substrate
6. **`gp init`** — bootstrap with events.jsonl, `project-initialized`, subsystem registration
7. **`gp status`** — derived state + suggested next steps
8. **`gp phase:start`/`phase:submit`/`phase:transition`** — generic phase boundaries
9. **Bootstrap reviewer registry + rubrics** — hardcoded test rubric with 1–2 reviewers so refinement commands can be tested. Not the full registry — just enough to exercise `refine:*`.
10. **`gp refine:*`** — artifact-agnostic refinement loop, convergence evaluator, circuit breaker. Testable against bootstrap rubric.
11. **`gp milestone:commit`** — stage + commit event groups

### Layer 2: Entity Commands + Full Trust Substrate

Items within this layer have internal ordering. Build in this sequence:

**2a. Foundation commands (needed by entity commands):**
12. **Extractor framework** — all 10 extractors. Required before any commit command since commit commands run extractors to produce structured event payloads.
13. **`gp subsystem:*`** — register, update-maturity, retire, list, show. Required by `gp init` (which calls `subsystem:register` inline in Layer 1, but full commands needed for ongoing use).
14. **Full reviewer registry + rubrics** — all reviewers registered, rubrics extracted from prose to YAML, routing function complete. Extends the bootstrap from Layer 1.
15. **`gp context:bundle`** — per-phase context assembly. Needed by skills but also by phase:start.

**2b. Entity commands (depend on 2a):**
16. **`gp epic:*`** — full lifecycle: goal-draft/commit, architecture-draft/commit, architecture-shape, pressure-test, slices-draft/commit, slice-set-shape, set-steering, pause, resume. Depends on extractors (for commit commands) and reviewer registry (for refinement routing).
17. **`gp slice:*`** — plan-draft/commit, plan-shape, implement-start, chunk lifecycle, code-refine, land. Depends on epic commands (slices belong to epics).
18. **`gp side-quest:*`** — renamed from quest, full lifecycle. Independent of epic/slice but uses same extractor/reviewer infra.

**2c. Supporting commands (parallel with 2b):**
19. **`gp finding:*`, `gp briefing:*`, `gp invariant:*`** — trust substrate commands
20. **`gp reviewer:*`, `gp rubric:*`** — registry query commands
21. **`gp decision:*`, `gp learning:*`, `gp events:*`, `gp project:*`** — remaining commands

### Layer 3: Skills + Agents
22. **Skill rewrites** — starting with `workflow-guide` and `status`, then phase-owning skills
23. **Agent contract updates** — structured return format, new agents (pressure-test, verifier, extractor, completion-side-quest)
24. **Agent reference rewrites** — rubric YAML, review-preamble, plan-format, sub-agent-return-format

### Layer 4: Migration + Validation
25. **`gp migrate`** — v1→v2 migration command
26. **Test harness updates** — exercise new pipeline end-to-end
27. **Dogfood: run a real epic** — validate with actual usage

### Critical path:
**Event engine → derived state → `gp status` → bootstrap rubric → `gp refine:*` → extractors → entity commands → skills.**

The bootstrap rubric (Layer 1, item 9) resolves the chicken-and-egg problem: refinement commands need rubrics to test, but full rubrics come later. A minimal hardcoded rubric with 1–2 reviewers is sufficient for Layer 1 testing.

Extractors are on the critical path because commit commands (e.g., `gp epic:goal-commit`) run extractors to produce structured event payloads. Build extractors before entity commands.

---

## 12. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| **Invariant extraction from transition guards** | Guards are code not data. Manual extraction is error-prone. | Write tests for each invariant BEFORE retiring the transition file. The test becomes the spec. |
| **Event schema explosion** | ~80 event types. Large Zod surface. | Discriminated unions with shared envelope. Start with entity lifecycle, add incrementally. Consider two-level discriminant (scope + type) if compile times suffer. |
| **Derived state performance** | Streaming full event log per `gp status` could be slow. | Defer optimization (SQLite caching deferred). If slow, derived-state cache file recomputed on append. |
| **Reviewer structured output** | 20 reviewers need format changes. LLMs don't always produce valid JSON. | Zod parsing with retry. Start with 3–5 active reviewers per artifact type. |
| **`implement` skill split** | Splitting into `implement-slice` + `land-slice` requires clear P11→P12 boundary. | Define boundary event (`code-refinement-converged`) first. Each skill checks for it. |
| **v1→v2 migration** | Active projects need to migrate. | Build last. Test with this repo's `.goodplan/`. |
| **Context window pressure** | Chunk events + evidence + reviewer output = lots of context. | Aggressive token budgeting per phase. Sub-agent model (fresh context per chunk). |
| **Rubric bootstrapping** | `refine:*` needs rubrics to test, but full rubrics come later. | Bootstrap rubric with 1–2 reviewers in Layer 1. Full registry in Layer 2. |
| **Hook protection gap during development** | New protected files (`events.jsonl`) exist before hooks are updated. | Update hooks in Layer 0, not Layer 3. |
| **Collaborative mode regression** | Skills that should wait for user might proceed autonomously. | Collaborative phases explicitly check for user presence. Autonomous phases check steering preference. Test both paths. |

---

## 13. Spec Questions / Flags

Items where potential issues were noticed in the spec (08). Not proposals to change — flags to consider.

1. **Content-addressed blobs via `git hash-object -w`.** Loose blobs between milestones are vulnerable to `git gc`. Milestone commits make them reachable, but the window exists.

2. **~80 event types in single Zod discriminated union.** TypeScript compile times may suffer. Two-level discriminant (scope + type) is a possible mitigation.

3. **`reviewer-invariant-checker` and `reviewer-context-transport` as always-on.** New agents needing careful calibration to avoid false positives blocking convergence on every artifact.

4. **Side-quest compression details.** "Same trust gates but compressed" — fewer refinement rounds? Fewer reviewers? Lower thresholds? The spec doesn't fully specify.

5. **Multi-person model constraints.** The spec says "multiple people should NOT work on the same epic simultaneously" but doesn't specify what happens if they try. Should the CLI enforce this (e.g., branch ownership events)?

6. **Determinism-vs-judgment boundary.** Gating is deterministic (invariants, rubrics, convergence). Content is judgment (findings, reshape proposals, scope decisions). The spec is clear on this principle but the boundary will need iteration — some "deterministic" gates depend on LLM-produced scores.

7. **Epic completion trigger: 08 vs 09 inconsistency — RESOLVED.** The spec (08 S3.1) says final P12 auto-triggers epic completion. The walkthrough (09) shows a separate `/gp:complete-epic` invocation labeled "P13." **Decision: auto-trigger at final P12.** No separate P13. The final P12's user review substep already surfaces completion artifacts (cross-slice synthesis, architecture reconciliation, maturity transitions, side-quest proposals) — a separate step would add ceremony without a new decision point. The walkthrough (09) is out of date on this point.

8. **Walkthrough naming: `slice-set-shape` vs `slice-set-shape` — RESOLVED.** The walkthrough (09) uses `gp epic:slice-set-shape-approve`; the spec (08 S6.3) uses `gp epic:slice-set-shape-approve`. **Decision: use `slice-set-shape` naming** (more precise — it's the slice *set* being shaped, not slices individually). Delta commands updated accordingly.
