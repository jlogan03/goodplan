# Problems-First Synthesis

A fresh look at workflow-bug-fixes that starts from the problems, not the mechanisms. Documents 01 (ideal flow) and 03 (implementation premises) each propose a set of mechanisms. Both are good documents. But the user's instruction is explicit: *"I don't need all of the mechanisms... but I do want to solve the problems those mechanisms are targeted at solving."* This document extracts the problems, groups them, and proposes the smallest architecture that resolves them — preserving the load-bearing disciplines from 01/03 where they earn their keep, departing from them where a simpler answer covers the same ground.

This is not a merge of 01 and 03. It is a new proposal that should be compared against them.

---

## 1. Framing and posture

The posture is: **mechanisms are expensive.** Each named mechanism is something the LLM has to be taught, the CLI has to enforce, reviewers have to check, and the user has to keep in their head. The cost of a mechanism is paid at every invocation forever. So the question for each one is not *"is this a good mechanism?"* but *"what problem does it solve, and is there a cheaper way to solve that problem — or to make the problem not exist?"*

The constraints are inherited from 01 and 03 and are non-negotiable:

- Keep the CLI as the integrity engine.
- LLM does most of the labor; the human is the source of intent and the steerer.
- Markdown artifacts in git; multi-person merge resilience.
- The workflow must dogfood on this repo.
- The model is trusted to exercise judgment; scaffolding provides context, not rules.

---

## 2. The problems

Extracted from every mechanism in 01 and every premise in 03. Each problem is stated as *"what goes wrong without a solution."* No mechanism vocabulary in this section.

### 2.1 Intent and grounding

**P1. The LLM rebuilds its mental map of the project from scratch on every run, producing subtly different mental models each time.** Without standing grounding documents, every phase re-discovers the system, and decisions on Tuesday contradict decisions on Wednesday.

**P2. The user knows what they want; the LLM does not. The interface between intent and labor is a small number of moments where the user is paying attention, and those moments are expensive.** Without explicit recognition of when the user is present vs. absent, the system either bothers them constantly or runs unattended on premises they would have rejected in five seconds.

**P3. Plans drafted at the start are wrong in ways that only become visible during the work.** Without a discipline for absorbing mid-flight reality, surprises become either silent scope creep or full restarts.

### 2.2 Architectural quality and design rigor

**P4. Models defend the first design they produce. They do not naturally generate the classes of errors a *different* design could have made impossible.** Without an adversarial pass, designs are correct-given-the-inputs-considered and rotten everywhere else.

**P5. Models treat experimental and load-bearing code with the same rigor — usually too little for foundational, too much for experimental.** Without a rigor dial, you get over-engineered prototypes and casual refactors of primitives.

**P6. Architectural changes happen silently inside slices and are never reconciled with the project's standing picture.** Without explicit promotion, the project's grounding documents drift from reality and the next epic plans against a stale picture.

**P7. Conventions and invariants change silently with no review.** Without treating these as first-class targets, "we now do X" appears in one slice and is forgotten by the next.

### 2.3 Verification and "done"

**P8. The model's ability to do good work autonomously depends entirely on its ability to tell whether the work is good. Without a feedback signal it can run, autonomous iteration collapses into "write something, hope it's right, stop."**

**P9. Models write tests that pass while the live code is broken — they verify their tests agree with their implementation, both written by the same model in the same session.** A green check from `vitest` is not evidence of a working system.

**P10. Some intents cannot be checked by the model ("the UI feels responsive," "the refactor preserved external behavior"). Papering over with shallow proxies manufactures false confidence.**

### 2.4 Artifact quality and context transport

**P11. A plan can be correct and still useless if it assumes context the implementer doesn't have.** Same for an architecture target the next epic won't have. Same for slice definitions a fresh reader can't decode.

**P12. Reviewers re-raise stale concerns, drift in scope, and fail to converge. Naive review loops stagnate or ceremonialize.**

**P13. Stale context in an artifact is as harmful as missing context.** A plan padded with irrelevant prior art slows the implementer and crowds out what matters.

### 2.5 Autonomy boundaries and steering

**P14. In a long autonomy window, the LLM may discover something that changes a decision the user already made. Continuing builds on a false premise; pausing for trivia trains the user to ignore pauses.** The system needs a discipline for what justifies an interruption.

**P15. When the LLM does interrupt, it has built up context the user does not share. A question that requires the user to guess what the LLM was thinking is not a question — it is a puzzle.** Cheap blocks resolve in seconds; bad blocks require meetings.

**P16. Questions that should have been asked at the start of an autonomy window get asked in the middle of it instead, wasting the user's "I stepped away" time.**

**P17. After a stop, compaction, or fresh session, the LLM has no idea where it was or what it was thinking. Reconstructing this from raw history is unreliable; the freshest context is at the moment of pause, not at the moment of return.**

### 2.6 State, history, and reversibility

**P18. A rigid forward-only state machine cannot model real workflows. Users change their minds; mid-flight discoveries demand insertion, backward movement, parallel branches.** But a freely-mutable state model loses the audit trail and lets multiple branches silently disagree about what's true.

**P19. Multiple humans (and multiple branches) edit the same project in parallel. Naive single-file state breaks under merge. Collisions need to fail loudly, not silently.**

**P20. The integrity of the state must not depend on the LLM behaving well.** The LLM will write directly to files when convenient, skip steps when it thinks they're trivial, and fabricate state when confused. The integrity guarantee has to live below the LLM.

### 2.7 Discovery and follow-up work

**P21. Work discovered mid-epic is two flavors of the same problem (blocking/non-blocking × in-scope/out-of-scope), but is currently treated as separate features with separate capture paths.** The result is heavyweight capture, triage at the wrong time, no culling of stale findings, and push-based surfacing that demands attention when the user isn't ready.

**P22. Follow-ups captured during a slice get triaged when the user has the *least* information about them (right now), instead of at the next milestone (when post-slice context is available).**

**P23. Findings tagged to a subsystem are not surfaced when a future epic touches that subsystem — they are remembered, not retrieved.**

### 2.8 Subsystem identity and impact

**P24. Without stable subsystem identity, the same concept (auth, the data layer, the CLI) gets referred to by three different names across artifacts, learnings, and decisions, and impact analysis is impossible.**

**P25. Documentation rigor needs to scale with how load-bearing a subsystem is. A foundational subsystem with no docs is a fire; an experimental subsystem with comprehensive docs is wasted work.**

### 2.9 Phase boundaries and orientation

**P26. The next-action menu must be produced when the LLM still has full context (at the pause), not reconstructed at return time when context is gone.** Briefings are a forward-write discipline, not a backward-read one.

**P27. Every session start is a return experience.** Whether it's the human after two weeks or a fresh Claude session after compaction, the orientation problem is identical and needs the same solution.

### 2.10 Honest intermediate states

**P28. Mid-rename is mid-rename. A half-adopted convention is half-adopted. The temptation to describe "where it'll be when this slice lands" instead of "where it actually is right now" produces architecture docs that lie.** The lie compounds across slices.

### 2.11 CLI and integrity

**P29. State integrity, schema validation, structured queries, atomic multi-file operations, and ground truth independent of the LLM session cannot be reproduced cheaply in a skill-only world.** The CLI exists for these reasons and removing it would re-open every problem it solves.

**P30. A direct-edit attack on `.goodplan/` (whether malicious or accidental) bypasses every invariant the CLI enforces.** The defense must produce a loud immediate error at the tool-call level, not a silent corruption discovered later.

---

## 3. Problem groupings and relationships

Several "different" problems are facets of the same underlying concern. Naming the groupings reduces the mechanism count.

| Group | Constituent problems | Underlying concern |
|---|---|---|
| **G1. Grounding** | P1, P6, P7, P28 | The project must have a single, honest, current picture of itself, and every phase must read from it and write to it. |
| **G2. Steering economy** | P2, P14, P15, P16, P17, P26, P27 | The user's attention is the scarce resource. The system must concentrate questions at moments the user chose to be present, and make returns cheap by writing the next-action menu at pause time. |
| **G3. Design adversarialism** | P4, P5 | Models defend; the system must force the model into adversarial posture for design work, calibrated to how load-bearing the change is. |
| **G4. Artifact-as-context-transport** | P11, P12, P13 | Artifacts must be self-contained specifications. The mechanism that makes them so is a review loop with context-accumulation as a first-class question, change-scoped re-review, and exit on criteria. |
| **G5. Verifiability** | P8, P9, P10 | No autonomy without a model-runnable check that exercises real code paths and ends with live observation. Honesty about what cannot be verified beats fake green checks. |
| **G6. Mid-flight reality** | P3, P21, P22, P23 | Work discovered during execution is the rule, not the exception. There must be one decision matrix and one capture format, with triage at milestones, not at capture. |
| **G7. State integrity and reversibility** | P18, P19, P20, P29, P30 | State must be append-only, mergeable, queryable, protected from the LLM, and able to model "the user changed their mind" without losing history. |
| **G8. Subsystem identity** | P24, P25 | Stable IDs that show up everywhere — architecture, learnings, decisions, invariants, reviewer routing, doc-depth requirements. |

Eight groups. The proposed architecture in §5 has roughly one element per group.

---

## 4. The shape of a good solution

Before proposing mechanisms, the properties any good solution must have:

1. **Append-only and queryable.** Anything that records what happened must be append-only (for merge resilience and audit) and queryable as a *view* (for "what's the state of X right now"). This pattern subsumes state machines, side-quest queues, and discovery ledgers in one shape.
2. **Promotion, not duplication.** Findings, learnings, and discoveries should *promote* into a single grounding picture (G1) rather than living forever in their own ledgers. The grounding picture is the long-term memory; everything else is a path into it.
3. **One pause discipline, one resume discipline.** Whatever rule governs "should I interrupt the user mid-window" is the same rule that governs "what goes in the briefing at end-of-window" is the same rule that governs "what does the user see when they return." G2 collapses if these are unified.
4. **One review loop, parameterized.** The same loop runs on targets, slices, and plans, with different reviewer pools. Anything that varies is a parameter, not a new mechanism.
5. **Verifiability is a property of every chunk, not a phase.** R2 is enforced at declaration (slice), at review (plan), and at runtime (build). It is one rule applied at three places, not three rules.
6. **Adversarial design is a posture, not a skill.** Forcing the model into adversarial mode is a prompt-level discipline applied at one named moment, not a constant background hum.
7. **CLI does what only the CLI can do, skills do everything else.** The split is: integrity, schema, queries, atomicity, protection → CLI. Judgment, prose, conversation → skills. No skill writes `.goodplan/` directly; no CLI command produces prose.
8. **Honesty over neatness.** Mid-states are described mid. Things the model can't verify are flagged. Findings the design can't address are accepted-with-justification. The workflow optimizes for not lying to itself.

---

## 5. Proposed architecture

Eight elements. Each maps to one problem group.

### 5.1 The Spine (G1, G8)

A small set of standing project-level documents — `architecture-current.md`, `conventions.md`, `invariants.md`, plus per-subsystem files under `subsystems/<id>.md` — that every phase reads at start and that get *promoted into* at slice land. Subsystems are first-class with stable IDs that show up in learnings, decisions, invariants, and reviewer routing. Documentation depth is required to scale with maturity (experimental: optional; foundational: comprehensive), and this is enforced as an invariant.

The honest-intermediate-state rule is load-bearing for every spine document, not just architecture: *"mid-rename is mid-rename — no pretending."* This phrase is preserved verbatim in the rule because the prose around it has failed to capture it before.

**Why this is a good solution.** It is the only place that holds long-term project memory. Findings, learnings, and accepted pressure-test results all promote *into* the spine, which means the spine is the only thing that has to be re-read across epics. Everything else is ephemeral. This is what makes "mechanisms are expensive" affordable: most things don't need to live forever, only the spine does.

**Corresponds to:** Context Spine (01) + architecture/conventions/invariants premises (03) + subsystem tracking (03).

### 5.2 Append-only event log + invariants (G6, G7)

State is stored as append-only events in `events.jsonl` files (project-level and per-epic/per-side-quest). Derived state — "what's the current phase," "what slices are active" — is computed from the log via CLI queries, never stored. Constraints are expressed as invariants checked against the log (cardinality, precedence, content shape, referential integrity, protection). Backward movement, insertion, parallel branches, and "the user changed their mind" all become natural: emit a compensating event, the view updates.

This is *not* a database. It is JSONL committed to git. The CLI is the read engine, the invariant engine, and the only writer. Pre-tool-use hooks block direct edits at the tool-call level, producing loud immediate errors that guide the LLM to use the CLI. HMAC is not needed — the threat model is accidents, not motivated attackers, and a hook is simpler.

**Why this is a good solution.** One mechanism solves five problems: state machine rigidity (P18), merge resilience (P19), LLM-proof integrity (P20), CLI necessity (P29), and direct-edit protection (P30). It also makes the discovery ledger and the side-quest queue and the briefing log all *the same thing* — events, queried different ways.

**Corresponds to:** events + invariants premise (03), pre-tool-use hook premise (03), state-shape discussion (01).

### 5.3 The Refinement Loop (G4)

One loop, parameterized. Used for: target architecture, slice definitions, plan, optionally code review. Selects reviewers by relevance from a fixed pool. Each reviewer has a fixed contract (prevents drift). Always-on reviewers include holistic and invariant. Every reviewer answers two questions in addition to their domain: *"What context would the implementer (with the codebase open but no prior conversation) have to stop and figure out?"* and *"What context in this artifact is stale or unneeded?"* Both are first-class.

Re-review is change-scoped — reviewers see the diff and answer "did your prior concerns get resolved? are there new ones?" — not the whole artifact. Exit is mechanical: scores ≥ threshold, no CRITICAL/IMPORTANT, only MINOR remaining, OR a circuit breaker hands the user a judgment call. **Round count is not a target.**

The framing **"artifacts are context transport"** is preserved as the loop's animating principle, and **"a plan can be correct and still useless if it assumes context the implementer doesn't have"** is preserved as the rule reviewers apply.

**Why this is a good solution.** It absorbs everything that wants to be a separate review process (target review, slice review, plan review, code review). Convergence cost itself becomes a signal: a plan that won't converge is evidence the slice is too big — feeds back into reshape decisions in §5.6.

**Corresponds to:** Refinement Loop (01), reviewer-and-extractor premise (03), tight-writing premise (03).

### 5.4 Pressure Test (G3)

A single named adversarial pass on the target, before refinement, with five questions: failure-mode enumeration, scaling cliffs, optionality ledger, error-class inventory (with the third bucket — *"classes a different design could have made impossible"* — as the forcing function), and locked-in assumptions. The prompt explicitly tells the LLM its job is to find problems, not defend the design.

Findings are addressed or **accepted-with-justification** as a first-class outcome; accepted findings promote into the spine as tagged constraints so future reviewers don't re-raise them. The phrasing **"errors made impossible"** is preserved as the strongest framing the test exists to force.

Maturity calibrates depth — foundational subsystems get the deepest pass, experimental subsystems get a light one. Maturity is *not* a separate mechanism; it is a tag on subsystems in the spine (§5.1) that the Pressure Test, the Refinement Loop, and §5.5 all read.

**Why this is a good solution.** It addresses P4 (model defends first design) directly with the only thing that works — a posture switch enforced at one named moment. It does not need to be running constantly; that would dilute it into ceremony.

**Corresponds to:** Pressure Test (01), Maturity Tracking (01) — but maturity is folded into the spine, not a separate mechanism.

### 5.5 Verification rule (R2) (G5)

Every chunk in every plan declares a verification method. Plan-stage reviewers in the Refinement Loop check that the method is meaningful and tied to the chunk's intent. The build window declares up front what verification it runs between iterations. **A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence** — preserved verbatim, because the prose around it has failed to convey it.

Verification must, when possible, exercise real code paths and **end with live observation** — preserved verbatim. Things that cannot be model-checked (UI feel, subtle behavioral preservation) are *flagged honestly*: reshape the chunk, design an approximate check and flag the approximation, or schedule explicit human verification. No shallow proxies.

Mid-build, if the model discovers its verification is insufficient (tests pass but the result is obviously wrong), that itself is a pause trigger (§5.6).

**Why this is a good solution.** It is one rule, applied at three points (declaration, review, runtime), not three mechanisms. Verifiability is a property of every chunk, never an afterthought.

**Corresponds to:** R2 (01).

### 5.6 The Pause Discipline (G2)

This element absorbs four things that 01 treated separately: R1 discovery checkpoints, pre-flight, briefings, and the next-action menu. They are all the same discipline, applied at different moments around an autonomy window.

**The rule:** *"If the user knew this, would they want to reconsider?"* — preserved verbatim. If yes, pause. If no, note and continue. Maturity multiplies sensitivity: a foundational subsystem triggers pause on any trade-off shift.

**Before** an autonomy window: a structured pre-flight statement — *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. What I think I know: A, B, C. Anything to change?"* The discipline is **"if the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight"** — preserved verbatim. Runtime questions that recur are a signal that the pre-flight format is missing something, not that the LLM should ask more carefully.

**During** the window: pause only on the rule above. When you do pause, **a question that requires the user to guess what you were thinking is not a question — it is a puzzle** — preserved verbatim. State the original trade-off, what you found, two or three paths forward, and your recommended direction.

**At** every pause (whether voluntary at end-of-window or triggered by the rule): write a briefing event. The briefing is the next-action menu — produced when context is fresh, not reconstructed at return. **The next-action menu is always produced at pause time.**

**On return** (whether by the human after two weeks or a fresh Claude session after compaction): the orientation answer is "read the most recent briefing event for this scope." **Every session start is a return experience** and uses the same mechanism.

**Why this is a good solution.** Four mechanisms (R1, pre-flight, briefings, return-orientation) collapse to one discipline with four moments. The moments share a vocabulary (the rule, the structured format) and reinforce each other: a recurring runtime pause is a pre-flight format bug; a vague briefing is a discipline violation; a confused return is a missing briefing.

**Corresponds to:** R1 + Pre-flight (01) + Briefings (03) + the orientation discussion (03).

### 5.7 Mid-Epic Discovery, unified (G6)

One decision matrix, one capture format. The matrix is two-by-two: blocking × in-scope. The four cells are: expand current slice / insert slice / reshape epic or stop; defer to spine or to a future epic.

**Capture is uniform and cheap** — the same five-second shape for any finding: *what I was doing, what I found, why it matters, why I'm not doing it now.* The last field is the discriminator that separates a useful finding from a stale TODO. Capture is an event in the log (§5.2), tagged to the subsystem (§5.1).

**Triage happens at milestones, not at capture.** Slice Land and Epic Land each have a mandatory triage step (allowed to be empty-handed). Triage either promotes (to spine, to a future slice, to a new epic candidate, to an invariant proposal), merges duplicates, or culls. Findings tagged to a subsystem are surfaced *pull-based* when a future epic touches that subsystem.

Blocking discoveries route through the pause discipline (§5.6) and present the user with the matrix's blocking row as the menu of options. A reshape that adds work must update the spine first — *cannot* edit slice plans in place without the spine catching up.

**Why this is a good solution.** It absorbs the side-quest queue, the discovery ledger, and the triggered-reshape mechanism into one matrix with one event format. It also makes promotion into the spine the default disposition, which keeps the spine current and prevents findings from accumulating forever.

**Corresponds to:** Discovery Ledger + Triggered Reshape (01).

### 5.8 The CLI as the only writer (G7)

The CLI is the invariant engine, schema validator, query engine, atomic-write primitive, and integrity guarantee. Skills read derived state and emit events through CLI commands; skills never write `.goodplan/` directly. Pre-tool-use hooks enforce this at the tool-call level. The CLI also runs the extractors that pull structured metadata from prose at commit time, so invariants check structure, not text.

**Why this is a good solution.** It is the only solution to P29 and P30 that survives an LLM that occasionally cuts corners. The CLI is small enough to dogfood on this repo and large enough that no skill ever needs to "just edit the file."

**Corresponds to:** CLI premise (03), extractor premise (03), pre-tool-use hook premise (03), HMAC removal (03).

---

## 6. Mapping back to 01 and 03

| 01 / 03 mechanism | Survives? | Where it lives now |
|---|---|---|
| Context Spine | Yes, intact | §5.1 |
| Maturity Tracking | Folded in | Tag on subsystems in the spine; calibrates §5.4, §5.5, §5.6 |
| Pressure Test | Yes, intact | §5.4 |
| Refinement Loop | Yes, intact | §5.3 |
| R1 Discovery Checkpoint | Folded in | The "rule" inside §5.6 |
| R2 Build Only What You Can Check | Yes, intact | §5.5 |
| Discovery Ledger | Folded in | One half of §5.7 |
| Triggered Reshape | Folded in | Other half of §5.7 |
| Pre-flight checkpoint | Folded in | "Before" moment of §5.6 |
| Briefings (eager, structured) | Folded in | "At pause" moment of §5.6 |
| Return-from-stop orientation | Folded in | "On return" moment of §5.6 |
| Events + invariants architecture | Yes, intact | §5.2 |
| JSONL event log in git | Yes, intact | §5.2 |
| Pre-tool-use hook protection (no HMAC) | Yes, intact | §5.2, §5.8 |
| Subsystem first-class tracking | Yes, intact | §5.1 (folded into spine) |
| CLI as integrity engine | Yes, intact | §5.8 |
| Extractors at commit time | Yes, intact | §5.8 |
| Tight writing discipline | Yes | Reviewer contract in §5.3 |
| Honest-intermediate-state rule | Yes, verbatim | §5.1 |
| LLM-proposed invariants | Yes | Spine extension via §5.7 promotion |
| Snapshot/checkpoint state model | Subsumed | The event log (§5.2) is the snapshot model — every event is a checkpoint |

Mechanism count: 01 names roughly 7 named mechanisms, 03 adds another 6-7 architectural premises. The proposal here is 8 elements, but several of them absorb 2-4 of the originals. The user-visible vocabulary is smaller; the disciplines preserved are the same.

---

## 7. What would be lost (if anything)

Nothing load-bearing. The departures from 01/03:

- **"Maturity Tracking" is no longer a named mechanism.** It is a tag on subsystems in the spine, read by the Pressure Test, the Refinement Loop, and the pause discipline. This loses no behavior — the rigor dial still scales with maturity at every place that needs it. It saves the user from having to remember "Maturity Tracking" as a thing distinct from the spine.
- **"R1" and "Pre-flight" and "Briefings" are no longer three named mechanisms.** They are four moments of one pause discipline. The vocabulary loss is real: a contributor reading the docs will not see "R1" as a section heading. The discipline loss is zero: the rule, the structured format, the eager-write briefing, and the return-from-stop orientation are all preserved, and they are *easier* to remember as one thing with four moments than as three separate things. The verbatim phrasings are preserved.
- **"Discovery Ledger" and "Triggered Reshape" are no longer two named mechanisms.** They are one decision matrix with one capture format. This is a real consolidation, not a relabeling: the two mechanisms shared a problem (mid-flight discovery) and a substrate (the event log) but were treated separately in 01.
- **The snapshot state model from 01's "state shape" section is not separately implemented.** The event log *is* the snapshot model — every event is a checkpoint, every replay is a snapshot view. This is a clean win, not a loss.

The constraints from §1 are all honored: CLI preserved, LLM+human collaboration intact, markdown in git, multi-person merge resilience (events are append-only), this repo can dogfood on it.

The one thing worth flagging as a deliberate cost: **the proposal removes "Maturity Tracking" as a named heading.** If the team finds that it gets forgotten without its own name, that's recoverable — promote it back to a named element. The proposal bets that anchoring it to subsystem records in the spine is enough to keep it visible.

---

## 8. Reality check: every problem covered

| Problem | Addressed by |
|---|---|
| P1 grounding rebuild | §5.1 spine |
| P2 steering economy | §5.6 pause discipline |
| P3 mid-flight reality | §5.7 unified discovery |
| P4 model defends first design | §5.4 pressure test |
| P5 wrong rigor for maturity | Maturity tag in §5.1, used by §5.4, §5.5, §5.6 |
| P6 silent architectural drift | §5.1 honest-state rule + §5.7 promotion at slice land |
| P7 silent convention/invariant change | §5.1 rule that these are first-class spine docs and changes go through the same review as architecture |
| P8 no autonomy without verification signal | §5.5 R2 |
| P9 tests passing while code is broken | §5.5 "end with live observation" |
| P10 unverifiable intents | §5.5 honesty-over-shallow-proxy rule |
| P11 plan-correct-but-context-poor | §5.3 reviewer context-accumulation question |
| P12 reviewer drift and stagnation | §5.3 fixed contracts + change-scoped re-review + mechanical exit |
| P13 stale context in artifacts | §5.3 stale-context reviewer question |
| P14 when to interrupt | §5.6 the rule |
| P15 puzzle questions | §5.6 cheap-block discipline |
| P16 questions belong at pre-flight | §5.6 pre-flight discipline |
| P17 return after stop | §5.6 briefings as eager forward writes |
| P18 state machine rigidity | §5.2 events + invariants |
| P19 merge resilience | §5.2 append-only JSONL |
| P20 LLM-proof integrity | §5.2 + §5.8 hook-enforced CLI-only writes |
| P21 unified discovery shape | §5.7 |
| P22 triage at milestones | §5.7 |
| P23 pull-based surfacing | §5.7 |
| P24 stable subsystem identity | §5.1 subsystem records with stable IDs |
| P25 doc depth scales with maturity | §5.1 invariant tying depth to maturity |
| P26 next-action menu at pause time | §5.6 |
| P27 every session start is a return | §5.6 |
| P28 honest intermediate states | §5.1 verbatim rule |
| P29 CLI necessity | §5.8 |
| P30 direct-edit protection | §5.2 + §5.8 hook |

Every problem in §2 is addressed.

---

## 9. Next steps for the drafter of the ideal implementation doc

If this synthesis is the chosen direction, the ideal implementation doc should:

1. **Open with the spine.** It is the substrate; everything else reads from or writes to it. Define `architecture-current.md`, `conventions.md`, `invariants.md`, and `subsystems/<id>.md` in concrete terms with examples from this repo.
2. **Specify the event log and invariant set next.** Schema for events, the starting ~20 invariants, the extractor specs. This is the part the CLI implements.
3. **Specify the CLI command surface third.** Read commands, write commands (which emit events), query commands (which compute derived state). Every write goes through the CLI; every read can go through the CLI.
4. **Specify the Refinement Loop fourth, with the reviewer pool and contracts.** Include the two universal reviewer questions (missing context, stale context).
5. **Specify the Pressure Test, R2, and the pause discipline as named protocols, not mechanisms.** Each is a written discipline the LLM is taught and the reviewers check. Preserve the verbatim phrasings.
6. **Specify the unified discovery matrix and the event format for findings.** This is short; the work is in the routing rules at slice land and epic land.
7. **Phase ownership and skill set last.** Spark, Sharpen, Survey, Shape, Slice, Build, Slice Land, Repeat, Epic Land. For each, what skill owns it, what events get emitted, what context bundle is loaded, what invariants apply. This is the part that should feel mostly mechanical given §1-§6.
8. **Resist re-introducing collapsed mechanisms.** If the doc starts wanting a "Maturity Tracking" section heading or an "R1" section heading, ask whether the discipline is missing or just the name. If it's just the name, anchor it inside the element it lives in (§5.1 or §5.6).

This document deliberately does not specify event schemas, invariant definitions, or CLI command names. Those are the implementation doc's job. This document's job is to make the case that 8 elements is enough.
