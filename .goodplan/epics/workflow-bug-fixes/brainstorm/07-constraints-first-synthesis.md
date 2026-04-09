# Constraints-First Synthesis

A fresh architecture for workflow-bug-fixes, organized from the ground up around two non-negotiable constraints. This is not 06 with patches. It is a different shape: a **Trust Substrate** sits beneath everything else, and every artifact-producing or code-producing phase of the workflow is gated on evidence that substrate produces.

06 asked *"what is the smallest set of mechanisms that covers every problem?"* and arrived at eight elements. 07 asks a different question: *"if we accept that LLM output is untrusted until proven, what architecture falls out?"* The answer shares a lot of surface with 06 — the spine, the event log, the pause discipline, the discovery matrix — but the center of gravity moves. The Refinement Loop is no longer one element of eight. It becomes the substrate the other seven are built on, in two expressions: refinement for artifacts, verification for code.

---

## 1. Meta-principle and the two constraints

### The meta-principle

> **Trust is earned through evidence, not asserted through production.**

An LLM producing something — an architecture target, a plan, a slice definition, a chunk of code — does not make that thing trustworthy. Downstream work cannot build on it until evidence exists that it is good enough to build on. "The LLM wrote something" and "the workflow can build on something" are two distinct states, separated by evidence. **LLM output is a claim; evidence is what makes the claim true.**

This single principle has two faces, because the evidence that makes an artifact trustworthy is not the same kind of evidence that makes code trustworthy. The two faces are the two constraints below. Every other architectural choice in this document is a consequence of one or both of them.

### Constraint 1 — Refinement before handoff

> Any substantive artifact produced by an LLM is untrusted until it has been reviewed by multiple specialized sub-agents whose domains are relevant to the artifact's contents, across multiple iterative rounds, producing structured scores against a defined rubric, converging on a quality bar that mechanically signals the artifact is done and ready to hand off. No handoff happens until the bar is met.

Unpacked:

- **Substantive artifact** = anything downstream work will read and build on. Target architectures, slice definitions, plans, pressure-test reports, epic-land summaries, post-landing architecture updates. Not: casual prose, private scratch, commit messages.
- **Multiple specialized sub-agents** = plural, and chosen because their domain is relevant to what's in the artifact. Not a single generalist reviewer. Not a fixed roster regardless of content. Routing is part of the substrate.
- **Multiple iterative rounds** = at least two passes where earlier rounds' findings are incorporated and checked. A one-shot review is not refinement.
- **Structured scores against a defined rubric** = reviewers emit machine-parseable evidence, not free prose. The rubric is known to the artifact producer up front so they can draft against it.
- **Convergence on a mechanical bar** = exit is determined by the scores, not by the LLM feeling done. No CRITICAL, no IMPORTANT, MINOR-only, two consecutive rounds with no new findings — whatever the bar is, it is explicit and checkable.
- **No handoff until the bar is met** = the next phase cannot start. The invariant engine refuses the transition.

When the loop cannot converge, that is itself a signal — and the workflow surfaces it to the user as a real decision, not a silent acceptance.

### Constraint 2 — Execution verification before done

> When an LLM implements code, the work is not "done" until the LLM has directly executed the code in a live environment, observed the actual result, and verified that the observation matches a pre-specified expectation. Tests are a useful tool but not sufficient on their own — passing tests do not constitute verification by themselves. When direct execution verification is impossible, that fact must be surfaced to the user explicitly so the user can choose a different approach.

Unpacked:

- **Directly executed in a live environment** = the code actually ran. Not compiled, not type-checked, not linted. Ran. Produced behavior.
- **Observed the actual result** = the agent captured what happened — output, state, a screenshot, a log line, a shape of data, a response to a curl.
- **Matches a pre-specified expectation** = the expectation was written *before* the run, as part of the plan. It is not invented after the fact to match what the run produced. The expectation and the observation are two separate artifacts, compared at the end.
- **Tests alone are insufficient** because *"a test that passes because it tests almost nothing is worse than no test, because it manufactures confidence."* Tests can be *part of* verification only if the agent can demonstrate that the test actually exercises the changed code path. A test blindly added alongside a change is not evidence.
- **Impossibility must be surfaced** = if verification cannot be done (the environment is unavailable, the behavior is subjective, the dependency is external and untouchable), the workflow pauses with a structured decision. The user chooses: redesign the work, accept an approximation with a declared limitation, insert a human verification step, or rethink the approach. **Silent substitution with proxy signals is forbidden.**

### The two faces, one rule

Both constraints are the same rule applied to different media. For prose-shaped things, evidence is specialized reviewer scores against a rubric. For executable things, evidence is live observation matching expectation. For things that are both — a plan that contains executable chunks — both kinds of evidence apply (the plan as artifact goes through refinement; the chunks it specifies will each go through verification when built).

---

## 2. Problems

### 2.1 Problems the constraints directly create or reveal

Starting from the constraints themselves, before importing anything from 01/06:

**C-P1. Reviewers need to be selected, not fixed.** If reviewer selection is domain-dependent on artifact content, the workflow needs a registry of reviewers declaring what they know, and a selector that reads the artifact and picks the relevant ones. A hardcoded roster fails Constraint 1's "specialized sub-agents whose domains are relevant."

**C-P2. Rubrics need to exist, be versioned, and be readable by the producer up front.** A rubric invented per run is not a rubric. A rubric the producer can't see is a hazing ritual. Rubrics are first-class artifacts in the repo, versioned, and quoted into the producer's context before drafting begins.

**C-P3. Convergence needs to be mechanical, not vibes.** "The reviewers seem happy" is not convergence. The substrate must define what "done" looks like as a function of the score stream, and the CLI must be able to evaluate it without asking the LLM.

**C-P4. Non-convergence needs an escape hatch that doesn't degrade into surrender.** A loop that could run forever is no better than a loop that exits too soon. The substrate must detect stuck states — two rounds in a row with the same critical findings, oscillation between reviewers, rubric items that cannot be resolved — and route to the user with a structured decision.

**C-P5. Re-review must be change-scoped or it stagnates.** Reviewers handed the whole artifact on round 3 will drift, re-raise, and reopen settled issues. They must see the diff since their prior pass and answer a fixed question: *"did your prior concerns get resolved, and are there new ones?"*

**C-P6. Refinement has a cost; it must scale with stakes.** Running five reviewers for three rounds on every artifact bankrupts the workflow. The rigor dial (reviewer count, round budget, rubric strictness) must be a function of what's being reviewed: foundational targets get the deepest pass, experimental side quests get a light one.

**C-P7. Plans must pre-specify verification for every chunk, or Constraint 2 cannot be enforced at build time.** This means the plan artifact itself must contain, per chunk: description, expectation, verification method, verification type. If any chunk is missing these, the plan is incomplete by rubric — it fails its own refinement gate.

**C-P8. Verification methods must be meaningful, not cargo-culted.** The plan refinement loop must have a reviewer whose sole job is to interrogate the verification method: *does running this actually exercise what the chunk changes? or is it a green checkmark factory?* If the reviewer can't tell, the chunk is flagged for the author to strengthen.

**C-P9. "Impossible to verify" must be a first-class plan state, not an accident at build time.** If a chunk is known to be unverifiable at plan time, the plan declares it as `impossible-with-reason` and surfaces it during refinement. The user decides during planning whether to accept, redesign, or remove. Build-time discovery of unverifiability is allowed, but it routes through the same user decision, not a silent skip.

**C-P10. Verification events need a schema, or "done" is not machine-checkable.** The event log must carry `chunk-verified { matched: bool, evidence: ..., method: ... }` and `chunk-unverifiable { reason, user-decision }`. The invariant on slice completion is "every chunk has one of these events."

**C-P11. Evidence must be distinguishable from assertion in the log.** A `chunk-verified` event must carry the observation, not just a boolean. Otherwise the LLM can emit the event without doing the work and nothing catches it.

**C-P12. Build agents will be tempted to fake verification.** When the path of least resistance is to claim verification happened, some runs will claim it without doing it. The substrate's defense is that the verification evidence itself has to be present in the event (not a bare boolean), and a spot-check reviewer can sample events and re-run the verification.

**C-P13. Refinement loops produce a lot of events.** The event log must tolerate dense per-round event emission (reviewer scores, round summaries, convergence checks) without becoming unreadable. Querying "final reviewer verdicts for artifact X" must be cheap.

### 2.2 Problems imported from 06/01 that are still relevant

The constraints do not eliminate the existing problem set. Many problems from 06 remain, unchanged:

- **P1 grounding rebuild.** The LLM still re-derives project context every run. Still needs a spine.
- **P2 steering economy.** User attention is still the scarce resource. The new refinement loop eats user attention if mis-calibrated, so this gets *worse*, not better.
- **P3 mid-flight reality.** Plans are still wrong in ways only visible during execution.
- **P6 silent architectural drift.** Architecture still needs promotion at slice land.
- **P7 silent convention/invariant change.** Still first-class.
- **P11 plan correct but context-poor.** The refinement loop now has this as a *core* rubric question, not a side one.
- **P13 stale context in artifacts.** Same.
- **P14 when to interrupt.** Pause discipline still needed, and now absorbs a new trigger (unverifiable chunk).
- **P15 puzzle questions.** Still true; the refinement loop's circuit breaker to the user inherits this rule.
- **P16 pre-flight asks.** Still true.
- **P17 return after stop.** Still true.
- **P18 state rigidity.** Event log still answers this.
- **P19 merge resilience.** Same.
- **P20 LLM-proof integrity.** *More* critical under the constraints — if the LLM can fake a `chunk-verified` event, the whole substrate collapses.
- **P21 unified discovery.** Still true; the 2x2 still works.
- **P22 triage at milestones.** Still true.
- **P23 pull-based surfacing.** Still true.
- **P24 subsystem identity.** Needed — now also as the routing input for reviewer selection (C-P1).
- **P25 doc depth scales with maturity.** Still true; maturity also feeds the rigor dial (C-P6).
- **P26 next-action menu at pause time.** Still true.
- **P27 every session start is a return.** Still true.
- **P28 honest intermediate states.** *"Mid-rename is mid-rename"* is load-bearing for the spine and for in-progress refinement artifacts too.
- **P29 CLI necessity.** Same.
- **P30 direct-edit protection.** Same, more critical.

What drops out:

- **P4 model defends first design.** Subsumed — the refinement loop's adversarial reviewers are now the permanent posture, so "Pressure Test as a separate named moment" becomes less load-bearing. (Kept anyway, see §4.4, because the *"errors made impossible"* prompt remains uniquely valuable up-front.)
- **P5 wrong rigor for maturity.** Now handled at the substrate level via the rigor dial.
- **P8/P9/P10 verification problems.** Absorbed by Constraint 2 as the architectural spine of implementation.
- **P12 reviewer drift.** Absorbed by the substrate's change-scoped re-review and reviewer contracts.

### 2.3 Grouped problem set

| Group | Problems | Concern |
|---|---|---|
| **G-Trust** | C-P1..C-P13, P4, P5, P8, P9, P10, P11, P12, P13 | Evidence-gated handoff for artifacts and code |
| **G-Grounding** | P1, P6, P7, P24, P25, P28 | Single honest current picture of the project |
| **G-Steering** | P2, P14, P15, P16, P17, P26, P27 | Concentrate user attention at chosen moments |
| **G-Mid-flight** | P3, P21, P22, P23 | Absorb discoveries without losing scope or history |
| **G-State** | P18, P19, P20, P29, P30 | Append-only, mergeable, LLM-proof substrate |

Five groups, not eight. G-Trust absorbs everything about rigor, review, and verification. Everything else is in service of either grounding the Trust Substrate (G-Grounding), concentrating user intervention in it (G-Steering), updating it as reality changes (G-Mid-flight), or enforcing it (G-State).

---

## 3. The Trust Substrate

This is the center of the architecture. Every other element reads from or writes to it.

### 3.1 Shape

The Trust Substrate is a single mechanism with two expressions. It consists of:

1. **A reviewer/verifier registry.** A set of named agents, each with a declared contract: name, version, domains (`architecture`, `invariants`, `security`, `data-model`, `prose-tightness`, `verification-plausibility`, `context-transport`, ...), input shape, output shape, and a reference to the rubric dimensions they score against.
2. **A rubric library.** Versioned, in-repo, per-artifact-type. A rubric defines scoring dimensions (each with a scale and a severity: `BLOCKING`, `CRITICAL`, `IMPORTANT`, `MINOR`) and the convergence bar for that artifact type. Producers read the rubric before drafting.
3. **A routing function.** Given an artifact (type + content + subsystem tags + maturity), select which reviewers run and at what rigor level. Pure function, deterministic, CLI-owned.
4. **Structured evidence events.** Every reviewer pass emits a `reviewer-scored` event (artifact id, artifact version/diff, reviewer id, round number, dimension scores, findings with severity, free-text rationale). Every verification attempt emits a `chunk-verified` or `chunk-unverifiable` event with concrete evidence.
5. **A convergence evaluator.** A pure function over the event stream that, for a given artifact, computes: `CONVERGED` / `NOT_CONVERGED(reason)` / `STUCK(reason)`. Lives in the CLI.
6. **A circuit breaker.** When convergence evaluator returns `STUCK`, the workflow pauses with a structured handoff to the user: which dimensions are stuck, which reviewers disagree, what the options are. Re-uses the Pause Discipline (§4.3).
7. **Invariants gating downstream transitions.** *"No phase transition can fire if the artifact the previous phase produced has not reached CONVERGED."* Enforced at the CLI layer, below the LLM.

### 3.2 Two expressions

#### 3.2.1 Expression A — Artifact refinement (Constraint 1)

**Targets:** target architecture, epic slice set, individual slice definition, implementation plan, pressure-test report, epic-land synthesis, post-slice architecture-delta, invariant proposals.

**Flow:**
1. Producer reads rubric and relevant spine context, drafts artifact, emits `artifact-drafted` event.
2. **Plan-shape checkpoint (plan artifacts only, mandatory).** Before reviewers run, the producer surfaces the draft to the user and enters an interactive shape-collaboration mode. The user and the LLM shape the skeleton together — structure, ordering, scope of chunks, framing — while the plan is still malleable and has not yet accreted reviewer context. Refinement does **not** run until the user explicitly signals "shape-approved, proceed to refinement." See §4.3's *Scheduled steering checkpoints* for the discipline. Other artifact types may opt into a shape checkpoint via the rubric; for plans it is non-negotiable.
3. Routing function picks reviewers based on artifact type, content tags, and subsystem maturity.
4. Each reviewer reads the full artifact (round 1) and emits `reviewer-scored`.
5. Convergence evaluator: if `CONVERGED`, emit `artifact-converged` and unblock downstream; else producer sees aggregated findings.
6. Producer addresses findings, emits `artifact-revised` with a diff against the prior version.
7. Each reviewer from round N-1 sees the **diff**, not the full artifact, and answers the single question: *"did your prior concerns get resolved, and are there new ones in the changed region?"* Re-review is change-scoped.
8. Loop until `CONVERGED` or `STUCK`.
9. `STUCK` → circuit breaker → Pause Discipline → structured user decision → either forced convergence with a recorded override, or redesign, or abandon.

**Refinement only runs on shape-approved plans.** Refinement does not bypass, replace, or substitute for the shape checkpoint. A plan that has not been shape-approved cannot enter the reviewer loop; the invariant engine refuses it the same way it refuses unconverged handoffs.

**Always-on reviewers (attached to every artifact regardless of type):**
- **Holistic-coherence reviewer** — internal consistency and claims-vs-content.
- **Invariant reviewer** — checks that nothing proposed violates a spine invariant.
- **Context-transport reviewer** — asks the two universal questions: *"what context would a fresh implementer (codebase open, no prior conversation) have to stop and figure out?"* and *"what context in this artifact is stale, unused, or crowding out what matters?"* Both are first-class rubric dimensions.

**Artifact-specific reviewers** attach based on content. A target involving auth gets a security reviewer. A plan touching the data layer gets a data-model reviewer. A slice touching CLI surface gets a command-surface reviewer. The routing function owns the selection.

**Rubric format (sketch):**

```
rubric:plan/v3
  dimensions:
    - id: context-transport
      scale: 0-5
      severity-for-below-threshold: IMPORTANT
    - id: verification-plausibility
      scale: per-chunk pass/fail
      severity: BLOCKING on any fail
    - id: scope-coherence
      ...
  convergence:
    all-blocking-zero: true
    all-critical-zero: true
    important-count-max: 2
    minor-ok: true
    stuck-if:
      - same-blocking-finding-two-rounds-consecutive
      - reviewer-disagreement-unresolved-three-rounds
```

**Rigor dial (C-P6).** The routing function reads the maturity tag of affected subsystems (§4.1). Foundational → full reviewer set, deeper rubric, higher round budget. Experimental → minimum viable set (holistic + invariant + one domain), lower round budget, less strict convergence. The dial is not a skill-level judgment; it is a deterministic function of content.

#### 3.2.2 Expression B — Code verification (Constraint 2)

**Targets:** every chunk in every plan that implements real code. Not docs-only chunks, not config-only chunks (though those get their own lightweight verification — e.g., config-loaded-and-parsed).

**Plan-time obligations (enforced by the refinement loop on plans):**

Every chunk declares, in the plan artifact:

```
chunk:
  id: c17
  description: Add `task:defer` command that appends a defer event to the task log.
  expectation: After `task:defer 42 --until=tomorrow`, `task:list --pending` no longer shows task 42 today, but shows it tomorrow.
  red-test: |
    A unit/integration test that invokes `task:defer` and asserts the log contains
    a `task-deferred { id, until }` event. The test MUST be written before the
    implementation and MUST be observed to fail (command not found / event absent)
    before any implementation code is added. The failure is itself an expectation:
    it proves the test actually exercises the intended behavior and is not a
    cargo-culted green checkmark.
  verification-method: |
    1. Seed a task with `task:create "foo"` and record its id.
    2. Run `task:defer <id> --until=2026-04-08`.
    3. Run `task:list --pending --as-of=2026-04-07 --json` → assert id absent.
    4. Run `task:list --pending --as-of=2026-04-08 --json` → assert id present.
  verification-type: live
```

**verification-type** is one of:
- `live` — the agent will run code and observe real behavior (the default and the baseline Constraint 2 demands).
- `supplementary-tests` — a unit/integration test will be written *and* the test will be demonstrated to exercise the changed code path (diff coverage, mutation survival, or an executable sanity check). Tests alone never satisfy verification without this demonstration.
- `impossible-with-reason` — the chunk cannot be verified by the agent. The reason must be concrete: "requires subjective judgment of UI feel," "depends on external service we cannot invoke," "verification requires hardware unavailable in this environment."

The **verification-plausibility reviewer** (always attached to plan artifacts) interrogates every chunk:
- Does the verification method actually exercise what the description says changes?
- Is the expectation falsifiable? (An expectation like "works correctly" is not.)
- Is this `live` pretending to be `live` when it's really just a type check or a build?
- If `supplementary-tests`, is the coverage demonstration concrete?
- If `impossible-with-reason`, is the reason specific enough to give the user a real choice?
- **Does the `red-test` exercise the chunk's expectation — not an adjacent property?** A test that asserts something other than what the chunk is meant to do is rejected, even if it happens to exercise nearby code.
- **Does the `red-test` test behavior, not implementation details?** Tests that lock in specific internal choices (private method signatures, incidental call counts, internal data shapes) are rejected. Tests that verify observable outcomes are accepted.
- **Is the `red-test` meaningful?** A test that fails for trivial reasons (`expect(1).toBe(2)`, unconditional throw, unrelated assertion) is not a valid red test even if it technically fails initially. The failure must be caused by the absence of the thing the chunk is meant to add.
- **Could the `red-test` pass for reasons unrelated to the described change?** If yes, it is cargo-culted and rejected. The reviewer traces: if the chunk's change were reverted, would this test actually fail for the intended reason?
- **Is the `red-test` distinct from the `verification-method`?** The red test proves intent-alignment at the unit level in isolation or a controlled environment; the verification method proves behavior in production-shape conditions at the live-execution level. Both are required, and a plan that collapses the two loses the property each one provides.

Any chunk that fails these is a BLOCKING finding. The plan cannot converge until every chunk passes.

**Build-time flow (when implementing a chunk) — the red-green-verify loop:**

1. Agent loads the chunk from the plan (the contract: description, expectation, `red-test`, verification-method, verification-type).
2. **Red.** Agent writes the `red-test` as specified and runs it. The test MUST fail. The failure is captured as evidence — a passing test at this step is itself a bug (the test is not exercising the intended behavior, or prior state satisfies it accidentally) and the chunk halts until the test is rewritten to fail for the right reason.
3. **Green.** Agent writes the implementation code until the `red-test` passes. No other changes; the goal is to move the one test from red to green.
4. **Verify.** Agent runs the `verification-method` in the live environment.
5. Agent captures observations (output, state dumps, screenshots, curl responses, log excerpts).
6. Agent compares observation against expectation.
7. If match: emit `chunk-verified { id: c17, method: live, expectation: ..., observation: ..., red-test-initial-failure: ..., red-test-final-pass: ..., matched: true, evidence-ref: ... }`.
8. If mismatch: the agent does **not** edit the expectation. It diagnoses the mismatch and either fixes the implementation, re-runs, or, if the mismatch is because the expectation itself was wrong, pauses (the plan artifact needs a revision, which re-enters refinement).
9. If verification turns out to be impossible at build time (environment broken, dependency missing, something the plan did not foresee): emit `chunk-blocked-on-verification` and pause with the Unverifiable-Chunk Decision (see §4.3).

**TDD is additive, not a substitute for live execution.** The red-green loop gives one property — it proves the test exercises the intended behavior, because the test was observed to fail before the code existed. Live verification gives a different property — it proves the real-world behavior the user cares about actually happened. Constraint 2's language is deliberately stronger than red-green TDD and stays that way: *"a test that passes because it tests almost nothing is worse than no test."* TDD contributes to the evidence; it never replaces the live-execution observation that Constraint 2 demands.

**Invariant on slice completion:**

> `slice-completed` cannot fire unless every `chunk` in the slice plan has either a `chunk-verified { matched: true }` event or a `chunk-unverifiable { user-decision: accepted-with-reason }` event.

**Anti-fake-verification defenses:**

- `chunk-verified` carries evidence, not just a boolean. The schema requires a non-empty `observation` field.
- A `verification-spot-check` reviewer can sample N% of `chunk-verified` events in an epic-land synthesis and re-run the verification method, comparing its observation to the one in the event. Divergence triggers an IMPORTANT finding against the build agent and may retro-demote the chunk to unverified.
- The Pressure Test (§4.4) explicitly includes the question: *"for which chunks could the LLM plausibly fake verification without anyone noticing? strengthen those methods."*

#### 3.2.3 Code refinement loop — Constraint 1 applied to implemented code

Execution verification (Constraint 2) answers *"does this code do what it's supposed to?"* — a mechanical per-chunk check that behavior matches expectation. It does not answer *"is this code good enough to live in the project?"* — the quality dimensions of performance, reliability, security, domain correctness, code style, and test meaningfulness. Under Constraint 1, implemented code is itself an artifact and must earn trust through review.

After every chunk in a slice has passed execution verification (Constraint 2 satisfied), the implemented code enters a **code refinement loop**: specialized reviewers evaluate quality dimensions, iterating until a quality bar is met. This is not a new top-level element — it is the refinement loop mechanism from §3.2.1 applied to code as the artifact, with reviewer categories specialized for code quality dimensions. *"The refinement loop is applied to code after execution verification, with reviewer categories specialized for code quality dimensions. This is Constraint 1 applied to implemented code: the code earns trust through review, just as artifacts earn trust through review."*

**Reviewer categories (starting set, expandable via the reviewer registry):**

- **Performance** — hot paths, algorithmic complexity, memory usage, I/O patterns.
- **Reliability** — error handling, edge cases, recovery paths, failure modes.
- **Security** — input validation, auth/authz, secrets handling, injection surfaces.
- **Domain correctness** — business logic, invariants maintained, contract adherence.
- **Code style and maintainability** — readability, consistency with the existing codebase, naming, structure.
- **Test meaningfulness** — tests actually exercise the claimed behavior; no cargo-culted tests. This is the slot for cargo-cult detection at code-review time, complementing the plan-refinement-time check on `red-test` (§3.2.2).
- **Subsystem reviewers** — pulled dynamically by the routing function based on which subsystems the slice touches.

The loop reuses the substrate wholesale: routing function, rubric library (with a `code/vN` rubric), convergence evaluator, circuit breaker, change-scoped re-review, rigor dial. The artifact is the slice's diff; rounds operate on the diff and on successive revisions. STUCK routes through the Pause Discipline exactly as artifact refinement does.

**Invariant on slice completion (strengthened from §3.2.2):**

> `slice-completed` cannot fire unless every chunk has a `chunk-verified { matched: true }` (or `chunk-unverifiable { user-decision: accepted-with-reason }`) event **and** the slice's code has a `code-refined { converged: true }` event. No slice may enter Slice Land until all chunks are verified AND the code has passed the code refinement loop.

### 3.3 Shared substrate infrastructure

Both expressions share:

- **The event log** (§4.2) as the evidence store.
- **The CLI** as the sole writer (so evidence cannot be forged by direct file edits).
- **The invariant engine** as the gatekeeper (so downstream phases cannot fire without evidence).
- **The Pause Discipline** as the circuit breaker (so non-convergence surfaces as a real decision).
- **The rigor dial** keyed on maturity (so cost scales with stakes).

### 3.4 Why this is not the Refinement Loop from 06 with a new name

06 listed Refinement Loop as one element of eight, on roughly equal footing with Spine, Event Log, Pressure Test, R2, Pause Discipline, Unified Discovery, CLI. 07 promotes it to substrate. The differences are load-bearing:

- **Every artifact-producing phase is now gated on the substrate, not just "target, slice, plan, optional code review."** There is no shortcut path for "small" artifacts; there is a rigor dial instead.
- **R2 is not a separate element.** It is one expression of the substrate, sharing reviewer registry, event schemas, convergence logic, circuit breaker, and invariant gating with artifact refinement.
- **The reviewer registry and rubric library are first-class repo artifacts.** In 06 they were implied; here they are specified at enough detail to start drafting.
- **Convergence is a pure function over events.** In 06 it was described but not specified. Here it is the CLI's job, not the LLM's.
- **Fake-verification defense is architectural, not aspirational.** The event schema, the spot-check reviewer, and the Pressure Test question work together.

---

## 4. The other architecture elements

These are the elements the substrate needs to live inside. They are mostly imported from 06 — with tweaks where the constraints demand it.

### 4.1 The Spine (G-Grounding)

Unchanged from 06 in shape: `architecture-current.md`, `conventions.md`, `invariants.md`, `subsystems/<id>.md`. Every phase reads at start, slice land promotes into it.

**What the constraints change:**

- **Subsystem records now carry a maturity tag that feeds the rigor dial.** Maturity is not a separate mechanism; it is a field on the subsystem record read by the routing function.
- **The spine's own updates are artifacts that go through the substrate.** A proposed architecture delta, a new invariant, a convention change — each is a small artifact with a rubric, reviewed before promotion. The refinement cost scales with the affected subsystems' maturity.
- **The honest-intermediate-state rule is load-bearing:** *"mid-rename is mid-rename — no pretending."* Verbatim in the spine rule, and verbatim in the context-transport reviewer's prompt (because the temptation to describe aspirational state is strongest in refinement rounds where reviewers ask "what about X" and the producer wants to answer "well, we're going to...").
- **Subsystem identity is the routing input for reviewer selection** (C-P1). Stable IDs matter for the substrate, not only for impact analysis.

### 4.2 The Event Log (G-State)

Unchanged in shape from 06: append-only JSONL committed to git, project-level and per-scope, derived state computed via CLI queries, invariants checked against the log, pre-tool-use hooks block direct edits.

**What the constraints change:**

- **Event density is higher.** Each artifact refinement round emits multiple `reviewer-scored` events. Each build chunk emits verification events. The log must tolerate this, and the CLI query surface must answer "final verdict for artifact X" cheaply.
- **The evidence schema is explicit.** `reviewer-scored` carries artifact version, dimensions, findings, severity. `chunk-verified` carries observation, not just `matched`. `chunk-unverifiable` carries reason and user-decision.
- **Convergence state is derived, never stored.** `CONVERGED` for an artifact is computed from the log at query time by a pure function. This matches 06's discipline: *"the event log is the snapshot substrate; every event is a checkpoint."*
- **LLM-proof integrity is now critical**, not just prudent. If the LLM can fake a `chunk-verified` event, the substrate is a lie. Pre-tool-use hooks and CLI-only writes are the only defense.

### 4.3 The Pause Discipline (G-Steering)

Imported from 06 with its structure intact: one rule, four moments (before / during / at pause / on return), absorbing R1 + pre-flight + briefings + return orientation.

**The rule, verbatim:** *"If the user knew this, would they want to reconsider?"*

**Before an autonomy window** — pre-flight statement: *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. What I think I know: A, B, C. Anything to change?"* The discipline, verbatim: *"if the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight."*

**During the window** — pause only on the rule. When you do pause: *"a question that requires the user to guess what you were thinking is not a question — it is a puzzle."* State the trade-off, what you found, paths forward, recommendation.

**At every pause** — write a briefing event. The briefing is the next-action menu, produced when context is fresh. **The next-action menu is always produced at pause time.**

**On return** — read the most recent briefing event. **Every session start is a return experience.**

**What the constraints add — a fifth trigger:**

The Pause Discipline now absorbs two new cases that fall out of the Trust Substrate:

- **Non-convergence pause.** When the refinement loop returns `STUCK`, the circuit breaker fires and the pause discipline takes over. The briefing states: which dimensions are stuck, which reviewers disagree, which rubric items can't be resolved, what the user's options are (accept-with-override, redesign the artifact, abandon, change reviewers). This is not a new mechanism; it is a new trigger for the existing discipline with a structured template.
- **Unverifiable-chunk pause.** When a chunk cannot be verified by live execution (known at plan time or discovered at build time), the pause discipline fires with the Unverifiable-Chunk Decision:

> Chunk `<id>` cannot be verified because `<concrete reason>`.
> The description is: `<description>`.
> The expectation was: `<expectation>`.
> What I actually tried: `<attempts>`.
>
> Options:
> 1. **Redesign the chunk** so it produces an observable side effect we can check.
> 2. **Accept an approximation** — we verify X instead of Y, with the known limitation that `<what we're not catching>`.
> 3. **Insert a human verification step** — the work is marked `awaiting-user-verification` and the slice doesn't complete until you confirm.
> 4. **Rethink the work entirely** — this chunk is a symptom that the slice scope is wrong.
>
> Recommended: `<option + reason>`.

The user's choice is recorded as `chunk-unverifiable-decided { choice, reason }`. Only options 2 and 3 allow the slice to eventually complete; option 2 requires a declared limitation that promotes into the spine as a known risk on the affected subsystem.

**Scheduled steering checkpoints — a distinct class of pause.**

The five triggers above (R1, pre-flight, briefings, return, non-convergence, unverifiable-chunk) are **reactive**: the LLM hits a condition and the discipline fires. The Pause Discipline also owns a second class, **scheduled steering checkpoints**, which are built into the phase flow rather than reactive to a condition.

| Property | Reactive pause | Scheduled steering checkpoint |
|---|---|---|
| When it fires | When a trigger condition hits | At a fixed point in the phase lifecycle |
| What the LLM is doing | Blocking on an external decision | Actively collaborating with the user |
| User's role | Resolves the block, workflow resumes | Primary feedback source on shape and direction |
| Exits on | Decision recorded | Explicit user signal ("shape-approved, proceed") |

**The canonical example is the plan-shape checkpoint.** After the initial plan draft and *before* the plan refinement loop runs, the workflow enters the shape checkpoint: the user and the LLM iteratively shape the plan's skeleton together. The checkpoint exists because the plan is most malleable before refinement accretes reviewer context around it, and the user's highest-leverage opportunity to steer direction is at the skeleton stage — not after reviewers have turned the plan into a vehicle for aggregated context. This is not a quality gate (refinement is); it is a **steering checkpoint**. Refinement is forbidden from running until the user signals shape-approval.

The shape checkpoint reuses the Pause Discipline's format — fresh briefing, trade-offs named, options presented, recommendation stated — but in collaborative mode: the LLM is not waiting, it is proposing revisions, surfacing alternatives, and converging with the user on a skeleton both sides are willing to hand to reviewers. On exit, a `plan-shape-approved { artifact-id, user-confirmation }` event is emitted; the invariant engine refuses to start refinement without it.

**"User away" protocol — epic-level steering preference.** The shape checkpoint is collaborative, which requires a user on the other end. When the user is unavailable at checkpoint time, the workflow must neither block forever nor silently guess. The resolution is an **epic-level steering preference** set once during epic creation (§4.8) and honored at every checkpoint in that epic.

The three preference values:

- **`always-consult`** — the LLM pauses at each checkpoint, emits a *"plan-shape checkpoint reached, ready for your input"* notification, and waits indefinitely. The slice does not progress until the user engages.
- **`best-guess-and-flag`** — the LLM drafts a best-guess shape, emits a `plan-shape-checkpoint-auto-shaped { artifact-id, guess-summary, reasoning }` event, proceeds to refinement, and flags the decision in the return briefing so the user sees it and can redirect at the next natural pause.
- **`ask-in-the-moment`** — the LLM emits a short *"I'm at a plan-shape checkpoint, do you want to steer now?"* notification and proceeds based on the response; after a reasonable wait with no response, it defaults to best-guess with flag.

**Override at any time.** The user can override the epic-level preference with an explicit message (*"I want to steer the next plan directly"* / *"use best-guess for the next few slices"*). Overrides are either permanent (updating the epic preference) or scoped to a specified number of upcoming checkpoints. Emits `epic-steering-preference-set { scope, value }`.

The preference applies only to scheduled steering checkpoints, not to reactive pauses — a non-convergence or unverifiable-chunk pause still fires regardless of the preference, because those are blocks on real decisions the user cannot delegate to a guess.

Other artifact types may opt into scheduled steering checkpoints by declaring one in their rubric. For plans the checkpoint is non-negotiable. It lives in the Pause Discipline because it shares the same shape (fresh context, structured format, next-action clarity), not because it is reactive.

**Why absorbing these into Pause Discipline instead of adding new mechanisms:** They share the same shape — fresh context at pause time, structured format, cheap-block rule, next-action menu discipline. Making them new mechanisms would duplicate the rule and the format. Making them triggers means a new contributor learns Pause Discipline once and gets all five cases for free.

### 4.4 The Pressure Test

06 kept this as a separate element. Under the constraints, its role narrows and sharpens.

The Trust Substrate's reviewers *already* catch most "did you consider this?" problems across every refinement round. What they do *not* catch is the **locked-in assumption** — the thing the design cannot talk about because the entire artifact is written inside it. Adversarial reviewers reviewing a locked-in design still answer from inside the lock.

Pressure Test remains a single named moment, applied to targets before refinement, because it uses a **different prompt posture**: the LLM's job at Pressure Test is explicitly to find problems, not to defend the design, and specifically to enumerate *"classes of errors a different design could have made impossible."* This is the **"errors made impossible"** framing, verbatim, load-bearing, non-negotiable.

Pressure Test findings are either addressed in the target or **accepted-with-justification** and promoted to the spine as tagged constraints so downstream refinement reviewers don't re-raise them.

**Under the constraints, Pressure Test also carries the fake-verification question:**

> Which chunks in the plan we will later draft could an LLM plausibly fake verification for without being caught? For those chunks, what stronger verification method would make fakery impossible?

Maturity still calibrates depth: foundational subsystems get the deepest pass.

The Pressure Test *itself* is an artifact, so its report goes through refinement, at light rigor, mostly to enforce the context-transport questions.

### 4.5 Unified Mid-Epic Discovery (G-Mid-flight)

Unchanged from 06: one 2x2 matrix (blocking × in-scope), one capture format (*what I was doing, what I found, why it matters, why I'm not doing it now*), triage at milestones (Slice Land, Epic Land), pull-based surfacing tagged to subsystems.

**What the constraints add:**

- **Discoveries that reveal a verification was shallow are a first-class finding type.** If during one chunk's work the agent realizes an earlier chunk's verification method was insufficient, that is a discovery. Captured, tagged, surfaced at slice land, potentially demotes the earlier chunk back to unverified. This is the feedback loop that keeps Constraint 2 honest across chunks within a slice.
- **Discoveries that reveal an artifact's rubric is missing a dimension are also first-class.** The rubric library evolves via discoveries. "The plan refinement loop didn't catch this because there was no dimension for it" → a proposed rubric dimension goes through its own (lightweight) refinement before being added to the rubric.
- **Reshape decisions that add work still cannot edit slice plans in place without spine catch-up**, same rule as 06.

### 4.6 The CLI as the only writer (G-State)

Unchanged from 06. Integrity engine, schema validator, query engine, atomic-write primitive, pre-tool-use hook enforcement. Skills never write `.goodplan/` directly.

**What the constraints add:**

- **The CLI owns the routing function, the convergence evaluator, and the rigor dial** as pure deterministic functions over the event log and the rubric library. These are not LLM judgment calls.
- **The CLI owns the reviewer registry and rubric library read surface.** `gp reviewer:list --for-artifact=plan --subsystem=auth` is a query. `gp rubric:show plan/v3` is a query. The producer of an artifact reads the applicable rubric through the CLI before drafting.
- **The CLI enforces the handoff invariant.** `gp phase:transition --from=plan --to=build` refuses if `convergence:evaluate --artifact=<plan-id>` is not `CONVERGED`. The LLM cannot override; only a user-level `--force-override-with-reason` flag can, and that emits a `convergence-overridden` event recorded on the epic's audit trail.

### 4.7 Slicing techniques (Shape phase)

When the Shape phase produces the slice set for an epic, three techniques guide the slicing.

> *"These techniques guide slicing but don't dictate it. The slicing step weighs them against each other and against the epic's specific shape. Deviations are allowed and expected; reviewers ask about justification, not enforcement."*

They are heuristics, not rules — reviewers attached to slice-set artifacts check for them explicitly, but the check is *"if you didn't apply this technique, why not?"*, not *"did you apply this technique?"*.

| Technique | Rule | Why |
|---|---|---|
| **Tracer bullet** | The first slice is a thin end-to-end cross-section through every layer the epic affects — front to back, minimal feature content — producing a working-but-minimal skeleton. | De-risks layer integration early; subsequent slices iterate on a proven skeleton rather than on speculation about whether the layers connect. |
| **Debugging/observability early** | Logging, tracing, and debugging tooling that later slices will rely on are scheduled in early slices. | Later slices are verified inside an environment with good debug tools, not added retroactively when something is already broken. |
| **Known unknowns first** | Slices that directly address the team's biggest uncertainties — feasibility, approach, external behavior — are prioritized ahead of comfortable work. | The scariest parts pay their risk down first, while there is still time to reshape the epic around what the early slices reveal. |

**Reviewer contract (slice-set refinement).** The slicing reviewer — attached to every slice-set artifact — does *not* check "did you tracer-bullet?"; it checks "if you didn't tracer-bullet, why not?" A slicing that applies none of the techniques but records clear justification passes review. A slicing that omits them silently, or with weak reasoning ("felt cleaner this way"), fails review. The reviewer's job is to surface missing reasoning, not to enforce a checklist.

**Valid deviations (examples):**

- *Tracer bullet:* a pure backend refactor has no frontend to thread through — deviation accepted.
- *Observability early:* an epic that touches already-well-instrumented code doesn't need a dedicated observability slice — deviation accepted.
- *Known unknowns first:* an epic with no meaningful unknowns doesn't need a de-risking slice — deviation accepted.

**Meta-rule: techniques serve the epic's goals.** The techniques exist to de-risk epic execution. If applying a technique would produce nonsensical slices for this epic, the technique doesn't apply to this epic. The slicing step chooses its techniques based on the epic's actual risks, not on checklist compliance.

**The techniques can conflict.** Tracer bullet says *"touch every layer lightly"*; known-unknowns-first says *"go deep on the scariest thing."* These cannot both be the first slice. The slicing step resolves the conflict based on the epic's specific risks — which risk, if it fires, hurts the epic more — and records the reasoning for the slicing reviewer to evaluate.

**Connection to the rest of the architecture.** These techniques are the *"de-risk early"* posture expressed as concrete slicing rules. They interact with §4.5 Mid-Epic Discovery: known-unknowns-first maximizes the chance that mid-flight discoveries land while the epic still has scope to absorb them, rather than at the end when reshape is expensive.

### 4.8 Design tree interviewing (Explore and Shape phases)

When the LLM interviews the user — during brainstorming in the Explore phase, or during architecture design in the Shape phase — it uses a **design tree** approach. The LLM maintains an internal model of the design space as a tree where each branching point is a decision with alternatives and consequences. Questions to the user are generated to systematically navigate the tree, rather than drifting through whatever topic surfaces next.

**How the technique runs:**

- The LLM builds the tree incrementally: the root is the thing being designed, branches are the major decisions, sub-branches are the alternatives at each decision, leaves are consequences and open questions.
- The LLM asks questions that help the user reason through one branch at a time, marking branches as **explored / deferred / closed** as the conversation progresses.
- The LLM does not commit to a direction until enough of the tree has been explored to make the choice informed. Commitment before exploration is a pull back to the tree, not a skip.
- The user sees a summary-level view of the tree on request — what's been explored, what's still open, what's deferred — so the conversation has shared state rather than living only in the LLM's context.
- The tree is maintained implicitly by the LLM during the interview, surfaced explicitly at the end (or on demand) as an artifact the Explore or Shape phase can hand to downstream work.

**Where the technique applies:**

| Phase | Use |
|---|---|
| Explore | Brainstorming an idea, researching a problem space, mapping alternatives before committing to a target. Design tree interviewing is the primary interview technique. |
| Shape | Architecture design — the interactive portions where the user has context the LLM needs. The tree captures the design space of the architecture itself and is navigated collaboratively. |
| Slice (plan-shape checkpoint) | The shape checkpoint (§4.3, §3.2.1) is a natural place to use design-tree interviewing on the plan skeleton: the skeleton is itself a small design space with branches worth exploring before refinement locks in. |

**Why a tree rather than a flat question list:** flat questioning drifts, re-covers ground, and leaves the LLM without a map of what's unexplored. A tree makes unexplored branches visible and prevents the LLM from committing to a direction because the first branch sounded promising. The technique is in service of *"extract as much useful context from the user as possible"* — the user's attention is scarce, and the tree structure makes each question earn its place.

**The tree is biased; the user co-authors it.** The design tree the LLM generates is inherently biased — it includes the branches the LLM can think of, and misses ones it can't. The LLM explicitly acknowledges this to the user when introducing the tree: *"Here's the design tree as I see it. Are there branches or alternatives I missed? This is your chance to add them before we explore."* The user becomes a co-author of the tree, not just a navigator of it. Branches the user adds are marked as user-contributed so later reviewers can weight them appropriately.

**Non-tree-shaped spaces use different structures.** Some design spaces aren't tree-shaped. They're graphs (branches interconnect and can't be explored independently), matrices (orthogonal dimensions that compose), or flat (many parallel choices with no hierarchy). When the LLM recognizes that the space isn't naturally tree-shaped, it says so and uses a different structure: a matrix for orthogonal dimensions, a diagram for interconnected branches, a list for flat parallel choices. *"Design tree"* is the default technique; the underlying principle is *"systematic exploration of the design space,"* and the structure should match the space.

**Epic-creation interview: capturing the steering preference.** When the design-tree interview runs during initial goal capture for a new epic, the LLM asks the user explicitly about the plan-shape checkpoint steering preference (§4.3):

> *"For this epic, plan-shape checkpoints give you a chance to steer each slice's plan before refinement starts. How do you want me to handle them? (a) Always consult you — I'll block at each checkpoint until you respond. (b) Use best-guess and flag for your review at return time — I'll continue working and you can redirect if you disagree. (c) Ask me in the moment at each checkpoint — I'll tell you I've reached one, you decide then whether to engage."*

The answer is captured as an epic-level steering preference and emitted as `epic-steering-preference-set { epic-id, value }`. The preference is honored by every plan-shape checkpoint in the epic unless the user overrides it at a specific checkpoint (§4.3).

**Relationship to the substrate.** Design tree interviewing is a producer-side technique for Explore and Shape phases; it is not a reviewer or a gate. Its output feeds into artifacts that then go through the Trust Substrate like any other. The tree itself can be captured as an artifact and reviewed if the phase's rubric asks for it.

---

## 5. How the mechanisms compose

The flow of a single slice, showing where evidence gates fire:

```
(Spark/Sharpen) → Target proposed
     ↓
Pressure Test on target (single adversarial moment, different prompt posture)
     ↓
Pressure-test report → refinement (light) → CONVERGED
     ↓
Target → refinement (rigor scaled to maturity) → CONVERGED
     ↓  [invariant gate: no Slice phase without converged target]
Slice set proposed (applying tracer-bullet / observability-early / known-unknowns-first techniques §4.7) → refinement → CONVERGED
     ↓  [invariant gate: no Plan phase without converged slices]
Per slice: Plan drafted
     ↓
Plan-shape checkpoint (§4.3) — interactive user↔LLM shaping of the skeleton
     ↓  [invariant gate: no refinement without plan-shape-approved event]
Plan → refinement, with verification-plausibility as BLOCKING reviewer
     ↓
  if any chunk `impossible-with-reason`:
    Pause Discipline → Unverifiable-Chunk Decision → user choice recorded
  if refinement STUCK:
    Pause Discipline → Non-Convergence decision → user choice recorded
     ↓
Plan CONVERGED
     ↓  [invariant gate: no Build phase without converged plan and all chunks decidable]
Build: for each chunk (red-green-verify loop §3.2.2):
  Write red-test → run → confirm FAIL → write code → run red-test → confirm PASS
    → run verification-method → capture observation
    → match:    emit chunk-verified{matched:true, evidence}
    → mismatch: diagnose → fix → retry, or revise plan (re-enters refinement)
    → impossible at build time: Pause Discipline → Unverifiable-Chunk Decision
     ↓  [invariant gate: no Slice Land without every chunk verified or decided]
Slice Land:
  Triage mid-flight discoveries (2x2 matrix)
  Promote architecture deltas to spine (each delta is a small refined artifact)
  Optional: verification-spot-check reviewer samples chunk-verified events
  Write Slice Land briefing event (next-action menu)
     ↓
Epic Land: synthesize across slices, promote learnings, reconcile invariants
```

**Three properties of the composition:**

1. **Every arrow crossing a phase boundary crosses an invariant gate backed by evidence.** There is no unchecked handoff.
2. **Every pause — voluntary or triggered — writes a briefing that doubles as a return-orientation aid.** R1, pre-flight, non-convergence, unverifiable-chunk, end-of-autonomy — they all share the four-moment discipline.
3. **Rigor scales with maturity at every gate.** Foundational work pays the full price; experimental work pays a fraction. The rigor dial is a single input read by the routing function.

---

## 6. Mapping to 01 and 06

| 01 / 06 element | Status in 07 | Where it lives |
|---|---|---|
| Context Spine (01 §, 06 §5.1) | Kept, intact | §4.1, with maturity feeding the rigor dial |
| Maturity Tracking (01) | Folded | Tag on subsystems; input to rigor dial in §3 |
| Pressure Test (01, 06 §5.4) | Kept, narrowed and sharpened | §4.4; now also carries the fake-verification question |
| Refinement Loop (01, 06 §5.3) | **Promoted to substrate** | §3 (all of it); no longer one element among many |
| R1 Discovery Checkpoint (01) | Folded | "During" moment of §4.3 Pause Discipline |
| R2 Build What You Can Check (01, 06 §5.5) | **Reshaped into Constraint 2** | §1.3 and §3.2.2; no longer a separate element |
| Discovery Ledger (01) | Folded | §4.5 |
| Triggered Reshape (01) | Folded | §4.5 |
| Pre-flight checkpoint (01) | Folded | "Before" moment of §4.3 |
| Briefings (03) | Folded | "At pause" moment of §4.3 |
| Return-from-stop orientation (03) | Folded | "On return" moment of §4.3 |
| Event log + invariants (03, 06 §5.2) | Kept, intact, more critical | §4.2 |
| JSONL event log in git (03) | Kept | §4.2 |
| Pre-tool-use hook (no HMAC) (03) | Kept, more critical | §4.2, §4.6 |
| Subsystem first-class tracking (03) | Kept; also the routing input | §4.1, §3.1 |
| CLI as integrity engine (03, 06 §5.8) | Kept; also owns routing/convergence/rigor | §4.6 |
| Extractors at commit time (03) | Kept | §4.6 |
| Tight-writing discipline (03) | Kept | Rubric dimensions in §3, context-transport reviewer |
| Honest-intermediate-state rule (01) | Kept, verbatim | §4.1; also in context-transport reviewer prompt |
| LLM-proposed invariants (01) | Kept | Promoted via §4.5, refined via §3 |
| Snapshot/checkpoint state model (01) | Subsumed by event log, as in 06 | §4.2 |
| 06's eight-element architecture | **Restructured** | One substrate (§3), five surrounding elements (§4) |
| 06's "Work Discovered 2x2" | Kept, intact | §4.5 |
| 06's "Pause Discipline unifies R1+pre-flight+briefings+return" | Kept, extended with two new triggers | §4.3 |

The arithmetic: 06 had 8 elements. 07 has 1 substrate + 5 elements = 6 surface pieces, but the substrate is denser than any one element in 06. The total implementation surface area is *larger*, not smaller, because the constraints demand specificity (reviewer registry, rubric library, convergence evaluator, verification event schema, spot-check reviewer) that 06 deferred.

This is a deliberate trade-off: 06 was optimizing for "smallest mechanism count." 07 is optimizing for "constraints cannot be cheated." They are different targets.

---

## 7. Honest losses

What this architecture does *not* cover, and why:

- **No explicit performance/regression gate.** Chunks that verify behaviorally can still regress performance. There is no substrate element for "benchmark before and after." **Why:** it can be folded in as a verification-type (`live-with-benchmark`) but adding it to the baseline here would dilute the core Constraint 2 rule. Left as a rubric extension for performance-sensitive subsystems.
- **The reviewer registry bootstrapping problem.** Where do the initial reviewers come from? This document assumes they exist. In practice they have to be written, and they themselves are artifacts that should be reviewed. **Why left out:** chicken-and-egg; the initial reviewer set is hand-authored by the user and accepted without substrate review. Subsequent reviewer changes go through refinement.
- **Cost of refinement on "small" artifacts.** Even with the rigor dial at minimum, there is real overhead. Experimental side quests will feel this most. **Why:** the constraint is non-negotiable. The dial mitigates but does not eliminate the cost; the trade is intentional.
- **Human override exists and leaves a trace.** The user can `--force-override-with-reason` past a refused convergence or accept an unverifiable chunk. This is not a loss per se, but it is a known escape hatch that means "strictly enforced" is actually "enforced unless the user chooses otherwise, with audit." Pretending otherwise would be dishonest.
- **Adversarial posture at every refinement round is load on the user and on the reviewers.** 06's Pressure Test was a single moment precisely because adversarial-all-the-time dilutes. 07 relies on reviewers being adversarial-in-their-domain all the time, which may or may not hold up in practice. **Why:** the constraints demand it; if it breaks, Pressure Test expands back into multiple moments.
- **No explicit "retrospective on the substrate itself" element.** The substrate can produce bad outcomes (wrong convergence bar, missing reviewer, rubric dimension that everyone games) and there is no element that reviews the substrate's own effectiveness. **Why left out:** this belongs at Epic Land as a category of reflection, not as a new mechanism.

---

## 8. Judgment calls I made without explicit instruction

Flagged for user review. Each of these is a design decision I made while writing 07 that the prompt did not explicitly determine. Any of them can be reversed.

1. **I kept Pressure Test as a separate named element (§4.4) rather than folding it fully into the substrate.** The constraints arguably make it redundant (reviewers are already adversarial). I kept it because the *"errors made impossible"* prompt posture is distinct and load-bearing. If you want 07 to be stricter about consolidation, Pressure Test can be absorbed into a "round-zero reviewer" attached to target artifacts, and the separate element drops.

2. **I made `supplementary-tests` a legitimate verification-type alongside `live`** (§3.2.2), requiring a demonstration that the test exercises the changed code path. A purist reading of Constraint 2 might say "live or nothing, tests are never enough." I kept the category because in practice there are cases (pure functions, data transforms) where a test that provably exercises the change is equivalent evidence. If you want Constraint 2 enforced literally, drop `supplementary-tests` and everything must be `live` or `impossible-with-reason`.

3. **I folded the non-convergence case and the unverifiable-chunk case into the Pause Discipline as new triggers**, rather than naming them as new mechanisms. 06 unified four pause cases; I added two more. This keeps the mechanism count down but makes Pause Discipline do a lot of work. If Pause Discipline starts feeling overloaded, either case could be promoted to a named element.

4. **I made the rigor dial a deterministic function of subsystem maturity** (§3.1), owned by the CLI. An alternative is making it a judgment call the skill makes per invocation. I chose determinism because judgment calls under pressure tend to under-apply rigor, and the whole point of the substrate is to remove judgment from the gating decision. If this is too rigid in practice, the dial can become advisory.

5. **I added a `verification-spot-check` reviewer at slice land** (§3.2.2 and §5) as the defense against fake `chunk-verified` events. This is speculative — it has cost (re-running verifications) and may not catch much if agents are honest. I added it because C-P12 is real and needs an architectural defense, not just a hope. If you think the defense is overkill, drop the spot-check and rely only on the evidence-in-event schema.

6. **I made the Pressure Test also carry the fake-verification question** (§4.4). The prompt did not ask for this; I added it because up-front enumeration of fakeable chunks is the cheapest time to catch them. If it muddles Pressure Test's identity, it can move to a separate reviewer.

7. **I specified the rubric format as YAML-like pseudocode** (§3.2.1) rather than leaving the format unspecified. The prompt asked for specificity but did not dictate format. The format is a placeholder — the real decision is whether rubrics are structured (YAML/JSON) or prose with conventions. I chose structured because convergence evaluation needs to be a pure function.

8. **I said "the plan is an artifact so it goes through refinement" and also "the verification-plausibility reviewer is always attached to plans"** (§3.2.2). This means plans always get at least one domain-specific reviewer in addition to the always-on set. Other artifacts might not get a guaranteed domain reviewer. This asymmetry is intentional — plans carry the Constraint 2 contract so their plausibility check is non-optional — but it is an asymmetry the prompt did not request.

9. **I kept 06's "Work Discovered 2x2" and the discovery-capture format verbatim** (§4.5). The prompt said to preserve this consolidation, so this is less a judgment call than a read of the prompt — but I did not copy 06's text, I paraphrased, and in doing so I added the "discoveries about shallow verification" and "discoveries about missing rubric dimensions" as new first-class discovery types. That addition is mine.

10. **I did not specify how the reviewer registry bootstraps.** Flagged in §7. This is a judgment call by omission; a different writer would have sketched an answer.

11. **I did not specify event schemas at field level** — I sketched them in prose (e.g., *"`chunk-verified` carries observation, not just boolean"*). The next-layer implementation doc needs full schemas. I left them at sketch-level because the prompt asked for architecture, not implementation, and full schemas would have pushed this doc past length and usefulness.

12. **I treated "phases" from 06 (Spark/Sharpen/Survey/Shape/Slice/Build/SliceLand/Repeat/EpicLand) as implicit context, not as named first-class entities in 07.** The prompt did not ask me to redefine phase names. The substrate gates transitions between phases; the phase names themselves are inherited from 01/06 without change.

### 8a. Judgment calls on the technique additions

The original 12 judgment calls above are unchanged. The four techniques added in this revision (plan-shape checkpoint, red-green TDD, slicing techniques, design tree interviewing) were specified by the user as concepts to integrate, but their placement and scoping were choices I made; these are flagged separately so the original set stays stable.

- **A. Plan-shape checkpoint as mandatory-for-plans, rubric-optional elsewhere** (§3.2.1, §4.3). Alternative: mandatory for every artifact, or optional everywhere. I chose mandatory-for-plans because plans are where user steering leverage is highest and refinement churn is most expensive; other artifacts can opt in through their rubric. If this asymmetry is wrong, the rule generalizes either direction.
- **B. Red-green-verify as baseline on every code-producing chunk** (§3.2.2). Alternative: make `red-test` optional per chunk (e.g., skippable for config-only chunks). I made it baseline because the cost is low and the "does the test actually exercise the change" property is load-bearing for plan refinement. If baseline TDD is too expensive on some chunk classes, the verification-type taxonomy can gain a `live-without-red-test` variant with recorded justification. **This addition does not alter Constraint 2's language; TDD is additive to live execution, never a substitute.**
- **C. Slicing techniques as a named §4.7 subsection** rather than rubric dimensions only. I chose a named subsection because the techniques are concrete enough to teach and the reviewer contract is clearer when the techniques have names. If §4 gets crowded, §4.7 can collapse into rubric dimensions on slice-set/vN.
- **D. Design tree interviewing as a named §4.8 subsection** rather than implicit phase behavior. I named it because interviewing is the step most prone to drift and a named technique gives reviewers and skills something concrete to check. If this over-specifies, §4.8 can relocate into producer guidance notes on the Explore and Shape phases.

None of the four additions modify any of the 12 original judgment calls. They interact most directly with calls 2 (`supplementary-tests` vs. strict `live`) and 8 (verification-plausibility as always-on for plans): B strengthens both by adding a second per-chunk check the reviewer runs, but does not change either's disposition.

### 8b. Judgment calls on the refinement additions

The five refinements in this revision (plan-shape "user away" protocol, post-implementation code refinement loop, strengthened red-test reviewer bullets, slicing heuristics-not-rules framing, design tree bias and non-tree shapes) were specified by the user as concepts to integrate, but their placement and scoping were choices I made. Flagged separately so sets §8 and §8a stay stable.

- **E. Three fixed values for the epic-level steering preference** (§4.3, §4.8) — `always-consult`, `best-guess-and-flag`, `ask-in-the-moment`. Alternative: a richer DSL (e.g., "best-guess for slices 1-3, consult for slices 4+"). I chose three fixed values because per-epic capture is the cheap path and the override mechanism already covers fine-grained cases. If richer scoping is needed routinely, the preference can become a small policy expression.
- **F. The steering preference applies only to scheduled steering checkpoints, not reactive pauses** (§4.3). Alternative: generalize it to any pause. I kept it narrow because reactive pauses (non-convergence, unverifiable-chunk) block on real decisions the user cannot delegate to a best-guess without losing the constraint they exist to enforce. If the narrowness becomes annoying, the preference can gain a second axis for reactive pauses.
- **G. Code refinement loop runs after execution verification, not interleaved with it** (§3.2.3). Alternative: interleave per chunk. I chose "after all chunks verify" because the code-refinement reviewers need the whole slice diff to evaluate cross-chunk properties (style consistency, reliability across integration points, subsystem-level correctness) and per-chunk review would fragment these. If the loop turns out to block slice completion on trivial style issues, the per-chunk interleave is available as an alternative.
- **H. Test meaningfulness lives in the code refinement loop as a reviewer category, not as a separate element** (§3.2.3). Alternative: a dedicated cargo-cult-detection element. I folded it into the code refinement loop because it is a quality dimension of code, and the loop is where quality dimensions live. The plan-time `red-test` reviewer (§3.2.2) catches the plan-level failure mode; the code-refinement reviewer catches the build-time failure mode where the test technically passes but tests the wrong thing. Two complementary checks at two different gates.
- **I. The slicing reviewer contract is "why didn't you?" not "did you?"** (§4.7). Alternative: hybrid — apply at least one, justify deviations from the others. I chose the pure "why didn't you?" framing because the hybrid smuggles in a checklist under the heuristic framing. If slicings routinely apply none of the techniques and the justifications all read as post-hoc rationalization, the hybrid can be adopted.
- **J. Non-tree design-space structures (graph, matrix, flat list) are named but not fully specified** (§4.8). Alternative: specify each structure's shape, navigation rules, and hand-off format in §4.8 the same way the tree is specified. I left them at sketch-level because the tree is the default and the alternatives are escape hatches; fully specifying each would triple §4.8's length for cases that will be rare. If one of the alternative structures becomes common, it earns its own subsection.

None of the refinements modify §8's 12 original calls or §8a's four additions. The code refinement loop (G, H) interacts with call 2 (`supplementary-tests`) by adding a second place where test meaningfulness is checked, but does not change the verification-type taxonomy.

---

## 9. What the next-layer implementation doc must cover

Scope boundary. 07 is architecture. The ideal-implementation doc must cover:

1. **The reviewer registry schema and starting roster.** Field definitions, domain taxonomy, contract format, how a new reviewer is added, how versioning works. Initial set of ~10 reviewers authored by the user, covering the always-on trio plus auth/data/CLI/prose/verification-plausibility/invariants.

2. **The rubric library schema and starting rubrics.** Per-artifact-type rubrics: target, slice-set, slice, plan, pressure-test-report, epic-land-synthesis, architecture-delta, invariant-proposal. Each with its dimensions, severity mapping, and convergence bar. Include the rigor-dial variants (foundational/standard/experimental).

3. **Event schemas at field level.** `artifact-drafted`, `artifact-revised`, `reviewer-scored`, `artifact-converged`, `artifact-stuck`, `chunk-verified`, `chunk-unverifiable`, `chunk-unverifiable-decided`, `convergence-overridden`, `verification-spot-check-performed`, plus every event type inherited from 06.

4. **The CLI command surface.** Read: `rubric:show`, `reviewer:list`, `convergence:evaluate`, `verification:status`, `phase:transition --check`. Write (event-emitting): `artifact:draft`, `artifact:revise`, `reviewer:score`, `chunk:verified`, `chunk:unverifiable`, `phase:transition`, `convergence:override`. All writes atomic, hook-protected.

5. **The routing function.** Given (artifact-type, affected-subsystems, subsystem-maturities, rubric-version), return (reviewer-set, rigor-level, round-budget, convergence-bar). Deterministic, testable.

6. **The convergence evaluator.** Pure function from (event-stream-for-artifact, rubric) → `CONVERGED | NOT_CONVERGED(reasons) | STUCK(reasons)`. Including the stuck-detection rules.

7. **The Pause Discipline templates.** One template per trigger: R1, pre-flight, voluntary end-of-autonomy, non-convergence, unverifiable-chunk. Each template produces a briefing event with a fixed shape.

8. **The verification-spot-check reviewer specification.** How it samples, what evidence it needs from `chunk-verified` events to re-run, what a mismatch event looks like, how it feeds back.

9. **The Spine documents and invariants.** Same as 06 — architecture-current, conventions, invariants, subsystems/<id>. Including the maturity tag and the depth-scales-with-maturity invariant.

10. **Phase wiring.** For each phase in the flow (§5), which skills own it, which artifacts it produces, which reviewers route to those artifacts, which invariants gate its transitions, which pause moments apply.

11. **Bootstrap and migration.** How this repo migrates from its current state to this architecture. Which reviewers to hand-author first. Which rubrics are minimum viable. How existing epics that started pre-substrate continue.

12. **Anti-cheating audit plan.** How the team checks, periodically, that the substrate is not being routinely overridden or that `chunk-verified` events are not being fabricated. What signals to watch.

---

## 10. Closing

The constraints are not constraints on the workflow. They are constraints on **what "done" means at every step of the workflow**. The workflow is whatever shape makes "done" enforceable.

Under this framing, mechanism count is not the right optimization target — 06 was right that mechanisms are expensive, but the cost of a missing evidence gate is higher than the cost of a mechanism. 07 pays the extra cost at the substrate layer once, and in exchange gets a workflow where no artifact crosses a phase boundary without evidence, and no chunk is called done without observation. Everything else — the spine, the event log, the pause discipline, the discovery matrix, the CLI — exists to make that substrate possible.

*"LLM output is a claim; evidence is what makes the claim true."* Everything in this document is a consequence.
