# Arc 1 — Ideal Flow From First Principles

**Constraint for this doc**: Pretend goodplan does not exist. The user has an idea. They want it shipped, with high quality, with the LLM doing most of the labor, while staying confident the LLM is building the right thing. What is the *minimum* set of phases, transitions, and steering moments?

Do not reference current skill names, CLI verbs, or state-machine vocabulary in this doc. We earn the right to map back to those in Arc 2.

---

## Framing

Stripped of tooling, the journey from "idea" to "shipped" is short: spark an idea, sharpen it, survey the landscape, shape an approach, slice the work, build each slice, land it, repeat. Eight verbs. Everything else in this document is scaffolding to make those verbs reliable when an LLM is doing the labor.

Several of the workflow's central judgment calls — whether a finding materially matters, whether an assumption is load-bearing, whether a slice is coherent — are irreducibly judgment-laden by design. The mental models throughout this doc (the R1 question, the honest-intermediate-state test, the pre-flight discipline) exist precisely because checklists fail at these boundaries. The model is trusted to exercise judgment; the workflow provides scaffolding (context, prompts, blocking options) rather than rules.

Two tensions shape the design:

- **User steering vs. LLM autonomy.** The user is the only one who knows what they actually want; the LLM is the only one with the patience to do the labor. The interface between them is *steering moments*. A steering moment is cheap when the user is paying attention and expensive when they have stepped away. So the user picks when to be present, and the system honors that contract: never block mid-window for what could have been asked at the start, always block at window boundaries so re-entry is cheap, and surface mid-window discoveries that *change the deal* — only those — without forcing a stop.
- **Up-front definition vs. mid-flight reality.** Plans drafted at the start are wrong in ways that only become visible during the work. The flow has to absorb that reality without either pretending it didn't happen (silent scope creep) or treating every surprise as a restart.

The mechanisms introduced below are all in service of those tensions. **A Context Spine** keeps a live picture of the system — architecture, conventions, invariants, and any other standing grounding docs — so every phase starts grounded. **Maturity Tracking** tells the LLM how much rigor to apply where. A **Pressure Test** forces adversarial design review before code is written. A **Refinement Loop** turns artifacts into self-contained context transports. **Discovery Checkpoints (R1)** govern when the LLM is allowed to interrupt the user, and a **Build-Only-What-You-Can-Check rule (R2)** governs what the LLM is allowed to call done. **Work Discovered Mid-Epic** unifies blocking and deferred findings under a single decision matrix. They compose: each is a different facet of the same underlying discipline.

## The phases

**Spark — conversation.** "I want X." Vague, possibly wrong about what X really is. Produces a goal blurb the user signs off on.

**Sharpen — conversation.** Talk it through until the user can answer "what could go wrong" without hedging. Acceptance criteria, non-goals, and risks surface. The user is fully present.

**Survey — autonomy window.** Research the world this idea has to fit into: existing code, prior decisions, libraries, tradeoffs others have already chewed on. Begins by reading the **Context Spine** (architecture, conventions, invariants, and any other standing grounding docs) to seed context. Ends with a short menu of approaches. Soft interrupts allowed (see R1).

**Shape — review.** Pick the load-bearing approach. This phase has the most internal structure of any in the flow:
1. Draft `epic/target.md` as a *diff* from the current Context Spine — primarily architecture, but may also propose deliberate changes to conventions or invariants (rare, significant — see Context Spine).
2. Run the **Pressure Test** — five adversarial questions, in adversarial mode, looking for problems the design *invites* and errors a different design could have made impossible.
3. Adjust the target to address findings. Accept the rest with explicit justification — accept-with-justification is a first-class outcome and promotes into the spine as a known constraint.
4. Run the **Refinement Loop** on the adjusted target.
5. Name any **maturity transitions** the epic will drive.

Shape exits when the user has explicitly accepted each load-bearing choice, the target shape, and the pressure-test summary. If the Pressure Test reveals the target is materially shakier than the draft assumed, that is a blocking discovery — Shape does not exit until the target is adjusted.

**Slice — review.** Cut the work into chunks small enough that each can be built, reviewed, and verified as a unit. Order them so risky pieces happen early and intermediate states are coherent. Every slice carries an **explicit verification method** (R2) and a reference to the **maturity** of the subsystems it touches. The slice definitions themselves go through a short Refinement Loop checking sequencing, scope, and verifiability. Exit when each slice ends in an honest, describable intermediate state and the user has approved the cut.

**Build — autonomy window with soft interrupts.** Per slice: nail down what specifically gets touched, build it, check it, fix it. The slice plan is produced by the per-slice Refinement Loop. The plan references `epic/target.md` as a constraint. Inside the window, the LLM iterates against a verification signal it can run itself (R2); the only legal reason to pause is an R1 blocking discovery.

**Slice Land — review.** Four mandatory substeps the workflow refuses to skip:
1. **Promote the Context Spine** to reflect the honest post-slice reality — `architecture.md` most commonly, but also `conventions.md`, `invariants.md`, or any other grounding doc the slice changed. Mid-state work is described honestly (mid-rename is mid-rename — no pretending). The honest-intermediate-state rule applies to all spine docs.
2. **Triage the Discovery Ledger** — promote, merge, or cull findings captured during the slice. Promotion targets include spine additions, tasks, quests, and epic candidates. Allowed to be empty-handed; not allowed to be skipped.
3. **Capture learnings** — what was learned during Build that future slices or epics should know. Learnings are distinct from Ledger findings: a finding is *"this thing exists and we should act on it"*; a learning is *"we now know X about the system/problem/approach."*
4. **Review with the user** — recap, surface any `epic/target.md` edits discovered during the slice, triage proposed follow-ups (do now / queue / drop).

**Repeat — conversation.** Next slice picked or epic closed.

**Epic Land — review.** Final reconciliation of the Context Spine against `epic/target.md` (modulo discovered target edits). Maturity transitions finalized. Silent-drift audit. Discovery Ledger triaged across the whole epic.

The crucial pattern: **Sharpen, Shape, Slice, Slice Land, and Epic Land are user steering points. Survey and Build are autonomy windows.** Spark and Repeat are short transitions. Two autonomy windows total — both bounded, both resumable, both ending at a natural review boundary.

## Phase summary

| Phase | Mode | Artifact | Mechanisms |
|---|---|---|---|
| Spark | Conversation | Goal blurb | — |
| Sharpen | Conversation | Sharpened goal, acceptance, non-goals, risks | — |
| Survey | Autonomy (soft interrupts) | Research notes, approach menu | R1 |
| Shape | Review | `epic/target.md` (diff), pressure-test summary, named maturity transitions | Context Spine, Pressure Test, Refinement Loop (target), R1 |
| Slice | Review | Ordered slice list with per-slice verification and maturity refs | Refinement Loop (slice defs), R2, Maturity |
| Build | Autonomy (soft interrupts) | Slice plan + code + review trail | Refinement Loop (plan), R1, R2, Discovery Ledger capture |
| Slice Land | Review | Spine promotion, ledger triage, learnings, user recap + follow-up triage | Context Spine (promotion), Work Discovered Mid-Epic |
| Repeat | Conversation | Next slice or close | — |
| Epic Land | Review | Reconciliation, maturity finalization, drift audit, full ledger triage | Context Spine, Maturity, Work Discovered Mid-Epic |

```
[Spark] → [Sharpen] →
   [Survey] ----autonomy---- (soft interrupts)
[Shape] → [Slice] →
   For each slice:
      [Build] ----autonomy---- (soft interrupts)
      [Slice Land]
[Repeat / Epic Land]
```

## Steering modes

Four modes, chained explicitly. The user always knows which one they're in.

| Mode | Feel | Where |
|---|---|---|
| **Conversation** | Back-and-forth, user fully present | Spark, Sharpen, Repeat |
| **Review** | User looks at a finished thing, says yes/no/tweak | Shape, Slice, Slice Land, Epic Land |
| **Soft interrupt** | Async ping during a window: "you should know about this" | R1 inside Survey, Build |
| **Background** | User is gone; system runs to a safe boundary | Survey, Build |

Transitions obey five rules: the system always knows what comes next; conversational phases offer to advance automatically ("ready to survey, want me to go?" — one yes/no); autonomy windows announce when they will return ("I'll be working on Survey for the next few minutes; back when I have an architecture proposal or sooner if I hit something tradeoff-changing"); re-entry after compaction or stop is free (one "where am I?" call returns to the exact next steering moment); and phase boundaries are atomic (no halfway state). The contract: **during autonomy windows, the LLM may pause for exactly one reason — an R1 blocking discovery.** Everything else waits for the boundary checkpoint.

---

## Context Spine

Every phase starts by reading a small set of standing project-level documents that anchor the LLM's mental model. These documents are the ground truth for how the codebase is structured, how it must behave, and how contributors work within it. Without them, every phase re-discovers the project from scratch, producing subtly different mental models on each run. The spine is the substrate the rest of the workflow reads from and writes to.

**Documents in the spine** (each is project-level and single source of truth for its concern):

- **`architecture.md`** — the structural map of the system as it exists *today*. Subsystems, public boundaries, how things fit together. Not a file listing.
- **`conventions.md`** — *how we do things.* Tech stack, code style, test patterns, naming, module layout, PR/commit norms, build and release workflow. Violating a convention is a code smell, not a bug.
- **`invariants.md`** — *what must be true.* Properties the code is required to preserve. *"All state mutations go through the CLI." "Every mutation stamps the version field." "No file in `.goodplan/` is written directly — HMAC guards integrity."* Violating an invariant is a bug, not a style issue.
- **Other grounding documents as needed** — glossary, domain model, security model, whatever gives an LLM enough context to reason about a change without reading the whole codebase. The rule: if multiple phases or multiple epics need the same context to make good decisions, and it can't be derived quickly from code, it belongs in the spine. (This is a forward-compat escape hatch, not a prescription — the default set is the three above.)

**Epic-level layer.** `epic/target.md` is the epic-specific diff, describing the shape the system will have after the epic lands. It is a diff against `architecture.md` primarily, but it may also propose changes to `conventions.md` or `invariants.md`. Those are rare and significant, and are treated as explicit target items — not silent edits.

**Rules that apply to every spine document:**

1. **Terseness.** Structural, not exhaustive. If it can be derived from reading the code in ten minutes, it doesn't belong. Details live in code.
2. **Promotion happens per slice at Land.** When a slice changes something structural — architecture shape, a new convention adopted, a new invariant established, a fact that changes — the relevant spine document is updated honestly. The honest-intermediate-state rule applies to *all* spine docs, not just architecture: mid-rename is described as mid-rename; a half-adopted convention is described as half-adopted; no pretending.
3. **Changes to invariants and conventions are first-class epic concerns.** Unlike architectural diffs, which flow naturally from implementation work, changing an invariant or convention is a deliberate act. It should appear in `epic/target.md` and go through the same refinement and Pressure Test as any architectural change.
4. **Maturity applies.** Conventions and invariants carry maturity tags too — experimental convention vs. foundational invariant. The rigor dial extends to them: breaking a foundational invariant triggers R1 blocking by default.

**Why this matters to the LLM, not just the human.** Every phase begins by reading the spine, so the LLM doesn't rebuild a mental map from code exploration on each run. The target acts as a constraint reviewers check plans against, not just describe. Slice 3 and Slice 7 plan against the same reference, catching cross-slice drift. And promotion keeps the spine current so the next epic doesn't start from a stale picture.

**Promotion targets** for findings (from Pressure Test, Discovery Ledger, etc.) include any spine document: an accepted pressure-test finding becomes a tagged architecture constraint; a repeatedly-rediscovered pattern promotes into `conventions.md`; a newly-established property the code now relies on promotes into `invariants.md`. This keeps reasoning visible across epics so the same issues don't get re-rediscovered.

**Failure modes.** *Doc rot* — antidote: promotion is mandatory at Slice Land across all spine docs; the workflow refuses to close the slice without it; an inter-epic reconciliation audit catches silent drift. *Target over-specification* — rule: target describes shape and invariants, not function names or line counts. *Stranded drift* — slice-time discoveries can change the right target, so target is **live**; slices may propose target edits, gated by R1, and target edits are a first-class slice outcome. *Verbose spine docs* — antidote: structural only; details live in code. *Silent invariant/convention changes* — antidote: rule 3 above; such changes must be in `epic/target.md` explicitly.

## Maturity Tracking

Each subsystem in `architecture.md` carries a **maturity tag** plus an orthogonal **lifecycle state** (active / deprecated / retired).

| Level | Meaning | LLM behavior |
|---|---|---|
| **Experimental** | Recently introduced. Unstable API. Few or no dependents. | Change freely. Don't over-engineer. Tests check the experiment, not churn. |
| **Maturing** | Some dependents. API in flux but not wildly. | Be deliberate. Write tests. Don't break known callers silently. |
| **Stable** | API fixed. Multiple dependents. | Default rigor. Breaking changes need justification. |
| **Foundational** | Load-bearing primitive, many dependents. | Change carefully and rarely. Explicit user sign-off for breaking changes. R1 sensitivity multiplier. Plan migrations exhaustively. |

Without maturity, the LLM falls into two symmetric failure modes: over-engineering experimental code (careful migrations and test scaffolds for stuff about to be rewritten), and under-engineering foundational code (treating a load-bearing change like a casual refactor). Neither is fixable by telling it to "use judgment" — it has no basis for judgment without the information. Maturity is the rigor dial that runs through the rest of the system: it scales the Pressure Test, calibrates Refinement Loop strictness, multiplies R1 blocking sensitivity, and inherits into a finding's severity (the same performance cliff is a note in an experimental module and a reshape trigger in a foundational one).

`architecture.md` lists each subsystem with its maturity tag and a dependent count — the count is a falsifiability check, since "experimental" with twelve dependents is lying. `epic/target.md` explicitly names any maturity transitions the epic drives: *"After this epic, X promotes from maturing → stable."* Promotion is a deliberate decision with a review gate. Epic Land runs a maturity reconciliation: did anything silently become load-bearing? Did anything deprecated get resurrected?

**Failure modes.** *Maturity lies* — antidote: dependent count flags it. *Over-tagging to foundational* — it feels safer but destroys velocity; promotion to foundational requires explicit user sign-off. *Under-tagging forever* — antidote: Epic Land asks "did anything mature?"

## Pressure Test

After the target architecture is drafted and before it enters refinement, run an explicit adversarial pass. This is not a review of whether the design is correct; it is a search for the classes of problems the design *invites*, the scaling cliffs it hides, the optionality it forecloses, and the errors it fails to make impossible.

The strongest framing is **errors made impossible**: the difference between *"the code handles bad input correctly"* and *"bad input cannot be constructed in the first place."* Models don't naturally reach for this — they reach for defensive validation, which is strictly worse. The Pressure Test exists to force the stronger framing. Without it, models systematically under-deliver architectural quality, producing designs that are correct given the inputs considered but leave whole classes of problems to be discovered one at a time at the worst possible moments.

**Five questions, one rigorous pass:**

1. **Failure-mode enumeration.** What *shapes* in this design invite classes of problems? Not hypothetical bugs — structural invitations. *"Validation lives at the caller, so every new caller becomes a new place validation can be forgotten."*
2. **Scaling cliffs.** Concrete axes, not vague "will it scale": what breaks at 10x data, 100x concurrent writers, 2x entity count, when a new integration is added? Output is the *location of the cliff*, not a performance estimate. Anchor to realistic horizons (next 6–12 months) to avoid architecture astronautics.
3. **Optionality ledger.** Two columns: options preserved (decisions deferred because the shape accommodates multiple answers) and options foreclosed (decisions committed now that would be expensive to reverse). Good architecture preserves options where uncertainty is genuine and commits decisively where it isn't. Preserving everywhere is flexible slop; foreclosing everywhere is brittle.
4. **Error class inventory.** Three buckets: classes of error now impossible by construction; classes still possible; and — the hardest and most important — *classes a different design could have made impossible*. The third bucket is the forcing function: it makes the model imagine alternatives instead of defending the current.
5. **Locked-in assumptions.** What does the design silently assume? *"Findings never reference each other." "The ledger fits in memory." "The user is the only writer."* Each assumption is a future cliff in disguise.

The error-class inventory (question 4) has a specific tie to the Context Spine: it should check whether the target *preserves or strengthens existing invariants*, and whether *new invariants* can be added to make additional error classes impossible by construction. Invariants **are** the architectural tool for making errors impossible — the inventory and `invariants.md` are two ends of the same mechanism.

**Prompt posture matters.** The LLM must be told its job in this step is to *find* problems, not defend the design. Literal instruction: *"Your job in this step is to find ways this will hurt us. If you find none, press harder — that usually means you haven't tried."* Adversarial mode is a different cognitive posture than review; the prompt is what flips it. This is also why it's a named step rather than a reviewer role — reviewers critique what's there; this critiques what *isn't*.

**Outcome handling.** Findings are addressed where worthwhile or **accepted with justification** — accept-with-justification is a first-class outcome, not a cop-out. Accepted findings promote into the Context Spine as tagged constraints (usually `architecture.md`, occasionally `invariants.md` or `conventions.md`) so they're tracked honestly and don't get re-raised by future reviewers. The final target carries a Pressure-Test Summary: what was examined, what was changed, what was accepted and why.

**Failure modes.** *Performative listing of three generic concerns* — antidote: require a specific finding per category; generic findings are rejected. *Findings never accepted, only fixed* — every finding becomes a drag and the test gets watered down; antidote: accept-with-justification is first class. *Box-ticking* — antidote: the prompt itself is the protection.

## Refinement Loop

**Artifacts are context transport.** Most review processes are framed as catching mistakes. This one does that, but its more important function is **context accumulation**: each reviewer adds missing context, corrects wrong context, and verifies what's there. By the end, the artifact is a self-contained specification — a downstream agent who has never seen the codebase could, in principle, execute against it without re-discovering anything. **A plan can be correct and still useless if it assumes context the implementer doesn't have.** Same for a target that assumes context the next epic won't have. Same for slice definitions a reader can't decode standalone. Context accumulation is an explicit goal of every reviewer, not a happy side effect.

**Mechanism**, universal in shape, parameterized per use:

1. **Select reviewers by relevance** from a pool of specialists (architecture, conventions, invariant, holistic, type safety, data layer, frontend, API contracts, verifiability, sequencing, …). Reviewers reference the full Context Spine, not just architecture: a conventions reviewer checks style and patterns against `conventions.md`; an invariant reviewer checks that `invariants.md` is preserved; an architecture reviewer checks structural fit against `architecture.md`. Always-on reviewers (holistic, invariant-checker) run every time.
2. **Parallel review.** Each reviewer evaluates against its written contract (*"I check for X, Y, Z"*) and produces severity-tagged findings, a score, and identified missing context. Fixed contracts prevent reviewer drift.
3. **Synthesize.** Merge into a single feedback document. Surface unresolved contradictions to the user (R1 territory) rather than silently picking a side.
4. **Edit.** An editor agent *fixes* the feedback, not just flags it. Unresolvable items escalate.
5. **Re-review, change-scoped.** Next round sees a *diff*, not the whole artifact, and answers: did your prior concerns get resolved? did the changes introduce new ones? This is the key to avoiding stagnation.
6. **Exit on criteria, not feel.** Mechanical: all relevant scores ≥ threshold, zero CRITICAL/IMPORTANT, only MINOR remaining. Or circuit-breaker on stagnation/max-rounds, which hands the user a judgment call (*"accept at 8, escalate to reshape, or abandon?"*) instead of exiting silently. **Round count is not a target.** The loop runs until the bar is met — however many rounds that takes — or until the circuit breaker triggers and the user is asked to make a judgment call.

**Where it runs.** Every artifact boundary where downstream work depends on the result.

| Phase | Artifact | Pool | Rigor |
|---|---|---|---|
| Shape | `epic/target.md` (post-pressure-test) | System-level: architecture, holistic, invariant, touched-subsystem specialists | System-level pool, selected by relevance. Exits when the bar is met. |
| Shape | Slice definitions | Holistic, sequencing, verifiability, subsystem-boundary, dependency | Focused pool. Exits when the bar is met. |
| Build (per slice) | Slice plan | Full specialist pool selected by what the plan touches — the largest loop. Context accumulation is the explicit goal. | Full pool, selected by relevance. Exits when the bar is met. |
| Build | In-progress code | Reviewers on commits/PRs; continuous light touch | Lower threshold; doesn't block every commit |
| Slice Land | Spine promotion, ledger triage, learnings capture, user recap | Light touch — checks promotion reflects reality and learnings are non-duplicative | Minimal pool; sanity check only |

**Improvements over naive review** (each addressing a specific failure mode):

- **Context accumulation as a first-class question.** Every reviewer answers: *"Reading the codebase as it exists today, would the implementer have to stop and figure X out?"* Concrete grounding, not speculation. (Failure mode: speculative invention. Antidote: ground in real codebase state.)
- **Change-scoped re-review.** Reviewers can't re-raise stale concerns about unchanged content; convergence is faster, tokens proportional to delta size. (Failure mode: stagnation.)
- **Rigor scales with stakes**, dialed by maturity and target-delta size and pressure-test findings. Over-rigor is as bad as under-rigor — it wastes tokens and trains the team to treat review as ceremony. (Failure mode: foundational work skipped to avoid review pain. Antidote: rigor tied to maturity, not user preference; overrides recorded.)
- **Reviewer contracts are fixed and structured**, preventing drift, noise, and contradictions that are artifacts of unclear scope.
- **Weighted scoring by relevance.** A TS reviewer's 7 on a TS-heavy plan is load-bearing; on a data-model-heavy plan, it's a warning. High-weight below threshold blocks; low-weight produces warnings.
- **Convergence cost is a slicing signal.** A slice plan that won't converge is itself evidence the slice is too big or ambiguous — the loop reports cost back, and the right response is reshape (see Work Discovered Mid-Epic), not more rounds.
- **Both missing and stale context** are flagged. A plan with context the implementer doesn't need is also failing. (Failure mode: context bloat.)
- **Reviewer calibration over time** — track score-vs-outcome correlation; uncorrelated reviewers get weights adjusted or contracts rewritten. (Failure mode: gamed/miscalibrated reviewers.)

The Refinement Loop is also where **R2 becomes enforceable**: plan-stage reviewers explicitly check that each chunk's verification method is meaningful — tied to acceptance criteria, model-runnable, not cargo-culted. Pressure-test findings (both fixed and accepted) are passed in as context so reviewers don't re-raise concerns that were already deliberately accepted.

## Discovery Checkpoints (R1)

Inside an autonomy window, the LLM may pause for exactly one reason: **a discovery so trade-off-changing that continuing would burn user time on a path the user wouldn't endorse.** The question to ask yourself: *"If the user knew this, would they want to reconsider?"* If yes, pause. If the discovery only affects a local implementation choice with no ripple, keep going and note it for later. Err toward pausing when the decision is load-bearing and toward continuing when it is not — building for an hour on a wrong premise is far more expensive than a two-minute check-in.

**"Materially matters" is context-dependent.** Maturity is the multiplier: a trade-off shift that barely matters in an experimental subsystem absolutely matters in a foundational one. Foundational work triggers R1 by default on any trade-off shift.

**Examples of the judgment in action:**

- *Found that the chosen data structure makes the N+1 case expensive when the ledger grows past ~10k entries.* → **Block.** Performance cliff, affects an architectural assumption the target relied on, user will want to reconsider.
- *Found that an unrelated helper function in the same file has a misleading variable name.* → **Note and continue.** Style concern, not on the epic's path, no downstream effect.
- *Found that the auth check runs after the database write, so failed auth still pollutes the DB.* → **Block.** Reliability/correctness, clearly a design error, the kind of thing the user would want to redirect immediately.
- *Found that an error message is slightly vague.* → **Note and continue.** UX concern but minor, can batch into the Discovery Ledger.

The pattern: block when the finding would change a decision that's already been made or affects something load-bearing; note-and-continue when the finding is local, stylistic, or batchable.

**When you do pause, make the block cheap.** State the original trade-off, what you found, two or three paths forward, and your recommended direction. The user has not been in the room with you; you have built up context they do not share. Reconstruct that context in the question itself: what you were doing, what you found, why it matters, and what you need from them. **A question that requires the user to guess what you were thinking is not a question — it is a puzzle.** A block the user can resolve in ten seconds is a good block; a block that requires a meeting is a planning failure.

R1 blocks have specific structural ties to the rest of the flow:

- **In-scope blocking discoveries are the load-bearing case for R1.** The "two or three paths forward" the block must present map directly to the five reshape options below.
- **Pressure-test findings can be R1 blocks themselves.** If the test reveals the target is materially shakier than the Shape draft assumed, Shape does not exit until the target is adjusted.
- **Refinement Loop contradictions** that synthesis can't resolve route through R1 rather than getting silently papered over.
- **R2 still applies** to anything R1-added work: any work added mid-epic must come with a model-runnable verification method, same as work planned at Slice time.
- **Pre-flight checkpoints** before each autonomy window are R1's prevention layer — see the subsection below.

### Pre-flight checkpoint

Before entering any autonomy window, the LLM produces a short, structured pre-flight statement and presents it to the user: *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. Here's what I think I know that matters: A, B, C. Anything to change before I start?"* This is the user's cheapest steering opportunity — correcting a misunderstanding at pre-flight costs seconds; correcting it mid-autonomy costs a block.

The hardest design discipline around pre-flight is that **if the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight.** When runtime questions keep arising, they are a signal that the pre-flight format is missing something, not that the LLM should "ask more carefully." The intervention system exists to spot questions that repeatedly surface at runtime and migrate them to pre-flight.

Structured format over freeform. A structured pre-flight is faster for the user to scan, easier to measure, and prevents the LLM from burying the key decisions in prose. Freeform pre-flights rot into preambles.

## Build Only What You Can Check (R2)

The model's ability to do good work autonomously depends entirely on its ability to tell whether the work is good. Without a feedback signal the model can run, iteration collapses into *"write something, hope it's right, stop"* — which is how mediocre work ships. Verifiability is not a ceremony; it is the thing that makes autonomous iteration possible at all.

When breaking work into chunks, ask of each one: *"If I finish this, how will I know I got it right?"* The answer must be something the model itself can run and interpret — a test, a typecheck, a script that compares output to expected, a query that confirms a state change. The answer must also be tied to the actual intent of the chunk, not an incidental property. **A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence.**

Watch for the specific failure of writing tests that pass while the live code is broken. A model that runs `vitest`, sees green, and calls it done has not verified the software — it has verified that its tests agree with its implementation, both of which the same model just wrote. Whenever possible, verification must include exercising the actual code paths and directly observing behavior: start the service and hit the endpoint, run the CLI with a real argument and inspect the output, load the page and watch what happens. Integration and unit tests remain valuable — they catch regressions and document intent — but they are not by themselves sufficient evidence that a goal has been achieved. **End with live observation.**

When intent cannot be checked by the model (*"the interface feels responsive," "the error message is clear," "the refactor didn't change external behavior in some subtle way"*), do not paper over with a shallow proxy. Surface it: reshape the chunk so it is checkable, design an approximate check and flag the approximation honestly, or schedule an explicit human verification step. Honesty about what cannot be verified is more valuable than fake green checks.

R2 threads through three phases. **Slice:** every chunk carries an explicit verification method. "Model runs test X, it passes" is ideal; "lint + typecheck + targeted unit test" is standard; "human eyeballs the UI" is legitimate but must be explicit and scheduled, converting that slice's Build window from pure autonomy into autonomy-with-a-required-review-interrupt. **Refinement Loop:** plan reviewers check that each chunk's declared verification is meaningful and not cargo-culted — a plan with shallow or missing verification fails the loop. **Build:** the autonomy window declares up front what verification it will run between iterations and what signal it treats as "done." If mid-window the model discovers its verification is insufficient (tests pass but the result is obviously wrong), that is itself an R1 trigger.

## Work Discovered Mid-Epic

Deferred work and blocking work are not unrelated concerns — they are two flavors of the same problem: **work discovered mid-epic.** They differ on two dimensions: blocking vs. non-blocking, and in-scope vs. out-of-scope. The current system treats them as separate features with separate capture paths; the ideal flow unifies them under one decision matrix and routes each finding to the cheapest correct response.

|                   | **In scope**                                          | **Out of scope**                                              |
|---|---|---|
| **Blocking**      | Reshape current epic                                  | Stop epic; promote finding to its own epic; resume after      |
| **Non-blocking**  | Expand target, insert/adjust a future slice           | Defer: park as a finding in the Discovery Ledger              |

### Discovery Ledger (non-blocking deferred work)

The current side-quest model has four failure modes: capture is too heavyweight for the moment of discovery, triage happens at the wrong time (when you have the least information), nothing culls stale findings, and surfacing is push-based rather than pull-based.

**The ledger fixes them:**

- **Uniform, cheap capture.** Five seconds. Every finding has a fixed small shape: *what I was doing, what I found, why it matters, why I'm not doing it now.* The last field separates a useful finding from a stale TODO. No size classification at capture.
- **Triage at milestones, not at capture.** Slice Land and Epic Land each have a short triage step: promote (to task / quest / epic candidate / architecture annotation), merge duplicates, cull. Triage is cheap at milestones because post-slice/epic context is available. The step is mandatory but allowed to be empty-handed.
- **Facts promote into the Context Spine.** *"Module Y has a perf cliff at 10k records"* isn't work, it's a constraint; it lands in `architecture.md` tagged to the subsystem. A repeatedly-rediscovered pattern may promote into `conventions.md`. A newly-established property the code relies on may promote into `invariants.md` — this last one is rare and deliberate, not a casual promotion. (Failure mode: every finding becomes an annotation and the docs rot — antidote: spine promotion requires the finding to name a constraint that affects planning, not just a nuisance.)
- **Pull-based surfacing.** When a new epic enters Frame, the workflow surfaces findings tagged to the subsystems that epic will touch. They arrive when relevant, not when remembered.
- **Explicit decay.** Findings older than N epics without promotion or reference are surfaced for culling with a two-second prompt.

### Triggered Reshape (blocking in-epic work)

A slice that discovers necessary work cannot silently grow — that breaks reviewer frames of reference and causes epic drift. But forcing a full restart is absurd. Five explicit options, with the workflow making them visible and picking the cheapest one that is actually correct:

| Response | When to pick | Cost |
|---|---|---|
| **Expand current slice** | Discovery is small, directly on the slice's path, doesn't change its goal. | Low. Plan edited; reviewers re-run on the delta only. |
| **Insert a slice before this one** | Discovery is a prerequisite — distinct unit of work, blocks the current slice. | Medium. Current slice pauses; new slice runs through Plan/Build; current slice resumes against updated architecture. |
| **Insert a slice after this one** | Discovery is needed for the epic to land but does NOT block the current slice. | Medium. Current slice continues; target updated; sequencing adjusted. |
| **Reshape the epic** | Discovery invalidates `epic/target.md` — the shape of what the epic is building has changed. | High. Return to Shape with accumulated context; re-draft target; re-slice affected portions. |
| **Stop and promote to its own epic** | Discovery is out of scope entirely. | Very high. Only correct when in-place options would cause more damage. |

**Three forcing functions keep this honest:**

1. **Any reshape must update `epic/target.md` first.** You cannot edit slice plans in place without updating the target; reviewers review the target diff before the new slice plan. This prevents silent scope creep.
2. **R1 is the trigger.** A slice does not quietly grow scope. When it discovers work it cannot contain, it hits the R1 checkpoint, surfaces the finding with the five options and a recommendation, and the user picks. A 30-second decision in most cases.
3. **Reshapes inherit upstream invariants.** A reshape triggered by an invalidated pressure-test assumption must update the Pressure-Test Summary in the new target, not just the diff. A reshape triggered by Refinement Loop convergence failure must record that as the cause. The audit trail tells you *why* the reshape was necessary.

The "Reshape the epic" branch routes back into Shape with accumulated context — not a full restart. Reviewers should be more lenient on re-review because most of the epic is unchanged; only the delta matters (this composes with change-scoped re-review in the Refinement Loop).

**Failure modes.** *"Expand current slice" becomes the default* because it's cheapest — this is how epics silently drift. Antidote: reviewers explicitly check whether expand-in-place was right, and reshape decisions are recorded so drift is observable. *Reshape cascades* — cap reshapes per epic (say, 3); hitting the cap forces a Shape-level conversation about whether the epic is still coherent or should be split. *Cross-slice invalidation* — a reshape that adds or inserts a slice can invalidate downstream slices' assumptions; reshape must explicitly re-verify downstream plans against the updated target before Build resumes. *Invariant violation as discovery* — if a mid-epic discovery reveals that an existing invariant is being violated, or that a missing invariant would have prevented the problem, that is a **material finding by default** (foundational severity) and routes straight to R1; invariant changes are first-class epic concerns and cannot be patched silently.

---

## Autonomy windows

Autonomy windows (Survey, Build) have to be *worth* walking away from. That means:

- **Long enough to matter.** Sub-five-minute windows don't earn the user the right to step away.
- **Bounded by clear deliverables.** *"I'll come back with an architecture proposal"* is a window. *"I'll work on it for a bit"* is not.
- **Resumable.** If interrupted (compaction, error, stop), they resume from the same point on next entry.
- **Self-correcting within scope.** Inside, the LLM iterates with reviewers without asking the user. Stagnation, regression, and oscillation detection are mechanical.
- **Anchored to a model-runnable verification signal** (R2). No verification signal → no true autonomy window.
- **Honest about budgets.** Windows declare a circuit-breaker cap (*"I'll stop and ask if I exceed M rounds"*) — a cap, not a target. The user can extend on return, not mid-flight.

## State shape

The current state machine forbids backward transitions. From first principles, that's wrong, but for a subtle reason: it's not about whether the *machine* can step backward, it's about whether the *user* can change their mind without losing artifacts.

Two failure modes. *No back-step:* user discovers a planning error during build → must abandon the slice → loses build state and plan history. *Free back-step:* user pops back during build → state machine accepts → autonomy windows that were running get silently invalidated → confusion about what's valid.

The right model is **time-stamped checkpoints, not a linear state machine.** Each phase produces an immutable snapshot. Going "back" means starting a new attempt at an earlier phase, with the prior attempt preserved. The system shows you *"you have two architecture proposals, which is current?"* and you pick. This collapses several current concepts: replan count is a count of planning snapshots; abandon-and-recreate is a new attempt; phase skip is a snapshot tagged "skipped, reason: trivial"; re-entry after error resumes from the latest snapshot.

## Context discipline

For each phase, the LLM gets *exactly* the context required for that phase, no more, no less.

- **Conversational phases** (Sharpen, Shape, Slice, Slice Land): user is present, can answer questions. Context is whatever's needed to ask good questions: prior decisions in scope, recent learnings, the current goal. ~5–10KB.
- **Survey window**: goal, conventions, prior research on adjacent topics, the architecture as it stands. NOT source code. ~10–20KB.
- **Build window**: the plan, the slice's blast-radius source files (computed by import graph), architecture for touched subsystems only, learnings filtered by subsystem and pattern, decisions filtered by domain. NOT untouched subsystems. NOT distant learnings. ~15–30KB.
- **Slice Land**: the plan, the diff, the architecture for touched subsystems, prior learnings to dedupe against. ~10–20KB.

The rule: **context is a function of phase × scope × diff**, not phase × scope. The diff (or planned diff) tells you what's actually relevant. A two-pass system — structural filter then optional relevance scoring — is the right shape, but the structural filter does most of the work if it has a real import graph. The system also owes the user *visibility into what was excluded and why*: when a Build agent struggles, the user should be able to ask "what did you not show it?" and get a real answer.

## The shape of "done"

A slice is done when: acceptance criteria met, reviewer agrees, lint/build/test pass, Slice Land has promoted the Context Spine, triaged the ledger, captured learnings, and the user has acknowledged the recap and triaged follow-ups.

An epic is done when: all slices done or explicitly dropped, cross-slice learnings rolled up, architecture reconciled with reality, maturity transitions finalized, ledger drained, and the user has acknowledged the closing recap.

Nothing is "done" without explicit user acknowledgment. Acknowledgment is cheap — one keystroke — but it's the contract that the user actually saw the result.

## How the mechanisms compose

The mechanisms are not independent features. They share a backbone:

- **The Context Spine is the substrate.** Every other mechanism reads from it or writes to it. Pressure Test promotes accepted findings into it; Discovery Ledger promotes facts into it; Slice Land updates it; Maturity tags live on it; Refinement Loop reviewers consult the full spine (architecture, conventions, invariants) for context.
- **Maturity is the universal rigor dial.** It calibrates Pressure Test depth, Refinement Loop strictness, R1 sensitivity, and Triggered Reshape thresholds. One concept, four uses.
- **R1 is the universal "should we stop?" rule** during autonomy. Pressure-test failures, Refinement Loop unresolvable contradictions, mid-build trade-off shifts, and convergence failures all route through R1 to the user with the same shape: state the context, name the options, recommend.
- **R2 is the universal "is this verifiable?" rule** for any chunk. It is enforced by Slice (declaration), Refinement Loop (plan review), and Build (window contract).
- **The Refinement Loop is how artifacts become trustworthy enough to act on.** It runs at every artifact boundary. Its convergence cost is itself a signal that feeds back into Triggered Reshape.

Each mechanism can be described in isolation, but in practice they fire together. A pressure-test finding may become an R1 block, become a target adjustment, become a Context Spine annotation, and inform the next Refinement Loop's reviewers — all within Shape. A mid-build discovery may become an R1 pause, become a Triggered Reshape, become a target diff, become a re-run of the slice Refinement Loop, become an updated `architecture.md` at Slice Land. The value is not in any single mechanism but in their interlocking.

## Open design questions for Arc 2

1. **Pre-flight checkpoint format** — structured form (*"I will do X, returning Y, blocking on Z"*) or freeform paragraph? Structured probably wins for telemetry.
2. **Discovery severity** — binary (interrupt now / queue) or graded? Binary is cleaner but loses nuance.
3. **Snapshot model vs. state machine** — adopting snapshots is a *significant* change. Worth it, but big. Could be retrofitted as "the state machine plus a snapshot table."
4. **Auto-advance between conversational phases** — yes by default, with an opt-out? Or always ask?
5. **Telemetry as first-class vs. optional** — the intervention system needs telemetry to migrate runtime questions to pre-flight. If telemetry is optional, the loop never closes.
