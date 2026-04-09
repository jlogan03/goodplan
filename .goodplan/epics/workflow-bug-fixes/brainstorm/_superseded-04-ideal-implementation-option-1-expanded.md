# Ideal Implementation Premises — Expanded (Option 1)

This file extends `03-ideal-implementation-premises.md` with mechanism sections that 03 currently drops or weakens. Everything in 03 is preserved; the additions specify the *implementation premises* the drafter needs so the mechanisms from `01-ideal-flow-from-first-principles.md` can be supported. Mechanisms are not re-explained conceptually — that's 01's job. Each new section answers: "what does the ideal implementation need to provide so this mechanism works?"

## Process

- **Three-step exploration:** ideal flow → ideal implementation → delta. The previous attempt jumped from ideal flow to delta, conflating design and migration reasoning. The delta step happens only after the ideal implementation is drafted, reviewed, and pressure-tested.
- **The existing `02-delta-vs-current-implementation.md` is stale** and should be renamed or deferred. Its grounded research about the current codebase is useful scaffolding for the eventual real delta.
- **Modify in place, don't rewrite.** Every change to existing code is framed as a bounded shippable delta, not a greenfield replacement. The pain is execution gap, not conception.
- **Dogfood with integrity.** The workflow must work on itself. This epic tests the workflow's ability to handle a real, working system (this codebase) being improved incrementally.

## Architectural premise: invariants + events, not a rigid state machine

**Keep the CLI.** It provides state integrity, schema validation, structured queries, context bundling, ground truth independent of LLM sessions, debuggability, testability, integration points for non-LLM code, deterministic error codes, and atomic multi-file operations. None of these can be reproduced cheaply in a skill-only world.

**Replace the state machine abstraction with invariants + events.** The current forward-only transition graph is too rigid; adding escape hatches makes the rule set unbounded. The new abstraction:

- **Events** are facts about what happened. Append-only, schema-validated, immutable.
- **Invariants** are check-constraints every event must satisfy. They define what must be true, not what sequence of actions must occur.
- **Derived state** is computed from the event log via queries. "What's the current state of X" is a view, not a stored value.
- **The CLI is the invariant engine, schema validator, and query engine.** Skills emit events and consume derived state.

This gives: backward movement (compensating events), insertion mid-flow (events don't require a predecessor), optional phases (no required sequence), parallelism (events are independent), full audit history (log IS state), natural merge resilience (append-only).

## Storage

**Event log as JSONL, committed to git.** One `events.jsonl` per scope:
- `.goodplan/events.jsonl` — project-level events
- `.goodplan/epics/<slug>/events.jsonl` — epic-scoped events
- `.goodplan/side-quests/<slug>/events.jsonl` — side-quest-scoped events

**Content-addressed storage via git's internal object store.** No explicit `blobs/` directory. Events reference content by git blob hash; retrieval via `git cat-file blob <hash>`. Content is committed to git as normal markdown files in the workspace, which gives content-addressing for free via git's object model.

**SQLite deferred.** Start with JSONL direct read + in-memory parsing per CLI invocation. Add persistent caching only when profiling shows a need.

**Commit rhythm:** skills commit at workflow milestones, not per event. Events are visible to the CLI immediately via file appends; git commits happen at phase transitions, end of sessions, and user-requested save points.

**Pre-tool-use hooks protect JSONL files and spine docs from direct edits.** HMAC is dropped. The hook blocks write attempts at the tool-call level, producing loud immediate errors that guide the LLM to use the CLI. Simpler than HMAC and matches the actual threat model (prevent accidents, not motivated attacks).

## Directory structure

```
.goodplan/
├── .gitignore
├── events.jsonl                              # project-level events
├── architecture-current.md                   # current system architecture (subsystem index + communication patterns)
├── conventions.md                            # project conventions
├── invariants.md                             # prose reference; canonical invariants live in .goodplan/invariants/
├── invariants/
│   ├── core.yaml                             # ships with CLI
│   ├── custom/                               # project-specific extensions (optional)
│   └── proposed/                             # LLM-proposed invariants awaiting human approval
├── subsystems/
│   └── <date>_<slug>_<suffix>.md             # per-subsystem API docs, data models, maintained invariants
├── briefings/                                # project-level briefings
│   └── <date>_briefing_<suffix>.md
├── decisions/
│   └── <date>_<slug>_<suffix>.md
├── learnings/
│   └── <date>_<slug>_<suffix>.md
├── epics/
│   └── <date>_<slug>_<suffix>/
│       ├── events.jsonl
│       ├── goal.md
│       ├── architecture-target.md            # diff against architecture-current.md
│       ├── pressure-test.md
│       ├── discovery-ledger.jsonl            # findings captured during the epic
│       ├── briefings/
│       │   └── <date>_briefing_<suffix>.md
│       ├── slices/
│       │   └── <slug>/                       # slice slugs scoped within epic, no suffix
│       │       ├── goal.md
│       │       ├── plan.md                   # or plan/ directory for multi-file plans
│       │       ├── pre-flight.md             # pre-flight statement before each autonomy window
│       │       └── briefings/
│       ├── brainstorm/
│       ├── research/
│       └── refinement/                       # in-progress refinement state
│           └── <artifact>/
│               └── round-<N>/
│                   ├── reviews/
│                   │   └── <reviewer>.md
│                   ├── synthesis.md
│                   └── edit-notes.md
└── side-quests/
    └── <date>_<slug>_<suffix>/
        ├── events.jsonl
        ├── goal.md
        ├── plan.md
        └── briefings/
```

## Naming conventions

- **Epics and side quests:** `<YYYY-MM-DD>_<slug>_<6-char-suffix>`. Date sorts chronologically. Slug is human-readable. Suffix prevents collision when multiple people create same-named entities on different branches.
- **Slices:** `<slug>` only. Scoped within the epic directory, no cross-branch collision risk.
- **Briefings, decisions, learnings:** `<YYYY-MM-DD>_<slug-or-type>_<suffix>.md`.
- **Architecture docs:** `architecture-current.md` at `.goodplan/` root; `architecture-target.md` inside each epic directory. Clearer than `architecture.md` in both places.
- **Event log filename:** `events.jsonl` everywhere (project root and per-entity). Parent directory disambiguates scope.
- **IDs:** ULIDs for system-generated identifiers (events, findings, briefings, decisions, learnings). Sortable by creation time, collision-resistant across branches, 26 characters. Slugs for user-facing entity names; entities also carry a stable ULID that doesn't change if the slug is renamed.

## Artifacts

- **Every artifact is a set of (path, hash) entries.** Single-file artifacts are sets of length 1. Multi-file artifacts (big plans, subsystems that grow into directories) are handled naturally.
- **CLI commit accepts single files, directories, or explicit lists.** All produce the same event shape. Drift detection compares workspace file sets to committed sets and handles modifications, additions, and removals.
- **Structured metadata is extracted at commit time.** For each artifact type, the CLI has an extractor that pulls structured fields from the prose (chunks with verification methods from plans, subsystem lists from architecture, acceptance criteria from goals). Extracted metadata is attached to the commit event and is what invariants check.
- **Skills are responsible for producing prose that extracts cleanly.** Templates provide starting structure; schema-aware prompts guide the LLM to produce content the extractor can parse.
- **Reviewers cross-check prose against extracted metadata** as a backstop. The CLI trusts extraction at commit time; reviewers catch discrepancies between claims and reality.

## Context Spine

**Name the concept.** The Context Spine is the named set of standing project-level documents every phase reads before doing anything else. The default set is `architecture-current.md`, `conventions.md`, `invariants.md`. Additional grounding docs (glossary, domain model, security model) may be promoted into the spine via a registry; this is a forward-compat escape hatch, not a default prescription.

**Spine registry.** `.goodplan/spine.yaml` declares the active spine document set: each entry has a path, a kind (`architecture` | `conventions` | `invariants` | `other`), and a maturity tag. The registry is itself a spine-protected document. Adding to the spine is a deliberate act, not silent file creation.

**Discipline: every phase starts by reading the spine.** The CLI exposes `gp spine:load` (returns paths + extracted summaries) and every phase agent's context bundle is required to include the spine output. Skills cannot opt out; the bundle assembler refuses to produce a bundle without it. Reviewers also load the full spine, not just the document closest to their specialty.

**Promotion-required-at-slice-land invariant.** A `slice-land` event fails its precondition check unless it carries a `spine-promotion` sub-event for every spine doc the slice's diff touched. The CLI computes touched-spine-docs from the slice's file diff intersected with the spine registry; if the intersection is non-empty, the slice cannot land without explicit promotion events. Empty-handed promotion ("no spine changes — verified") is allowed but must be declared, not skipped.

**Honest-intermediate-state rule, applied to ALL spine docs.** The promotion event schema requires a free-text `state_description` field and a `state_kind` enum: `complete` | `mid-rename` | `partial-adoption` | `deprecated-but-live` | `experimental`. Mid-rename is mid-rename; a half-adopted convention is described as half-adopted. Reviewers at Slice Land check that state_kind matches reality — a `complete` claim with obvious mid-state code is a CRITICAL finding.

**Other-grounding-docs escape hatch.** Spine entries with `kind: other` are first-class but require an explicit user-approved event to add. The CLI rejects spine.yaml edits made outside `gp spine:add` / `gp spine:remove`.

**Cross-spine reviewer routing.** Reviewers declare which spine kinds they consult. An invariant reviewer always loads `invariants.md`; a conventions reviewer always loads `conventions.md`; the holistic reviewer always loads all of them. The bundle assembler honors these declarations.

## Invariants

**Hybrid model (Option C):**
- Universal invariants live in TypeScript code (they define what goodplan is — cardinality, precedence, temporal, referential)
- Extensible invariants live in YAML files under `.goodplan/invariants/` (project-specific additions and overrides)
- YAML uses a small set of composable rule types: `unique`, `required`, `count_limit`, `foreign_key`, `enum`, `all_match`, `exists`, `precondition`, `temporal`, `custom`
- `custom` escape hatch points to a sandboxed TypeScript function for checks too complex to declare

**Starting invariant set (~20):**
- Cardinality: one active epic per branch, one active side quest per branch, unique slugs within scope
- Precedence: slice needs refined plan before build, slice needs verification before complete, epic needs all slices complete before complete, slice needs dependencies complete before activation
- Content: plans have at least one chunk, every chunk has a verification method (R2), goals non-empty, findings have required fields, briefings have required sections
- Referential: entity IDs resolve, blob hashes resolve, cross-log references resolve
- Protection: spine doc changes only via commit events, invariants themselves are spine-protected
- Spine promotion: slice-land events require spine-promotion sub-events for touched spine docs
- Pre-flight: any `autonomy-window-open` event requires a preceding `pre-flight` event in the same slice
- R2: every chunk in a plan has a verification method whose `runnable_by` is `model` or carries an explicit `human_checkpoint` flag

**LLM-proposed invariants:**
- LLM can propose new invariants via files in `.goodplan/invariants/proposed/`
- Proposals include trigger context, rationale, dry-run results showing what would have been caught historically, and the invariant itself in the DSL
- Proposals are surfaced to the user at slice/epic land (or on demand)
- User approves, modifies, or rejects; accepted proposals move to `core.yaml` or `custom/`
- Natural proposal triggers: slice land retrospective, epic completion reflection, user "that shouldn't be possible" statements, pressure test findings

## Parallelism

- **At most one active epic per branch.** Target architecture convergence concern is real — multiple active epics would pull architecture in incompatible directions.
- **At most one active side quest per branch.** Side quests run orthogonally to the active epic since they don't propose alternate architecture.
- **Parallel slices within an epic, gated by dependencies.** Slices can run in parallel if their declared dependencies are complete and they don't have implicit dependencies (subsystem overlap). Slices declare `depends_on: [slice_ids]` and `affected_subsystems: [subsystem_ids]`.
- **Same-slice multi-branch collision is forbidden.** Invariant enforces this; merges that would activate the same slice on two branches fail with a clear error.
- **Multi-person collaboration on an active epic happens via the epic's branch**, not via main. Alice starts epic A1 on `feature/epic-A1`; Bob checks out that branch directly and contributes slices; PRs go into the epic branch, not main.

## PR and merge model: Option 1

- **Epics must be complete before their branch can merge to main.** Main never carries active epic state.
- **Enforcement is a pre-merge check** — a CLI command (`gp check-ready-to-merge --target main`) that runs invariants against the proposed post-merge state. Teams can wire this into git hooks or CI.
- **Long-lived epic branches** are a general git hygiene concern handled with normal practices (periodic merges from main into the epic branch). Not a goodplan workflow concern.
- **Side quests and small fixes** don't block on the active epic — they go on their own branches and merge to main independently.

## Subsystem tracking

- **Subsystems are first-class architectural entities with stable slug IDs** shared across maturity tracking, slice dependency inference, learning/decision tagging, and reviewer routing.
- **`architecture-current.md` holds the subsystem index** (name, maturity, owns paths, depends on, link to per-subsystem file) and **communication patterns** (how subsystems talk: direct calls, event-mediated, shared models, boundary rules).
- **`.goodplan/subsystems/<slug>.md` holds per-subsystem details:** description, public API (with stability markers), data models, maintained invariants, known limitations, future directions.
- **Per-subsystem extractor** pulls structured data: API methods, signatures, stability, data models with field lists, invariant counts.
- **Documentation depth scales with maturity.** Experimental: optional. Maturing: must exist. Stable: complete API docs required. Foundational: comprehensive. Enforced by invariant.
- **Queries:** `gp subsystem:show <id>`, `gp subsystem:api <id>`, `gp subsystem:callers <id>`, `gp subsystem:impacts <id>`. The `callers` and `impacts` queries enable impact analysis before making API changes.

## Maturity as a universal rigor dial

Maturity is not just a documentation depth indicator — it is the rigor dial that runs through the rest of the workflow. The implementation must expose maturity as an INPUT to several other mechanisms.

**Subsystem maturity is queryable as a first-class field.** `gp subsystem:maturity <id>` returns the level. The bundle assembler attaches the maturity of every touched subsystem to the context bundle for any phase that touches that subsystem.

**Maturity is an INPUT to:**

| Mechanism | How maturity scales it |
|---|---|
| **Pressure Test depth** | Experimental → light pass (one finding per category sufficient, time-boxed). Maturing → standard. Stable → standard with extra emphasis on the error-class inventory. Foundational → full treatment, explicit enumeration required for all five questions, accept-with-justification needs user approval. |
| **Refinement Loop strictness** | Score thresholds are maturity-scaled. Experimental: pass at ≥6. Maturing: ≥7. Stable: ≥8. Foundational: ≥9 plus zero IMPORTANT findings. |
| **R1 sensitivity** | Foundational subsystems trigger R1 blocks by default on any trade-off shift, even ones that would be note-and-continue elsewhere. Experimental subsystems require an explicit "this would change a load-bearing decision" judgment to block. |
| **Reshape blocking thresholds** | Foundational-touching reshapes require higher bars: a 2-of-3 reshape cap (vs. 3 elsewhere), explicit user sign-off on each option presented, mandatory cross-slice invalidation re-check. |

**Dependent-count falsifiability check.** Each subsystem's entry in `architecture-current.md` carries a dependent count, computed by the CLI from declared `affected_subsystems` history and import graph analysis. The invariant `maturity_consistent_with_dependents` flags an "experimental" tag with >N dependents (default N=3) as a CRITICAL finding. Maturity that lies is a bug, not a style issue.

**Epic Land maturity reconciliation.** A required substep at Epic Land: the CLI emits a `maturity-reconciliation-prompt` event listing every subsystem the epic touched, with current maturity, pre-epic dependent count, post-epic dependent count, and a flag if the delta crosses a maturity threshold. The user explicitly confirms each subsystem's maturity post-epic — promote, demote, or hold. Promotion to `foundational` requires explicit user sign-off, captured as a `maturity-promoted` event with rationale. The reconciliation cannot be skipped; Epic Land does not exit without it.

## Pressure Test

The Pressure Test runs in the Shape phase, after `architecture-target.md` is drafted and before it enters the Refinement Loop. The implementation must support adversarial-mode prompting, structured five-question output, and accept-with-justification as a first-class event.

**Skill ownership.** Owned by the `shape` skill. The skill invokes a dedicated `pressure-test` agent (not a reviewer agent — the cognitive posture is different). The agent runs in a single pass and writes `<epic>/pressure-test.md`.

**Adversarial-mode prompt contract.** The agent prompt explicitly instructs the model to FIND problems, not defend the design. Literal contract text the implementation must include:

> "Your job in this step is to find ways this will hurt us. If you find none, press harder — that usually means you haven't tried."

The prompt template is fixed and lives in the skill, not generated per-run. Generic findings ("the system might be hard to maintain") are rejected by a structural check on the output extractor.

**Five-question output schema.** The pressure-test agent must return a structured document with exactly these five sections, each with at least one specific finding:

1. **Failure-mode enumeration** — structural invitations to classes of bugs. Each finding cites the part of the target that invites the failure.
2. **Scaling cliffs** — concrete axes (10x data, 100x writers, 2x entity count, new integration), each with a *location of cliff*. Anchored to a 6–12 month horizon.
3. **Optionality ledger** — two columns: options preserved, options foreclosed.
4. **Error class inventory** — three buckets: now-impossible, still-possible, *could-have-been-impossible-with-different-design*. The third bucket is required and non-empty; an empty third bucket is a structural validation failure.
5. **Locked-in assumptions** — silent assumptions the design makes.

The extractor parses these sections and attaches them as structured metadata on the `pressure-test-complete` event.

**Errors made impossible.** Preserved verbatim as the framing the prompt must include:

> "the difference between 'the code handles bad input correctly' and 'bad input cannot be constructed in the first place.'"

The error-class inventory question (#4) explicitly checks whether the target preserves or strengthens existing invariants from `invariants.md`, and whether new invariants could be added to make additional error classes impossible by construction. Invariants are the architectural tool for making errors impossible; the inventory and `invariants.md` are two ends of the same mechanism.

**Accept-with-justification as a first-class event type.** Findings have three resolution paths: `addressed` (target updated), `accepted` (justification recorded), `escalated` (R1 block). The `pressure-test-finding-accepted` event carries the finding ID, the justification text, and the spine-promotion target (which spine doc the constraint will be tagged into). Accepted-without-justification is impossible — the CLI rejects the event.

**Promotion path from accepted findings to spine annotations.** Each `pressure-test-finding-accepted` event triggers a `spine-annotation-pending` flag on the named spine doc. At Slice Land or Shape exit, the CLI surfaces these pending annotations and requires the LLM to write them into the relevant spine doc as tagged constraints (usually `architecture-current.md`, occasionally `invariants.md` or `conventions.md`). This prevents accepted findings from being silently re-raised by future reviewers.

**Maturity-scaled depth.** The pressure-test agent receives the maturity tags of every subsystem the target touches. The prompt scales as described in the Maturity section: experimental → light pass; foundational → full treatment with explicit enumeration. Skipping the test for a foundational-touching epic is forbidden by invariant.

## Refinement Loop

The Refinement Loop is the primary mechanism for turning artifacts into self-contained context transports. The implementation must support change-scoped re-review, weighted scoring, missing-AND-stale context detection, and circuit breakers that hand off to the user rather than exiting silently.

**Artifacts are context transport.** Preserved verbatim. The reviewer agent contracts must include this framing as a first-principle reminder. The exit criteria are not "no defects found" — they are "a downstream agent with the codebase open and no prior conversation could execute against this."

> **A plan can be correct and still useless if it assumes context the implementer doesn't have.**

This is the load-bearing line for every reviewer's context-accumulation question.

**Context-accumulation as a first-class reviewer question.** Every reviewer's contract includes the explicit prompt: *"Reading the codebase as it exists today, would the implementer have to stop and figure X out?"* This is grounded in real codebase state, not speculation. Reviewers that produce only defect findings without addressing context-accumulation are flagged as miscalibrated and lose weight over time.

**Missing AND stale context detection.** Reviewers explicitly answer two context questions, not one:
- What context is missing that the implementer will need?
- What context in the artifact is stale, irrelevant, or wrong, that the implementer would have to filter through?

A plan with bloat is failing the loop just as surely as a plan with gaps. The synthesis step merges both into the edit pass.

**Exit on criteria, not feel.** The loop exit is mechanical:
- All relevant reviewer scores ≥ threshold (maturity-scaled — see Maturity section).
- Zero CRITICAL findings.
- Zero IMPORTANT findings.
- Only MINOR findings remaining.
- OR circuit breaker triggers.

"Feels good enough" is not an exit condition. The CLI rejects a `refinement-loop-exit` event without one of these grounds attached.

**Round count is not a target.** The loop runs until the bar is met or the circuit breaker fires. There is no preferred round count. Reviewers are forbidden from declaring done early to "save rounds."

**Change-scoped re-review.** Round N+1 reviewers see a *diff* against round N, not the whole artifact. The CLI computes the diff between round N's edited artifact and the round N-1 baseline, and feeds the diff into the round N+1 reviewer prompt with a fixed contract: "did your prior concerns get resolved? did the changes introduce new ones?" Reviewers cannot re-raise stale concerns about unchanged content.

**Circuit breakers with explicit hand-off.** Two breakers:
- **Stagnation:** consecutive rounds where the same finding recurs without resolution. Triggers after 2 consecutive recurrences.
- **Max rounds:** hard cap (default 5, maturity-scalable). Triggers regardless of progress.

When a breaker fires, the CLI emits a `refinement-loop-circuit-breaker` event and surfaces an explicit user choice: *"accept at current score, escalate to reshape, or abandon?"* The loop never exits silently when a breaker fires. The hand-off is to the user, not to the next phase.

**Weighted scoring by reviewer relevance.** Each reviewer declares which artifact kinds and which subsystem kinds it is load-bearing for. The CLI computes a weight per reviewer per artifact: high-weight reviewers' scores below threshold block exit; low-weight reviewers below threshold produce warnings. A TS reviewer's 7 on a TS-heavy plan blocks; on a data-model-heavy plan, it's a warning. Weights are stored in the reviewer registry, not hardcoded per run.

**Convergence cost as a slicing signal.** The CLI tracks rounds-to-converge per artifact. When a slice plan exceeds a convergence-cost threshold (default: 4 rounds without exit), the loop emits a `convergence-cost-high` signal that routes to Triggered Reshape: *"this slice may be too big or ambiguous; consider reshape."* The signal is a recommendation to the user, not a forced reshape.

**Reviewer contracts are fixed and structured.** Each reviewer has a versioned contract file declaring: what it checks for, what severity scale it uses, what spine docs it consults, what its weight is per artifact kind. Contracts are not regenerated per run. Drift in reviewer behavior is detected by comparing emitted findings to contract scope.

**R2 enforcement at plan refinement.** Plan-stage reviewers explicitly check that each chunk's verification method is meaningful (see R2 section). A plan with shallow or missing verification fails the loop.

## Discovery Checkpoints (R1) and Pre-flight Checkpoint

R1 is the universal "should we stop?" rule during autonomy windows. The implementation must support a blocking decision contract, structured pre-flight statements, and a migration loop from runtime questions back to pre-flight.

**The blocking rule.** The R1 contract every autonomy-window agent receives:

> *"If the user knew this, would they want to reconsider? If yes, pause. If no, note it for later."*

The contract is enforced not by the CLI but by the agent prompt. The CLI's role is to provide the `gp r1:block` API and the event schema; the judgment lives in the agent.

**Preserved verbatim** in the agent prompt:

> "A question that requires the user to guess what you were thinking is not a question — it is a puzzle."

This line is load-bearing for the context-reconstruction requirement below.

**Pre-flight format.** Before any autonomy window opens, the LLM must produce a structured pre-flight statement and present it to the user. The statement is written to `<slice>/pre-flight.md` and committed via a `pre-flight-recorded` event. Structure is required, not freeform:

```
## I'm about to do
<X — concrete deliverable>

## I plan to return
<Y — what the user will see at the next steering moment>

## I expect to block on
<Z — specific known unknowns that would trip R1 if hit>

## Here's what I think I know that matters
- A
- B
- C

## Anything to change before I start?
```

Freeform pre-flights are rejected by the extractor — preambles, hedging, and missing sections all fail the check.

**Pre-flight event shape and timing.** The `pre-flight-recorded` event must be emitted before the corresponding `autonomy-window-open` event in the same slice. This is enforced by invariant: any `autonomy-window-open` without a preceding `pre-flight-recorded` event in the same slice fails its precondition.

**R1 block event shape.** The `r1-block` event records:
- The trigger (what the LLM was doing)
- The discovery (what was found)
- Why it matters (the trade-off shift)
- The two-or-three options forward
- The recommended option
- The context the user needs to evaluate (reconstructed from the autonomy window's accumulated state)

The CLI rejects an `r1-block` event missing any of these fields. A block with only "found a problem" is a puzzle, not a question.

**Context-reconstruction requirement.** The block's "context the user needs to evaluate" field must be populated with the working context the LLM has built up — the user was not in the room. The agent prompt explicitly reminds: *"Reconstruct context in the question itself: what you were doing, what you found, why it matters, what you need from them."* Reviewers at Slice Land sample R1 blocks from the slice and flag any that read as puzzles.

**Migration-loop discipline.** Preserved as the operating principle:

> *"If the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight."*

The implementation supports this via a telemetry hook: each `r1-block` event is tagged with whether the corresponding pre-flight statement mentioned the relevant unknown. If the same kind of unknown surfaces as a runtime block more than once, the CLI surfaces a `pre-flight-format-gap` event at Epic Land for the user to consider — the answer is to update the pre-flight template, not to "ask more carefully."

**Agent-level API for emitting blocks.** Agents call `gp r1:block --trigger <...> --discovery <...> --options <...> --recommendation <...> --context <...>`. The CLI validates the shape, writes the event, and pauses the autonomy window. The agent does not write directly to the event log.

**Judgment-laden acknowledgment.** Preserved verbatim from the ideal flow:

> "Several of the workflow's central judgment calls — whether a finding materially matters, whether an assumption is load-bearing, whether a slice is coherent — are irreducibly judgment-laden by design."

R1 is one of these. The implementation provides scaffolding (context, prompts, blocking options) rather than rules. The CLI does not try to mechanically decide what is "material" — it provides the API and trusts the agent's judgment, while creating a feedback loop (the migration loop above) so judgment improves over time.

## R2: Build Only What You Can Check

R2 is the universal "is this verifiable?" rule for any chunk. The implementation must enforce verification-method *meaningfulness*, not just presence — and must distinguish model-runnable from human-checkpoint verification.

**Verification-method meaningfulness, not just presence.** The plan extractor pulls a `verification` field from each chunk; the field is a structured object, not free text:

```
verification:
  method: <test | typecheck | script | query | live-observation | human-checkpoint>
  runnable_by: <model | human>
  exercises: <description of what the verification actually exercises>
  acceptance_tie: <which acceptance criterion it ties to>
```

The presence of a verification field is necessary but not sufficient. The Refinement Loop's verifiability reviewer explicitly checks that `exercises` is not vacuous and `acceptance_tie` is real.

**Model-runnability requirement.** When `runnable_by: model`, the verification must be something the model itself can run and interpret. The CLI does not enforce runnability mechanically (it can't), but the verifiability reviewer is contractually required to flag verifications the model cannot actually run as CRITICAL.

**Preserved verbatim** in the verifiability reviewer's prompt:

> "A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence."

> "End with live observation."

These two lines are load-bearing for the reviewer's calibration.

**Shallow-test detection heuristic.** The verifiability reviewer checks each chunk's verification against three failure patterns:
1. **Tautology:** the test passes by reasserting the implementation. (E.g., a test that checks the same value the function returns.)
2. **Mock-only:** the test exercises mocks but no real code path.
3. **Existence-only:** the test confirms something exists but not that it works.

Any of these is a CRITICAL finding. The reviewer's contract requires explicit affirmation: *"does this chunk's verification actually exercise its intent?"* — yes/no per chunk.

**R1 trigger on insufficient verification.** If during Build the model discovers its declared verification is insufficient (tests pass but the result is obviously wrong), that is itself an R1 trigger. The agent emits an `r1-block` with the discovery framed as "verification is insufficient" — the user picks whether to deepen the verification, reshape the chunk, or accept the gap with a human checkpoint.

**Human checkpoint path.** Chunks that cannot be model-verified set `runnable_by: human` and `method: human-checkpoint`. This is legitimate but not silent: the chunk's Build window converts from pure autonomy into autonomy-with-a-required-review-interrupt. The CLI emits a `human-checkpoint-scheduled` event when the chunk enters Build, so the user is not surprised at completion time. Human checkpoints are explicit and scheduled, not assumed.

**Reviewer contract: every reviewer asks the verification question.** Not just the dedicated verifiability reviewer. Every reviewer in the plan-stage Refinement Loop pool answers, for each chunk in scope: *"does this chunk's verification actually exercise its intent?"* Disagreement among reviewers on this question is a CRITICAL synthesis finding and routes through R1 if unresolvable.

## Per-subsystem learnings, decisions, and invariants via tagging

- **Learnings and decisions** get an optional `related_subsystems: [ids]` field in their extracted metadata
- **Invariants** can declare `scope: subsystem` with `target_subsystem: <id>` to apply only when events touch that subsystem
- **Context bundles load targeted subsystem context:** when planning a slice that touches `auth`, the bundle includes learnings/decisions/invariants tagged with `auth` plus untagged project-level wisdom
- **Storage is tag-based, not directory-based.** Flat directories (`.goodplan/learnings/`, `.goodplan/decisions/`); views like `gp learnings:list --subsystem auth` filter by tag
- **Subsystem renames** produce `subsystem-renamed` events that map old ID to new; the CLI can auto-rewrite references or leave them stale with resolution via the mapping

## Work Discovered Mid-Epic: Discovery Ledger and Triggered Reshape

Deferred work and blocking work are two flavors of the same problem. The implementation must unify them under a 2x2 decision matrix and route findings to the cheapest correct response.

**The 2x2 decision matrix** is the canonical reference for every discovery. The implementation surfaces it in the agent prompt at every R1 checkpoint:

|                   | **In scope**                                          | **Out of scope**                                              |
|---|---|---|
| **Blocking**      | Reshape current epic                                  | Stop epic; promote finding to its own epic; resume after      |
| **Non-blocking**  | Expand target, insert/adjust a future slice           | Defer: park as a finding in the Discovery Ledger              |

### Discovery Ledger

**Storage.** `.goodplan/epics/<slug>/discovery-ledger.jsonl`. One entry per finding. Append-only, like the event log. Findings are addressable by ULID for cross-reference from spine annotations and triggered reshapes.

**Finding event shape.** Required fields, fixed and small:
```
{
  id: <ulid>,
  captured_at: <timestamp>,
  captured_in_slice: <slug>,
  what_i_was_doing: <text>,
  what_i_found: <text>,
  why_it_matters: <text>,
  why_im_not_doing_it_now: <text>,
  related_subsystems: [<id>],
  state: <open | promoted | merged | culled>
}
```

The `why_im_not_doing_it_now` field is required — it separates a useful finding from a stale TODO. The CLI rejects findings without it.

**Uniform cheap capture.** Five seconds. The CLI exposes `gp finding:add` which the agent can call mid-window without leaving the autonomy window. No size classification at capture, no triage at capture. The agent just records and continues.

**Triage at milestone moments, not at capture.** Slice Land and Epic Land each include a mandatory triage substep. The CLI emits a `discovery-ledger-triage-prompt` event listing all open findings tagged to the milestone's scope. The user (with the LLM as assistant) walks each one: promote, merge, cull. Empty-handed triage ("nothing to triage — verified") is allowed; skipping the step is not.

**Promotion targets.** Each promotion is a typed event:
- `task` — a small piece of follow-up work, attached to the project task list.
- `side-quest` — a bounded out-of-scope effort with its own goal and plan.
- `epic-candidate` — large enough to deserve full Spark/Sharpen treatment.
- `spine-annotation` — a fact about the system that affects planning; lands in `architecture-current.md`, `conventions.md`, or `invariants.md` as a tagged constraint.
- `cull` — explicitly dropped, with a rationale field. Culls are still recorded; nothing disappears silently.

**Pull-based surfacing at relevance points.** When a new epic enters Spark/Sharpen, the CLI runs `gp finding:relevant --subsystems <touched>` and surfaces findings tagged to subsystems the new epic will touch. Findings arrive when relevant, not when remembered. The agent prompt at Sharpen explicitly requires consulting these findings before drafting `epic/target.md`.

**Explicit decay rule.** Findings older than N epics (default N=3) without promotion or reference are surfaced for culling at the next Epic Land. The CLI emits a `decay-candidate` flag; the user gets a two-second prompt per finding: keep, cull, or promote now. Decay is deliberate, not silent expiry.

### Triggered Reshape

**Five options as a typed enum.** The reshape agent presents exactly these options at every reshape decision; any new options must be added to the enum in code.

| Response | When to pick | Cost |
|---|---|---|
| **Expand current slice** | Discovery is small, directly on the slice's path, doesn't change its goal. | Low. Plan edited; reviewers re-run on the delta only. |
| **Insert a slice before this one** | Discovery is a prerequisite — distinct unit of work, blocks the current slice. | Medium. Current slice pauses; new slice runs through Plan/Build; current slice resumes against updated architecture. |
| **Insert a slice after this one** | Discovery is needed for the epic to land but does NOT block the current slice. | Medium. Current slice continues; target updated; sequencing adjusted. |
| **Reshape the epic** | Discovery invalidates `architecture-target.md` — the shape of what the epic is building has changed. | High. Return to Shape with accumulated context; re-draft target; re-slice affected portions. |
| **Stop and promote to its own epic** | Discovery is out of scope entirely. | Very high. Only correct when in-place options would cause more damage. |

**Forcing function 1: target update first.** Any reshape must update `architecture-target.md` first. The CLI rejects a `reshape-applied` event whose timestamp precedes the corresponding `target-updated` event. Reviewers review the target diff before the new slice plan. This prevents silent scope creep — slice plans cannot edit themselves into a new shape without first amending the target.

**Forcing function 2: R1 is the trigger.** Slices do not quietly grow scope. A slice that discovers necessary work emits an `r1-block` with the five reshape options as the "paths forward" payload. The user picks an option; the CLI emits a `reshape-decision` event tied to the original block. Reshape outside an R1 block is forbidden by invariant.

**Reshape cap.** A per-epic reshape counter. Default cap: 3. Hitting the cap forces a Shape-level conversation about whether the epic is still coherent or should be split. The cap is a structural prompt, not a hard stop — the user can override after the conversation.

**Cross-slice invalidation check.** A reshape that adds, inserts, or restructures slices must explicitly re-verify downstream slices' assumptions against the updated target. The CLI emits a `cross-slice-revalidation-pending` flag for each downstream slice; reshape does not exit until each is either re-verified (event: `slice-revalidated`) or explicitly marked stale (event: `slice-marked-stale`). Build does not resume on a slice with a pending revalidation flag.

**Maturity multiplier on reshape.** Reshapes that touch foundational subsystems require higher bars (see Maturity section): the cap is 2 instead of 3, the user must explicitly approve each option presented (not just the recommendation), and the cross-slice invalidation re-check is mandatory rather than recommended.

**Audit trail.** Each reshape carries a `cause` field: `pressure-test-finding`, `refinement-convergence-failure`, `r1-trade-off-shift`, `invariant-violation`, `user-direction`. Reshapes triggered by an invalidated pressure-test assumption must update the Pressure-Test Summary in the new target, not just the diff. Reshapes triggered by Refinement Loop convergence failure must record that as the cause. The audit trail tells you *why* the reshape was necessary.

## Slice Land substeps

Slice Land is a transition contract with four mandatory substeps. The implementation enforces all four — none can be skipped, and the transition fails if any is missing.

**Four mandatory substeps.** The CLI's `gp slice:land` command expects four sub-events before it will emit the `slice-landed` event:

1. **`spine-promoted`** — for every spine doc the slice's diff touched (intersection of slice file diff with spine registry). Each promotion carries a `state_kind` matching the honest-intermediate-state rule (see Context Spine section). Empty-handed promotion ("no spine changes — verified") is allowed but must be declared.
2. **`discovery-ledger-triaged`** — every open finding in the epic's ledger is either triaged (promoted/merged/culled) or explicitly deferred to Epic Land with a rationale. Empty-handed triage is allowed but must be declared.
3. **`learnings-captured`** — at least one `learning-recorded` event OR an explicit `no-learnings` event with a rationale. Learnings are distinct from Ledger findings: a finding is *"this thing exists and we should act on it"*; a learning is *"we now know X about the system/problem/approach."* The CLI's extractor flags learnings that look like findings (they describe something to do rather than something now-known) and routes them to the ledger instead.
4. **`user-recap-acknowledged`** — the user has seen the recap, including any `target-edit-proposed` events from the slice, and triaged proposed follow-ups (do now / queue / drop). Acknowledgment is one keystroke but it's the contract that the user actually saw the result.

**Refuse-to-skip rule.** The `slice-landed` event has a precondition invariant requiring all four sub-events with timestamps preceding it. The CLI rejects the event if any is missing; the agent gets a structured error naming exactly which substep is incomplete. There is no override flag — skipping is not a supported operation.

**Honest-intermediate-state enforcement.** At Slice Land, a sanity-check reviewer samples the spine promotions and checks that the `state_description` matches what the slice's diff actually did. Mid-rename described as `complete` is a CRITICAL finding that blocks the land. The reviewer is light-touch (one pass, no Refinement Loop) but its finding is binding.

## Orientation and briefings

- **Briefings are first-class artifacts written eagerly at pause points.** Not reconstructed from events at return time — the LLM writes the briefing when context is freshest.
- **Types:** session-boundary briefings (end of user session), blocking briefings (R1 checkpoint fires), checkpoint briefings (during long autonomous runs at well-defined internal boundaries).
- **Each briefing includes:** time context (session duration, time since last user interaction), where we stopped and why, what just happened (narrative), what's next (intended next step with uncertainty), what needs a decision, what might have been missed, deep links to relevant artifacts.
- **Same mechanism serves humans returning after days/weeks AND fresh Claude sessions** that have no conversation memory. Every session start is a return experience.
- **The next-action menu is always produced at pause time** — the LLM must articulate its uncertainty while still in context, not leave vague "figure out where we are" for next time.

## Tight writing discipline

- **All LLM-produced artifacts use tight writing.** Cut hedging, throat-clearing, preambles, repetition. Prefer structure (tables, lists) over prose where denser. Say important things once and reference them.
- **Skills and agent prompts also use tight writing** (they're read by LLMs, which are robust to density).
- **Condensed grammar is not the right optimization.** Token savings are modest and harm readability. Tight writing (structural density) gives 20-40% reduction with no downsides.
- **Context-accumulation as a first-class reviewer question.** Every reviewer asks: "what context will the downstream agent need that isn't in this artifact? what stale context should be removed?" Grounded in "if I were the implementer with the codebase open but no prior conversation, would I have to stop and figure X out?"

## Scope boundary for the ideal implementation doc

The doc should cover:

- Event schemas (by type), including: `pre-flight-recorded`, `autonomy-window-open`, `r1-block`, `pressure-test-finding-accepted`, `spine-promoted`, `discovery-ledger-triaged`, `reshape-decision`, `cross-slice-revalidation-pending`, `maturity-promoted`, `human-checkpoint-scheduled`
- The canonical invariant set (starting ~20, plus the ones added in this doc: spine-promotion-at-slice-land, pre-flight-before-autonomy, R2-verification-runnability, maturity-consistent-with-dependents, reshape-target-update-precedence)
- Skill set and phase ownership, including which skill owns the Pressure Test
- CLI command surface, including: `gp spine:load`, `gp spine:add/remove`, `gp r1:block`, `gp finding:add`, `gp finding:relevant`, `gp subsystem:maturity`, `gp check-ready-to-merge`
- Agent types (phase, reviewer, editor, pressure-test) and their contracts
- Context bundle shape per phase, including the spine-load requirement
- Key command flows for major workflows (create-epic, plan-slice, implement, land, complete-epic, side-quest lifecycle)
- Extractor specs for each artifact type, including the pressure-test five-section schema and the verification structured object
- Reviewer contract format and registry layout
- Pre-flight template and the migration-loop telemetry hook
- Directory layout (this doc has the overview; the ideal implementation can expand)

The doc should NOT cover:

- Migration strategy from current implementation (that's the delta step, done separately)
- Implementation details below the skill/CLI interface
- Performance optimization (deferred until profiling shows a need)
- Backward compatibility with the current state format
