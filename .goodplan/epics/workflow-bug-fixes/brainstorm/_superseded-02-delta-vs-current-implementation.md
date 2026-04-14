# Arc 2 — Delta Analysis: Ideal Flow vs Current Implementation (rev 2)

Rewritten against the post-cohesion-pass `01-ideal-flow-from-first-principles.md`. The previous version of this doc framed deltas around "skill recut" and "snapshot model" as headline epics; that framing is wrong for this codebase. The pain is execution gap, not conception, and the right shape is **many bounded, in-place modifications** to the existing CLI + skill split.

## 1. Executive summary

The ideal flow asks for nine first-class mechanisms (Context Spine, Maturity Tracking, Pressure Test, Refinement Loop upgrades, R1 Discovery Checkpoints, R2 Build-Only-What-You-Can-Check, Discovery Ledger + Triggered Reshape, Slice Land consolidation). The current system already gestures at most of them — the `_overview.md`, the `priorities.ts` context table, the `slice-submit` review loop, the `complete-epic` skill, the side-quest entity. None of them are *fully shaped* as the ideal flow describes.

The shape of the change is **modify-in-place across `src/core/state/transitions/`, `src/core/context/`, `src/schemas/entities/`, `src/commands/{epic,slice,quest}/`, the per-skill `SKILL.md` files, and the per-agent `*-phase.md` files.** No subsystem is removed; no skill is renamed wholesale. Two new entity types are added (`spine`, `discovery`); one is upgraded from informal to first-class (`maturity` as a tag on architecture subsystems). The state machine gains snapshot-and-reason transitions but stays forward-driven; reshape is modeled as an explicit transition rather than a snapshot graph.

Approximate slice count: **~28 slices grouped into 5 arcs** (Foundations, Spine + Maturity, Steering, Refinement Upgrades, Discovery & Reshape). Headline points: most slices are small-to-medium (1–2 sessions); the load-bearing ones are the **Context Spine schema + promotion plumbing** and the **Discovery Ledger + Reshape decision matrix** because every other mechanism reads from or writes to them. The hardest mechanism to decompose is the Refinement Loop upgrade bundle — it has six independent sub-features that interlock, and care is needed to keep each slice individually shippable without leaving the loop in a half-converted state.

## 2. Division of labor (the contract this delta upholds)

| Layer | Owns |
|---|---|
| **CLI (`src/`)** | State integrity, schema validation (Zod), state machine transitions, structured queries (`gp status --json --query`), context bundling (`core/context/`), HMAC + activity log, atomic file ops, RPC contract |
| **Skills (`plugin/skills/`)** | Orchestration, interactive Q&A with the user, sub-agent dispatch, content generation, presentation, mode tagging, recap discipline |
| **Agents (`plugin/agents/`)** | Stateless workers (phase agents, reviewer agents) — invoked by skills, write artifact files via temp dirs, never touch `.goodplan/` |
| **Hooks (`plugin/hooks/`)** | Enforce the boundary (`protect-state.sh`), warn on bash that touches state |

Every delta in §3 is checked against this split. CLI gets schemas, transitions, queries, and bundling logic. Skills get prose, Q&A turns, and dispatch logic. Reviewers get contracts. Nothing crosses lanes.

## 3. Per-mechanism delta

### 3.1 Context Spine

**Intent.** Every phase begins by reading a small set of *managed* project-level docs (`architecture.md`, `conventions.md`, `invariants.md`, plus optional grounding docs) that are the single source of truth for shape, style, and required properties. Findings promote into the spine; slices update the spine honestly at Land; the spine carries maturity tags.

**Current state.**
- `.goodplan/architecture/_overview.md` exists, owned by the CLI and surfaced via `gp status --json --query '.artifacts.architecture'`.
- `.goodplan/conventions.md` is referenced in `CLAUDE.md` but is **not** a CLI-managed artifact (it's currently deleted at HEAD per git status; lives only as repo-level prose).
- **No `invariants.md` exists** anywhere — the concept is entirely implicit (HMAC, hooks, "no direct writes" rules live in `CLAUDE.md` and `plugin/hooks/protect-state.sh` but are not enumerated as a managed doc).
- Context bundling reads architecture via `src/core/context/collect.ts` + `priorities.ts` but treats it as one of many priority targets, not as a *substrate*.
- No promotion verb. Findings from `slice-submit.ts` reviewers don't flow into architecture.

**CLI changes.**
- New schema: `src/schemas/entities/spine.ts` defining `SpineDocument = { kind: 'architecture' | 'conventions' | 'invariants' | 'grounding', path, version, lastPromotedAt, maturityTags? }`.
- New data layer module: `src/core/data/spine.ts` (atomic read/write, HMAC-stamped, validates against schema).
- New commands under `src/commands/spine/`: `spine:list`, `spine:read`, `spine:promote --doc <kind> --finding <id> --reason "..."`, `spine:diff` (against `epic/target.md`).
- New transition `src/core/state/transitions/spine-promote.ts` — promotion is a recorded state event, not a silent file edit.
- `src/core/context/priorities.ts`: every phase's priority list grows a `spine: 'always-inline'` entry so the spine is *always* in the bundle, never overflowed to references.
- `src/core/context/collect.ts`: spine fetch becomes its own pass (Pass 0 — substrate), runs before the existing priority pass.

**Skill changes.**
- `plugin/skills/_references/` gets `spine-reading-protocol.md` describing the read-spine-first discipline. Each phase agent (`explore-phase.md`, `architecture-phase.md`, `plan-phase.md`, `implement-phase.md`) prepends a spine-read step.
- `plugin/skills/start-epic/SKILL.md`: architecture review step expanded to also surface `conventions.md` and `invariants.md` deltas if `epic/target.md` proposes any.
- `plugin/skills/complete-epic/SKILL.md`: closing reconciliation step expands to all spine docs, not just architecture.

**Slice candidates.**
1. **Slice 3.1.a — Spine schema + read-only commands.** Add `spine.ts` schema, `data/spine.ts`, `spine:list` and `spine:read`. Verification: `gp spine:list --json` returns architecture entry; vitest covers schema parse. **No behavior change** for any other subsystem yet.
2. **Slice 3.1.b — Promote `conventions.md` to managed spine doc.** Reinstate `.goodplan/conventions.md` (currently deleted), wire into spine entity, add to `gp status --json --query '.artifacts.spine'`. Verification: `gp spine:read --kind conventions` returns content; status query includes it.
3. **Slice 3.1.c — Author and seed `invariants.md`.** Enumerate the implicit invariants (HMAC integrity, no direct `.goodplan/` writes, schema-validated reads, version stamping). One-time content slice — but the mechanism (managed file under spine) lives. Verification: file exists, schema-valid, returned by `spine:list`.
4. **Slice 3.1.d — Spine-always-inline in context bundles.** Modify `priorities.ts` and `collect.ts` to always inline spine docs as Pass 0. Verification: integration test asserts every phase's `ContextBundle.inline` includes all three spine doc keys.
5. **Slice 3.1.e — `spine:promote` transition + activity log.** Add `spine-promote.ts` transition and the command. Verification: vitest unit test for the transition; integration test that promotion appears in `activity-log.jsonl`.
6. **Slice 3.1.f — Spine-aware skill prologues.** Edit `architecture-phase.md`, `plan-phase.md`, `implement-phase.md`, `explore-phase.md` to read spine first. Verification: dogfood `validate-consolidated.ts` run; assert each phase agent's first tool call references a spine path.

**Dependencies.** None outward; everything else builds on this. **3.1.a is the load-bearing slice** for the entire epic.

**Risk notes.** `invariants.md` content is genuinely hard to author well — the slice should land the *mechanism* with a minimal seed, and a follow-up quest can deepen it. Don't conflate "the doc exists and is managed" with "the doc is exhaustive."

---

### 3.2 Maturity Tracking

**Intent.** Each subsystem in `architecture.md` carries `experimental | maturing | stable | foundational` plus a `dependent count` falsifiability check. Maturity dials rigor for Pressure Test, Refinement Loop, R1 sensitivity, and reshape thresholds.

**Current state.**
- `.goodplan/architecture/_overview.md` already has a "Subsystem Maturity" table with the four-level vocabulary and a Dependents column. **The data exists as prose; it is not structured.**
- No CLI command surfaces it; no other code reads it.

**CLI changes.**
- Extend `src/schemas/entities/overview.ts` with a structured `subsystems[]` array: `{ name, path, maturity, dependentCount, justification }`.
- Add `gp architecture:subsystems --json` to query the table.
- Add `gp architecture:set-maturity --subsystem <name> --level <level> --reason "..."` — gated transition that requires user confirmation flag for `foundational` promotions.
- Wire maturity into `core/context/priorities.ts`: when a build phase touches subsystem X, learnings/decisions tagged to X are bumped to mandatory inline.

**Skill changes.**
- `architecture-phase.md`: when drafting `epic/target.md`, must enumerate any maturity transitions explicitly.
- `complete-epic` agent (`completion-epic.md`): adds a "maturity reconciliation" step — asks "did anything silently become load-bearing?" and proposes transitions.
- Reviewer contracts (`reviewer-software-architecture.md`, etc.) reference maturity when scoring.

**Slice candidates.**
1. **Slice 3.2.a — Structured maturity in overview schema.** Migrate the prose table into `overview.ts` schema. Backward-compat: parser tolerates both. Verification: schema parse test on the existing overview.
2. **Slice 3.2.b — `architecture:subsystems` query + maturity set transition.** Verification: CLI commands round-trip; activity log records changes.
3. **Slice 3.2.c — Maturity-aware context priority.** Modify `priorities.ts` so subsystem-tagged learnings get bumped when that subsystem is touched. Verification: unit test on bundle composition with a synthetic touched-subsystem set.
4. **Slice 3.2.d — Maturity in architecture-phase + completion-epic agents.** Verification: dogfood E2E asserts agent output includes maturity transitions when `epic/target.md` is drafted.

**Dependencies.** 3.2.c depends on 3.1.d (spine-always-inline) being in place so the priority changes layer cleanly.

**Risk notes.** Foundational promotions need a confirmation gate or the system will drift toward over-rigor. Implement the gate in 3.2.b, not later.

---

### 3.3 Pressure Test

**Intent.** Adversarial pass after `epic/target.md` is drafted, before refinement. Five questions, accept-with-justification first-class, accepted findings promote into the spine.

**Current state.**
- `architecture-phase.md` (4.7k) drafts the architecture and runs reviewers. **No adversarial step.** Reviewers critique what's there; the Pressure Test critiques what *isn't*, which is a different cognitive mode.
- `reviewer-holistic.md` is the closest existing thing but it's a generic critic, not a five-question structured pass.

**CLI changes.**
- New schema: `src/schemas/records/pressure-test.ts` — `{ epicId, draftRef, findings: [{ category, finding, disposition: 'fixed' | 'accepted', justification? }], summary }`.
- New transition `src/core/state/transitions/epic-pressure-test.ts` recording the pass as a state event tied to the epic phase.
- New command `gp epic:pressure-test --draft <path>` — stores the record, returns the structured findings shape for the agent to fill.
- Acceptance feeds `spine:promote` with `kind=architecture` and a `tag=pressure-test-constraint` annotation.

**Skill changes.**
- New agent: `plugin/agents/pressure-test-phase.md` — five-question prompt with adversarial-mode framing ("your job is to find ways this will hurt us").
- `architecture-phase.md`: insert a "run pressure test" step between draft and refinement. Output of the test is appended to `epic/target.md` as a Pressure-Test Summary block.
- `reviewer-software-architecture.md`: contract updated to *not* re-raise pressure-test-accepted findings.

**Slice candidates.**
1. **Slice 3.3.a — Pressure-test record schema + storage.** Verification: schema parse + atomic write test.
2. **Slice 3.3.b — Pressure-test phase agent + skill wiring.** Verification: dogfood `test-create-epic.ts` asserts the agent runs and produces five categorized findings.
3. **Slice 3.3.c — Promotion pipeline from pressure-test acceptance to spine annotation.** Verification: integration test — accept a finding, assert it appears in `spine:read --kind architecture` with the constraint tag.
4. **Slice 3.3.d — Reviewer awareness of accepted findings.** Verification: integration test — re-running reviewers after acceptance shows zero re-raises.

**Dependencies.** 3.3.c depends on 3.1.e (`spine:promote`).

**Risk notes.** The adversarial prompt posture is the load-bearing piece. Test it with E2E runs on at least two distinct epic shapes; if the agent slides into review mode, the slice fails.

---

### 3.4 Refinement Loop improvements

**Intent.** The existing review loop in `slice-submit.ts` and the reviewer agents already implements the basic shape. The ideal flow asks for **six specific upgrades**: context accumulation as an explicit reviewer question, change-scoped re-review, rigor scaled by maturity, reviewer contracts as fixed structures, weighted scoring by relevance, and convergence cost as a slicing signal.

**Current state.**
- `src/core/state/transitions/slice-submit.ts` (9.5k) implements review rounds, score thresholds, replan counter.
- `plugin/agents/reviewer-*.md` (~17 reviewers) each have a short freeform prompt — **not structured contracts**.
- `plugin/agents/synthesis.md` and `editor.md` exist; round-2 reviewers see the full artifact, not the diff.
- No weighting; all reviewers contribute equally to a unweighted average.
- No convergence-cost reporting.

**CLI changes.**
- Extend `src/schemas/records/` with `reviewer-contract.ts` (each reviewer's id, scope tags, scoring rubric, missing-context question template).
- Extend the round record in `slice-submit.ts` with `convergenceCost = { rounds, tokensApprox, stagnationScore }`.
- New query `gp slice:review-cost --slice <id> --json` exposing convergence metrics for the Triggered Reshape decision (§3.7).
- New command `gp reviewer:contracts --json` listing contracts and their weights.
- Modify the round-2+ payload constructor to package a *diff* against round 1 rather than the full artifact (change-scoped re-review).
- Weighted score aggregation in `slice-submit.ts`: each reviewer's score multiplied by `relevanceWeight = f(touched-subsystems, contract.scopeTags)`.

**Skill changes.**
- Each `reviewer-*.md` agent rewritten to a fixed contract shape: *"I check for X, Y, Z. I score 1–10 based on rubric R. I always answer: did the implementer have all the context they needed?"*
- New always-on reviewer question (added to every contract): **"Reading the codebase as it exists today, would the implementer have to stop and figure something out that this artifact doesn't tell them?"**
- `synthesis.md` updated to surface unresolved contradictions to the user (R1 territory) rather than silently picking a side.
- Rigor dial: each reviewer's threshold pulled from a maturity-aware lookup (`f(subsystem.maturity)`), not a hardcoded 7.

**Slice candidates.**
1. **Slice 3.4.a — Reviewer contract schema + migration.** Convert all 17 reviewer agents to the fixed contract shape. One-time content migration. Verification: schema-validate every reviewer file; existing dogfood tests still pass.
2. **Slice 3.4.b — Always-on context-accumulation question.** Add the question to every contract; route the answer into the synthesis output. Verification: dogfood asserts every reviewer's output includes the context question.
3. **Slice 3.4.c — Change-scoped re-review payload.** Modify `slice-submit.ts` round dispatcher to send diffs from round 2 onward. Verification: integration test — round 2 prompt size is meaningfully smaller than round 1 on a small change.
4. **Slice 3.4.d — Weighted scoring by relevance.** Add `relevanceWeight` and per-touch weighting to the aggregator. Verification: unit test on the aggregator with synthetic scores.
5. **Slice 3.4.e — Maturity-aware rigor thresholds.** Wire reviewer thresholds to the maturity table. Verification: unit test on threshold lookup; foundational subsystem reviewers require higher scores.
6. **Slice 3.4.f — Convergence-cost reporting.** Add the metric and the query. Verification: `gp slice:review-cost --json` returns shape; integration test increments rounds correctly.

**Dependencies.** 3.4.e depends on 3.2.a (structured maturity). 3.4.f is a prerequisite for 3.7's "convergence cost as reshape signal" feature. 3.4.a should land first because every other slice depends on the contract shape.

**Risk notes.** This is the **hardest mechanism to decompose**. The six upgrades interlock: 3.4.b without 3.4.c means longer prompts; 3.4.d without 3.4.a has no scope tags to weight against. The order above is forced; reordering breaks shippability. If a slice gets stuck, the right move is to land a thinner version of 3.4.a (covering only the most-used reviewers) and unblock the rest.

---

### 3.5 R1 Discovery Checkpoints

**Intent.** Inside autonomy windows (Survey, Build), the LLM may pause for exactly one reason: a discovery so trade-off-changing that the user would want to reconsider. Before any autonomy window, a **structured pre-flight** is presented to the user.

**Current state.**
- `implement-phase.md` (8.2k) is "fully autonomous" — only escape is `AskUserQuestion` on hard errors. **No pre-flight.**
- `explore-phase.md` (5.5k) runs research cycles; **no pre-flight.**
- No verb for "I discovered something the user should know about." Discoveries are inlined into agent prose and lost.

**CLI changes.**
- New schema: `src/schemas/entities/discovery.ts` — `{ id, scope: { epicId?, sliceId? }, severity: 'info' | 'tradeoff-change' | 'blocking', what, where, why, recommendation, ts }`.
- New command surface `src/commands/discovery/`: `discovery:flag`, `discovery:list --scope <id>`, `discovery:resolve --id <id> --action <...>`.
- New transition `src/core/state/transitions/discovery-flag.ts`. Transitions tagged `tradeoff-change` and `blocking` set a `pendingInterrupt: true` field on the slice/epic; the orchestrator polls for this between phase steps.
- New schema field on slice phase records: `preflightRef` pointing to the structured pre-flight statement.
- New record `src/schemas/records/preflight.ts` — `{ scope, willDo, willProduce, willPauseOn, knownAssumptions, expectedReturn }`.

**Skill changes.**
- New always-on reference `plugin/skills/_references/r1-discovery-protocol.md` — the *"if the user knew this, would they reconsider?"* judgment guide with worked examples.
- `implement-phase.md` and `explore-phase.md`: add a Step 0 that emits a structured pre-flight, calls `gp preflight:record`, and waits for user ack.
- Both phase agents add a between-step poll: `gp discovery:list --scope <id> --pending` — if a `tradeoff-change` or `blocking` finding is queued, the agent stops at the next safe boundary and surfaces it.
- `synthesis.md` (Refinement Loop) routes unresolved contradictions through `discovery:flag --severity tradeoff-change`.

**Slice candidates.**
1. **Slice 3.5.a — Discovery entity schema + commands.** Verification: round-trip CLI test; activity log entries.
2. **Slice 3.5.b — Pre-flight record schema + `preflight:record` command.** Verification: schema parse + storage test.
3. **Slice 3.5.c — Pre-flight wired into `implement-phase` agent.** Verification: dogfood `validate-consolidated.ts` asserts the agent emits a pre-flight before doing build work and that user-ack is awaited.
4. **Slice 3.5.d — Pre-flight wired into `explore-phase` agent.** Verification: dogfood `test-plan-slice.ts` (or analog) asserts pre-flight emission.
5. **Slice 3.5.e — Discovery polling between phase steps.** Verification: integration test — flag a `blocking` discovery, assert the next poll surfaces it and the agent halts.
6. **Slice 3.5.f — R1 protocol reference + judgment examples in skill prose.** Verification: dogfood asserts at least one discovery flag in a representative E2E run is correctly classified.

**Dependencies.** 3.5.e requires 3.5.a. 3.5.f benefits from 3.7 being at least partially landed, but isn't blocked.

**Risk notes.** The "between safe boundaries" poll point is subtle — if the agent polls too often it interrupts mid-edit; if it polls too rarely the block lands too late. Define "safe boundary" as "between phases of the implement loop" explicitly in the slice plan.

---

### 3.6 R2 Build Only What You Can Check

**Intent.** Every chunk carries an explicit, model-runnable verification method. Plan reviewers reject chunks with shallow or missing verification. Build windows declare verification up front. End with live observation, not just green tests.

**Current state.**
- `slice.ts` schema has a `goal` field but **no `verification` field**.
- `plan-phase.md` produces a plan that *describes* tests but doesn't structurally enforce per-chunk verification.
- `implement-phase.md` runs the build but has no contract that verification must include live observation. The user-level CLAUDE.md *Mandatory Verification* table is the de facto policy and lives outside the system.

**CLI changes.**
- Extend `src/schemas/entities/slice.ts` and `src/schemas/records/plan.ts` with `verification: { method, runnable: boolean, observationStep?, humanCheckRequired?: boolean }` per chunk.
- `slice-plan.ts` transition rejects plans where any chunk has `runnable: false` AND `humanCheckRequired: false` (forces honest classification).
- New query `gp slice:verification --slice <id> --json` exposing verification methods to reviewers.

**Skill changes.**
- `plan-phase.md`: every chunk in the plan must declare a verification. Editor agent enforces this on draft.
- New reviewer `reviewer-verifiability.md` (or extend an existing one) with a fixed contract: scores each chunk's verification for *runnable*, *tied to acceptance criteria*, *includes live observation*.
- `implement-phase.md`: after each chunk, runs the declared verification and emits the observation evidence into the activity log.

**Slice candidates.**
1. **Slice 3.6.a — Verification schema field on slice + plan records.** Verification: schema parse test; `slice-plan` transition rejects an invalid plan.
2. **Slice 3.6.b — `reviewer-verifiability.md` agent + reviewer contract.** Verification: dogfood asserts the reviewer fires on plan review and flags shallow verification.
3. **Slice 3.6.c — Implement-phase live-observation step.** Verification: dogfood asserts the activity log includes observation evidence (stdout/stderr capture, page screenshot, etc.) per chunk.

**Dependencies.** 3.6.b benefits from 3.4.a (reviewer contract shape). 3.6.c benefits from 3.5.a (so verification failures can flag discoveries).

**Risk notes.** "Live observation" is hard to enforce mechanically — the reviewer can be tricked. Design 3.6.b to ask for an *artifact path* (log file, screenshot, query result) rather than a self-report.

---

### 3.7 Work Discovered Mid-Epic (Discovery Ledger + Triggered Reshape)

**Intent.** Unify deferred work and blocking work under one decision matrix. Discovery Ledger captures non-blocking findings cheaply, triages at milestones, surfaces pull-based when adjacent epics start. Triggered Reshape gives blocking findings five explicit options.

**Current state.**
- Side quest is the closest existing concept (`quest-create.ts`, `create-side-quest` skill, 175 LoC). It's heavyweight at capture time and triages at the wrong moment.
- `complete-epic.md` agent does some rollup but it's epic-end only; there's no slice-end ledger triage.
- **No reshape concept at all.** The state machine has only `slice-abandon` as an escape; reshape collapses to "abandon and recreate."

**CLI changes.**
- Reuse the `discovery` entity from §3.5 — non-blocking findings are `severity: 'info'` discoveries; the ledger is just `gp discovery:list --status open`.
- Extend `discovery.ts` schema: `disposition: 'open' | 'promoted-to-task' | 'promoted-to-quest' | 'promoted-to-epic-candidate' | 'promoted-to-spine' | 'merged' | 'culled'`.
- New transition `src/core/state/transitions/discovery-triage.ts` for milestone triage (slice-end, epic-end).
- New transition `src/core/state/transitions/epic-reshape.ts` — five explicit reshape kinds: `expand-slice | insert-slice-before | insert-slice-after | reshape-epic | promote-to-new-epic`. Each requires a `triggerDiscoveryId` and updates `epic/target.md` first (forcing function #1 from the ideal flow).
- New query `gp discovery:list --touches-subsystem <name> --json` for pull-based surfacing when a new epic starts.
- Reshape cap: epic record gets `reshapeCount` field; transition rejects the 4th reshape and forces a Shape-level conversation (cap of 3 from the ideal flow).

**Skill changes.**
- `create-side-quest` skill **simplifies** to a thin wrapper around `gp discovery:flag --severity info` for non-blocking captures. The 175-line orchestrator collapses to ~40 lines. (This is the slice-level CLI/skill simplification allowance from framing decision #4.)
- New skill or skill section: `discovery-triage` step inserted into the slice-end (`completion-slice.md`) and epic-end (`completion-epic.md`) agents — mandatory step, allowed to be empty-handed.
- `implement-phase.md` and `architecture-phase.md`: when a blocking discovery fires, the agent presents the five reshape options with a recommendation (per R1 protocol).
- New agent `plugin/agents/reshape-phase.md` orchestrating the chosen reshape kind.

**Slice candidates.**
1. **Slice 3.7.a — Extend discovery schema with disposition + triage transition.** Verification: round-trip + transition unit test.
2. **Slice 3.7.b — Slice-end triage step in `completion-slice.md`.** Mandatory step. Verification: dogfood asserts the step runs (even when empty) and records the triage event.
3. **Slice 3.7.c — Epic-end triage step in `completion-epic.md`.** Verification: as 3.7.b but at epic close.
4. **Slice 3.7.d — Pull-based surfacing query.** Add `--touches-subsystem` filter; wire into `create-epic` skill's Sharpen step. Verification: integration test — flag a discovery against subsystem X, start an epic that touches X, assert the discovery surfaces.
5. **Slice 3.7.e — Reshape transition: expand-slice, insert-before, insert-after.** Three small reshape kinds; the cheap ones. Verification: unit tests per kind; activity log records the trigger.
6. **Slice 3.7.f — Reshape transition: reshape-epic, promote-to-new-epic.** The expensive ones; require `epic/target.md` update before transition. Verification: transition rejects when target hasn't been updated.
7. **Slice 3.7.g — Reshape orchestration agent + R1 prompt with five options.** Verification: dogfood E2E — inject a blocking discovery, assert the agent presents five options and routes the user's choice.
8. **Slice 3.7.h — `create-side-quest` skill simplification.** Collapse to thin wrapper. Verification: dogfood `test-plan-slice.ts` analog still passes; line count materially smaller.
9. **Slice 3.7.i — Reshape cap (3 per epic) + Shape-level escalation.** Verification: integration test — fourth reshape rejected with the right message.

**Dependencies.** All of §3.7 requires §3.5.a (discovery entity). 3.7.d benefits from §3.2 (subsystem tagging on context). 3.7.f requires §3.1 (`epic/target.md` as a managed artifact).

**Risk notes.** The reshape transition is the most state-machine-invasive change in the entire delta. Keep each reshape kind in its own slice (3.7.e splits naturally into three sub-slices if needed). The forcing function — "must update target first" — is load-bearing; if it slips, silent scope creep returns immediately.

---

### 3.8 Slice Land consolidation (collapse Reflect into Slice Land)

**Intent.** The ideal flow has *one* phase between Build and Repeat: Slice Land, with four mandatory substeps (promote spine, triage ledger, capture learnings, user recap). The current system splits this awkwardly between `implement` Step 6 and a separate completion step.

**Current state.**
- `implement-phase.md` Step 6 does a templated completion summary.
- `completion-slice.md` (6.7k) does the heavier completion work but is invoked separately.
- `slice-complete.ts` transition is the state event.
- The four substeps from the ideal flow are partially present but not enforced as a single atomic Land step.

**CLI changes.**
- Extend `slice-complete.ts` transition to require four sub-events: `spinePromoted`, `discoveryTriaged`, `learningsCaptured`, `userRecapAck`. Transition fails if any are missing.
- New schema field on slice record: `landSubsteps: { spinePromoted, discoveryTriaged, learningsCaptured, userRecapAck }` (each with timestamps).
- Add `gp slice:land --substep <name>` verbs for the agent to mark substeps complete.

**Skill changes.**
- Remove the templated Step 6 from `implement-phase.md`; replace with a hand-off to `completion-slice.md`.
- `completion-slice.md` agent restructured into four named substeps matching the ideal flow.
- The user recap follows the fixed shape: *what got built / what changed in the spine / what surprised us / what's queued / what needs your decision*.

**Slice candidates.**
1. **Slice 3.8.a — `landSubsteps` schema + transition gate.** Verification: transition fails when any substep missing; passes when all present.
2. **Slice 3.8.b — `completion-slice.md` restructured into four named substeps.** Verification: dogfood E2E asserts each substep emits its CLI verb call.
3. **Slice 3.8.c — Recap shape + decision-list discipline.** Verification: dogfood asserts the recap output matches the fixed shape (parsed from the agent's final message).
4. **Slice 3.8.d — Remove duplicate Step 6 from `implement-phase.md`.** Verification: dogfood — no duplication; `implement-phase` exits cleanly into `completion-slice`.

**Dependencies.** 3.8.a requires 3.7.b (discovery triage step) and at least 3.1.e (spine promotion verb). 3.8.b is mostly content, no hard deps.

**Risk notes.** The transition gate is strict — if a slice can't satisfy all four substeps it can't complete. Make sure trivial slices have a "land lite" path (empty triage, empty learnings) so they can pass through.

---

## 4. Slice sequencing proposal

Five arcs, ~28 slices. Arcs are roughly sequential but slices within an arc can parallelize where dependencies allow.

### Arc A — Foundations (the spine + maturity substrate)
1. **3.1.a** Spine schema + read-only commands
2. **3.1.b** Promote `conventions.md` to managed spine doc
3. **3.1.c** Author and seed `invariants.md`
4. **3.2.a** Structured maturity in overview schema
5. **3.1.d** Spine-always-inline in context bundles
6. **3.1.e** `spine:promote` transition
7. **3.2.b** `architecture:subsystems` query + maturity set transition
8. **3.1.f** Spine-aware skill prologues

*Exit state: every phase reads spine first; promotion verb exists; maturity is structured. No behavior else changed.*

### Arc B — Refinement upgrades (so reviewers can use the new substrate)
9. **3.4.a** Reviewer contract schema + migration
10. **3.4.b** Always-on context-accumulation question
11. **3.4.c** Change-scoped re-review payload
12. **3.4.d** Weighted scoring by relevance
13. **3.4.e** Maturity-aware rigor thresholds
14. **3.4.f** Convergence-cost reporting
15. **3.2.c** Maturity-aware context priority
16. **3.2.d** Maturity in architecture-phase + completion-epic agents

*Exit state: refinement loop is the version the ideal flow describes; reviewers know about spine and maturity.*

### Arc C — Steering (R1 + R2)
17. **3.5.a** Discovery entity schema + commands
18. **3.5.b** Pre-flight record schema + command
19. **3.6.a** Verification schema field on slice + plan
20. **3.5.c** Pre-flight wired into `implement-phase`
21. **3.5.d** Pre-flight wired into `explore-phase`
22. **3.6.b** `reviewer-verifiability` agent + contract
23. **3.5.e** Discovery polling between phase steps
24. **3.6.c** Implement-phase live-observation step
25. **3.5.f** R1 protocol reference + judgment examples

*Exit state: every autonomy window has a pre-flight; discoveries can fire mid-flight and surface at safe boundaries; verification is enforced.*

### Arc D — Pressure Test (depends on spine + reviewers being upgraded)
26. **3.3.a** Pressure-test record schema + storage
27. **3.3.b** Pressure-test phase agent + skill wiring
28. **3.3.c** Promotion pipeline from acceptance to spine annotation
29. **3.3.d** Reviewer awareness of accepted findings

*Exit state: every epic's Shape phase ends with a pressure-test summary; accepted findings live in the spine.*

### Arc E — Discovery Ledger + Reshape + Land consolidation
30. **3.7.a** Discovery disposition + triage transition
31. **3.8.a** `landSubsteps` schema + transition gate
32. **3.7.b** Slice-end triage step
33. **3.8.b** `completion-slice.md` restructured
34. **3.7.c** Epic-end triage step
35. **3.8.c** Recap shape + decision-list discipline
36. **3.7.d** Pull-based surfacing query
37. **3.7.e** Reshape transition: cheap kinds (expand, insert-before, insert-after)
38. **3.7.f** Reshape transition: expensive kinds (reshape-epic, promote-to-new-epic)
39. **3.7.g** Reshape orchestration agent
40. **3.7.h** `create-side-quest` simplification
41. **3.7.i** Reshape cap + escalation
42. **3.8.d** Remove duplicate Step 6 from `implement-phase`

*Exit state: ideal flow's Land discipline + reshape decision matrix are live; side-quest skill is the thin wrapper version.*

(Actual count is closer to 42 if every sub-slice ships individually; the ~28 estimate in §1 collapses some closely related pairs. The user can decide the resolution at slice-time.)

## 5. Pain-point crosswalk

| User pain | Slices that address it |
|---|---|
| **Clunky phase transitions** (manual `/gp:foo` firing, awkward re-entry) | 3.5.b/c/d (pre-flight as the explicit handoff), 3.8.b/c (Land recap with named "next") — and a small follow-up could add a `nextIntent` field to slice records, but this is now a *consequence* of the Land-recap discipline, not a separate slice. |
| **Wrong context bundles** | 3.1.d (spine always inline), 3.2.c (maturity-aware priority), 3.4.b (context-accumulation reviewer question), 3.4.c (change-scoped diffs reduce noise) |
| **Rigid state machine** | 3.7.e/f (reshape kinds replace abandon-and-recreate as the escape hatch), 3.8.a (Land gate is strict but supports a lite path), 3.7.i (cap forces escalation instead of silent drift) |
| **User steering vs autonomy balance** | 3.5.c/d (pre-flight is the cheap steering moment), 3.5.e (discovery polling is the only legitimate interrupt), 3.6.c (live observation forces honest "is it actually done"), 3.4.f (convergence cost surfaces "this slice is too big") |

Every pain point is addressed by at least three slices. The first two pains are addressed in Arc A–B; the second two are addressed primarily in Arc C and Arc E.

## 6. Open questions for the architecture phase

1. **`epic/target.md` as a managed file** — currently informal. Should it become a spine-adjacent entity (like architecture, but epic-scoped) with its own schema and transition? Probably yes, but it adds a 43rd slice. Decide before Arc D starts.
2. **Discovery polling cadence** — between every agent tool call? between phase steps? a separate watcher? Affects 3.5.e's complexity by an order of magnitude.
3. **Pre-flight format: structured (schema-validated) or freeform-with-required-sections?** The ideal flow says structured; the agents will resist. Decide once before 3.5.b ships or it'll get re-litigated per slice.
4. **Reshape cap value** — 3 is the ideal-flow default but may be too low for early epics where the workflow itself is being learned. Configurable per project? Hardcoded?
5. **Reviewer contract format** — TOML, JSON-in-frontmatter, or a structured Markdown block? Affects 3.4.a substantially.
6. **Relationship between `discovery` entity and existing `task` entity** — overlap is real. Either deprecate `task` or define a sharp boundary (task = "user said do this," discovery = "agent noticed this"). Decide before 3.7.a.
7. **`create-side-quest` deprecation timing** — collapse in 3.7.h or leave the heavy version in place behind a flag for one release? Affects how fast Arc E can ship.

These are signals for the next phase, not blockers. Most are 5-minute decisions with the user once the architecture phase opens.
