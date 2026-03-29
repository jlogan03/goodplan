# Structured Iterative Development Under Uncertainty

## A Practical Framework for Human-LLM Collaborative Software Engineering

---

## 1. The Problem

Building complex software is hard regardless of who or what is doing the building. The difficulty comes from properties of the problem itself, not from properties of the builder.

**The solution space is enormous.** A nontrivial software system involves thousands of interdependent decisions: data model choices, API design, module boundaries, error handling strategies, performance tradeoffs, naming conventions, and more. The set of possible implementations is combinatorially large.

**Specifications are always incomplete.** No requirements document, user story, or prompt fully determines the implementation. The gap between what the specification says and what the implementation requires must be filled by the builder — through experience, conventions, or iterative feedback.

**Constraints interact nonlinearly.** Satisfying one requirement can make another harder or impossible. There are dead ends, tradeoffs, and regions of the solution space where no good answer exists without relaxing a constraint. You can't evaluate decisions in isolation.

These properties explain why humans developed iterative development practices (code review, agile, prototyping, architecture decision records) long before LLMs existed, and why LLMs similarly cannot reliably produce correct complex software in a single pass. **The need for iteration is intrinsic to the problem, not a deficiency of the tool.**

---

## 2. Two Levers

Given that software development is an iterative search through a complex space, there are two fundamental levers for improving the process:

### 2.1 Make the Goal More Precise

A vague goal ("build me a dashboard") admits an enormous number of valid solutions, most of which won't be what the user actually wants. A precise goal with explicit constraints, acceptance criteria, architectural requirements, and behavioral invariants narrows the field so that most solutions that satisfy the goal are also solutions the user would accept.

**Describe the destination, not the route.** Declarative constraints — statements about properties the solution must have — directly narrow the field of acceptable solutions. Every declarative token does useful work. Prescriptive instructions — statements about *how* to build the solution — constrain the process rather than the result. If an early step goes wrong, subsequent steps start from a bad position regardless of how well the result was described.

**Exception:** Prescriptive detail that provides domain knowledge the builder lacks (e.g., "use optimistic locking because the access pattern is concurrent") is effectively declarative — it describes a property of the solution at the implementation level. This kind of detail genuinely helps by providing information the builder couldn't derive from the goal alone.

**The information gap.** The gap between specification information content and implementation information content must be filled somehow — by the builder's priors (experience, training data, conventions) or by iterative feedback. More precise specifications front-load more information, reducing how many iterations are needed.

### 2.2 Make Each Iteration More Effective

Since single-pass solutions are unreliable, the quality of each iterative step matters. This depends on:

- **How well the builder can generate a candidate** that's closer to the goal than the current state
- **How much the feedback signal reveals about direction**, not just distance. "This is wrong" gives almost no guidance. "This is wrong because the state mutation happens before validation, and validation needs the pre-mutation state" gives a clear direction for improvement.
- **Whether the builder can act on feedback without introducing new problems.** Fixing one thing while breaking another is a common failure mode, especially for LLMs, and it turns iteration into a random walk rather than directed progress.

---

## 3. Ideas Borrowed from Adjacent Fields

The workflow described in this document was developed through practical experience, but several of its design decisions were informed by structural analogies to problems studied in other fields. The analogies are loose — the formalism of these fields doesn't transfer to software development — but they were productive as sources of ideas.

This section documents the intellectual debts honestly: where the ideas came from, what we took, and where the analogy stops being useful.

### 3.1 From Iterative Sampling Methods (MCMC and Related Techniques)

**What we borrowed:** MCMC is a family of algorithms for exploring complex spaces by proposing candidates, evaluating them, accepting or rejecting, and iterating. The LLM development loop has the same high-level structure. More usefully, MCMC has a well-studied catalog of failure modes that map onto real problems in LLM code generation:

| Failure Mode (from sampling literature) | What It Looks Like in Practice |
|---|---|
| Getting stuck in a local region | The model finds a partially working approach and keeps making small adjustments instead of trying a fundamentally different architecture |
| Poor exploration | Feedback is too vague to give direction but specific enough to anchor the model on its current approach |
| Exponential difficulty scaling with scope | A task touching many subsystems is exponentially harder to get right than one with narrow scope |
| Hard-to-reverse changes | The model makes changes (large refactors, architectural shifts) that are easy to propose but hard to undo |
| Wasted iterations | Rounds where feedback doesn't meaningfully change the output, burning tokens without progress |

**What we took from it:**

- **Try multiple approaches for critical decisions.** For architectural choices that lock in early, generate 2–3 independent candidates, evaluate them, and refine the best one. This reduces the risk of committing to a locally attractive but globally suboptimal approach.
- **Track the best result and support rollback.** The LLM process doesn't guarantee improvement on each step, so the system needs to explicitly track the best candidate seen so far and be able to revert when a new attempt is worse. Git commits between iterations provide this.
- **Detect non-convergence and change strategy.** If iteration isn't producing improvement (scores declining, oscillating, or stalling), continuing to iterate is usually the wrong response. The right response is usually to decompose the problem, restart with learned constraints, or escalate to the human. Circuit breakers implement this.
- **Decomposition is exponentially better, not linearly.** Splitting a large problem into smaller independent pieces doesn't just make each piece easier — it makes each piece *dramatically* easier because the difficulty scales exponentially with scope. This is the strongest argument for thin vertical slicing.

**Where the analogy breaks:** MCMC has mathematical convergence guarantees that depend on properties the LLM workflow doesn't have. Each MCMC step is guaranteed to move toward the target; LLM iterations can regress. The "space" that software lives in has no defined metric — we can't measure distance between implementations in any formal sense. The MCMC vocabulary (proposal distributions, stationary distributions, detailed balance) doesn't carry its formal meaning in this context and should not be used as if it does.

### 3.2 From Feedback Control Theory

**What we borrowed:** Control theory studies how to drive a system toward a desired state using feedback. The plan refinement loop — where the current plan is evaluated, feedback is generated, corrections are applied, and the result is re-evaluated — is structurally a feedback control loop.

**What we took from it:**

- **Oscillation means corrections are too aggressive.** When refinement scores alternate between better and worse across rounds, the system is overcorrecting — each fix introduces a new problem that the next round tries to fix, creating a cycle. The fix: reduce the scope of each correction. Address only the single highest-priority issue per round instead of all feedback at once. Trade speed (more rounds) for stability (each round makes reliable progress).
- **Different situations need different correction aggressiveness.** When the plan is far from acceptable, broad corrections make sense. When it's close, only targeted corrections should be applied. This suggests modulating the scope of refinement feedback based on how close the plan is to passing.
- **Predictive signals are more useful than reactive ones.** Rather than waiting for oscillation to detect instability, use leading indicators (which subsystems are touched, how much scope the plan covers, how many constraints are in tension) to pre-set refinement parameters.

**Where the analogy breaks:** A real control theory analysis would require a formal model of the system — transfer functions, disturbance models, stability margins. We don't have that, and the recommendations above are derivable from common sense without the formalism. The value was in the framing directing attention to specific failure modes (oscillation, overshoot) and their corresponding fixes.

### 3.3 From Constraint Satisfaction

**What we borrowed:** A plan must simultaneously satisfy the goal, respect the architecture, pass reviewer criteria, not violate invariants, and not break fitness functions. This is structurally a constraint satisfaction problem — finding a solution that satisfies a conjunction of constraints.

**What we took from it:**

- **When constraints conflict, identify the conflict explicitly.** When refinement can't converge, it's often because two requirements are in tension — one reviewer wants more abstraction while another wants less indirection. Rather than continuing to iterate (which will oscillate), identify which specific requirements conflict and present the conflict to the human with a request to decide which to relax.
- **Distinguish hard constraints from soft constraints.** Some constraints are non-negotiable (invariants, fitness functions, type safety). Others are preferences (coding style, architectural elegance, reviewer opinions about approach). When the system is over-constrained, soft constraints should be relaxed first.
- **Detect infeasibility early.** If known constraints already conflict, surface this before burning refinement rounds. Don't waste iterations trying to satisfy the impossible.

**Where the analogy breaks:** Formal constraint satisfaction uses techniques (arc consistency, backtracking, constraint propagation) that assume the constraint set is fully enumerable and the variable domains are known. Software plans don't have this property — many constraints are implicit, emergent, or only discoverable through implementation. The value was in the mindset of thinking about reviewer conflicts as constraint conflicts with specific structure, not just "reviewers disagree."

### 3.4 From Counterexample-Guided Refinement (Program Synthesis)

**What we borrowed:** The RED-GREEN implementation cycle — propose an implementation, run tests, use failures to guide the next attempt — is structurally similar to counterexample-guided refinement from the program synthesis literature, where a candidate program is tested against examples and failures guide the next candidate.

**What we took from it:**

- **Not all test failures are equally informative.** A failure that reveals a fundamental misunderstanding of the requirement tells you much more than a typo-induced failure. The system should prioritize high-information failures (core logic errors) over low-information ones (syntax, boilerplate, environmental issues) and ensure the model addresses them first.
- **Passing tests are constraints that must be preserved.** Any implementation change that breaks a previously passing test is a regression. This should be treated as a hard constraint on future iterations, not just something to notice after the fact.

**Where the analogy breaks:** Formal program synthesis operates on well-defined specification languages with decidable properties. Software specifications are informal, ambiguous, and incomplete. But the practical insight — prioritize informative failures and treat passing tests as constraints — is sound independent of the formalism.

### 3.5 From Information Theory

**What we borrowed:** Several concepts from information theory apply naturally without needing to force an analogy:

- **Context bundles should contain all relevant information and nothing irrelevant.** The idea of a "sufficient" summary — one that captures everything needed for a particular decision with nothing extraneous — gives a useful way to evaluate context bundle quality. If refinement reveals that the model was missing information it should have had, the context bundle was insufficient. Track these misses and use them to improve what gets loaded.
- **Reviewer disagreement is a different signal than uniform low scores.** When reviewers all give 7s, the plan needs specific improvements everyone can see. When half give 9s and half give 5s, there's a fundamental tension that needs resolution, not more refinement. Measuring agreement separately from average score catches this earlier.
- **Some work units are more informative than others.** A slice that tests an unvalidated architectural assumption teaches you more than one that follows an established pattern. Prioritizing informative work early reduces the risk of building extensively on wrong assumptions.

**Where the analogy breaks:** Formal information theory requires probability distributions and measurable quantities. We don't have a defined probability distribution over the solution space, so we can't compute entropy or information gain in a formal sense. But the qualitative insights — measure disagreement, prioritize informative work, evaluate whether context is sufficient — are useful without the math.

### 3.6 Explore-Exploit Tradeoff

**What we borrowed:** The fundamental tension between trying new approaches (exploring) and refining the best known approach (exploiting) is well-studied across several fields.

**What we took from it:**

- **The balance should shift over time.** Early in a project, exploration has high value (uncertainty is high, commitments are few). Late in a project, exploitation is more appropriate (uncertainty is lower, the cost of changing direction is higher).
- **Don't switch discretely.** Rather than a hard boundary between "explore phase" and "build phase," maintain a small exploration budget throughout. When implementation reveals a potentially better alternative, evaluate the expected value of investigating it against the cost of the detour.
- **The maturity system encodes this tradeoff.** Experimental subsystems have low switching costs (explore freely). Foundational subsystems have high switching costs (exploit what works, change only with strong justification).

---

## 4. Handle Deterministically What You Can

This is perhaps the single most reliable principle in the entire framework, and it doesn't require any analogy to justify: **every aspect of the problem that can be solved with deterministic code should be, rather than leaving it to the LLM.**

The LLM should only be responsible for parts of the problem that genuinely require judgment and synthesis. Everything else — state management, validation, file I/O, convention enforcement, boilerplate generation from schemas, test scaffolding from specifications — should be handled by deterministic tooling.

This isn't just an efficiency optimization. It's a reliability guarantee. Deterministic code produces the same result every time. LLM output varies. Every dimension you remove from the LLM's decision space is a dimension that can't go wrong stochastically.

In the Good Plan workflow, the CLI embodies this principle by owning all state transitions, context bundling, validation, and file operations. The LLM handles judgment work: interviewing users, writing plans, reviewing code, scoring quality.

**Push this further.** High-confidence learnings that have been validated repeatedly should be converted from "context the LLM reads and hopefully applies" to "constraints the CLI or reviewers enforce." A learning like "always include timeout handling for network calls" can become a reviewer checklist item or a fitness function candidate. Every learning promoted from stochastic application to deterministic enforcement is a permanent reliability improvement.

---

## 5. The Human-LLM Responsibility Split

### 5.1 Complementary Strengths

Humans and LLMs are good at different things, and their strengths are largely complementary:

| Capability | Humans | LLMs |
|---|---|---|
| **Imagining how approaches play out** | Strong — can mentally simulate execution, predict failure modes from experience | Weak — must be explicitly prompted to trace through scenarios |
| **Knowing which direction to go** | Strong — intuition about what will work, when something feels wrong | Weak — pattern matches on context; no internal sense of trajectory |
| **Producing structured output** | Low bandwidth — slow, gets fatigued, inconsistent on tedious tasks | High bandwidth — fast, tireless, exhaustive |
| **Applying patterns consistently** | Unreliable across large scopes — misses cases | Reliable — applies patterns across entire codebases |
| **Checking consistency** | Poor for large systems — humans miss contradictions | Strong — can systematically compare large volumes |
| **Judging under genuine ambiguity** | Strong — can weigh incommensurable tradeoffs using values, taste, context | Weak — tends to split the difference or defer |

### 5.2 The Implied Division

**Humans should own:** what to build (target definition), whether the process is heading in the right direction (trajectory judgment), tradeoffs that depend on business context or taste (ambiguous decisions), and whether the goal actually matches what they want (validation that the right thing is being built).

**LLMs should own:** exhaustive exploration of alternatives within a defined region, consistent pattern application, comprehensive review against checklists and constraints, and all high-volume low-judgment work.

### 5.3 Giving the LLM Better Judgment

The LLM's weakest capability is mental simulation — imagining how an approach will play out. Several techniques approximate this:

**Failure mode analysis.** Before committing to an approach, require the model to describe three ways it could fail and what the symptoms would look like. This forces explicit simulation of future states.

**Adversarial self-review.** Before formal refinement, have the model argue against its own proposal. This surfaces concerns that autoregressive generation naturally suppresses — once the model starts down a path, the token-by-token mechanism makes it unlikely to back up and reconsider.

**Scenario tracing.** Walk through concrete user scenarios against the proposed design. "Given this data model and these endpoints, what happens when a user does X, Y, Z?" The output either builds confidence or reveals specific breakpoints.

**Prototyping.** Build small working versions to test assumptions. This gives the model empirical evidence rather than relying on pattern matching.

These don't fully substitute for human intuition — experienced developers have priors from failures they've lived through that the model simply doesn't have. But systematic adversarial analysis and scenario tracing cover a useful subset.

---

## 6. LLM Parameter Tuning Across Workflow Phases

The model's temperature and sampling parameters can be deliberately varied across workflow phases to match each phase's requirements.

| Phase | Temperature | Rationale |
|---|---|---|
| Exploration / brainstorming | Higher (0.9–1.0) | Maximize diversity; reach for unusual connections |
| Architecture generation | Moderate (0.6–0.8) | Balance creativity with coherence |
| Plan first draft | Moderate (0.5–0.7) | Coherent plan with some creative latitude |
| Plan refinement edits | Low (0.2–0.4) | Precise, targeted changes; preserve existing structure |
| Implementation | Low (0.2–0.4) | Most likely correct code; stay close to patterns |
| Review / adversarial analysis | Moderate (0.5–0.7) | Surface concerns suppressed at low temperature |

**For critical decisions,** generate multiple candidates at different temperatures and compare. A low-temperature candidate follows established patterns; a high-temperature candidate may discover novel approaches. Evaluate both explicitly.

**Within a single phase,** consider starting warmer and cooling down: first plan draft at 0.7, each refinement round drops progressively.

**Caveats:** Temperature effects are model-dependent. Very high temperature doesn't produce "more creative" output — past a threshold it produces incoherent output. The useful range is narrower than intuition suggests. Instrument and tune empirically.

---

## 7. The Two Categories of Workflow Steps

This is the most important structural insight in the document.

### 7.1 The Taxonomy

Every step in the workflow falls into one of two categories:

**Category 1: Compensating for builder fallibility.** These are the refinement loops — plan refinement, architecture refinement, implementation iteration. They exist because the builder cannot reliably produce a correct result in a single pass. Their purpose is to iteratively improve the output through feedback and correction.

**Category 2: Progressive specification enrichment.** These are the steps that extract context from the human, combine it with research and exploration, and progressively sharpen the specification until it's precise enough to implement. The flow from idea capture through exploration through architecture through slicing through planning is fundamentally a process of making the goal more precise at each stage.

### 7.2 Why This Distinction Matters

**Category 1** has an inverse relationship with builder capability. As models get smarter, these loops run fewer rounds and consume fewer tokens. The infrastructure remains as a safety net but does less work. Investment here has diminishing returns over time.

**Category 2** is independent of builder capability. No matter how smart the model is, it cannot know what the human wants without asking. It cannot know the business context, user needs, product vision, or taste-level preferences that determine whether a technically correct solution is the right one. The structured process of eliciting and refining this information is irreducible — it's transferring information from the human's mind into a form the builder can act on.

### 7.3 The Specification Refinement Pipeline

Category 2 can be viewed as a pipeline that progressively reduces ambiguity:

```
Idea (maximum ambiguity — many possible interpretations)
  ↓ exploration — remove uncertainty about feasibility, tradeoffs, prior art
  ↓ architecture — remove uncertainty about system structure, patterns, boundaries
  ↓ slicing — remove uncertainty about decomposition, sequencing, dependencies
  ↓ planning — remove uncertainty about implementation approach, verification
  ↓ refinement — remove remaining ambiguity, conflicts, gaps
Precise Specification (minimum ambiguity)
  ↓ implementation — build a solution that satisfies the specification
  ↓ iteration (Category 1) — correct any remaining gaps
Working Software
```

Each step narrows the set of acceptable solutions. By the time implementation begins, the specification is precise enough that even an imperfect builder can produce something acceptable — and if it doesn't, the Category 1 loops handle the remaining gap.

**This means the highest-leverage improvement to the entire workflow is improving the specification enrichment pipeline** — making each step extract more information and reduce more ambiguity. Better specifications make implementation easier, refinement faster, and architectural rework less likely.

### 7.4 Investment Implications

Invest proportionally more in Category 2 (specification enrichment) and design Category 1 (fallibility compensation) to be adaptive:

**Category 2 — durable investment:**
- The explore phase becomes more powerful as models evaluate tradeoffs more deeply
- Architecture governance becomes more critical as systems grow more complex
- The learning loop becomes more effective as models apply learnings more reliably
- Context bundling becomes a force multiplier for better models

**Category 1 — adaptive infrastructure:**
- Refinement loops with dynamic thresholds that tighten or relax based on observed performance
- Circuit breakers that remain as safety nets but fire less frequently as models improve
- Implementation iteration limits that decrease as first-pass success rates increase
- All compensatory mechanisms should be measurable so their declining necessity is visible

---

## 8. Framework Durability

### 8.1 The Framework Addresses the Problem, Not the Builder

Model intelligence is improving rapidly. This raises the question: will this framework become unnecessary?

The core argument: the difficulty comes from properties of the *problem* — the size of the solution space, the incompleteness of specifications, the nonlinearity of constraints. These don't change when the model gets smarter. Compilers got dramatically better over decades, but we didn't stop using type systems, test suites, or modular architecture. Hiring smarter engineers doesn't eliminate the need for documentation, coding standards, or CI/CD. The framework is organizational infrastructure for a coordination problem, not a crutch for a capability problem.

### 8.2 What Changes With Better Models

A smarter model needs fewer iterations per step — it gets closer to right on the first try. But this shifts where the framework's value concentrates rather than eliminating it.

**Becomes less critical:** Refinement round counts, circuit breaker frequency, implementation iteration limits. These compensate for per-step inaccuracy, and better models have less of that.

**Becomes more valuable:**

- **Architecture governance.** A faster model produces code faster, which means architectural debt accumulates faster without governance. Power tools need more safety equipment.
- **Learning infrastructure.** A smarter model applies captured learnings more reliably, increasing the ROI of every learning captured.
- **Exploration infrastructure.** A smarter model evaluates tradeoffs more deeply, making the explore phase a force multiplier.
- **The decision layer.** A smarter model can make meta-decisions (which strategy to use, when to restart, when to explore) that current models can't. But it needs structured information to reason about — scores, trajectories, maturity levels, learnings. The framework provides this substrate.
- **The specification pipeline.** The information gap between "user has an idea" and "precise specification" doesn't shrink because the model is smarter — the information is in the human's head. The pipeline extracts it. A smarter model traverses the pipeline faster, but the pipeline itself is doing irreducible work.

### 8.3 Design for Adaptation

The framework should scale gracefully in both directions:

- Compensatory mechanisms (refinement loops, circuit breakers) should have dynamic thresholds that relax as models improve, eventually becoming lightweight safety nets
- Information architecture (context bundling, learning systems, maturity tracking) should receive proportionally more investment as it becomes the primary value driver
- The autonomous decision layer should expand over time as codified rules accumulate from observed human interventions

---

## 9. Mappings to the Good Plan Workflow

### 9.1 Current Strengths

| Workflow Feature | What It Does Well |
|---|---|
| CLI owns all deterministic state | Maximally reduces the LLM's decision space — the most reliable improvement available |
| Two-layer architecture (current reality + epic target) | Separates "where we are" from "where we're going," giving both the builder and the human a clear picture |
| Explore phase (research → brainstorm → prototype) | Broad exploration before committing to an approach, reducing the risk of locking into a local optimum |
| Plan refinement with parallel reviewers | Multiple perspectives catch issues that any single reviewer would miss |
| Circuit breakers (decline, oscillation, max rounds) | Detects the most common iteration failure modes and escalates to the human |
| Maturity levels (experimental → foundational) | Scales caution proportionally to accumulated investment and dependents |
| Learning rollup (slice → epic → project) | Captures experience and makes it available to future work |
| Fitness functions and invariants | Moves architectural constraints from "the LLM hopefully remembers" to "deterministic enforcement" |
| Vertical slicing | Decomposes large problems into dramatically more tractable smaller ones |
| Git commits between iterations | Provides mechanical rollback that the LLM process can't provide on its own |
| RED-GREEN verification cycle | Uses test failures as structured feedback to guide implementation correction |
| Context bundling with byte budget | Compresses relevant project state into the model's working context |

### 9.2 Specific Improvements

**Adaptive context bundles.** Make priority tables dynamic. If plans consistently fail on codebase alignment reviews, the CLI should automatically promote codebase-related docs in the context bundle. The data (reviewer scores per domain per round) is already available.

**Structured options matrix from exploration.** Require the explore phase to produce not just artifacts but a structured comparison: 2–3 candidate approaches with explicit tradeoffs. Architecture definition then selects from evaluated candidates rather than synthesizing from unstructured research.

**Phase-dependent parameters.** Vary LLM temperature, context budget, and refinement thresholds based on slice position in the epic and maturity of touched subsystems. Early slices: relaxed, exploratory. Late slices touching mature subsystems: strict, conservative.

**Mode collapse detection.** Track diff size between successive plan revisions. If three rounds produce only cosmetic changes but scores aren't at threshold, the plan is stuck. Default recommendation: decompose or restart with constraints, not "refine harder."

**Low-information iteration detection.** If feedback is all minor with no critical issues but scores remain below threshold, surface this to the human. The reviewers can't articulate what's wrong — this needs human judgment or different reviewers.

**Constraint conflict identification.** When refinement stalls, identify which specific reviewer requirements are in tension. Present the conflict to the human with a request to decide which requirement to relax.

**Stability mode.** When oscillation is detected, automatically switch from "address all feedback" to "address only the single highest-priority issue." Trade speed for stability.

**Best-so-far tracking for plans.** If round N+1 scores lower than round N, offer to revert to the round N version. Don't let refinement regress.

**Information-based slice sequencing.** Beyond dependency order and user value, consider: which unimplemented slice would most reduce uncertainty about the architecture? Prioritize it early.

**Tighter learning application.** Convert validated, high-confidence learnings from context (stochastic application) to enforced constraints (deterministic application). Track recurrence of issues despite learnings as evidence of application failure.

**Test failure prioritization.** Rank implementation failures by information content: core logic first, boilerplate second, environmental issues flagged separately. Ensure high-information failures are addressed first.

**Coherence passes after targeted edits.** After editing specific plan sections during refinement, check remaining sections for assumptions that no longer hold. Cheaper than full regeneration, prevents accumulated drift.

**Dimensionality-aware context sizing.** A slice adding an endpoint to a well-patterned subsystem needs less context than one introducing a new subsystem. Size the context budget and refinement expectations accordingly.

**Meta-workflow learning.** Log every human intervention with structured context: system state, signals present, human decision, outcome. Over time, these become the basis for autonomous decision rules.

---

## 10. The Path to Greater Autonomy

### 10.1 What Autonomy Requires

The system can operate autonomously when it can reliably detect problems and reliably select the right response. It needs human intervention when either capability is insufficient.

**Detection capabilities — current state:**
- ✅ Refinement oscillation, decline, and max rounds
- ✅ Maturity-scaled change caution
- ✅ Fitness function and invariant enforcement
- ✅ Learning capture and (partial) application
- ⬜ Mode collapse / anchoring (stuck on an approach)
- ⬜ Low-information iterations (going through the motions)
- ⬜ Constraint conflicts between reviewers
- ⬜ Specification misalignment (building the wrong thing)

**Response capabilities — current state:**
- ✅ Phase sequencing (explore, plan, implement, etc.)
- ⬜ Dynamic parameter adjustment (temperature, context budget) per phase
- ⬜ Strategy selection (all-feedback vs. single-issue refinement) based on stability
- ⬜ Restart-vs-refine decision based on convergence trajectory
- ⬜ Information-based slice sequencing
- ⬜ Quest-vs-push-through decision based on expected value

### 10.2 Decision Rules to Codify

Each rule is individually simple and testable. Autonomy comes from accumulating enough rules to cover the common operating conditions:

- Oscillation detected + reviewer conflict → single-issue refinement for 2 rounds; if still oscillating, decompose
- Mode collapse detected (3 rounds, small diffs, stalled scores) → restart with learned constraints
- Low information gain for 3 consecutive rounds → escalate to human with diagnosis
- Slice touches only experimental subsystems → relaxed thresholds, higher temperature
- Slice touches foundational subsystems → strict thresholds, lower temperature, require fitness function updates
- Refinement stable and converging → continue autonomously
- Refinement unstable → reduce correction scope, lower temperature
- Test failure reveals specification gap → escalate rather than iterate
- Exploration has 3+ candidates with one clear winner → recommend committing

### 10.3 Growing the Autonomous Envelope

Every human intervention is data about a gap in the system's decision-making. By logging interventions with structure — system state, signals present, human decision, outcome — the system builds a knowledge base for new decision rules. The goal isn't to eliminate human involvement; it's to push the boundary of what the system handles independently so human attention is spent on genuinely novel situations that require product vision, taste, or business context.

---

## 11. Diffusion as a Thought Experiment

One question worth considering: could code generation be reformulated as a diffusion process — starting from noise and iteratively refining toward a target, the way image generation works?

### 11.1 Why It's Appealing

Diffusion models have properties we're constructing through scaffolding: guaranteed improvement per step, coarse-to-fine resolution (broad structure first, details later), and continuous conditioning on the prompt. If code generation had these properties natively, much of the workflow's compensatory infrastructure would be unnecessary.

### 11.2 Why Code Resists This Approach

**Code is discrete and brittle.** Images degrade gracefully — a slightly noisy image is a slightly worse image. Code degrades catastrophically — changing one character can make a working program completely broken. There's no meaningful concept of "slightly noisy code."

**Hard constraints have no analog in images.** Code must parse. Types must check. Tests pass or fail with no middle ground. Images have no equivalent of "fails to compile."

**Compositionality.** Software behavior emerges from the interaction of modules. Changing one module can alter the behavior of others through their interfaces. Images don't compose this way.

There is active research on diffusion over learned code embeddings and abstract syntax trees, but results are currently limited to small, constrained problems (single functions, competitive programming) and haven't scaled to real-world systems.

### 11.3 What We Can Take From It

Rather than literally building code diffusion, the useful question is: what properties make diffusion work, and can we approximate them?

| Diffusion Property | How the Workflow Approximates It |
|---|---|
| **Improvement per step** | Rollback and best-so-far tracking (not guaranteed, but enforced by tooling) |
| **Coarse-to-fine resolution** | Architecture → slices → plans → implementation → edge cases |
| **Conditioning on the specification** | Context bundling loads relevant specification at each phase |
| **Smooth quality landscape** | Fitness functions, invariants, type checking, linting create intermediate quality signals between "broken" and "correct" |

The fourth property is the most important and most underinvested. Every intermediate quality signal (fitness functions, type checking, linting, partial test suites, architectural conformance checks) effectively smooths the quality landscape, making iterative improvement more reliable. The more intermediate signals defined, the more reliably each step moves toward the target.

---

## 12. Established Fields and Prior Art

Many of the ideas in this document have been studied extensively in established fields. This section documents the most relevant fields, specific findings that validate or inform the workflow, and key works worth engaging with directly. The workflow is not a novel invention so much as a synthesis of well-studied principles applied to a new context (human-LLM collaboration). Understanding the prior art strengthens the framework and surfaces techniques not yet incorporated.

### 12.1 Software Engineering Research

This is the academic discipline that empirically studies how software gets built effectively — not "how to code" but "what processes, structures, and practices lead to better outcomes." Two sub-areas are most directly relevant.

**Empirical software engineering** runs controlled studies and mines real project data. Findings that directly validate or inform the workflow:

Code review effectiveness drops sharply as changeset size increases, with studies identifying a sweet spot around 200–400 lines per review. Beyond that, reviewers miss more defects and the review becomes superficial. This validates the vertical slicing approach and the per-phase implementation with review — keeping each reviewable unit small enough for effective evaluation.

Defects are not uniformly distributed. They cluster around areas of high complexity, frequent change, and boundary crossings between modules. This suggests fitness functions should concentrate on module boundaries and high-change areas rather than being uniformly distributed. The maturity system's principle of scaling caution to accumulated investment is supported by the empirical finding that a small number of modules account for a disproportionate share of defects.

Requirements errors that reach implementation cost orders of magnitude more to fix than those caught during specification. This is the empirical basis for the investment thesis that the specification enrichment pipeline (Category 2) is the highest-leverage investment. This finding has been validated repeatedly across decades of studies and multiple methodologies.

**Requirements engineering** is the sub-field most directly aligned with the specification enrichment pipeline (Category 2). It studies how requirements are elicited, analyzed, negotiated, documented, and validated.

The concept of **requirements smells** — patterns in specifications that predict downstream problems — is directly applicable. Documented smells include: vague acceptance criteria, implicit assumptions about system behavior, missing error and edge cases, unstated performance requirements, ambiguous quantifiers ("the system should be fast"), and unresolved conflicts between stakeholder needs. These are documented patterns with known detection heuristics. The reviewer checklist used during plan refinement could incorporate requirements smell detection as a specific review dimension.

**Progressive elaboration** — the idea that requirements should be refined incrementally rather than specified completely upfront — is well-studied. The specification refinement pipeline (explore → architecture → slice → plan) is an instance of this. The requirements engineering literature provides specific techniques for identifying ambiguity systematically, managing conflicting stakeholder needs, and tracing requirements through to implementation. Requirements traceability — tracking how each requirement flows through to implementation and verification — is a mature practice that could tighten the connection between the specification pipeline and the implementation verification cycle.

### 12.2 Barry Boehm's Spiral Model and Risk-Driven Development

Boehm's spiral model (1986) is the most direct ancestor of this workflow. The spiral model says: don't proceed linearly from requirements to implementation. Instead, iterate through cycles of objective setting, risk analysis, development, and evaluation. Each cycle reduces risk and refines the specification.

More importantly, Boehm formalized a principle that maps exactly onto the "information-based slice sequencing" idea: **the order in which you do things should be determined by what reduces risk the most.** A slice that tests an unvalidated architectural assumption carries more risk than one that follows an established pattern. Boehm's principle says: do the risky slice first, because the information it provides either confirms the architecture (reducing risk for all subsequent slices) or reveals problems early (before extensive work is built on wrong assumptions).

Boehm developed specific techniques for risk assessment and prioritization that could directly inform slice ordering. His later work on **value-based software engineering** extends this to balancing risk reduction with value delivery — the same tension the workflow navigates between "informative" slices and "user-valuable" slices. When these conflict (the most informative slice isn't the most valuable), Boehm's framework provides a structured way to reason about the tradeoff.

**Key work:** Boehm, B. "A Spiral Model of Software Development and Enhancement" (1986). Also: Boehm, B. and Sullivan, K. "Software Economics: A Roadmap" (2000) for the value-based extension.

### 12.3 Design Science

**Herbert Simon's *Sciences of the Artificial*** (1969) laid the groundwork for studying design as a discipline — how agents navigate from a current state to a desired state when the path isn't known. Simon's key insight: design is **satisficing search** — you're not looking for the optimal solution, you're looking for a solution that's good enough across all constraints. The target isn't a point; it's a region of acceptable solutions, and the job is to find any point inside it. This is the most precise statement of the "target volume" concept that runs through this document.

**Donald Schön's *The Reflective Practitioner*** (1983) studies how skilled practitioners actually work. Schön's concept of "reflection-in-action" — the practitioner proposes something, observes the result, and adjusts — maps onto the iterative development loop. More usefully, Schön identified that experts build **repertoires** of specific patterns and exemplars that they use to frame new situations. They don't reason from general principles; they reason by analogy to specific past cases.

This has a direct implication for the learning system: **concrete examples and specific failure stories are more useful than abstracted principles.** A learning like "the API rate limiting approach in slice 3 caused timeout cascades under load because the retry backoff was linear instead of exponential" is more actionable than "consider retry strategies carefully." The model (and humans) reason better from specific cases than from generalizations. The learning system should preserve enough specificity for pattern matching, not just distilled principles.

The design research tradition has also studied **design fixation** — the tendency to get stuck on one approach and keep refining it rather than exploring alternatives. This is the "mode collapse" problem, studied empirically in human designers. Known mitigations include: exposure to diverse examples before starting (the explore phase), forced consideration of alternatives (adversarial self-review), and explicit decomposition to prevent early commitment to a holistic approach (vertical slicing). These aren't just good ideas — they're validated interventions for a documented cognitive bias that affects both humans and LLMs.

**Key works:** Simon, H. *Sciences of the Artificial* (1969, chapters 5–7 on design). Schön, D. *The Reflective Practitioner* (1983).

### 12.4 Cybernetics and Systems Thinking

Cybernetics — the study of feedback, control, and communication in complex systems — was founded by Norbert Wiener in the 1940s and developed by W. Ross Ashby, Stafford Beer, and others. It's fallen out of fashion as a named field, but its core ideas are embedded throughout modern systems engineering and organizational theory. Two concepts are directly applicable.

**Ashby's Law of Requisite Variety:** A controller must have at least as many possible responses as the system has possible states. Applied to this workflow: the detection-and-response system needs to be at least as diverse as the failure modes it encounters. Every undetected failure mode or missing response option is a gap in the system's variety. This is the autonomy roadmap stated in cybernetic terms — expanding the autonomous envelope means expanding the variety of the controller to match the variety of the situations it faces. Requisite variety can't be achieved all at once; it's built incrementally by observing new failure modes and adding new response rules.

**Stafford Beer's Viable System Model (VSM):** Beer identified five functions any viable (self-organizing, adaptive) system needs:

1. **Implementation** — doing the work (LLM execution in the workflow)
2. **Coordination** — managing interactions between implementation units (the CLI state machine)
3. **Optimization** — improving performance of ongoing operations (refinement loops)
4. **Intelligence** — monitoring the environment and anticipating change (circuit breakers, health signals, metrics)
5. **Policy** — identity, direction, and values (the human providing vision and judgment)

Beer's model predicts that weakness in any function creates specific, diagnosable pathologies. Weak intelligence means the system doesn't detect when it's failing. Weak coordination means conflicting activities step on each other. Weak policy means technically correct but strategically wrong outputs. This diagnostic framework could help identify *where* the workflow is underperforming when problems arise — rather than treating all workflow problems as instances of "the model isn't good enough."

**Key work:** Beer, S. *Brain of the Firm* (1972, 2nd edition 1981) — the most accessible introduction to the Viable System Model.

### 12.5 Verification and Validation (V&V)

The two-category taxonomy (fallibility compensation vs. specification enrichment) maps onto a distinction studied for decades in software and systems engineering:

- **Verification:** "Are we building the thing right?" — does the implementation match the specification? (Category 1)
- **Validation:** "Are we building the right thing?" — does the specification match what the user actually needs? (Category 2)

V&V research provides frameworks for reasoning about which activities serve which purpose, how to allocate effort between them, and what failure modes arise when either is neglected. The finding that validation failures (building the wrong thing) are typically more costly than verification failures (building the right thing wrong) supports the investment thesis favoring the specification enrichment pipeline.

### 12.6 LLM-Based Software Engineering (Emerging Field)

There is a rapidly growing research area studying LLM-based agents for software engineering. Recent surveys have collected over 120 papers categorizing work from both the software engineering and agent design perspectives. This research highlights the importance of hybrid techniques — combining traditional SE practices with LLM capabilities — for reliable deployment, which is the architecture of this workflow.

A paper particularly relevant to this workflow is **SELF-REFINE** (Madaan et al., 2023), which empirically studied the iterative refinement loop. Key findings:

**Feedback quality is the dominant factor in refinement effectiveness.** Specific, actionable feedback (e.g., "avoid repeated calculations in the for loop") dramatically outperforms generic feedback (e.g., "improve the efficiency of the code"). In some tasks, the performance gap between specific and generic feedback was enormous. Without any feedback at all, the model tended to either repeat the same output or make unrelated changes — confirming that undirected iteration is essentially a random walk.

**Iterative refinement consistently improves output quality across tasks and models.** The improvement from a single refinement round is significant; further rounds show diminishing but real returns. This validates the refinement loop architecture while also supporting the adaptive threshold approach — most of the value comes in the first 1–2 rounds, with later rounds primarily useful for complex or difficult cases.

**The model can serve as both generator and evaluator**, but the quality of the evaluation prompt matters as much as the quality of the generation prompt. This validates the workflow's investment in structured reviewer instructions with specific evaluation dimensions (codebase alignment, technical design, security, performance, etc.) rather than generic "review this" prompting.

These findings directly support several workflow design decisions: the structured feedback categorization (CRITICAL, IMPORTANT, MINOR, DIRECTLY_ACTIONABLE), the parallel specialist reviewers with domain-specific evaluation criteria, and the principle that the evaluation function determines whether iteration converges.

### 12.7 Recommended Reading

For the theoretical foundations:
- **Simon, H. *Sciences of the Artificial*** (1969, chapters 5–7) — why design is satisficing search, the foundational framing for how builders navigate solution spaces
- **Boehm, B. "A Spiral Model of Software Development and Enhancement"** (1986) — risk-driven iterative development, the direct ancestor of this workflow's structure

For the specification enrichment pipeline:
- **Requirements engineering surveys or textbooks** — techniques for ambiguity detection, requirements smells, progressive elaboration, and traceability. These would map directly onto improving the explore and planning phases.

For the autonomy vision:
- **Beer, S. *Brain of the Firm*** (1972/1981) — the Viable System Model, providing a structured way to think about what functions the autonomous system needs and how to diagnose weaknesses

For the LLM-specific refinement loop:
- **Madaan et al. "Self-Refine: Iterative Refinement with Self-Feedback"** (2023) — empirical validation of iterative LLM refinement, with specific findings about feedback quality
- **Surveys on LLM-based agents for SE** (multiple, 2024–2026) — landscape of what others are building and where this workflow fits in the research space

For reflection and learning systems:
- **Schön, D. *The Reflective Practitioner*** (1983) — how practitioners build and use repertoires of experience, with implications for how learnings should be captured and structured

---

## 13. Areas for Deeper Investigation

### 13.1 Practical Tooling

- **Empirical temperature calibration.** Instrument quality metrics at each phase, run experiments with different temperature settings, build an empirical mapping of optimal ranges per phase per model.
- **Reviewer disagreement quantification.** Build a lightweight measure of reviewer agreement. Use it to distinguish "everyone sees the same problems" from "fundamental tension" early in refinement.
- **Context bundle sufficiency testing.** Track instances where refinement reveals missing context. Use these as data to improve priority tables.
- **Learning effectiveness tracking.** For each learning, track whether the same issue recurs. High-recurrence learnings are candidates for promotion to deterministic enforcement.
- **Requirements smell detection.** Incorporate documented requirements smells from the requirements engineering literature into the reviewer checklist as a specific evaluation dimension during plan refinement.
- **Meta-workflow instrumentation.** Log human interventions with structured context. Build a dashboard of intervention patterns. Identify common intervention types as candidates for decision rules.
- **VSM-based diagnostics.** When the workflow underperforms, use Beer's five-function model to diagnose *which* function is weak (implementation, coordination, optimization, intelligence, or policy) rather than treating all problems as model capability issues.

### 13.2 Open Questions

- **What's the optimal compression of project state into context bundles?** Is there a principled way to determine what to include versus exclude, beyond heuristic priority tables?
- **Is there a maximum rate at which the LLM can usefully absorb context?** Beyond some density, does additional context degrade rather than improve performance?
- **Can the system predict which slices will need the most iteration?** Leading indicators (scope, subsystem maturity, constraint density) might enable proactive resource allocation. Boehm's risk assessment techniques may provide a starting point.
- **Can the system learn to ask the right questions?** Instead of the human volunteering information through a structured pipeline, can the model identify the most informative questions to ask — the questions that maximally reduce specification ambiguity? Requirements elicitation techniques from the RE literature may inform this.
- **How should the workflow adapt as models improve?** What metrics would indicate that specific compensatory mechanisms can be relaxed or removed?
- **What is the optimal form for learnings?** Schön's research suggests that specific cases are more useful than abstract principles for practitioner reasoning. Should learnings be stored as concrete narratives rather than distilled rules? Can both forms coexist, with narratives for context and rules for enforcement?
- **How should slice sequencing balance risk, value, and information?** Boehm's risk-driven approach, the information-gain principle, and user-value delivery are three competing priorities. Is there a principled way to balance them, or is this inherently a human judgment call?

---

## 14. Summary of Key Principles

1. **Software development is an iterative search under uncertainty.** The problem's inherent complexity — large solution space, incomplete specifications, interacting constraints — makes single-pass solutions unreliable for any builder. The need for iteration is intrinsic to the problem.

2. **Describe the destination, not the route.** Declarative constraints on the result are more information-dense than prescriptive instructions about the process. Every declarative constraint directly narrows the set of acceptable solutions.

3. **Handle deterministically what you can.** Every aspect solved with deterministic code rather than LLM generation is a guaranteed reliability improvement. The most reliable improvement available.

4. **Decompose aggressively.** The difficulty of navigating a complex space scales exponentially with scope. Splitting problems into smaller pieces provides exponential, not linear, improvement.

5. **Invest in feedback quality.** Directional feedback (what's wrong and why) enables directed improvement. Non-directional feedback (it's wrong) produces random wandering. The evaluation function determines whether iteration converges.

6. **Workflow steps are either fallibility compensation or specification enrichment.** The former has diminishing returns as models improve. The latter is independent of model capability and is where durable investment should concentrate.

7. **The specification enrichment pipeline is the highest-leverage investment.** Better specifications make everything downstream easier — implementation, refinement, architectural coherence. Improving how effectively the workflow extracts and refines the human's intent has compound returns.

8. **Humans navigate; LLMs generate.** The optimal workflow leverages human strengths (judgment, simulation, direction) and LLM strengths (volume, consistency, exhaustiveness) while compensating for each agent's weaknesses.

9. **Detect problems and change strategy.** Non-convergence, oscillation, and stagnation are signals to change approach (decompose, restart, escalate) not to try harder with the same approach.

10. **The framework is a coordination protocol, not a capability crutch.** It defines how information flows between the human, the model, and the codebase. Smarter models execute the protocol faster, but the protocol solves a coordination problem that persists regardless of capability.

11. **Expand autonomy incrementally through codified decision rules.** Each human intervention reveals a gap in the system's autonomous operation. Logging interventions with enough structure builds a knowledge base for expanding the system's independent operating envelope.

12. **Design compensatory mechanisms to scale down gracefully.** As models improve, refinement loops should need fewer rounds, circuit breakers should fire less often, and iteration limits should decrease — without requiring structural changes to the workflow.
