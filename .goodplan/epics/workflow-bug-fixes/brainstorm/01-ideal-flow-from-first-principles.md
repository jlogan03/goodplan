# Arc 1 — Ideal Flow From First Principles

**Constraint for this doc**: Pretend goodplan does not exist. The user has an idea. They want it shipped, with high quality, with the LLM doing most of the labor, while staying confident the LLM is building the right thing. What is the *minimum* set of phases, transitions, and steering moments?

Do not reference current skill names, CLI verbs, or state-machine vocabulary in this doc. We earn the right to map back to those in Arc 2.

---

## The user's actual journey

Strip away tooling. The honest journey from "idea" to "shipped" looks like:

1. **Spark** — "I want X." Vague. Maybe a sentence. Possibly wrong about what X really is.
2. **Sharpen** — Talking it through; the user discovers what they actually want. Constraints surface. Non-goals surface. The shape of "done" comes into focus.
3. **Survey** — What does the world look like that this idea has to fit into? Existing code, prior decisions, libraries, patterns, tradeoffs other people have already chewed on.
4. **Shape** — Pick an approach. Make the load-bearing decisions. Acknowledge what's risky. This is the moment of architectural commitment.
5. **Slice** — Cut the work into pieces small enough that each one can be built, reviewed, and verified as a unit. Order them so early slices unblock later ones and so risky pieces happen early.
6. **Build** — For each slice: nail down what specifically gets touched, build it, check it, fix it, ship it.
7. **Reflect** — What did we learn? What surprised us? What does the architecture actually look like now versus what we said it would? What follow-ups do we owe?
8. **Repeat** — Most ideas have more than one slice. Most projects have more than one idea.

That's it. Eight verbs. Everything else is scaffolding to make those verbs reliable when an LLM is doing them.

## Where the user belongs

The user is the only one who knows what they actually want. The LLM is the only one with the patience to do the labor. The interface between them is "steering moments." A steering moment is cheap when the user is already paying attention, expensive when they have stepped away.

So: **the user picks the moments to be present, and the system has to honor that contract.** The system commits to:
- Never block in the middle of an autonomy window for something that could have been asked at the start.
- Always block at the boundary of an autonomy window so the user can re-enter cheaply.
- Surface mid-window discoveries that *change the deal* — and only those — without forcing a stop.

The four steering modes:

| Mode | What it feels like | Examples |
|---|---|---|
| **Conversation** | Back-and-forth, user fully present | Sharpen, Shape, Reflect |
| **Review** | User looks at a finished thing, says yes/no/tweak | Architecture proposal, slice menu, plan, completed slice |
| **Soft interrupt** | Async ping: "found something you should know about" | Discovery checkpoint, intervention proposal |
| **Background** | User is gone; system runs to next safe boundary | Slice build, multi-phase implementation |

The flow is a sequence of these modes, chained explicitly. The user always knows which mode they're currently in.

## The eight phases as zones

Map each verb above to one steering mode, plus the artifact it produces:

| Phase | Mode | Artifact | Done means |
|---|---|---|---|
| Spark | Conversation | Goal blurb | User signs off "yes that's what I want" |
| Sharpen | Conversation | Sharpened goal + acceptance criteria + non-goals + risks | User can answer "what could go wrong" without hedging |
| Survey | Background (mostly) | Research notes, brainstorm options | A short menu of approaches with tradeoffs surfaces |
| Shape | Review | Architecture commit + decisions with revisit triggers + pre-mortem scenarios + **`epic/target.md` (diff from current `architecture.md`)** + **pressure-test summary** + **named maturity transitions** | User has explicitly accepted each load-bearing choice and the target shape; the target draft has been put through an explicit Pressure Test and then a **target Refinement Loop** (see below) before exit |
| Slice | Review | Ordered slice list with dependencies, risk flags, **an explicit verification method per slice**, and **per-slice references to affected subsystems' maturity** | User has approved the cut; every slice has a declared verification method (or scheduled human checkpoint); each slice ends in an honest, describable intermediate state; the slice definitions themselves have been through a short **slice-definitions Refinement Loop** (see below) checking sequencing, scope, and verifiability |
| Build | Background with soft interrupts | Code + per-slice plan (post **plan Refinement Loop**, see below) + per-slice review trail; plan references `epic/target.md` as a constraint | Slice meets acceptance + checks pass + reviewer agrees + slice end-state matches its portion of the target delta |
| Slice Land | Short transition | **Promotion: `architecture.md` updated to reflect honest post-slice reality**; **Discovery Ledger triage** (promote/merge/cull findings captured during the slice) | Promotion committed; ledger triage run (even if empty-handed); workflow refuses to close the slice without both |
| Reflect | Background→Review | Learnings + architecture delta + follow-up proposals + any proposed `epic/target.md` edits surfaced from slice-time discoveries | User has triaged proposals (do now / queue / drop) |
| Repeat | Conversation | Next slice picked or epic closed | User says "next slice" or "ship it" |
| Epic Land | Review | Final reconciliation: `architecture.md` vs `epic/target.md` (modulo discovered target edits); maturity transitions finalized; silent-drift audit; **Discovery Ledger triage** across all findings accumulated during the epic | Gap closed or explicitly explained; maturity tags updated with sign-off; ledger triaged and any stale findings culled |

Note: the "Reshape the epic" branch of the Work Discovered Mid-Epic decision matrix routes control back to Shape, with accumulated context — not a full restart.

Every phase begins by reading `architecture.md` to seed context — see the Architecture Spine section below.

The crucial detail: **Sharpen, Shape, Slice, and Reflect are the user's steering points. Survey and Build are autonomy windows.** Spark and Repeat are short transitions.

## The flow as a single pipe

```
[Spark] →                                                        ← user present
   [Sharpen] ←-conversation--→
      [Survey] ----autonomy-window---- (soft interrupts allowed)
   [Shape] ←-review--→
   [Slice] ←-review--→
      For each slice:
         [Build] ----autonomy-window---- (soft interrupts allowed)
         [Reflect] ←-review--→
   [Repeat / Done] ←-conversation--→
```

Two autonomy windows: Survey and Build. Both can be paused and resumed. Both can fire soft interrupts. Both end at a natural review boundary.

Everything else is short and conversational. The user is present in those moments because being absent would be expensive — these are the moments where being wrong is hardest to undo.

## What "transition" should feel like

A transition is the boundary between two phases. The current system makes transitions clunky because each one requires the user to manually invoke the next skill. The ideal transition obeys these rules:

1. **The system always knows what comes next.** No "what should I run now?" — the next phase is implied by the current one's exit.
2. **Conversational phases offer to advance automatically.** If you just finished Sharpen, the system says "ready to survey the landscape, want me to go?" — one yes/no, not a slash command.
3. **Autonomy windows announce when they will return.** "I'll be working autonomously on Survey for the next few minutes. I'll come back when I have an architecture proposal, or sooner if I hit something tradeoff-changing."
4. **Re-entry is free.** After compaction, after walking away, after Ctrl-C: a single "where am I?" call returns to the exact next steering moment with all context restored.
5. **Phase boundaries are atomic.** You're either fully in phase N or fully in phase N+1. There is no "halfway through a transition" state.

## Steering checkpoints (the "more user steering" half of the tension)

The user wants more steering. That doesn't mean more interruptions — it means more *opportunities* to steer at moments the user has already opted into. Concretely:

1. **Pre-flight checkpoints** before each autonomy window:
   - "Here's what I'm about to go off and do. Here's what I'll come back with. Anything to change before I start?"
   - This is the user's chance to catch a mis-framing before the LLM burns hours on it.

2. **Discovery checkpoints** during autonomy windows:
   - **Pause on trade-off-shifting discoveries.** When you find something that changes the terms of a decision you or the user already made, stop and check in — don't keep building on a premise that may no longer hold. The question to ask yourself: *"If the user knew this, would they want to reconsider?"* If yes, pause. If the discovery only affects a local implementation choice with no ripple, keep going and note it for later.
   - When you do pause, make it cheap for the user to resolve: state the original trade-off, what you found, the two or three paths forward, and your recommended direction. A block the user can resolve in ten seconds is a good block; a block that requires a meeting is a planning failure.
   - When you pause to ask, remember that the user has not been in the room with you. You have been working independently and have built up context they do not share. Reconstruct that context in the question itself: what you were doing, what you found, why it matters, and what you need from them. A question that requires the user to guess what you were thinking is not a question — it is a puzzle.
   - Err toward pausing when the decision is load-bearing and toward continuing when it is not. Building for an hour on a wrong premise is far more expensive than a two-minute check-in.
   - Pressure-test findings can themselves be blocking discoveries: if the test reveals the target is materially shakier than the Shape draft assumed, that is an R1-style block on exiting Shape until the target is adjusted. The Pressure Test is, in effect, R1 applied to the design itself before any code is touched.
   - In-scope *blocking* discoveries are the load-bearing case for R1. The "two or three paths forward" the block is required to present map directly to the five reshape options in the Work Discovered Mid-Epic section (expand / insert-before / insert-after / reshape-epic / promote-to-own-epic). Verification of reshape-added work is not carved out: R2 still applies — any work added mid-epic must come with a model-runnable verification method, same as work planned at Slice time.

3. **Boundary checkpoints** at the end of each autonomy window:
   - "Here's what I did, here's what I found, here's what I think the next phase should look like."
   - The user can accept, redirect, or pop back to an earlier phase.

4. **Recap checkpoints** at the end of each slice and each epic:
   - Not just "done." A real recap: what did the system actually do, what does the architecture look like now, what surprised us, what's queued.

The contract: during autonomy windows, the LLM may pause for *exactly one* reason — a discovery so tradeoff-changing that continuing would burn user time on a path the user wouldn't endorse. Everything else waits for the boundary checkpoint. The "materially matters" judgment carries a built-in multiplier: changes that touch **foundational** subsystems (see Maturity Tracking below) are material by default — the bar to keep going without checking in is much higher.

## Architecture Spine

The workflow has a persistent architectural artifact spine. It seeds context for every phase, propagates constraints during slicing, and prevents cross-epic drift. Two layers:

- **`architecture.md`** (project-level, single source of truth). The system as it exists TODAY. Terse, structural: subsystem map, public boundaries, invariants, non-obvious constraints. Not a file listing. If you can derive it from reading the code in ten minutes, it doesn't belong here.
- **`epic/target.md`** (epic-level). The shape the system will have after this epic lands. Written as a DIFF from current, not a full rewrite: *"Current says X; target says Y; because Z."* Small, reviewable, automatically stable against unrelated parts of the system.

**Why this matters to the LLM, not just to the human:**

1. **Context seeding.** Every phase starts by reading `architecture.md`. The LLM does not rebuild a mental map from code exploration on each run. This stabilizes the starting frame and collapses startup cost.
2. **Constraint propagation during slicing.** The target acts as a constraint the LLM must satisfy, not just describe. Reviewers check plans against the target; without it they can only check local consistency.
3. **Cross-slice coherence.** Slice 3 and Slice 7 plan against the same reference. Local optimization and slice-to-slice drift get caught.
4. **No context rot between epics.** Promotion (next paragraph) means the next epic's `architecture.md` already incorporates the previous epic's shipped reality. Without promotion, the top-level doc goes stale the moment the first epic ships.

**Promotion rule — PER SLICE, not per epic.** When a slice lands, `architecture.md` is updated to reflect the real post-slice state. The LLM planning slice N+1 reads a current architecture that already includes slice N's contribution. Target progress is observable by diffing `architecture.md` against `epic/target.md` at any moment — if slices land but the gap doesn't shrink, that's a signal the slices weren't doing architectural work.

**The honest-intermediate-state rule.** Promotion describes the honest post-slice reality, not the intended end state. If a slice leaves the system mid-rename (half the files renamed, half not), `architecture.md` says so plainly: *"Module X is mid-rename; files A/B use the new name, files C/D still use the old. Slice 5 will complete this."* No pretending the work is done.

**Corollary — slicing preference.** Prefer cuts that leave coherent intermediate states. A slice that can land with a straight-faced architecture doc is better than one that can't. This becomes an explicit slicing-review criterion: *"Does this slice end in a state we'd be comfortable describing?"* If not, reshape.

**Failure modes:**

1. **Doc rot.** If promotion is skipped or half-done, `architecture.md` drifts from code. Antidote: promotion is a mandatory part of slice Land — the workflow refuses to close the slice without it. Between epics, a reconciliation audit (LLM reads code, diffs against `architecture.md`, flags discrepancies) catches silent drift from side quests or direct fixes.
2. **Target over-specification.** If `epic/target.md` names specific functions or line counts, slices get boxed in. Rule: target describes shape and invariants, not implementation. If the target mentions a specific function name, it's too specific.
3. **Stranded drift.** Slice-time discoveries can change the right target. If they don't propagate back, later slices plan against a wrong target. Target is LIVE — slices may propose target edits, gated by the R1 blocking-discovery rule. Target edits are a first-class outcome of a slice, not an anomaly.
4. **Verbose current doc.** Too much detail in `architecture.md` makes every slice's promotion a merge nightmare. Structural only — subsystem map, public APIs, invariants, non-obvious constraints. Details live in code.

**Connection to Work Discovered Mid-Epic.** Discovery Ledger findings that name constraints (not work) promote into `architecture.md` as known limitations, tagged to subsystem. Reshapes triggered by mid-epic blocking discoveries must update `epic/target.md` *before* any slice plan is touched — the spine is what makes reshape decisions reviewable instead of silent scope creep.

**Connection to Pressure Test.** Pressure-test findings that are *accepted* (rather than fixed) promote into `architecture.md` as known constraints or assumptions, tagged to the subsystem they touch — *"Module Y assumes single-writer."* This is a recognized promotion target alongside Discovery Ledger architectural annotations. It keeps pressure-test reasoning visible to future epics so they don't re-rediscover the same issues.

## Pressure Test

**Intent.** After the target architecture is drafted but before it enters the refinement loop, run an explicit adversarial pass that tries to find ways the design will hurt us later. This is not a review of whether the design is correct — it's a search for the classes of problems the design *invites*, the scaling cliffs it hides, the optionality it forecloses, and the errors it fails to make impossible. Without this step, models systematically under-deliver architectural quality: they produce designs that are *correct given the inputs considered* but leave whole classes of problems to be discovered one at a time at the worst possible moments.

The "errors made impossible" framing is the strongest form of architectural quality. It's the difference between *"the code handles bad input correctly"* and *"bad input cannot be constructed in the first place."* Models don't naturally reach for this — they reach for defensive validation, which is strictly worse. The Pressure Test's job is to force the stronger framing.

**Five questions.** A single rigorous pass answers all five:

1. **Failure-mode enumeration.** What are the *shapes* in this design that invite classes of problems? Not hypothetical bugs — structural invitations. *"This design puts validation at the caller, which means every new caller becomes a new place validation can be forgotten."* *"This state machine permits A→B but nothing enforces that A's invariant has been established, so B can be entered with garbage."*

2. **Scaling cliffs.** Not vague "will it scale" but concrete axes: *What breaks at 10x data volume? At 100x concurrent writers? When entity count doubles? When a new integration is added? When a new subsystem depends on this?* Output is the **location of the cliff**, not a performance estimate.

3. **Optionality ledger.** Two columns:
   - **Options preserved** — decisions this design lets us defer because the shape accommodates multiple future answers.
   - **Options foreclosed** — decisions this design commits to now that would be expensive to reverse.

   Good architecture preserves options in areas of genuine uncertainty and commits decisively in areas of confidence. A design that preserves optionality everywhere is flexible slop; a design that forecloses everywhere is brittle.

4. **Error class inventory.** Three buckets:
   - **Classes of error now impossible by construction.** *"A slice cannot be marked complete before its verification has run — the type requires the verification result."*
   - **Classes of error still possible.** *"Two concurrent writers can both mark the ledger dirty — nothing prevents race on this field."*
   - **Classes of error a different design could have made impossible.** This is the hard question and the most important — it forces the model to imagine alternative architectures that trade off differently instead of defending the current one.

5. **Locked-in assumptions.** What does the design silently assume? *"Assumes findings never reference each other."* *"Assumes the ledger is small enough to load fully in memory."* *"Assumes the user is the only writer."* Each assumption is a future cliff in disguise.

**Where it fits in Shape.**

1. Draft `epic/target.md` as a diff from current.
2. **Pressure test** — LLM runs the five questions in adversarial mode (see prompt posture below) and produces a pressure-test report.
3. Adjust the target to address findings where worthwhile. Explicitly **accept** findings where not (with a short justification — accept-with-justification is a first-class outcome, not a cop-out).
4. Target refinement loop runs on the adjusted target.
5. Final target includes a **Pressure-Test Summary** section documenting what was examined, what was changed, and what was accepted with rationale.

**Prompt posture.** The LLM must be explicitly told its job in this step is to *find* problems, not defend the design. Literal instruction: *"Your job in this step is to find ways this will hurt us. If you find none, press harder — that usually means you haven't tried."* Adversarial mode is a different cognitive posture than review; the prompt is what flips it.

**Why a step, not a reviewer role.** Reviewers critique what's there; this critiques what *isn't* there — alternative architectures that might have been better, errors that weren't designed against. That's easy to skip in a pile of reviewers. Making it a named step ensures it happens. (It can *also* be a reviewer perspective, but the step exists regardless.)

**Failure modes to design against:**

1. **Adversarial mode becomes performative.** LLM lists three generic concerns to satisfy the step and moves on. Antidote: require at least one finding per category, and each finding must be specific enough to act on. Generic findings (*"scaling could be a concern"*) are rejected.
2. **Pressure-test findings are never accepted, only fixed.** If every finding must be addressed, the test becomes a drag and gets watered down. Antidote: *accept-with-justification* is a first-class outcome, and accepted findings promote into the architecture spine so they're tracked honestly.
3. **Over-designing for hypothetical scale.** A pressure test can tip into architecture astronautics. Antidote: scaling questions are anchored to realistic horizons (*"in the next 6–12 months, what volume/complexity do we actually expect?"*), not arbitrary numbers.
4. **Pressure test becomes a reviewer checklist.** If treated as box-ticking, the adversarial mindset disappears. Antidote: the prompt itself is the protection — explicit instruction to *find* problems, not evaluate a document.
5. **"Errors made impossible" framed as constraint, not goal.** Models will list impossible-error classes if asked but won't *design for* making more classes impossible unless prompted. Antidote: the third error-class bucket (*"classes a different design could have made impossible"*) is the forcing function — it makes the model imagine alternatives, not just defend the current.

**Connections.**

- **Architecture Spine:** accepted findings promote into `architecture.md` as tagged constraints/assumptions (see the spine section's Connection to Pressure Test note).
- **Maturity Tracking:** rigor scales with maturity (see the maturity section).
- **R1 Discovery Checkpoints:** a pressure test that reveals the target is shakier than the Shape draft assumed is itself a blocking discovery — Shape does not exit until the target is adjusted.
- **Work Discovered Mid-Epic:** an invalidated pressure-test assumption mid-slice is a valid Triggered Reshape trigger; such reshapes update the pressure-test summary.
- **Refinement Loop:** pressure-test findings (both fixed and accept-with-justification) are passed to the downstream Refinement Loop's reviewers as context, so reviewers don't re-raise concerns that were already deliberately accepted.

## Refinement Loop

**Intent.** Any substantial artifact the workflow produces — architecture documents, slice definitions, slice plans — goes through an iterative multi-perspective refinement loop before downstream work depends on it. The loop is not a quality-control afterthought. It is *the* mechanism by which the workflow produces artifacts good enough to build on.

**The deep insight: artifacts are context transport.** Most review processes are framed as catching mistakes. This one does that, but its more important function is **context accumulation**. Each reviewer adds missing context, corrects wrong context, and verifies the context that's already there. By the end, the artifact is a self-contained specification: a downstream agent (implementer, slicer, target-drafter) who has never seen the codebase could, in principle, execute against it without re-discovering anything.

A plan can be *correct* and still *useless* if it assumes knowledge the implementer doesn't have. A refined plan has absorbed that knowledge. Same for architecture — a refined target that assumes context the next epic won't have forces every subsequent epic to rediscover it. Same for slice definitions: if a reader can't tell what each slice does from the definition alone, the definition isn't done.

Context accumulation should be an **explicit goal** of every reviewer, not a happy side effect.

---

**Mechanism.** The loop is universal in shape, parameterized per use:

1. **Select reviewers by relevance.** From a pool of specialized reviewers (software architecture, holistic, type safety, data layer, frontend, API contracts, verifiability, sequencing, etc.), pick the subset whose domains the artifact actually touches. Always-on reviewers (holistic, invariant-checker) run every time.
2. **Parallel review.** Each selected reviewer evaluates the artifact against its contract (see below), produces structured feedback (severity-tagged findings, a score, identified missing context), and returns.
3. **Synthesize.** Merge reviewer output into a single feedback document. Resolve contradictions; flag genuine unresolvable tensions for the user (R1 blocking territory).
4. **Edit.** An editor agent applies the feedback — not just flags issues, *fixes* them. Feedback that can't be auto-resolved escalates.
5. **Re-review, change-scoped.** Next round's reviewers see a diff, not the whole artifact, and answer: *"Did your prior concerns get resolved? Did the changes introduce new ones?"* This is the key to avoiding stagnation.
6. **Exit on criteria, not feel.** Mechanical: all relevant reviewer scores ≥ threshold, zero CRITICAL, zero IMPORTANT, only MINOR remaining. Or: circuit breaker on stagnation/reduction/max rounds, which hands control to the user for a judgment call rather than exiting silently.

---

**Where the pattern is used.** Refinement Loop runs at every artifact boundary where downstream work depends on the result:

| Phase | Artifact | Reviewer pool | Rigor |
|---|---|---|---|
| **Shape** | `epic/target.md` (post-pressure-test) | System-level reviewers: software architecture, holistic, invariant-checker, domain specialists for touched subsystems. Smaller pool. | Scales with target scope and maturity of touched subsystems. Usually 1–3 rounds. |
| **Shape** | slice definitions (sequencing, scope, dependencies) | Holistic, sequencing, verifiability, subsystem-boundary, dependency-check. Small focused pool. | Quick loop — 1–2 rounds typical. Checks size, coherence of intermediate states, ordering, verifiability per slice. |
| **Slice** (per slice) | slice plan | Full pool — specialists selected by what the plan touches. The largest loop. Context accumulation is the explicit goal. | Scales with slice stakes. 2–4 rounds typical, more for foundational work. |
| **Build** | in-progress code | Reviewers run against commits/PRs. Not a fixed loop; continuous light-touch review. | Lower severity threshold; doesn't block every commit but catches drift. |
| **Land** (per slice) | architecture.md promotion + learnings | Light touch. Reviewers check that promotion reflects reality, not a re-review of prior work. | 1 round typical. |

Each use shares the mechanism, differs in parameters (pool composition, rigor dial, max rounds, exit thresholds). The shared mechanism is named **Refinement Loop**; per-use parameters live alongside the phase definition.

---

**Six improvements over naive review:**

1. **Context accumulation is a first-class reviewer question.** Every reviewer, regardless of domain, answers: *"What context will the downstream agent need that isn't in this artifact?"* Concrete grounding: *"If I were the implementer with the codebase open but no prior conversation context, would I have to stop and figure X out?"* Grounded, not hypothetical.

2. **Change-scoped re-review.** After round 1, reviewers see a diff, not the whole artifact. They answer whether their prior concerns were resolved and whether the delta introduced new ones. This collapses stagnation (reviewers can't re-raise stale concerns about unchanged content), reduces token waste proportionally to how local the changes are, and makes convergence faster.

3. **Rigor scales with stakes, not a universal bar.** A trivial slice touching experimental code doesn't need the full specialist pool and three rounds. A foundational architectural change does. Inputs to the rigor dial: maturity of affected subsystems, size of the target delta, pressure-test findings in this area. Over-rigor is as bad as under-rigor — it wastes tokens and trains the team to treat review as ceremony.

4. **Reviewer contracts are fixed and structured.** Each reviewer has a written contract: *"I check for X, Y, Z."* Prevents reviewer drift (commenting outside domain), prevents noise, prevents contradictions that are artifacts of unclear scope rather than real disagreement. Output conforms to the contract.

5. **Weighted scoring by relevance.** Reviewer scores are weighted by how relevant that reviewer is to the specific artifact. A TypeScript reviewer's 7 on a TS-heavy plan is load-bearing; on a data-model-heavy plan, it's a warning. High-weight reviewers below threshold block exit; low-weight reviewers below threshold produce warnings.

6. **Convergence cost is a slicing signal.** A slice plan that takes more than N rounds to converge is a signal the underlying slice was too big, too ambiguous, or touched too many domains. The refinement loop reports convergence cost back to the slicing phase as feedback: slices that produce unconvergeable plans should route to Triggered Reshape, not to more review rounds.

---

**Failure modes to design against:**

1. **Stagnation.** Scores plateau at 8; rounds keep happening with no real improvement. Antidote: change-scoped re-review eliminates most false stagnation. When stagnation is real, the circuit breaker presents stuck findings to the user for a judgment call — *"Accept at 8, escalate to reshape, or abandon?"* — instead of exiting silently.

2. **Context accumulation becomes context bloat.** Reviewers add so much context the artifact becomes unreadable. Antidote: reviewers must identify *both* missing and stale context. A plan that has context the implementer doesn't need is also failing.

3. **Contradictions papered over.** Two reviewers disagree; synthesis picks one; the other's concern is lost even though it was the point. Antidote: synthesis surfaces unresolved contradictions to the user rather than silently resolving.

4. **Reviewers gamed or miscalibrated.** A reviewer that always scores 9 or always scores 5 is useless. Antidote: reviewer calibration over time — track correlation between scores and implementation outcomes; reviewers whose scores don't correlate get their weights adjusted or contracts rewritten.

5. **Rigor dial gamed.** Users downgrade rigor on foundational work to skip review pain. Antidote: rigor is tied to maturity and stakes, not user preference. Overrides are allowed but recorded and justified.

6. **"What context will the implementer need" becomes speculative.** Reviewers invent needs the real implementer would never have. Antidote: ground the test in the concrete codebase state — *"reading the codebase as it exists today, would the implementer have to stop and figure X out?"*

---

**Connections to existing sections:**

- **Architecture Spine.** Refinement runs on both `epic/target.md` (post-pressure-test) and slice plans. Target refinement is what makes the spine reviewable — a target diff goes through the loop before it's considered committed.
- **Pressure Test.** Pressure-test findings (both accepted and actioned) are passed to reviewers as context, so reviewers don't re-raise concerns that were already deliberately accepted. Pressure Test and Refinement Loop are complementary: Pressure Test finds problems proactively; Refinement Loop addresses them and catches others.
- **Maturity Tracking.** Rigor dial input. Foundational subsystems get the full reviewer pool and highest round counts; experimental gets a light pass.
- **Work Discovered Mid-Epic.** Convergence failure (repeated rounds, no progress) is a signal that reshaping the slice is cheaper than continuing to refine. The loop reports this back; reshape is the correct response, not more rounds.
- **R1 Discovery Checkpoints.** Unresolved reviewer contradictions or findings that would invalidate previously-made decisions route through R1 blocking — the loop doesn't silently paper over tension.
- **R2 Verification.** Reviewers explicitly check that each plan chunk's verification method is meaningful (tied to acceptance criteria, not cargo-culted). This operationalizes R2 — the refinement loop is where "build only what you can check" becomes enforceable.

## Maturity Tracking

Each subsystem in `architecture.md` carries a **maturity tag** and an orthogonal **lifecycle state**. These calibrate how much rigor the LLM applies when changing the subsystem.

**Why this matters to the LLM.** Without maturity, the LLM treats all code equally and falls into two symmetric failure modes: over-engineering experimental code (careful migrations and test scaffolds for stuff about to be rewritten), and under-engineering foundational code (treating a load-bearing change like a casual refactor). Neither is fixable by telling the LLM to "use judgment" — it has no basis for judgment without the information. Maturity also plugs directly into the R1 blocking-discovery rule: "materially matters" is context-dependent, and a trade-off shift that barely matters in an experimental subsystem absolutely matters in a foundational one. Maturity gives the blocking heuristic a multiplier.

**Taxonomy:**

| Level | Meaning | LLM behavior |
|---|---|---|
| **Experimental** | Recently introduced. Unstable API. Few or no dependents. Expected to change. | Change freely. Don't over-engineer. Tests focus on whether the experiment is working, not on preventing churn. |
| **Maturing** | Stabilizing. Some dependents. API in flux but not wildly. | Be deliberate. Write tests. Document rationale. Don't break known callers silently. |
| **Stable** | API fixed. Multiple dependents. Changes are planned and migrated. | Default rigor. Changes require migration thinking. Breaking changes need explicit justification. |
| **Foundational** | Load-bearing primitive. Many dependents. | Change carefully and rarely. Explicit user sign-off required for breaking changes. R1 discovery blocking triggers by default on any trade-off shift. Plan migrations exhaustively. Audit every dependent. |

**Orthogonal lifecycle axis:** active / deprecated / retired. *Deprecated* means "still here, but being phased out — don't build new things on top." *Retired* means "scheduled for removal in a known epic."

**Integration into the flow:**

- `architecture.md` lists each subsystem with its maturity tag and ideally a dependent count. The count is a falsifiability check — a subsystem tagged "experimental" with twelve dependents is lying.
- `epic/target.md` explicitly names any maturity transitions the epic drives: *"After this epic, subsystem X promotes from maturing → stable."* Promotion is a deliberate decision with a review gate, not an emergent one.
- Slice plans reference the maturity of affected subsystems and adjust rigor accordingly. Reviewers calibrate strictness the same way.
- R1 blocking gets a built-in multiplier: trade-off changes affecting foundational subsystems are material by default.
- At Epic Land (and during periodic audits) a maturity reconciliation step runs: *"Did any subsystem silently become load-bearing? Did any deprecated thing get resurrected?"* Catches drift.

**Failure modes:**

1. **Maturity lies.** Subsystem tagged "experimental" that's actually load-bearing. Antidote: dependent count is a sanity check. If experimental has >3 dependents, flag it.
2. **Over-tagging to foundational.** Feels safer but destroys velocity — everything becomes a careful migration. Antidote: promotion to foundational is an explicit decision with user sign-off, not a default.
3. **Under-tagging forever.** Experimental subsystems stay experimental past their stabilization point. Antidote: promotion is an active step at Epic Land and periodic audit — "did anything mature?"

**Connection to Pressure Test.** Pressure-test rigor scales with maturity. Experimental subsystems get a light pass — don't over-think shapes that are about to change anyway. Foundational subsystems get the full treatment of all five questions: the asymmetry of cost between a small change now and a migration later more than justifies the investment. Maturity is the rigor dial on the Pressure Test, the same way it is the rigor dial on R1 blocking sensitivity.

**Connection to Work Discovered Mid-Epic.** Reshapes that touch foundational subsystems automatically hit the R1 blocking rule at higher sensitivity — the bar to pick "expand current slice" rises with maturity. A finding's severity inherits the maturity of the subsystem it touches: the same performance cliff is a note in an experimental module and a reshape trigger in a foundational one.

## Work Discovered Mid-Epic

Deferred work and blocking work are not unrelated concerns — they are two flavors of the same parent problem: **work discovered mid-epic**. They differ on two dimensions: blocking vs. non-blocking, and in-scope vs. out-of-scope. The current system treats them as separate features with separate capture paths; the ideal flow unifies them under a single decision matrix and routes each discovery to the cheapest correct response.

|                     | **In scope**                                      | **Out of scope**                                                |
|---------------------|---------------------------------------------------|-----------------------------------------------------------------|
| **Blocking**        | Reshape current epic                              | Stop epic; promote finding to its own epic; resume after        |
| **Non-blocking**    | Expand target, insert/adjust a future slice       | Defer: park as a finding in the Discovery Ledger                |

### Discovery Ledger (non-blocking deferred work)

The current side-quest-and-task model captures deferred work but has four failure modes:

1. **Capture is too heavyweight for the moment of discovery.** Parking should take five seconds, not stop to classify.
2. **Triage happens at the wrong time.** Classifying at capture asks for a decision when you have the least information.
3. **No decay.** Nothing culls stale findings — the list becomes a graveyard.
4. **Push-based, not pull-based.** You have to remember to look. Findings don't surface when they become relevant.

**Proposal: a Discovery Ledger with deferred triage.**

- **Uniform, cheap capture.** Every discovery is a "finding" with a fixed small shape: *what I was doing, what I found, why it matters, why I'm not doing it now.* The last field is what separates a useful finding from a stale TODO. No size classification at capture.
- **Triage at milestone moments.** Slice Land and Epic Land each have a short triage step: promote findings (to task / quest / epic candidate / architecture annotation), merge duplicates, cull irrelevant ones. Triage is cheap at milestones because post-slice/epic context is available.
- **Some findings are architectural facts, not work.** "Module Y has a performance cliff at 10k records." That's a constraint, not a quest. It promotes into `architecture.md` as a known limitation of the current state, tagged to the subsystem. This is a new kind of promotion target.
- **Pull-based surfacing.** When a new epic enters Frame, the workflow surfaces any findings tagged to the subsystems that epic will touch. They arrive when they become relevant, not when you remember to look.
- **Explicit decay.** Findings older than N epics without promotion or reference are surfaced for culling with a two-second prompt: *"This finding is stale. Still relevant, or cull?"*

**Failure modes to design against:**

1. **Capture becomes triage by accident.** If the capture form asks too much, it defeats the five-second goal. Keep it to the four fields; only "what I found" is required.
2. **Triage skipped at milestones.** If Slice Land is busy, triage gets deferred and the ledger accumulates. Triage is a mandatory Slice Land step, but allowed to be empty-handed — the step exists even if there's nothing to do.
3. **Architecture-spine pollution.** If every finding becomes an architecture annotation, the doc rots. Architecture promotion requires a justification — the finding must name a constraint that affects planning, not just a nuisance.

### Triggered Reshape (blocking in-epic work)

When a slice discovers work necessary for the epic to succeed, the slice cannot silently grow — that breaks reviewer frames of reference and causes epic drift. But forcing a full restart is absurd. Five explicit response options, with the workflow making them visible and picking the cheapest one that is actually correct:

| Response | When to pick | Cost |
|---|---|---|
| **Expand current slice** | Discovery is small, directly on the slice's path, and does not change the slice's goal statement. | Low. Slice plan gets edited; reviewers re-run on the delta only. |
| **Insert a new slice before this one** | Discovery is a prerequisite for the current slice — a distinct unit of work with its own verification, blocking the current slice from proceeding. | Medium. Current slice pauses; new slice runs through Plan/Build normally; current slice resumes against updated architecture. |
| **Insert a new slice after this one (anywhere downstream)** | Discovery is needed for the epic to land but does NOT block the current slice. Can be placed directly after the current slice or interleaved anywhere among future slices based on dependencies. | Medium. Current slice continues uninterrupted; target is updated; slice sequencing is adjusted; new slice runs through Plan/Build when scheduled. |
| **Reshape the epic** | Discovery invalidates `epic/target.md` — the shape of what the epic is building has changed. | High. Return to Shape phase, re-draft target, re-slice affected portions. |
| **Stop and promote to its own epic** | Discovery is out of scope entirely. Current epic pauses until that epic lands (or is deferred). | Very high. Only correct when in-place options would cause more damage. |

**Two forcing functions to keep this honest:**

1. **Any reshape must update `epic/target.md` first.** You cannot edit slice plans in place without updating the target — the target must reflect the new intent. This prevents silent scope creep and makes reshape visible to reviewers: they review the target diff before they review the new slice plan.
2. **The R1 blocking rule is the trigger.** A slice does not quietly grow scope on its own initiative. When it discovers work it cannot contain, it hits the blocking-discovery checkpoint, surfaces the finding with the five options (and its recommendation), and the user picks. A 30-second decision in most cases.

A reshape can also be triggered by **an invalidated pressure-test assumption** — a slice discovers that something the original Pressure Test silently assumed (or explicitly accepted) no longer holds. When this happens, the reshape must update the Pressure-Test Summary in the new target, not just the target diff: the original justification is now part of the audit trail for why the reshape was necessary.

A third trigger: **convergence failure in the Refinement Loop.** When a slice plan refuses to converge after repeated rounds, that is itself a signal the underlying slice is too big, too ambiguous, or touches too many domains — reshape is the correct response, not more review rounds. The loop reports its convergence cost back to the slicing phase as a Triggered Reshape input.

The sharpen/survey/shape loop slots in naturally as the "Reshape the epic" branch — the same Shape phase running again, now with accumulated context. Reviewers should be more lenient on re-review because most of the epic is unchanged; only the delta matters. (This connects to refinement-loop redesign: review scope should match change scope.)

**Failure modes to design against:**

1. **"Expand current slice" becomes the default because it's cheapest.** This is how epics silently drift — every reshape picks the fast option. Reviewers explicitly check whether expand-in-place was the right call, and the workflow records reshape decisions so drift is observable over time.
2. **Reshape cascades.** One reshape triggers a new discovery that triggers another reshape. A cap on reshapes per epic (say, 3); hitting the cap forces a Shape-level conversation with the user about whether the epic is still coherent or should be split.
3. **Cross-slice invalidation.** A reshape that adds or inserts a slice can invalidate assumptions in downstream slices. Reshape must explicitly re-verify downstream slices' plans against the updated target before Build resumes.

## Core principle: build only what you can check

**Build only what you can check.** The model's ability to do good work autonomously depends entirely on its ability to tell whether the work is good. Without a feedback signal the model can run, iteration collapses into *"write something, hope it's right, stop"* — which is how mediocre work ships. Verifiability is not a ceremony. It is the thing that makes autonomous iteration possible at all.

When breaking work into chunks, ask of each one: *"If I finish this, how will I know I got it right?"* The answer must be something the model itself can run and interpret — a test, a typecheck, a script that compares output to expected, a query that confirms a state change. The answer must also be tied to the actual intent of the chunk, not an incidental property. A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence.

There is a specific failure mode to watch for: writing tests that pass while the live code is broken. A model that runs `vitest`, sees green, and calls it done has not verified the software — it has verified that its tests agree with its implementation, both of which the same model just wrote. Whenever possible, verification must include exercising the actual code paths you built or changed and directly observing the behavior: start the service and hit the endpoint, run the CLI with a real argument and inspect the output, load the page and watch what happens. Integration and unit tests remain valuable — they catch regressions cheaply and document intent — but they are not by themselves sufficient evidence that a goal has been achieved. End with live observation.

When a chunk's intent cannot be checked by the model — *"the interface feels responsive," "the error message is clear," "the refactor didn't change external behavior in some subtle way"* — do not paper over it with a shallow proxy. Surface it, and let the workflow decide: reshape the chunk so it is checkable, design an approximate check and flag the approximation honestly, or schedule an explicit human verification step. Honesty about what cannot be verified is more valuable than fake green checks.

**Implication for Slice:** every chunk produced by the Slice phase must carry an explicit verification method. "Model runs test X and it passes" is ideal. "Lint + typecheck + targeted unit test" is standard. "Human eyeballs the UI" is legitimate but must be **explicit and scheduled**, not assumed — and it converts that slice's Build window from pure-autonomy into autonomy-with-a-required-review-interrupt.

**Implication for the Refinement Loop:** plan-stage reviewers explicitly check that each chunk's declared verification method is meaningful — tied to the chunk's acceptance criteria, model-runnable, and not cargo-culted. The refinement loop is where "build only what you can check" stops being an aspiration and becomes enforceable: a plan with shallow or missing verification fails the loop.

**Implication for Build:** the autonomy window's iteration loop is only as good as its verification signal. The window declares up front *what verification it will run between iterations* and *what signal it treats as "done."* If mid-window the model discovers its verification is insufficient (e.g., tests pass but the result is obviously wrong), that is itself a discovery-checkpoint trigger under Revision 1.

## Autonomy windows (the "preserve walking away" half of the tension)

Autonomy windows have to be *worth* walking away from. That means:

- **Long enough to matter.** Sub-five-minute windows don't earn the user the right to step away.
- **Bounded by clear deliverables.** "I'll come back with an architecture proposal" is a window. "I'll work on it for a bit" is not.
- **Resumable.** If the window is interrupted (compaction, error, user stop) it resumes from the same point on next entry.
- **Self-correcting within scope.** Inside a window, the LLM iterates with reviewers without asking the user. Stagnation, regression, and oscillation detection are mechanical.
- **Anchored to a model-runnable verification signal.** The window cannot "iterate to quality" without a check it can run itself. No verification signal → no true autonomy window; see the core principle above.
- **Honest about budgets.** Windows declare "I expect N rounds, I'll stop and ask if I exceed M." The user can extend on return rather than mid-flight.

The hardest design discipline: **if the LLM is asking the user something during an autonomy window, that question should have been asked at the pre-flight checkpoint.** The intervention system exists to spot questions that should migrate from runtime to pre-flight.

## State shape (no backward arrows? or yes?)

The current state machine forbids backward transitions. From first principles, that's wrong, but for a subtle reason: it's not about whether the *machine* can step backward, it's about whether the *user* can change their mind without losing the artifacts.

Two failure modes:

- **No back-step**: user discovers a planning error during build → must abandon the slice → loses the build state and the plan history.
- **Free back-step**: user pops back during build → state machine accepts → autonomy windows that were running get silently invalidated → confusion about what's still valid.

The right model is **time-stamped checkpoints, not a linear state machine.** Each phase produces an immutable snapshot. Going "back" means starting a new attempt at an earlier phase, with the prior attempt preserved. The system shows you "you have two architecture proposals, which is current?" and you pick.

This collapses several current concepts:

- "Replan count" → just a count of how many planning snapshots exist
- "Abandon and recreate" → just a new attempt
- "Phase skip" → a phase whose snapshot is "skipped, reason: trivial"
- "Re-entry after error" → resume from latest snapshot

The state machine becomes: "what's the latest unblocked snapshot, and what's the next phase that needs one?"

## Context discipline (what the LLM should receive)

For each phase, the LLM needs *exactly* the context required to do that phase well, no more, no less. The discipline:

- **Conversational phases** (Sharpen, Shape, Slice, Reflect): user is present, can answer questions. Context is whatever's needed to ask good questions: prior decisions in scope, recent learnings, the current goal. ~5-10KB.
- **Survey window**: needs goal, conventions, prior research on adjacent topics, the architecture as it currently stands. NOT source code. ~10-20KB.
- **Build window**: needs the plan, the slice's blast-radius source files (computed by import graph), architecture for touched subsystems only, learnings filtered by subsystem and pattern, decisions filtered by domain. NOT untouched subsystems. NOT distant learnings. ~15-30KB.
- **Reflect window**: needs the plan, the diff, the architecture for touched subsystems, prior learnings to dedupe against. ~10-20KB.

The general rule: **context is a function of phase × scope × diff**, not phase × scope. The diff (or planned diff) tells you what's actually relevant. A two-pass system — structural filter then optional relevance scoring — is the right shape, but the structural filter does most of the work if it has a real import graph.

The system also owes the user *visibility into what was excluded and why*. When a Build agent struggles, the user should be able to ask "what did you not show it?" and get a real answer.

## The shape of "done"

The flow is "done" for a slice when:
- Acceptance criteria met (declared at Sharpen, verified at Build)
- Reviewer agrees (mechanical loop inside Build)
- Lint/build/test pass (mechanical, not LLM-judged)
- Reflect has produced learnings + architecture delta + triaged follow-ups
- The user has acknowledged the recap

The flow is "done" for an epic when:
- All slices are done or explicitly dropped
- Cross-slice learnings have been rolled up
- The architecture has been reconciled with reality
- The user has acknowledged the closing recap

Nothing is "done" without an explicit user acknowledgment. Acknowledgment is cheap (one keystroke) but it's the contract that the user actually saw the result.

## Open design questions for Arc 2

1. **Pre-flight checkpoint format** — is it a structured form ("I will do X, returning Y, blocking on Z") or a freeform paragraph? Structured probably wins for telemetry.
2. **Discovery severity** — binary (interrupt now / queue) or graded? Binary is cleaner but loses nuance.
3. **Snapshot model vs state machine** — adopting the snapshot model is a *significant* change. Worth it, but big. Could also be retrofitted as "the state machine plus a snapshot table."
4. **Auto-advance between conversational phases** — yes by default, with an opt-out? Or always ask?
5. **Telemetry as first-class vs optional** — the intervention system needs telemetry to migrate runtime questions to pre-flight. If telemetry is optional, the loop never closes.

These get answered in Arc 2 against the current codebase.
