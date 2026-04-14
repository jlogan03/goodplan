# Ideal Implementation — Synthesis (Option 3)

A unified design for the goodplan workflow. Conceptual mechanisms and the implementation premises that support them are presented together so the reader gets "what this is" and "how the system supports it" in the same breath. Structure is **layered**: foundations first (what the system stores and enforces), then the mechanisms that ride on those foundations, then the phases that compose them.

The constraint behind every choice: an LLM should do most of the labor, the user should stay confident the LLM is building the right thing, and the steering interface between them should be cheap when the user is present and absent when they are not.

---

## Part I — Foundations

### 1. Process discipline

- **Three-step exploration: ideal flow → ideal implementation → delta.** The previous attempt jumped straight from ideal flow to delta and conflated design with migration reasoning. Delta work happens only after the ideal implementation is drafted, reviewed, and pressure-tested. The earlier `02-delta-vs-current-implementation.md` is stale; its grounded research about the current code is scaffolding for the eventual real delta.
- **Modify in place, don't rewrite.** Every change to existing code is a bounded shippable delta, not a greenfield replacement. The pain is execution gap, not conception.
- **Dogfood with integrity.** The workflow must work on itself. This epic is the test of whether goodplan can shepherd a real, working system being improved incrementally.

### 2. Invariants + events, not a state machine

The current forward-only transition graph is too rigid. Adding escape hatches makes the rule set unbounded. The new abstraction:

- **Events** are facts about what happened. Append-only, schema-validated, immutable.
- **Invariants** are check-constraints every event must satisfy. They define what must be true, not what sequence of actions must occur.
- **Derived state** is a query over the event log. "What's the current state of X" is a view, not a stored value.
- **The CLI is the invariant engine, schema validator, and query engine.** Skills emit events; skills consume derived state.

This unlocks: backward movement via compensating events, mid-flow insertion, optional phases, parallelism, full audit history (the log *is* the state), and natural merge resilience because everything is append-only.

The CLI itself is non-negotiable. It provides state integrity, schema validation, structured queries, context bundling, ground truth independent of LLM sessions, debuggability, testability, integration points for non-LLM code, deterministic error codes, and atomic multi-file operations. None of these can be reproduced cheaply in a skill-only world.

The right model for "going back" is **timestamped checkpoints**, not a linear machine. Each phase produces an immutable snapshot. "Back" means starting a new attempt at an earlier phase with prior attempts preserved. The system shows you "you have two architecture proposals, which is current?" and you pick. Replan count, abandon-and-recreate, phase skip, and resume-after-error all collapse into snapshot operations on the same event log.

### 3. Storage

- **Event log as JSONL, committed to git.** One `events.jsonl` per scope: `.goodplan/events.jsonl` at the project, `.goodplan/epics/<slug>/events.jsonl`, `.goodplan/side-quests/<slug>/events.jsonl`.
- **Content-addressed via git's object store.** No explicit `blobs/` directory. Events reference content by git blob hash; retrieval is `git cat-file blob <hash>`. Content is committed as normal markdown in the workspace, which gives content addressing for free.
- **SQLite deferred.** Start with JSONL direct read and in-memory parsing per CLI invocation. Persistent caching only when profiling shows a need.
- **Commit rhythm:** skills commit at workflow milestones, not per event. Events are visible to the CLI immediately via file appends; git commits happen at phase transitions, end of session, and user-requested save points.
- **Pre-tool-use hooks protect the JSONL files and spine docs from direct edits.** HMAC is dropped. The hook blocks write attempts at the tool-call level with a loud immediate error that guides the LLM back to the CLI. Simpler than HMAC and matches the actual threat model — prevent accidents, not motivated attacks.

### 4. Directory structure

```
.goodplan/
├── .gitignore
├── events.jsonl                              # project-level events
├── architecture-current.md                   # current system: subsystem index + communication patterns
├── conventions.md                            # project conventions
├── invariants.md                             # prose reference; canonical invariants in invariants/
├── invariants/
│   ├── core.yaml                             # ships with CLI
│   ├── custom/                               # project-specific extensions
│   └── proposed/                             # LLM-proposed, awaiting human approval
├── subsystems/
│   └── <date>_<slug>_<suffix>.md             # per-subsystem API docs, data models, invariants
├── briefings/
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
│       ├── briefings/
│       ├── slices/
│       │   └── <slug>/                       # slug only; epic dir disambiguates
│       │       ├── goal.md
│       │       ├── plan.md                   # or plan/ for multi-file plans
│       │       └── briefings/
│       ├── brainstorm/
│       ├── research/
│       └── refinement/                       # in-progress refinement state
│           └── <artifact>/
│               └── round-<N>/
│                   ├── reviews/<reviewer>.md
│                   ├── synthesis.md
│                   └── edit-notes.md
└── side-quests/
    └── <date>_<slug>_<suffix>/
        ├── events.jsonl
        ├── goal.md
        ├── plan.md
        └── briefings/
```

### 5. Naming conventions

- **Epics, side quests, top-level artifacts:** `<YYYY-MM-DD>_<slug>_<6-char-suffix>`. Date sorts chronologically. Slug is human-readable. Suffix prevents collision when multiple people create same-named entities on different branches.
- **Slices:** `<slug>` only. Epic directory disambiguates; no cross-branch collision risk.
- **Briefings, decisions, learnings:** `<YYYY-MM-DD>_<slug-or-type>_<suffix>.md`.
- **Architecture docs:** `architecture-current.md` at `.goodplan/` root, `architecture-target.md` inside each epic. Clearer than `architecture.md` in two places.
- **Event log filename:** `events.jsonl` everywhere; the parent directory disambiguates scope.
- **IDs:** ULIDs for system-generated identifiers (events, findings, briefings, decisions, learnings) — sortable by creation time, collision-resistant across branches, 26 chars. Slugs for user-facing entity names; entities also carry a stable ULID that survives renames.

### 6. Artifacts as sets, extractors at commit time

- **Every artifact is a set of `(path, hash)` entries.** Single-file artifacts are sets of length one. Multi-file artifacts (large plans, subsystems that grow into directories) are handled the same way.
- **CLI commit accepts single files, directories, or explicit lists.** All produce the same event shape. Drift detection compares workspace file sets to committed sets and handles modifications, additions, and removals.
- **Structured metadata is extracted at commit time.** For each artifact type, the CLI runs an extractor that pulls structured fields from the prose: chunks with verification methods from plans, subsystem lists from architecture, acceptance criteria from goals. Extracted metadata attaches to the commit event and is what invariants check.
- **Skills are responsible for producing prose that extracts cleanly.** Templates provide starting structure; schema-aware prompts guide the LLM toward parseable content.
- **Reviewers cross-check prose against extracted metadata** as a backstop. The CLI trusts extraction at commit time; reviewers catch discrepancies between claims and reality.

### 7. The invariant model

**Hybrid (Option C):**
- Universal invariants live in TypeScript code — they define what goodplan *is*: cardinality, precedence, temporal, referential.
- Extensible invariants live in YAML under `.goodplan/invariants/` for project-specific additions and overrides.
- The DSL is a small set of composable rule types: `unique`, `required`, `count_limit`, `foreign_key`, `enum`, `all_match`, `exists`, `precondition`, `temporal`, `custom`.
- The `custom` escape hatch points to a sandboxed TypeScript function for checks too complex to declare.

**Starting set (~20):**

| Class | Examples |
|---|---|
| Cardinality | one active epic per branch, one active side quest per branch, unique slugs within scope |
| Precedence | slice needs refined plan before build, slice needs verification before complete, epic needs all slices complete before complete, slice needs dependencies complete before activation |
| Content | plans have at least one chunk, every chunk has a verification method (R2), goals non-empty, findings have required fields, briefings have required sections |
| Referential | entity IDs resolve, blob hashes resolve, cross-log references resolve |
| Protection | spine docs change only via commit events, invariants themselves are spine-protected |

**LLM-proposed invariants.** The LLM can propose new invariants as files in `.goodplan/invariants/proposed/`. Each proposal includes trigger context, rationale, dry-run results showing what would have been caught historically, and the invariant itself in DSL form. Proposals surface to the user at slice land, epic land, or on demand. Accepted proposals move to `core.yaml` or `custom/`. Natural triggers: slice-land retrospectives, epic completion reflection, user "that shouldn't be possible" statements, pressure-test findings.

This matters because **invariants are the architectural tool for making errors impossible**. The Pressure Test's error-class inventory and the invariant set are two ends of the same mechanism: one finds error classes a different design could have foreclosed; the other foreclosures them.

### 8. Parallelism and the PR/merge model

- **At most one active epic per branch.** Multiple active epics would pull target architecture in incompatible directions.
- **At most one active side quest per branch.** Side quests run orthogonally because they don't propose alternate architecture.
- **Parallel slices within an epic, gated by dependencies.** Slices declare `depends_on: [slice_ids]` and `affected_subsystems: [subsystem_ids]`. They can run in parallel if their declared dependencies are complete and they don't share affected subsystems.
- **Same-slice multi-branch collision is forbidden** — invariant-enforced; merges that would activate the same slice on two branches fail with a clear error.
- **Multi-person collaboration on an active epic happens via the epic's branch**, not via main. Alice starts epic A1 on `feature/epic-A1`; Bob checks out that branch directly and contributes slices; PRs go into the epic branch.

**Merge model (Option 1):** epics must be complete before their branch can merge to main. Main never carries active epic state. Enforcement is a pre-merge check (`gp check-ready-to-merge --target main`) that runs invariants against the proposed post-merge state; teams wire it into git hooks or CI. Long-lived epic branches are general git hygiene (periodic merges from main into the epic branch), not a goodplan concern. Side quests and small fixes don't block on the active epic — they go on their own branches and merge to main independently.

### 9. Tight writing discipline

- **All LLM-produced artifacts use tight writing.** Cut hedging, throat-clearing, preambles, repetition. Prefer structure (tables, lists) over prose where denser. Say important things once and reference them.
- **Skills and agent prompts also use tight writing** — they're read by LLMs, which are robust to density.
- **Condensed grammar is the wrong optimization.** Token savings are modest and harm readability. Tight writing (structural density) gives 20–40% reduction with no downsides.
- **Context-accumulation is a first-class reviewer question.** Every reviewer asks: "what context will the downstream agent need that isn't in this artifact? what stale context should be removed?" Grounded in: "if I were the implementer with the codebase open but no prior conversation, would I have to stop and figure X out?"

---

## Part II — Mechanisms

The mechanisms below are not independent features. They share a backbone: the Context Spine is the substrate, Maturity is the universal rigor dial, R1 is the universal "should we stop?" rule, R2 is the universal "is this verifiable?" rule, and the Refinement Loop is how artifacts become trustworthy enough to act on.

Several of the workflow's central judgment calls — whether a finding materially matters, whether an assumption is load-bearing, whether a slice is coherent — are **irreducibly judgment-laden by design**. The mechanisms below exist precisely because checklists fail at these boundaries. The model is trusted to exercise judgment; the workflow provides scaffolding (context, prompts, blocking options) rather than rules.

### 10. The Context Spine

Every phase begins by reading a small set of standing project-level documents that anchor the LLM's mental model. Without them, every phase re-discovers the project from scratch and produces a subtly different mental model on each run. The spine is the substrate the rest of the workflow reads from and writes to.

**Documents in the spine:**

| Doc | Concern | Violation |
|---|---|---|
| `architecture-current.md` | Structural map *as it exists today*: subsystems, public boundaries, how things fit together. Not a file listing. | Drift |
| `conventions.md` | *How we do things* — tech stack, code style, test patterns, naming, module layout, PR/commit norms, build and release. | Code smell |
| `invariants.md` | *What must be true* — properties the code is required to preserve. "All state mutations go through the CLI." "Every mutation stamps the version field." | Bug |
| Other grounding docs | Glossary, domain model, security model — anything multiple phases need that can't be derived quickly from code. Forward-compat escape hatch, not a prescription. | — |

**Epic-level layer.** `architecture-target.md` is the epic-specific diff describing the shape after the epic lands. It is primarily a diff against `architecture-current.md` but may also propose changes to `conventions.md` or `invariants.md`. Those are rare and significant — explicit target items, not silent edits.

**Universal rules:**

1. **Terseness.** Structural, not exhaustive. If it can be derived from reading code in ten minutes, it doesn't belong.
2. **Promotion happens per slice at Land.** When a slice changes something structural, the relevant spine doc is updated honestly. The honest-intermediate-state rule applies to *all* spine docs: mid-rename is described as mid-rename; a half-adopted convention is described as half-adopted; no pretending.
3. **Changes to invariants and conventions are first-class epic concerns.** Unlike architectural diffs, which flow naturally from implementation, changing an invariant or convention is a deliberate act. It appears in `architecture-target.md` and runs through the same refinement and Pressure Test as any architectural change.
4. **Maturity applies.** Conventions and invariants carry maturity tags too — experimental convention vs. foundational invariant. Breaking a foundational invariant triggers R1 blocking by default.

**Promotion targets** for findings (from Pressure Test, Discovery Ledger, anywhere) include any spine doc: an accepted pressure-test finding becomes a tagged architecture constraint; a repeatedly-rediscovered pattern promotes into `conventions.md`; a newly-established property the code now relies on promotes into `invariants.md`. This keeps reasoning visible across epics so the same issues don't get re-rediscovered.

**Why this matters to the LLM, not just the human.** Every phase begins by reading the spine, so the LLM doesn't rebuild a mental map from code exploration on each run. The target acts as a constraint reviewers check plans against, not just describe. Slice 3 and Slice 7 plan against the same reference, catching cross-slice drift. Promotion keeps the spine current so the next epic doesn't start from a stale picture.

**Failure modes.** *Doc rot* — antidote: promotion is mandatory at Slice Land across all spine docs; the workflow refuses to close the slice without it; an inter-epic reconciliation audit catches silent drift. *Target over-specification* — rule: target describes shape and invariants, not function names or line counts. *Stranded drift* — slice-time discoveries can change the right target, so target is **live**; slices may propose target edits, gated by R1, and target edits are a first-class slice outcome. *Verbose spine docs* — antidote: structural only; details live in code. *Silent invariant or convention changes* — antidote: rule 3 above.

### 11. Subsystem tracking

Subsystems are the unit of architectural reasoning, and they tie maturity, learnings, decisions, invariants, slice dependencies, and reviewer routing together.

- **Subsystems are first-class entities with stable slug IDs** shared across maturity tracking, slice dependency inference, learning/decision tagging, and reviewer routing.
- **`architecture-current.md` holds the subsystem index** — name, maturity, owns paths, depends on, link to per-subsystem file — and **communication patterns** (direct calls, event-mediated, shared models, boundary rules).
- **`.goodplan/subsystems/<slug>.md` holds per-subsystem details:** description, public API with stability markers, data models, maintained invariants, known limitations, future directions.
- **Per-subsystem extractor** pulls API methods, signatures, stability, data models with field lists, invariant counts.
- **Documentation depth scales with maturity.** Experimental: optional. Maturing: must exist. Stable: complete API docs required. Foundational: comprehensive. Enforced by invariant.
- **Queries:** `gp subsystem:show <id>`, `gp subsystem:api <id>`, `gp subsystem:callers <id>`, `gp subsystem:impacts <id>`. The `callers` and `impacts` queries enable impact analysis before API changes.

**Learnings, decisions, and invariants are tagged, not foldered.** Each learning or decision carries an optional `related_subsystems: [ids]` field in its extracted metadata. Invariants can declare `scope: subsystem` with `target_subsystem: <id>` to apply only when events touch that subsystem. Storage is flat (`.goodplan/learnings/`, `.goodplan/decisions/`); views like `gp learnings:list --subsystem auth` filter by tag. Subsystem renames produce `subsystem-renamed` events that map old to new; the CLI either auto-rewrites references or resolves through the mapping.

**Context bundles load targeted subsystem context.** When planning a slice that touches `auth`, the bundle includes learnings/decisions/invariants tagged with `auth` plus untagged project-level wisdom — and excludes everything else.

### 12. Maturity Tracking

Each subsystem in `architecture-current.md` carries a **maturity tag** plus an orthogonal **lifecycle state** (active / deprecated / retired).

| Level | Meaning | LLM behavior |
|---|---|---|
| **Experimental** | Recently introduced. Unstable API. Few or no dependents. | Change freely. Don't over-engineer. Tests check the experiment, not churn. |
| **Maturing** | Some dependents. API in flux but not wildly. | Be deliberate. Write tests. Don't break known callers silently. |
| **Stable** | API fixed. Multiple dependents. | Default rigor. Breaking changes need justification. |
| **Foundational** | Load-bearing primitive, many dependents. | Change carefully and rarely. Explicit user sign-off for breaking changes. R1 sensitivity multiplier. Plan migrations exhaustively. |

Without maturity, the LLM falls into two symmetric failure modes: **over-engineering experimental code** (careful migrations and test scaffolds for stuff about to be rewritten) and **under-engineering foundational code** (treating a load-bearing change like a casual refactor). Neither is fixable by telling it to "use judgment" — it has no basis for judgment without the information.

Maturity is **the rigor dial that runs through everything else**. It scales the Pressure Test, calibrates Refinement Loop strictness, multiplies R1 blocking sensitivity, and inherits into a finding's severity (the same performance cliff is a note in an experimental module and a reshape trigger in a foundational one).

`architecture-current.md` lists each subsystem with its maturity tag and a dependent count — the count is a falsifiability check, since "experimental" with twelve dependents is lying. `architecture-target.md` explicitly names any maturity transitions the epic drives: *"After this epic, X promotes from maturing → stable."* Promotion is a deliberate decision with a review gate. Epic Land runs a maturity reconciliation: did anything silently become load-bearing? Did anything deprecated get resurrected?

**Failure modes.** *Maturity lies* → dependent count flags it. *Over-tagging to foundational* → it feels safer but destroys velocity; promotion to foundational requires explicit user sign-off. *Under-tagging forever* → Epic Land asks "did anything mature?"

### 13. The Pressure Test

After the target architecture is drafted and before refinement, an explicit adversarial pass runs. This is not a review of whether the design is correct; it is a search for **the classes of problems the design *invites***, the scaling cliffs it hides, the optionality it forecloses, and the errors it fails to make impossible.

The strongest framing is **errors made impossible**: the difference between *"the code handles bad input correctly"* and *"bad input cannot be constructed in the first place."* Models don't naturally reach for this — they reach for defensive validation, which is strictly worse. The Pressure Test exists to force the stronger framing. Without it, models systematically under-deliver architectural quality.

**Five questions, one rigorous pass:**

1. **Failure-mode enumeration.** What *shapes* in this design invite classes of problems? Not hypothetical bugs — structural invitations. *"Validation lives at the caller, so every new caller becomes a new place validation can be forgotten."*
2. **Scaling cliffs.** Concrete axes, not vague "will it scale": what breaks at 10x data, 100x concurrent writers, 2x entity count, when a new integration is added? Output is the *location of the cliff*, not a performance estimate. Anchor to realistic horizons (next 6–12 months) to avoid architecture astronautics.
3. **Optionality ledger.** Two columns — options preserved (decisions deferred because the shape accommodates multiple answers) and options foreclosed (decisions committed now that would be expensive to reverse). Good architecture preserves options where uncertainty is genuine and commits decisively where it isn't. Preserving everywhere is flexible slop; foreclosing everywhere is brittle.
4. **Error class inventory.** Three buckets: classes of error now impossible by construction; classes still possible; and — the hardest and most important — *classes a different design could have made impossible*. The third bucket is the forcing function: it makes the model imagine alternatives instead of defending the current.
5. **Locked-in assumptions.** What does the design silently assume? *"Findings never reference each other." "The ledger fits in memory." "The user is the only writer."* Each assumption is a future cliff in disguise.

The error-class inventory has a specific tie to the spine: it should check whether the target *preserves or strengthens existing invariants* and whether *new invariants* can be added to make additional error classes impossible by construction. This is exactly where LLM-proposed invariants originate.

**Prompt posture matters.** The LLM must be told its job in this step is to *find* problems, not defend the design. Literal instruction: *"Your job in this step is to find ways this will hurt us. If you find none, press harder — that usually means you haven't tried."* Adversarial mode is a different cognitive posture than review; the prompt is what flips it. It's a named step rather than a reviewer role because reviewers critique what's there; this critiques what *isn't*.

**Outcome handling.** Findings are addressed where worthwhile or **accepted with justification** — accept-with-justification is a first-class outcome, not a cop-out. Accepted findings promote into the spine as tagged constraints (usually `architecture-current.md`, occasionally `invariants.md` or `conventions.md`) so they're tracked honestly and don't get re-raised. The final target carries a Pressure-Test Summary: what was examined, what was changed, what was accepted and why. This summary is committed as `pressure-test.md` inside the epic directory.

**Failure modes.** *Performative listing of three generic concerns* → require a specific finding per category; generic findings rejected. *Findings never accepted, only fixed* → the test gets watered down; antidote: accept-with-justification is first-class. *Box-ticking* → the prompt itself is the protection.

### 14. The Refinement Loop

**Artifacts are context transport.** Most review processes are framed as catching mistakes. This one does that, but its more important function is **context accumulation**: each reviewer adds missing context, corrects wrong context, and verifies what's there. By the end, the artifact is a self-contained specification — a downstream agent who has never seen the codebase could in principle execute against it without re-discovering anything. **A plan can be correct and still useless if it assumes context the implementer doesn't have.** Same for a target that assumes context the next epic won't have. Same for slice definitions a reader can't decode standalone. Context accumulation is an explicit goal of every reviewer, not a happy side effect.

**Mechanism**, universal in shape, parameterized per use:

1. **Select reviewers by relevance** from a pool of specialists (architecture, conventions, invariant, holistic, type safety, data layer, frontend, API contracts, verifiability, sequencing…). Reviewers reference the **full spine**, not just architecture: a conventions reviewer checks style and patterns against `conventions.md`; an invariant reviewer checks `invariants.md` is preserved; an architecture reviewer checks structural fit against `architecture-current.md`. Always-on reviewers (holistic, invariant-checker) run every time.
2. **Parallel review.** Each reviewer evaluates against its written contract (*"I check for X, Y, Z"*) and produces severity-tagged findings, a score, and identified missing context. Fixed contracts prevent reviewer drift.
3. **Synthesize.** Merge into a single feedback document. Surface unresolved contradictions to the user (R1 territory) rather than silently picking a side.
4. **Edit.** An editor agent *fixes* the feedback, not just flags it. Unresolvable items escalate.
5. **Re-review, change-scoped.** Next round sees a *diff*, not the whole artifact, and answers: did your prior concerns get resolved? did the changes introduce new ones? This is the key to avoiding stagnation.
6. **Exit on criteria, not feel.** Mechanical: all relevant scores ≥ threshold, zero CRITICAL/IMPORTANT, only MINOR remaining. Or circuit-breaker on stagnation/max-rounds, which hands the user a judgment call (*"accept at 8, escalate to reshape, or abandon?"*) instead of exiting silently. **Round count is not a target.** The loop runs until the bar is met — however many rounds that takes — or until the circuit breaker triggers and the user is asked to make a judgment call.

In-progress refinement state lives at `epic/refinement/<artifact>/round-<N>/` with `reviews/`, `synthesis.md`, and `edit-notes.md`. Each round is a snapshot, debuggable after the fact.

**Where it runs:**

| Phase | Artifact | Pool | Rigor |
|---|---|---|---|
| Shape | `architecture-target.md` (post-pressure-test) | Architecture, holistic, invariant, touched-subsystem specialists | System-level pool, selected by relevance. Exits when the bar is met. |
| Shape | Slice definitions | Holistic, sequencing, verifiability, subsystem-boundary, dependency | Focused pool. Exits when the bar is met. |
| Build (per slice) | Slice plan | Full specialist pool selected by what the plan touches — the largest loop. Context accumulation is the explicit goal. | Full pool, selected by relevance. Exits when the bar is met. |
| Build | In-progress code | Reviewers on commits/PRs; continuous light touch | Lower threshold; doesn't block every commit |
| Slice Land | Spine promotion, ledger triage, learnings, recap | Light touch — checks promotion reflects reality and learnings are non-duplicative | Minimal pool; sanity check only |

**Improvements over naive review** (each addressing a specific failure mode):

- **Context accumulation as a first-class question.** Every reviewer answers: *"Reading the codebase as it exists today, would the implementer have to stop and figure X out?"* Concrete grounding, not speculation. (Failure: speculative invention. Antidote: ground in real codebase state.)
- **Change-scoped re-review.** Reviewers can't re-raise stale concerns about unchanged content; convergence is faster, tokens proportional to delta size. (Failure: stagnation.)
- **Rigor scales with stakes**, dialed by maturity, target-delta size, and pressure-test findings. Over-rigor is as bad as under-rigor — wastes tokens, trains the team to treat review as ceremony. (Failure: foundational work skipped to avoid review pain. Antidote: rigor tied to maturity, not user preference; overrides recorded.)
- **Reviewer contracts are fixed and structured**, preventing drift, noise, and contradictions that are artifacts of unclear scope.
- **Weighted scoring by relevance.** A TS reviewer's 7 on a TS-heavy plan is load-bearing; on a data-model-heavy plan it's a warning. High-weight below threshold blocks; low-weight produces warnings.
- **Convergence cost is a slicing signal.** A slice plan that won't converge is itself evidence the slice is too big or ambiguous — the loop reports cost back, and the right response is reshape (see §16), not more rounds.
- **Both missing and stale context** are flagged. A plan with context the implementer doesn't need is also failing. (Failure: context bloat.)
- **Reviewer calibration over time** — track score-vs-outcome correlation; uncorrelated reviewers get weights adjusted or contracts rewritten. (Failure: gamed/miscalibrated reviewers.)

The Refinement Loop is also where **R2 becomes enforceable**: plan-stage reviewers explicitly check that each chunk's verification method is meaningful — tied to acceptance criteria, model-runnable, not cargo-culted. Pressure-test findings (both fixed and accepted) are passed in as context so reviewers don't re-raise concerns that were already deliberately accepted.

### 15. Discovery Checkpoints (R1) and Pre-flight

Inside an autonomy window, the LLM may pause for **exactly one reason**: a discovery so trade-off-changing that continuing would burn user time on a path the user wouldn't endorse. The question to ask yourself: **"If the user knew this, would they want to reconsider?"** If yes, pause. If the discovery only affects a local implementation choice with no ripple, keep going and note it for later. Err toward pausing when the decision is load-bearing and toward continuing when it is not — building for an hour on a wrong premise is far more expensive than a two-minute check-in.

**"Materially matters" is context-dependent.** Maturity is the multiplier: a trade-off shift that barely matters in an experimental subsystem absolutely matters in a foundational one. Foundational work triggers R1 by default on any trade-off shift.

**Examples of the judgment in action:**

- *Found that the chosen data structure makes the N+1 case expensive when the ledger grows past ~10k entries.* → **Block.** Performance cliff, affects an architectural assumption the target relied on, user will want to reconsider.
- *Found that an unrelated helper in the same file has a misleading variable name.* → **Note and continue.** Style concern, no downstream effect.
- *Found that the auth check runs after the database write, so failed auth still pollutes the DB.* → **Block.** Reliability/correctness, the kind of thing the user would want to redirect immediately.
- *Found that an error message is slightly vague.* → **Note and continue.** UX concern but minor, batch into the Discovery Ledger.

The pattern: block when the finding would change a decision that's already been made or affects something load-bearing; note-and-continue when the finding is local, stylistic, or batchable.

**When you do pause, make the block cheap.** State the original trade-off, what you found, two or three paths forward, and your recommended direction. The user has not been in the room with you; you have built up context they do not share. Reconstruct that context in the question itself: what you were doing, what you found, why it matters, and what you need from them. **A question that requires the user to guess what you were thinking is not a question — it is a puzzle.** A block the user can resolve in ten seconds is a good block; a block that requires a meeting is a planning failure.

R1 has specific structural ties:

- **In-scope blocking discoveries are the load-bearing case.** The "two or three paths forward" the block must present map directly to the five reshape options in §16.
- **Pressure-test findings can be R1 blocks themselves.** If the test reveals the target is materially shakier than the Shape draft assumed, Shape does not exit until the target is adjusted.
- **Refinement Loop contradictions** that synthesis can't resolve route through R1 rather than getting silently papered over.
- **R2 still applies** to anything R1-added work: any work added mid-epic must come with a model-runnable verification method, same as work planned at Slice time.

**Pre-flight checkpoint.** Before entering any autonomy window, the LLM produces a short, structured pre-flight statement and presents it to the user: *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. Here's what I think I know that matters: A, B, C. Anything to change before I start?"* This is the user's cheapest steering opportunity — correcting a misunderstanding at pre-flight costs seconds; correcting it mid-autonomy costs a block.

The hardest design discipline around pre-flight is that **if the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight.** When runtime questions keep arising, they are a signal that the pre-flight format is missing something, not that the LLM should "ask more carefully." The intervention system exists to spot questions that repeatedly surface at runtime and migrate them to pre-flight. Structured format over freeform: faster to scan, easier to measure, prevents the LLM from burying key decisions in prose. Freeform pre-flights rot into preambles.

### 16. Build Only What You Can Check (R2)

The model's ability to do good work autonomously depends entirely on its ability to tell whether the work is good. Without a feedback signal the model can run, iteration collapses into *"write something, hope it's right, stop"* — which is how mediocre work ships. Verifiability is not a ceremony; it is the thing that makes autonomous iteration possible at all.

When breaking work into chunks, ask of each one: *"If I finish this, how will I know I got it right?"* The answer must be something the model itself can run and interpret — a test, a typecheck, a script that compares output to expected, a query that confirms a state change. The answer must also be tied to the actual intent of the chunk, not an incidental property. **A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence.**

Watch for the specific failure of writing tests that pass while the live code is broken. A model that runs `vitest`, sees green, and calls it done has not verified the software — it has verified that its tests agree with its implementation, both of which the same model just wrote. Whenever possible, verification must include exercising the actual code paths and directly observing behavior: start the service and hit the endpoint, run the CLI with a real argument and inspect the output, load the page and watch what happens. Integration and unit tests remain valuable — they catch regressions and document intent — but they are not by themselves sufficient evidence that a goal has been achieved. **End with live observation.**

When intent cannot be checked by the model (*"the interface feels responsive," "the error message is clear," "the refactor didn't change external behavior in some subtle way"*), do not paper over with a shallow proxy. Surface it: reshape the chunk so it is checkable, design an approximate check and flag the approximation honestly, or schedule an explicit human verification step. Honesty about what cannot be verified is more valuable than fake green checks.

R2 threads through three phases. **Slice:** every chunk carries an explicit verification method. "Model runs test X, it passes" is ideal; "lint + typecheck + targeted unit test" is standard; "human eyeballs the UI" is legitimate but must be explicit and scheduled, converting that slice's Build window from pure autonomy into autonomy-with-a-required-review-interrupt. **Refinement Loop:** plan reviewers check that each chunk's declared verification is meaningful and not cargo-culted — a plan with shallow or missing verification fails the loop. **Build:** the autonomy window declares up front what verification it will run between iterations and what signal it treats as "done." If mid-window the model discovers its verification is insufficient (tests pass but the result is obviously wrong), that is itself an R1 trigger.

The CLI enforces R2 structurally: an invariant requires every chunk in every plan to carry a verification method, surfaced by the plan extractor. Plans missing verification fail at commit time, not at runtime.

### 17. Work Discovered Mid-Epic

Deferred work and blocking work are not unrelated concerns — they are two flavors of the same problem: **work discovered mid-epic.** They differ on two dimensions: blocking vs. non-blocking, and in-scope vs. out-of-scope. The current system treats them as separate features with separate capture paths; the unified flow routes each finding to the cheapest correct response.

|                   | **In scope**                                          | **Out of scope**                                              |
|---|---|---|
| **Blocking**      | Reshape current epic                                  | Stop epic; promote finding to its own epic; resume after      |
| **Non-blocking**  | Expand target, insert/adjust a future slice           | Defer: park as a finding in the Discovery Ledger              |

#### Discovery Ledger (non-blocking deferred work)

The current side-quest model has four failure modes: capture is too heavyweight at the moment of discovery, triage happens at the wrong time (when you have the least information), nothing culls stale findings, and surfacing is push-based rather than pull-based.

**The ledger fixes them:**

- **Uniform, cheap capture.** Five seconds. Every finding has a fixed small shape: *what I was doing, what I found, why it matters, why I'm not doing it now.* The last field separates a useful finding from a stale TODO. No size classification at capture.
- **Triage at milestones, not at capture.** Slice Land and Epic Land each have a short triage step: promote (to task / quest / epic candidate / spine annotation), merge duplicates, cull. Triage is cheap at milestones because post-slice/epic context is available. The step is mandatory but allowed to be empty-handed.
- **Facts promote into the Context Spine.** *"Module Y has a perf cliff at 10k records"* isn't work, it's a constraint; it lands in `architecture-current.md` tagged to the subsystem. A repeatedly-rediscovered pattern may promote into `conventions.md`. A newly-established property the code relies on may promote into `invariants.md` — rare and deliberate, not casual. (Failure mode: every finding becomes an annotation and the docs rot — antidote: spine promotion requires the finding to name a constraint that affects planning, not just a nuisance.)
- **Pull-based surfacing.** When a new epic enters Frame, the workflow surfaces findings tagged to the subsystems that epic will touch. They arrive when relevant, not when remembered.
- **Explicit decay.** Findings older than N epics without promotion or reference are surfaced for culling with a two-second prompt.

Findings are events in the epic's `events.jsonl`. Tagging is by subsystem ID, sharing the same vocabulary as learnings, decisions, and invariants.

#### Triggered Reshape (blocking in-epic work)

A slice that discovers necessary work cannot silently grow — that breaks reviewer frames of reference and causes epic drift. But forcing a full restart is absurd. Five explicit options, with the workflow making them visible and picking the cheapest one that is actually correct:

| Response | When to pick | Cost |
|---|---|---|
| **Expand current slice** | Discovery is small, directly on the slice's path, doesn't change its goal. | Low. Plan edited; reviewers re-run on the delta only. |
| **Insert a slice before this one** | Discovery is a prerequisite — distinct unit of work, blocks the current slice. | Medium. Current slice pauses; new slice runs through Plan/Build; current slice resumes against updated architecture. |
| **Insert a slice after this one** | Discovery is needed for the epic to land but does NOT block the current slice. | Medium. Current slice continues; target updated; sequencing adjusted. |
| **Reshape the epic** | Discovery invalidates `architecture-target.md` — the shape of what the epic is building has changed. | High. Return to Shape with accumulated context; re-draft target; re-slice affected portions. |
| **Stop and promote to its own epic** | Discovery is out of scope entirely. | Very high. Only correct when in-place options would cause more damage. |

**Three forcing functions keep this honest:**

1. **Any reshape must update `architecture-target.md` first.** You cannot edit slice plans in place without updating the target; reviewers review the target diff before the new slice plan. This prevents silent scope creep.
2. **R1 is the trigger.** A slice does not quietly grow scope. When it discovers work it cannot contain, it hits the R1 checkpoint, surfaces the finding with the five options and a recommendation, and the user picks. A 30-second decision in most cases.
3. **Reshapes inherit upstream invariants.** A reshape triggered by an invalidated pressure-test assumption must update the Pressure-Test Summary in the new target, not just the diff. A reshape triggered by Refinement Loop convergence failure must record that as the cause. The audit trail tells you *why* the reshape was necessary.

The "Reshape the epic" branch routes back into Shape with accumulated context — not a full restart. Reviewers should be more lenient on re-review because most of the epic is unchanged; only the delta matters (this composes with change-scoped re-review in the Refinement Loop).

**Failure modes.** *"Expand current slice" becomes the default* because it's cheapest — this is how epics silently drift. Antidote: reviewers explicitly check whether expand-in-place was right, and reshape decisions are recorded so drift is observable. *Reshape cascades* — cap reshapes per epic (say, 3); hitting the cap forces a Shape-level conversation about whether the epic is still coherent or should be split. *Cross-slice invalidation* — a reshape that adds or inserts a slice can invalidate downstream slices' assumptions; reshape must explicitly re-verify downstream plans against the updated target before Build resumes. *Invariant violation as discovery* — if a mid-epic discovery reveals that an existing invariant is being violated, or that a missing invariant would have prevented the problem, that is a **material finding by default** (foundational severity) and routes straight to R1; invariant changes are first-class epic concerns and cannot be patched silently.

### 18. Briefings as first-class artifacts

- **Briefings are first-class artifacts written eagerly at pause points.** Not reconstructed from events at return time — the LLM writes the briefing when context is freshest.
- **Types:** session-boundary briefings (end of user session), blocking briefings (R1 checkpoint fires), checkpoint briefings (during long autonomous runs at well-defined internal boundaries).
- **Each briefing includes:** time context (session duration, time since last user interaction), where we stopped and why, what just happened (narrative), what's next (intended next step with uncertainty), what needs a decision, what might have been missed, deep links to relevant artifacts.
- **Same mechanism serves humans returning after days/weeks AND fresh Claude sessions** that have no conversation memory. Every session start is a return experience.
- **The next-action menu is always produced at pause time** — the LLM must articulate its uncertainty while still in context, not leave vague "figure out where we are" for next time.

Briefings live at `.goodplan/briefings/` (project-level) and `epics/<slug>/briefings/` (epic-level), named `<date>_briefing_<suffix>.md`. The CLI extracts time context, deep links, and the next-action menu so they're queryable independent of prose.

---

## Part III — Phases

Stripped of tooling, the journey from "idea" to "shipped" is short: spark an idea, sharpen it, survey the landscape, shape an approach, slice the work, build each slice, land it, repeat. Eight verbs. Everything in Part II is scaffolding to make those verbs reliable when an LLM is doing the labor.

Two tensions shape the phase design:

- **User steering vs. LLM autonomy.** The user is the only one who knows what they actually want; the LLM is the only one with the patience to do the labor. The interface between them is *steering moments*. A steering moment is cheap when the user is paying attention and expensive when they have stepped away. So the user picks when to be present, and the system honors that contract: never block mid-window for what could have been asked at the start, always block at window boundaries so re-entry is cheap, and surface mid-window discoveries that *change the deal* — only those — without forcing a stop.
- **Up-front definition vs. mid-flight reality.** Plans drafted at the start are wrong in ways that only become visible during the work. The flow has to absorb that reality without either pretending it didn't happen (silent scope creep) or treating every surprise as a restart.

### 19. Phase summary

| Phase | Mode | Artifact | Mechanisms |
|---|---|---|---|
| **Spark** | Conversation | Goal blurb | — |
| **Sharpen** | Conversation | Sharpened goal, acceptance, non-goals, risks | — |
| **Survey** | Autonomy (soft interrupts) | Research notes, approach menu | R1, Pre-flight |
| **Shape** | Review | `architecture-target.md` (diff), `pressure-test.md`, named maturity transitions | Spine, Pressure Test, Refinement Loop (target), R1 |
| **Slice** | Review | Ordered slice list with per-slice verification and maturity refs | Refinement Loop (slice defs), R2, Maturity |
| **Build** | Autonomy (soft interrupts) | Slice plan + code + review trail | Refinement Loop (plan), R1, R2, Discovery Ledger capture |
| **Slice Land** | Review | Spine promotion, ledger triage, learnings, recap + follow-up triage | Spine (promotion), Work Discovered Mid-Epic |
| **Repeat** | Conversation | Next slice or close | — |
| **Epic Land** | Review | Reconciliation, maturity finalization, drift audit, full ledger triage | Spine, Maturity, Work Discovered Mid-Epic |

```
[Spark] → [Sharpen] →
   [Survey] ----autonomy---- (soft interrupts)
[Shape] → [Slice] →
   For each slice:
      [Build] ----autonomy---- (soft interrupts)
      [Slice Land]
[Repeat / Epic Land]
```

The crucial pattern: **Sharpen, Shape, Slice, Slice Land, and Epic Land are user steering points. Survey and Build are autonomy windows.** Spark and Repeat are short transitions. Two autonomy windows total — both bounded, both resumable, both ending at a natural review boundary.

### 20. Steering modes and the autonomy contract

Four modes, chained explicitly. The user always knows which one they're in.

| Mode | Feel | Where |
|---|---|---|
| **Conversation** | Back-and-forth, user fully present | Spark, Sharpen, Repeat |
| **Review** | User looks at a finished thing, says yes/no/tweak | Shape, Slice, Slice Land, Epic Land |
| **Soft interrupt** | Async ping during a window: "you should know about this" | R1 inside Survey, Build |
| **Background** | User is gone; system runs to a safe boundary | Survey, Build |

Transitions obey five rules: (1) the system always knows what comes next; (2) conversational phases offer to advance automatically (*"ready to survey, want me to go?"* — one yes/no); (3) autonomy windows announce when they will return (*"I'll be working on Survey for the next few minutes; back when I have an architecture proposal or sooner if I hit something tradeoff-changing"*); (4) re-entry after compaction or stop is free (one "where am I?" call returns to the exact next steering moment); (5) phase boundaries are atomic (no halfway state).

**The contract: during autonomy windows, the LLM may pause for exactly one reason — an R1 blocking discovery.** Everything else waits for the boundary checkpoint.

**Autonomy windows have to be *worth* walking away from.** That means:

- **Long enough to matter.** Sub-five-minute windows don't earn the user the right to step away.
- **Bounded by clear deliverables.** *"I'll come back with an architecture proposal"* is a window. *"I'll work on it for a bit"* is not.
- **Resumable.** If interrupted (compaction, error, stop), they resume from the same point on next entry.
- **Self-correcting within scope.** Inside, the LLM iterates with reviewers without asking the user. Stagnation, regression, and oscillation detection are mechanical.
- **Anchored to a model-runnable verification signal** (R2). No verification signal → no true autonomy window.
- **Honest about budgets.** Windows declare a circuit-breaker cap (*"I'll stop and ask if I exceed M rounds"*) — a cap, not a target. The user can extend on return, not mid-flight.

### 21. Phase mechanics

**Spark — conversation.** "I want X." Vague, possibly wrong about what X really is. Produces a goal blurb the user signs off on. CLI emits a `goal-drafted` event referencing the goal blob; an invariant requires a non-empty goal before any later phase can run.

**Sharpen — conversation.** Talk it through until the user can answer "what could go wrong" without hedging. Acceptance criteria, non-goals, and risks surface. The user is fully present. Acceptance criteria are extracted from the goal at commit time and become the substrate against which R2 verification methods are checked.

**Survey — autonomy window.** Research the world this idea has to fit into: existing code, prior decisions, libraries, tradeoffs others have already chewed on. Begins by reading the **Context Spine** (architecture, conventions, invariants, and any other standing grounding docs) to seed context. Pull-based ledger surfacing pulls findings tagged to subsystems likely to be touched. Ends with a short menu of approaches and a checkpoint briefing. Soft interrupts allowed (R1).

**Shape — review.** Pick the load-bearing approach. This phase has the most internal structure of any in the flow:

1. Draft `architecture-target.md` as a *diff* from the current spine — primarily architecture, but may also propose deliberate changes to conventions or invariants (rare, significant — first-class epic concerns).
2. Run the **Pressure Test** — five adversarial questions, in adversarial mode, looking for problems the design *invites* and errors a different design could have made impossible. Result: `pressure-test.md`.
3. Adjust the target to address findings. Accept the rest with explicit justification — accept-with-justification is a first-class outcome and promotes into the spine as a known constraint.
4. Run the **Refinement Loop** on the adjusted target.
5. Name any **maturity transitions** the epic will drive.

Shape exits when the user has explicitly accepted each load-bearing choice, the target shape, and the pressure-test summary. If the Pressure Test reveals the target is materially shakier than the draft assumed, that is a blocking discovery — Shape does not exit until the target is adjusted.

**Slice — review.** Cut the work into chunks small enough that each can be built, reviewed, and verified as a unit. Order them so risky pieces happen early and intermediate states are coherent. Every slice carries an **explicit verification method** (R2) and a reference to the **maturity** of the subsystems it touches. Slice metadata declares `depends_on: [slice_ids]` and `affected_subsystems: [subsystem_ids]` — extracted at commit time and used for parallel-slice gating, dependency invariants, and reviewer routing. The slice definitions themselves go through a short Refinement Loop checking sequencing, scope, and verifiability. Exit when each slice ends in an honest, describable intermediate state and the user has approved the cut.

**Build — autonomy window with soft interrupts.** Per slice: nail down what specifically gets touched, build it, check it, fix it. The slice plan is produced by the per-slice Refinement Loop. The plan references `architecture-target.md` as a constraint. Inside the window, the LLM iterates against a verification signal it can run itself (R2); the only legal reason to pause is an R1 blocking discovery. Findings discovered along the way are captured into the Discovery Ledger as events with the five-second shape; capture is cheap, triage waits.

**Slice Land — review.** Four mandatory substeps the workflow refuses to skip:

1. **Promote the Context Spine** to reflect the honest post-slice reality — `architecture-current.md` most commonly, but also `conventions.md`, `invariants.md`, or any other grounding doc the slice changed. Mid-state work is described honestly (mid-rename is mid-rename — no pretending). The honest-intermediate-state rule applies to all spine docs.
2. **Triage the Discovery Ledger** — promote, merge, or cull findings captured during the slice. Promotion targets include spine additions, tasks, quests, and epic candidates. Allowed to be empty-handed; not allowed to be skipped.
3. **Capture learnings** — what was learned during Build that future slices or epics should know. Learnings are distinct from Ledger findings: a finding is *"this thing exists and we should act on it"*; a learning is *"we now know X about the system/problem/approach."*
4. **Review with the user** — recap, surface any `architecture-target.md` edits discovered during the slice, triage proposed follow-ups (do now / queue / drop).

The CLI enforces all four via a `slice-landed` event whose invariants require linked spine-promotion events, a triage event (possibly empty), at least one learnings event (possibly empty), and a user-acknowledgment event.

**Repeat — conversation.** Next slice picked or epic closed.

**Epic Land — review.** Final reconciliation of the Context Spine against `architecture-target.md` (modulo discovered target edits). Maturity transitions finalized. Silent-drift audit. Discovery Ledger triaged across the whole epic. Pressure-test summary is checked against reality: did the accepted findings remain acceptable, or did one bite us and need to be promoted to a constraint? LLM-proposed invariants surfaced for approval.

### 22. Context discipline

For each phase, the LLM gets *exactly* the context required for that phase, no more, no less. The CLI is responsible for the bundling — skills request a bundle by phase and entity, and the CLI computes it.

| Phase | Context | Size |
|---|---|---|
| **Conversational** (Sharpen, Shape, Slice, Slice Land) | User is present and can answer questions. Context is whatever is needed to ask good questions: prior decisions in scope, recent learnings, the current goal. | ~5–10KB |
| **Survey window** | Goal, conventions, prior research on adjacent topics, the architecture as it stands. NOT source code. | ~10–20KB |
| **Build window** | The plan, the slice's blast-radius source files (computed by import graph), architecture for touched subsystems only, learnings filtered by subsystem and pattern, decisions filtered by domain. NOT untouched subsystems. NOT distant learnings. | ~15–30KB |
| **Slice Land** | The plan, the diff, the architecture for touched subsystems, prior learnings to dedupe against. | ~10–20KB |

The rule: **context is a function of phase × scope × diff**, not phase × scope. The diff (or planned diff) tells you what's actually relevant. A two-pass system — structural filter then optional relevance scoring — is the right shape, but the structural filter does most of the work if it has a real import graph. The system also owes the user *visibility into what was excluded and why*: when a Build agent struggles, the user should be able to ask "what did you not show it?" and get a real answer.

### 23. The shape of "done"

A slice is done when: acceptance criteria met, reviewer agrees, lint/build/test pass, Slice Land has promoted the Context Spine, triaged the ledger, captured learnings, and the user has acknowledged the recap and triaged follow-ups.

An epic is done when: all slices done or explicitly dropped, cross-slice learnings rolled up, architecture reconciled with reality, maturity transitions finalized, ledger drained, and the user has acknowledged the closing recap.

Nothing is "done" without explicit user acknowledgment. Acknowledgment is cheap — one keystroke — but it's the contract that the user actually saw the result. The CLI represents acknowledgment as an explicit `user-acknowledged` event referencing what was acknowledged; precedence invariants block `slice-completed` and `epic-completed` until that event exists.

---

## Part IV — How the mechanisms compose

The mechanisms are not independent features. They share a backbone:

- **The Context Spine is the substrate.** Every other mechanism reads from it or writes to it. Pressure Test promotes accepted findings into it; Discovery Ledger promotes facts into it; Slice Land updates it; Maturity tags live on it; Refinement Loop reviewers consult the full spine (architecture, conventions, invariants) for context.
- **Maturity is the universal rigor dial.** It calibrates Pressure Test depth, Refinement Loop strictness, R1 sensitivity, and Triggered Reshape thresholds. One concept, four uses.
- **R1 is the universal "should we stop?" rule** during autonomy. Pressure-test failures, Refinement Loop unresolvable contradictions, mid-build trade-off shifts, and convergence failures all route through R1 to the user with the same shape: state the context, name the options, recommend.
- **R2 is the universal "is this verifiable?" rule** for any chunk. It is enforced by Slice (declaration), Refinement Loop (plan review), and Build (window contract), and structurally by a CLI invariant on plan extraction.
- **The Refinement Loop is how artifacts become trustworthy enough to act on.** It runs at every artifact boundary. Its convergence cost is itself a signal that feeds back into Triggered Reshape.
- **Events + invariants are the substrate that makes the rest enforceable.** Without them, the mechanisms above are aspirations the LLM can quietly skip. With them, every promotion, every triage, every verification declaration, every acknowledgment is a fact the system can check.

Each mechanism can be described in isolation, but in practice they fire together. A pressure-test finding may become an R1 block, become a target adjustment, become a Context Spine annotation, and inform the next Refinement Loop's reviewers — all within Shape. A mid-build discovery may become an R1 pause, become a Triggered Reshape, become a target diff, become a re-run of the slice Refinement Loop, become an updated `architecture-current.md` at Slice Land — and every one of those steps is an event, validated by an invariant, queryable later. The value is not in any single mechanism but in their interlocking.

---

## Part V — Scope of the next document

The follow-on **ideal implementation** doc should cover:

- Event schemas (by type)
- The canonical invariant set (starting ~20)
- Skill set and phase ownership
- CLI command surface
- Agent types (phase, reviewer, editor) and their contracts
- Context bundle shape per phase
- Key command flows for major workflows (create-epic, plan-slice, implement, land, complete-epic, side-quest lifecycle)
- Extractor specs for each artifact type
- Directory layout (this doc has the overview; the implementation doc can expand)

It should NOT cover:

- Migration strategy from the current implementation (the delta step, separate)
- Implementation details below the skill/CLI interface
- Performance optimization (deferred until profiling shows a need)
- Backward compatibility with the current state format

## Open design questions

1. **Pre-flight checkpoint format** — structured form (*"I will do X, returning Y, blocking on Z"*) or freeform paragraph? Structured probably wins for telemetry.
2. **Discovery severity** — binary (interrupt now / queue) or graded? Binary is cleaner but loses nuance.
3. **Snapshot model vs. state machine** — adopting snapshots is a *significant* change. Worth it, but big. Could be retrofitted as "the event log plus a snapshot index."
4. **Auto-advance between conversational phases** — yes by default, with an opt-out? Or always ask?
5. **Telemetry as first-class vs. optional** — the intervention system needs telemetry to migrate runtime questions to pre-flight. If telemetry is optional, the loop never closes.
