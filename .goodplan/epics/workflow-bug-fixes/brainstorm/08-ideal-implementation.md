# Ideal Implementation

The implementation spec for the workflow-bug-fixes epic. Code drafted from this doc should be able to start writing TypeScript against citty, Zod v4, and an append-only JSONL event log without guessing the shapes of events, commands, reviewers, extractors, or skills. This is not the migration plan and it is not the code; it is the target the code is written *to*.

> **Trust is earned through evidence, not asserted through production.**
>
> *LLM output is a claim; evidence is what makes the claim true.*

The entire design is a consequence of two non-negotiable constraints:

1. **Refinement before handoff.** Any substantive LLM-produced artifact is untrusted until multiple specialized sub-agents have reviewed it across multiple rounds, producing structured scores against a defined rubric, converging on a mechanical bar that signals it is ready to hand off. No handoff happens until the bar is met.
2. **Execution verification before done.** When an LLM implements code, the work is not "done" until the LLM has directly executed the code in a live environment, observed the actual result, and verified that the observation matches a pre-specified expectation. Tests alone are not sufficient. When verification is impossible, that fact is surfaced to the user as a real decision.

Tests are a useful tool but not sufficient on their own. The failure mode to watch for: *"A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence."* Live execution with observation matching expectation is the evidence that makes the claim true. **End with live observation.**

Both constraints are the same rule applied to different media: for prose-shaped artifacts, evidence is reviewer scores against a rubric; for executable code, evidence is live observation matching expectation. For things that are both (a plan containing executable chunks), both kinds of evidence apply.

### Scope boundary

| In | Out |
|---|---|
| Event schemas at field level | Migration plan from current repo state |
| CLI command tree, flags, I/O shapes, emitted events | Concrete TypeScript source |
| Invariant set (core + extensible model) | Bootstrap timeline and sequencing of work |
| Initial reviewer registry with rubric sketches | Full reviewer prompts (sketched only) |
| Extractor specs per artifact type | Full prose of rubric dimension weightings |
| Skill set, phase ownership, agent contracts | Per-file file paths inside `src/` |
| Context bundle shape per phase | Performance tuning and caching implementation |
| Worked examples of end-to-end flows | UI/TUI surface beyond `--json` |

The code drafter is authorized to decide: concrete module layout, test harness wiring, helper function decomposition, TypeScript type-level encoding of event discriminants, internal representation of derived state. The code drafter must come back to the user for: deviations from the invariant list, new event types, changes to the two non-negotiable constraints, changes to the phase set.

---

## 2. Foundational decisions

Stated once here; the rest of the document assumes them.

| Decision | Consequence |
|---|---|
| Events + invariants + derived state, not a state machine | No status enums on entities; status is a query over the event log. `core/state/transitions/*.ts` is retired. |
| CLI owns the invariant engine, schema validator, routing function, convergence evaluator, rigor dial, extractors, query surface | LLMs never decide "done"; they request transitions and the CLI refuses if evidence is missing. |
| Skills are orchestrators that emit events and read derived state | Skills call CLI commands; they never touch files under `.goodplan/` directly. |
| JSONL event log per scope | `.goodplan/events.jsonl` (project) · `.goodplan/epics/<dir>/events.jsonl` (epic) · `.goodplan/side-quests/<dir>/events.jsonl` (side quest). Append-only. One event per line. |
| Content-addressed via git's internal object store | Artifact bodies are written as loose git blobs (`git hash-object -w`); events reference them by 40-char blob SHA. No separate `blobs/` directory. |
| SQLite caching deferred | Derived state is computed per-CLI-invocation by streaming the relevant JSONL file. Optimize only when profiling shows need. |
| Commit at milestones, not per event | The event log accumulates uncommitted lines; `gp milestone:commit` (called by phase-completing commands) stages and commits a meaningful group. |
| Pre-tool-use hooks for integrity; HMAC dropped | `.goodplan/**/*.jsonl` and spine files are blocked from direct Edit/Write by Claude Code hooks. The CLI is the only legitimate writer. `core/data/hmac.ts` and `gp verify --fix` retire. |
| Flat directory structure | `.goodplan/epics/` and `.goodplan/side-quests/` at root. The `workspace/` concept is gone. |
| Naming: `<YYYY-MM-DD>_<slug>/` for epic and side-quest directories | Date prefix for human-friendly chronological sorting; slug for readability. No random suffix — collision risk eliminated by one-person-per-epic model. |
| Slugs for entity IDs; UUIDs for event IDs | Slugs are human-readable and unique within scope. Event IDs are UUIDs — globally unique across branches to prevent merge conflicts when multiple branches append to the same JSONL files. Timestamps provide ordering; UUIDs provide identity. |
| `architecture-current.md` at `.goodplan/` root; `architecture-target.md` inside each active epic directory | The spine always reflects what the codebase *is*; the epic holds what it is becoming. |
| Hook-protected integrity files; LLM-writable artifact content | `events.jsonl` (any scope), `architecture-current.md`, `conventions.md`, `invariants.md` are CLI-only (hook-blocked from direct LLM writes). Artifact content files (plans, goals, research, brainstorm docs) under `.goodplan/` are LLM-writable — the CLI references them via events. |
| Single branch, single active epic, single active side-quest | `≤1 active epic per branch`, `≤1 active side-quest per branch`, parallel slices within an epic gated by declared dependencies, same slice on two branches forbidden. |
| PR Option 1 | Epic branches stay alive until the epic is complete, then merge to `main`. Multi-person collab happens on the epic branch. |

**Maturity taxonomy (4 levels).** Each subsystem carries a maturity tag that acts as the universal rigor dial.

| Level | Meaning | Rigor | LLM behavior |
|---|---|---|---|
| **Experimental** | Recently introduced. Unstable API. Few or no dependents. | minimum | Change freely. Don't over-engineer. Tests check the experiment, not churn. |
| **Stabilizing** | Some dependents. API in flux but not wildly. | standard | Be deliberate. Write tests. Don't break known callers silently. |
| **Stable** | API fixed. Multiple dependents. | standard | Default rigor. Breaking changes need justification. |
| **Foundational** | Load-bearing primitive, many dependents. | full | Change carefully and rarely. Explicit user sign-off for breaking changes. R1 sensitivity multiplier. |

`stabilizing` and `stable` share the same review rigor (`standard`); the distinction is API stability expectations and breaking-change sensitivity. Maturity calibrates Pressure Test depth, Refinement Loop strictness, R1 sensitivity, and Triggered Reshape thresholds — one concept, four uses. Each subsystem also carries a `dependentCount` as a falsifiability check: "experimental" with twelve dependents is lying.

**Multi-person model: one person per epic, merge at completion.** Each epic is worked on by one person on a dedicated branch off `main`. `main` has no active epic (invariant). Multiple people work on different epics simultaneously on different branches. When an epic completes, its branch merges to `main` via PR.

Merge conflicts — both in code and in `.goodplan/` state — are resolved at merge time, the same as today. When person A merges their epic and updates `architecture-current.md`, person B's branch becomes stale; they rebase, and the architecture changes flow in. Slice-land's incremental updates to `architecture-current.md` make these rebases predictable: each change is small, well-documented, and tied to a specific slice.

Multiple people should NOT work on the same epic simultaneously. The event log and artifact model are not designed for concurrent writers on the same scope.

**Determinism vs. judgment.** Gating is deterministic — invariants check, rubrics score, convergence is mechanical. But the CONTENT that reviewers and agents produce — findings, reshape proposals, scope judgments, verification-plausibility assessments — is irreducibly judgment-laden by design. The mental models throughout this doc (the R1 question, the honest-intermediate-state rule, the tests-manufacture-confidence warning) exist precisely because checklists fail at these boundaries. The model is trusted to exercise judgment; the workflow provides scaffolding — context, prompts, blocking options — rather than rules.

**Collaboration model: collaborative design, autonomous execution.** The workflow has two fundamentally different modes of user involvement:

**Collaborative phases** require the user present. The LLM and user work together in real-time — the user's domain knowledge, intuitions, and preferences are essential inputs the LLM cannot substitute. These phases are conversational, back-and-forth, and use design-tree interviewing to explore the space. Collaborative phases cannot use the steering preference system; they always require the user. If the user is away, collaborative phases wait.

**Autonomous-with-checkpoint phases** proceed independently. The LLM does mechanical work (refinement, implementation, verification, code review) and pauses at defined checkpoints for user input. Checkpoints respect the epic-level steering preference (always-consult / best-guess-and-flag / ask-in-the-moment). If the user is away and the preference allows, the LLM proceeds with best-guess and flags for return review.

The overall shape is front-loaded collaboration, back-loaded autonomy — mirroring how real software development works: design is collaborative (whiteboard, discussion), execution is heads-down (individual work). The trust handoff between collaborative and autonomous phases is the shape checkpoint — the moment where collaborative intent gets locked into an artifact that autonomous processes can refine without losing the user's direction. This is why "artifacts are context transport" is load-bearing: it is the mechanism that lets the user step away during implementation without the LLM losing their intent.

**Every major artifact has a lifecycle:** collaborative design (or autonomous draft) → shape checkpoint → autonomous refinement → optional post-refinement review → committed. The shape checkpoint is the trust handoff — the moment where collaborative intent gets locked into an artifact that autonomous processes can refine without losing the user's direction.

| Phase | Mode | Why |
|---|---|---|
| **Explore** (P2) | **Collaborative** | User's domain knowledge seeds brainstorming; research → brainstorm cycles are conversational; the LLM alone under-explores the space |
| **Architecture design** (P3) | **Collaborative** | User shapes subsystem boundaries, API decisions, communication patterns, invariants |
| Architecture shape checkpoint | Checkpoint (new) | User reviews architecture before autonomous refinement |
| Architecture refinement (P4) | Autonomous | Reviewers iterate mechanically |
| Post-refinement architecture review | Optional checkpoint (new) | User may want to see what refinement changed before committing |
| Slice definition (P5) | Autonomous | LLM proposes slices based on the refined architecture; user reviews at checkpoint |
| Slice shape checkpoint | Checkpoint (new) | User reviews slice definitions, adjusts scope/ordering before refinement |
| Slice refinement (P6 — future, if needed) | Autonomous | Reviewers iterate mechanically |
| **Plan drafting** (P7) | **Collaborative** | User and LLM build the plan skeleton together for each slice |
| Plan-shape checkpoint (P8) | Checkpoint (already designed) | User shapes the plan before autonomous refinement |
| Plan refinement (P9) | Autonomous | Reviewers iterate mechanically |
| Implementation (P10) | Autonomous | LLM codes and verifies per-chunk |
| Code refinement (P11) | Autonomous | Reviewers iterate mechanically |
| Slice Land (P12) | Mixed | Substeps 1–3 autonomous, substep 4 user review |
| Between-slice review | Optional checkpoint (new) | User may want to check implementation before the next slice |

**Key rule:** Collaborative phases (P2, P3, P7) cannot proceed without the user. Checkpoints respect the steering preference. Autonomous phases proceed independently.

---

## 3. Phases

The flow is enumerated here explicitly rather than inherited. Each phase has entry conditions (invariants that must be `true` before the phase can start), an owning skill, context bundle, agents spawned, events emitted, artifacts produced, a trust gate (refinement loop and/or execution verification that must complete), and an exit condition (invariants that must become `true` before the next phase can start).

### 3.1 Phase list

| # | Phase | Scope | Owning skill | Trust gate |
|---|---|---|---|---|
| P0 | Project-init | project | `gp:init` | none (bootstrap) |
| P1 | Epic-capture | epic | `gp:create-epic` | goal artifact refinement |
| P2 | Explore | epic | `gp:explore` | per-research-artifact light refinement |
| P3 | Shape: architecture | epic | `gp:create-epic` (continues) | `architecture-target` refinement |
| P4 | Shape: pressure-test | epic | `gp:create-epic` (continues) | pressure-test-report refinement (light) |
| P5 | Shape: slice set | epic | `gp:create-epic` (continues) | slice-set refinement |
| P6 | Epic-activate | epic | `gp:start-epic` | user approval of spine changes |
| P7 | Slice-plan-draft | slice | `gp:plan-slice` | — (produces plan, gate follows) |
| P8 | Slice-plan-shape-checkpoint | slice | `gp:plan-slice` | explicit user `shape-approved` event |
| P9 | Slice-plan-refine | slice | `gp:plan-slice` | plan artifact refinement (BLOCKING verification-plausibility reviewer) |
| P10 | Slice-implement (red-green-verify loop per chunk) | slice | `gp:implement-slice` | per-chunk `chunk-verified` or `chunk-unverifiable-decided` |
| P11 | Slice-code-refine | slice | `gp:implement-slice` | code refinement loop convergence |
| P12 | Slice-land (+ epic completion if final slice) | slice | `gp:land-slice` | spine deltas refined; discoveries triaged; if final slice: cross-slice synthesis, architecture reconciliation, maturity transitions |
| S0 | Side-quest-capture | side-quest | `gp:create-side-quest` | goal refined (light) |
| S1 | Side-quest-explore-plan | side-quest | `gp:create-side-quest` | plan refinement |
| S2 | Side-quest-implement | side-quest | `gp:implement-side-quest` | per-chunk verification |
| S3 | Side-quest-land | side-quest | `gp:land-side-quest` | light refinement |

The epic path is **P0 → P1 → P2 → P3 → P4 → P5 → P6 → (P7 → P8 → P9 → P10 → P11 → P12)***. The last P12 detects it is the final slice and triggers epic completion automatically — no separate P13. The side-quest path is **S0 → S1 → S2 → S3** and is concurrent with, but cannot interleave inside, a single slice's P7–P12 sequence on the same branch.

### 3.2 Per-phase detail

For each phase: what must be true to enter, what the owning skill loads, what it spawns, what it emits, what it writes, what gate closes before exit, what must be true to exit.

#### P0 — Project-init

- **Entry:** directory is a git repo; no `.goodplan/` exists, OR `.goodplan/` exists but has no `events.jsonl`.
- **Skill:** `gp:init`. Auto-detects onboarding (existing codebase) vs. fresh.
- **Context bundle:** repo root path; detected tech stack (package.json, pyproject.toml, etc.); existing docs under `docs/`, `README.md`.
- **Agents spawned:** `onboard-phase` (for existing codebase), single-shot.
- **Events emitted:** `project-initialized`, `architecture-committed` (first version, minimal), `conventions-committed`, `subsystem-registered` (one per detected subsystem, maturity=`experimental`).
- **Artifacts:** `.goodplan/architecture-current.md`, `.goodplan/conventions.md`, `.goodplan/invariants.md` (empty but present), `.goodplan/subsystems/<slug>.md`, `.goodplan/events.jsonl`.
- **Trust gate:** onboard produces draft spine, user reviews interactively, then commits. No refinement loop at init (chicken-and-egg — reviewer registry not yet trusted on a fresh repo).
- **Exit:** `project-initialized` event present; `architecture-current.md` exists.

#### P1 — Epic-capture

- **Entry:** `project-initialized` event present; no active epic on current branch (invariant `epic.single-active-per-branch`).
- **Skill:** `gp:create-epic`.
- **Context bundle:** architecture-current (inline), conventions (inline), subsystems with maturity (inline), active decisions (inline up to ~20), recent learnings filtered by subsystem tags (references), last N briefings (references).
- **Agents spawned:** none at capture (user-interactive); design-tree interview driven by the skill.
- **Events emitted:** `epic-created { slug, dir, date }`, `epic-goal-drafted`, `epic-steering-preference-set { value: always-consult | best-guess-and-flag | ask-in-the-moment }`, `epic-goal-committed` (after refinement converges).
- **Artifacts:** `.goodplan/epics/<dir>/goal.md`, `.goodplan/epics/<dir>/events.jsonl`.
- **Trust gate:** goal artifact refinement, **light** rigor (holistic + context-transport + goal-reviewer).
- **Exit:** `epic-goal-committed` event present; `epic-steering-preference-set` event present.

**Design tree interviewing carries a specific bias.** The tree the LLM generates is inherently limited — it includes the branches the LLM can think of, and misses ones it can't. The LLM acknowledges this explicitly to the user when introducing the tree: *"Here's the design tree as I see it. Are there branches or alternatives I missed? This is your chance to add them before we explore."* The user becomes a co-author of the tree, not just a navigator of it.

**Not every design space is tree-shaped.** Some are graphs (branches interconnect), matrices (orthogonal dimensions), or flat (many parallel choices with no hierarchy). When the LLM recognizes the space isn't naturally tree-shaped, it says so and uses an appropriate alternative structure — a matrix for orthogonal dimensions, a diagram for interconnected branches, a list for flat parallel choices. The underlying principle is "systematic exploration of the design space"; the structure should match the space, not force it into a tree.

#### P2 — Explore (collaborative)

- **Mode:** **Collaborative.** The brainstorming portions require the user present; the LLM cannot brainstorm alone because it lacks the user's domain knowledge and intuitions. Research portions are autonomous.
- **Entry:** `epic-goal-committed` present; user triggered exploration OR skill decides exploration is needed.
- **Skill:** `gp:explore`.
- **Context bundle:** epic goal (inline), architecture-current (inline), conventions (reference), prior research in this epic (references), design-tree state (if prior).
- **Agents spawned:** `explore-phase` (one per cycle, iterative, returns PARTIAL).
- **Events emitted:** `exploration-cycle-started`, `research-captured`, `brainstorm-captured`, `prototype-captured`, `exploration-cycle-completed`, `exploration-concluded`.
- **Artifacts:** `.goodplan/epics/<dir>/research/<date>_<slug>_<suffix>.md`, `.goodplan/epics/<dir>/brainstorm/<date>_<slug>_<suffix>.md`, `.goodplan/epics/<dir>/prototypes/<slug>/`.
- **Trust gate:** each artifact goes through light refinement (holistic + context-transport only). Prototypes are not refined — they are evidence for brainstorms.
- **Exit:** user signals exploration-done OR skill detects design-tree "no open high-value branches."

**Exploration is a research/brainstorm cycle, not a single pass.** The pattern:

1. **Research** (autonomous): LLM explores topics it identifies as needing investigation. Writes research files. The user need not be present.
2. **Brainstorm** (collaborative): LLM and user discuss what the research revealed. User brings domain knowledge, intuitions, preferences. Design-tree interviewing structures the conversation. New questions, ideas, and research topics emerge from the dialogue.
3. **Assess** (collaborative): LLM and user decide together — more research needed? More brainstorming? Or ready to move to architecture?
4. **Loop** back to (1) if research, (2) if brainstorming, or exit to P3 if both LLM and user feel the problem and solution space is well-explored.

The cycle alternates between autonomous research and collaborative brainstorming. If the user is away during a brainstorm cycle, the skill waits — it does not attempt to brainstorm alone.

#### P3 — Shape: architecture (collaborative)

- **Mode:** **Collaborative.** The user and LLM design the architecture together — subsystem boundaries, API decisions, communication patterns, invariants. The LLM uses design-tree interviewing. The user shapes the design based on their knowledge of the system and their preferences.
- **Entry:** `epic-goal-committed`; exploration artifacts available.
- **Skill:** `gp:create-epic` (resumes for shape sub-phase).
- **Context bundle:** epic goal, architecture-current, affected subsystems (inline full contents), exploration outputs (inline tightly budgeted), pressure-test history for affected subsystems.
- **Agents spawned:** `architecture-phase` (drafts `architecture-target.md` collaboratively with user), reviewer set at full rigor (after shape checkpoint).
- **Events emitted:** `architecture-target-drafted`, `architecture-shape-checkpoint-reached`, `architecture-shape-approved` OR `architecture-shape-checkpoint-auto-shaped`, `reviewer-scored` (multiple), `refinement-round-*`, `architecture-target-committed`.
- **Artifacts:** `.goodplan/epics/<dir>/architecture-target.md`.
- **Trust gate:** architecture artifact refinement, **rigor = max(maturity of affected subsystems)**. Always-on reviewers + subsystem-specific reviewers + `reviewer-software-architecture` + `reviewer-invariant-checker`.
- **Exit:** `artifact-converged { artifact: architecture-target }`.

**Architecture-shape checkpoint.** After collaborative design, before autonomous refinement begins. The same pattern as the plan-shape checkpoint:

- Present the architecture draft to the user for review.
- Allow the user to ask questions, suggest changes, reshape subsystem boundaries.
- Only proceed to P4 (autonomous pressure-test and refinement) when the user explicitly signals readiness.
- Since P3 is collaborative, the user is already present — the checkpoint is the transition from collaborative to autonomous.

**Optional post-refinement architecture review.** Between P4 and P5, the user may want to see what the reviewers changed before the architecture is committed and slicing begins. This is optional, controlled by steering preference. In `always-consult` mode, the workflow pauses here. In `best-guess-and-flag` mode, the workflow proceeds and flags in the return briefing.

#### P4 — Shape: pressure-test

- **Entry:** `architecture-target-committed`.
- **Skill:** `gp:create-epic` (resumes).
- **Context bundle:** `architecture-target.md` (inline), `architecture-current.md` (inline), invariants (inline), conventions (inline), subsystem files for all affected subsystems (inline).
- **Agents spawned:** `pressure-test-phase` (a single adversarial agent with a different prompt posture: *find errors a different design could have made impossible*).
- **Events emitted:** `pressure-test-drafted`, `pressure-test-finding-proposed` (n), `reviewer-scored`, `pressure-test-committed`, `pressure-test-finding-accepted { disposition: addressed | accepted-with-justification }`.
- **Artifacts:** `.goodplan/epics/<dir>/pressure-test.md`.
- **Trust gate:** light refinement on the pressure-test report (holistic + context-transport); the report's *purpose* is to find problems, not be perfect. Accepted-with-justification findings are promoted into the spine as tagged constraints so downstream reviewers don't re-raise them.
- **Exit:** `pressure-test-committed` AND every finding has a `pressure-test-finding-accepted` event.

**"Errors made impossible" is verbatim, load-bearing, non-negotiable** in the pressure-test prompt.

#### P5 — Shape: slice set (autonomous with checkpoint)

- **Mode:** **Autonomous with checkpoint.** The LLM proposes slices based on the refined architecture; the user reviews and adjusts at a checkpoint rather than co-creating. Once the architecture exists, the LLM usually has enough information to propose a good set of slices.
- **Entry:** `pressure-test-committed`.
- **Skill:** `gp:create-epic` (resumes).
- **Context bundle:** architecture-target, pressure-test report, affected subsystems with maturity, epic goal.
- **Agents spawned:** `slices-phase`, reviewer set including the slicing reviewer whose contract is **"why didn't you apply this technique?"** not "did you apply it?"
- **Events emitted:** `slice-set-drafted`, `slice-shape-checkpoint-reached`, `slice-shape-approved` OR `slice-shape-checkpoint-auto-shaped`, `reviewer-scored`, `slice-set-committed`, `slice-created` (one per slice).
- **Artifacts:** `.goodplan/epics/<dir>/slices/<n>_<slug>/goal.md` per slice; `.goodplan/epics/<dir>/slice-set.md` (the set as a unit).
- **Trust gate:** slice-set refinement. Slicing techniques (tracer bullet, observability early, known unknowns first) checked as heuristics; omissions need justification.
- **Exit:** `slice-set-committed` AND every slice has a `slice-created` event with a committed goal.

**Slice-shape checkpoint.** After the LLM drafts the slice set, before slice-set refinement begins:

- Present the proposed slice set to the user.
- Allow questions about scope, ordering, dependencies, tracer bullet choice, observability slice, known unknowns ordering.
- Allow the user to add, remove, or adjust slices.
- Only proceed to slice-set refinement when the user signals readiness.
- Respects the steering preference: in `always-consult` mode, waits; in `best-guess-and-flag` mode, auto-shapes and flags.

**These techniques are heuristics, not rules.** The slicing step weighs them against each other and against the epic's specific shape. Deviations are allowed and expected; reviewers ask about justification, not enforcement.

*"The techniques exist to de-risk epic execution. If applying a technique would produce nonsensical slices for this epic, the technique doesn't apply to this epic. The slicing step chooses its techniques based on the epic's actual risks, not on checklist compliance."*

**Examples of valid deviations:**

- *Tracer bullet*: a pure backend refactor has no frontend to thread through — deviation accepted.
- *Observability early*: an epic that touches already-well-instrumented code doesn't need a dedicated observability slice — deviation accepted.
- *Known unknowns first*: an epic with no known unknowns doesn't need a de-risking slice — deviation accepted.

**The three techniques can conflict.** Tracer bullet says "touch every layer lightly"; known unknowns first says "go deep on the scariest thing." These can't both be the first slice. The slicing step resolves the conflict based on the epic's specific risks and names which technique won and why.

**Reviewer contract for slicing**: the slice-set reviewer asks *"if you didn't tracer-bullet, why not?"* — not *"did you tracer-bullet?"* Reasonable justifications pass review; missing justifications or weak reasoning fail.

#### P6 — Epic-activate

- **Entry:** `slice-set-committed`.
- **Skill:** `gp:start-epic`.
- **Context bundle:** architecture-target, slice set, pressure-test findings, steering preference.
- **Agents spawned:** none (user-interactive review).
- **Events emitted:** `epic-activated`.
- **Trust gate:** user explicitly approves.
- **Exit:** `epic-activated` present; `epic.single-active-per-branch` now holds with this epic as the active one.

#### P7 — Slice-plan-draft (collaborative)

- **Mode:** **Collaborative.** The user and LLM build the plan skeleton together. The LLM brings the architecture context and the slice goal; the user brings their knowledge of how the code should work, what patterns to use, what pitfalls to avoid. This is a back-and-forth conversation, not the LLM producing a document alone.
- **Entry:** `epic-activated` AND target slice has `slice-created` but no `slice-plan-drafted`; slice dependencies (declared in its goal) are all `slice-landed`.
- **Skill:** `gp:plan-slice`.
- **Context bundle:** slice goal, architecture-target, affected-subsystem files, related decisions, related learnings by subsystem tag, recent findings, reviewer rubric for `plan/v1`.
- **Agents spawned:** `plan-phase` (interactive with user, not autonomous).
- **Events emitted:** `slice-plan-drafted`.
- **Artifacts:** `.goodplan/epics/<dir>/slices/<n>_<slug>/plan.md`.
- **Trust gate:** none yet (draft is the *input* to the next phase).
- **Exit:** `slice-plan-drafted`.

#### P8 — Slice-plan-shape-checkpoint

- **Entry:** `slice-plan-drafted`.
- **Skill:** `gp:plan-slice`.
- **Context bundle:** drafted plan, reviewer rubric (for producer-aware drafting), steering preference.
- **Agents spawned:** none (interactive between skill and user) UNLESS preference is `best-guess-and-flag`, in which case the skill auto-shapes and records a flag.
- **Events emitted:** `plan-shape-checkpoint-reached`, `plan-shape-revision-proposed` (n), `plan-shape-approved { artifact-id, user-confirmation }` OR `plan-shape-checkpoint-auto-shaped { guess-summary, reasoning }`.
- **Trust gate:** explicit user signal (`always-consult`, `ask-in-the-moment` when user responds) OR auto-shape-with-flag (`best-guess-and-flag`, `ask-in-the-moment` on timeout).
- **Exit:** `plan-shape-approved` OR `plan-shape-checkpoint-auto-shaped`.

**The invariant engine refuses refinement without one of these two events. Refinement never runs on an unshaped plan.**

#### P9 — Slice-plan-refine

- **Entry:** `plan-shape-approved` OR `plan-shape-checkpoint-auto-shaped`.
- **Skill:** `gp:plan-slice`.
- **Context bundle:** shaped plan, rubric, affected subsystems.
- **Agents spawned:** reviewers selected by the routing function — always-on trio (holistic, invariant, context-transport) + `reviewer-verification-plausibility` (BLOCKING) + `reviewer-plan` + subsystem-specific reviewers; `editor` agent for applying revisions; `synthesis` agent for multi-reviewer reconciliation.
- **Events emitted:** `refinement-round-started`, `reviewer-scored` (n per round), `refinement-synthesized`, `slice-plan-revised`, `refinement-converged` OR `refinement-circuit-breaker-tripped`, `slice-plan-committed` (on exit).
- **Trust gate:** convergence evaluator returns `CONVERGED` for `plan.md`.
- **Exit:** `slice-plan-committed`.

If convergence returns `STUCK`, the Pause Discipline fires. If any chunk is `impossible-with-reason`, the Unverifiable-Chunk Decision fires.

#### P10 — Slice-implement (red-green-verify loop per chunk)

**Red-green TDD is additive to live execution verification, not a substitute.** Each chunk's red test proves intent-alignment: by writing the test first and observing its failure, the agent proves the test actually checks for the intended behavior, eliminating one class of cargo-culted test. Live execution verification proves real-world behavior: running the code in a live environment and observing that the observation matches the expectation. Both are required. The red test answers "does this test test the right thing?" Live execution answers "does the code work in reality?" Constraint 2's language is stronger than red-green TDD, and it stays stronger — a passing test is not sufficient evidence on its own, regardless of whether it was written red-first.

- **Entry:** `slice-plan-committed` AND every chunk has a decidable verificationType (`live`, `supplementary-tests`, or `impossible-with-reason` with an accepted user decision).
- **Skill:** `gp:implement-slice`.
- **Context bundle:** committed plan, affected subsystem files, architecture-target, relevant learnings, red-test harness config.
- **Agents spawned:** `implement-phase` (per chunk), no reviewers during implementation (reviewers run in P11).
- **Events emitted:** `slice-implementation-started` (phase entry; precondition for any per-chunk work per `slice.single-active-per-branch`), then per chunk: `slice-implementation-chunk-started`, `chunk-red-test-written`, `chunk-red-test-failed` (evidence: run output), `chunk-green-achieved` (evidence: test output), `chunk-verified { chunk-id, method, expectation, observation, red-test-initial-failure, red-test-final-pass, matched: true, evidence-ref }` OR `chunk-unverifiable { chunk-id, reason, user-decision }`. On chunk failure with plan revision: `slice-plan-revision-proposed`, routing back to P9.
- **Trust gate:** every chunk has `chunk-verified { matched: true }` OR `chunk-unverifiable-decided { choice: accept-approximation OR awaiting-user-verification }`.
- **Exit:** invariant `chunk.all-decided` holds for the slice.

#### P11 — Slice-code-refine

- **Entry:** `chunk.all-decided` holds.
- **Skill:** `gp:implement-slice` (continues).
- **Context bundle:** full slice diff (against `main`), committed plan, subsystems touched.
- **Agents spawned:** reviewers from the code-quality set: `reviewer-performance`, `reviewer-reliability`, `reviewer-security`, `reviewer-domain-correctness`, `reviewer-test-meaningfulness`, `reviewer-code-style`, + subsystem-specific reviewers (e.g., `reviewer-typescript`, `reviewer-data-layer`, `reviewer-tui-cli`). `editor` and `synthesis` agents as in P9.
- **Events emitted:** `code-refinement-round-started`, `reviewer-scored`, `code-refinement-synthesized`, `slice-code-revised`, `code-refinement-converged`.
- **Trust gate:** convergence evaluator returns `CONVERGED` against `code/v1` rubric.
- **Exit:** `code-refinement-converged`.

**Slice cannot land** until every chunk has `chunk-verified { matched: true }` (or accepted alternative) **and** the slice's code has `code-refinement-converged`.

#### P12 — Slice-land

- **Entry:** `code-refinement-converged`.
- **Skill:** `gp:land-slice`.
- **Context bundle:** slice plan, diff, mid-flight findings for this slice, architecture-target, architecture-current, conventions, invariants.
- **Agents spawned:** `completion-slice` (triages discoveries, proposes spine updates, captures learnings, proposes side quests), optionally `reviewer-verification-spot-check` (samples N% of `chunk-verified` events and re-runs verification).
- **Events emitted:** `findings-triaged`, `architecture-delta-proposed`, `architecture-delta-committed`, `conventions-committed` (if updated), `invariants-committed` (if updated), `learning-captured`, `decision-recorded` (if any), `side-quest-proposed`, `slice-landed`, `milestone-committed`. If this is the final slice: additionally `epic-synthesis-committed`, `architecture-current-reconciled`, `epic-completed`.
- **Artifacts:** updates to `architecture-current.md` (honest intermediate state reflecting what the codebase *is* after this slice); updates to `conventions.md` (if new patterns emerged); updates to `invariants.md` (if new invariants discovered); learnings at `.goodplan/learnings/<date>_<slug>.md`.
- **Trust gate:** each spine delta is itself a small refined artifact (light rigor).
- **Exit:** `slice-landed` (or `epic-completed` if final slice).

**Spine rollup at slice-land.** Every slice-land updates the project spine to reflect the current state of the codebase. This is the incremental approach — rather than waiting until epic-land for a big reconciliation, each slice leaves the spine accurate for the next slice's planning:

1. **`architecture-current.md`** — updated to reflect what this slice built. Uses the honest-intermediate-state rule: mid-implementation is described as mid-implementation.
2. **`conventions.md`** — updated if this slice introduced or discovered new patterns worth codifying.
3. **`invariants.md`** — updated if this slice established new invariants or discovered that existing ones need revision.
4. **Learnings** — captured per slice, tagged by subsystem, so they surface in future context bundles.
5. **Findings triage** — deferred findings promoted, merged, or culled. Stale findings (older than N epics) surfaced for culling.

**Final-slice detection.** When the `completion-slice` agent runs, it checks: are all other slices in this epic `slice-landed` or `slice-abandoned`? If yes, this is the final slice and epic completion triggers automatically:

- **Cross-slice synthesis:** patterns across all slice learnings, recurring findings, surprising outcomes.
- **Architecture reconciliation:** verify `architecture-current.md` matches `architecture-target.md` (should be trivially close if slice-lands are doing their job). Flag any gaps.
- **Maturity transitions:** propose promotions for subsystems that matured during the epic. User confirms.
- **Side quest proposals:** scan deferred findings for side-quest candidates.
- **Emit:** `epic-synthesis-committed`, `architecture-current-reconciled`, `epic-completed`, `milestone-committed`.

This eliminates the need for a separate epic-land phase. The last slice-land does everything epic-land would have done, with the advantage that all context is still fresh.

**Between-slice review checkpoint (optional).** Between `slice-landed` and the next slice's P7 (plan drafting). The user can:

- Review the implementation that just landed.
- Check the updated `architecture-current.md` and other spine updates.
- Review findings from the Discovery Ledger triage.
- Adjust their approach for upcoming slices based on what they learned from this one.
- Decide whether to proceed to the next slice, reshape the epic, or take a break.

This checkpoint is optional, controlled by steering preference. In `always-consult` mode, the workflow pauses here. In `best-guess-and-flag` mode, the workflow proceeds to the next slice and flags the checkpoint in the return briefing.

#### S0–S3 — Side-quest lifecycle

Side quests use a compressed path: capture → plan (with optional exploration folded in) → implement → land. They use the **same** trust gates as slices (refinement on plan, red-green-verify per chunk, code refinement after implementation) but default to minimum-rigor routing unless affected subsystems force higher rigor.

| Phase | Entry | Events | Exit |
|---|---|---|---|
| S0 Capture | no active side-quest on branch | `side-quest-created`, `side-quest-goal-committed` (light refine) | goal committed |
| S1 Explore-plan | goal committed | `side-quest-plan-drafted`, `plan-shape-approved`, `refinement-converged`, `side-quest-plan-committed` | plan committed |
| S2 Implement | plan committed | `chunk-*` as in P10 | `chunk.all-decided` |
| S3 Land | chunks decided & code-refined | `side-quest-landed`, `milestone-committed` | landed |

Side quests do not produce spine updates unless the `completion-side-quest` agent proposes them and the user accepts. Findings triggered during a side quest escalate to the active epic (if any) through the Discovery matrix (§4.3).

### 3.3 Pause Discipline

Pause Discipline is how the workflow handles the tension between user steering and LLM autonomy. One rule, four moments, five reactive triggers plus scheduled checkpoints. It applies across every phase that opens an autonomy window (P2, P7–P9, P10, P11) rather than being duplicated inside each phase description. Sourced from 07 §4.3.

**The rule (R1).** Pause on trade-off-shifting discoveries. The question to ask yourself: *"If the user knew this, would they want to reconsider?"*

**The puzzle framing.** When you pause to ask, remember that the user has not been in the room with you. You have been working independently and have built up context they do not share. Reconstruct that context in the question itself. *"A question that requires the user to guess what you were thinking is not a question — it is a puzzle."*

**The four moments.**

| Moment | When | Mechanism |
|---|---|---|
| Before | Entry to any autonomy window | Pre-flight statement |
| During | Mid-autonomy discovery that shifts trade-offs | R1 block |
| At pause | Session ends or autonomy window completes | Session-boundary briefing |
| On return | User returns after a gap, fresh session starts, or agent resumes from interruption | Orientation (read most-recent briefing first) |

**Pre-flight discipline.** Before entering any autonomy window, the LLM produces a short, structured pre-flight statement and presents it to the user: *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. Here's what I think I know that matters: A, B, C. Anything to change before I start?"*

The discipline, verbatim: *"If the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight."*

Pre-flight is a structured format, not freeform narration — the fixed shape is what makes it an intervention system rather than a courtesy announcement. If the LLM cannot fill in X, Y, Z, and the known context, that is itself a signal to pause and gather more before starting the window.

**The five reactive + scheduled triggers.**

| Trigger | Category | Mechanism |
|---|---|---|
| Pre-flight | Scheduled (before autonomy) | `pre-flight-emitted` event |
| R1-during-autonomy | Reactive | `pause-entered { trigger: "r1" }` |
| End-of-autonomy | Scheduled (after autonomy) | `briefing-written { type: "session-boundary" }` |
| Non-convergence of refinement | Reactive | `pause-entered { trigger: "non-convergence" }` |
| Unverifiable chunk | Reactive | `pause-entered { trigger: "unverifiable-chunk" }` |

Scheduled steering checkpoints built into the phase flow:

| Checkpoint | When | Mechanism |
|---|---|---|
| Architecture-shape checkpoint | Between P3 (collaborative design) and P4 (pressure-test) | `pause-entered { trigger: "architecture-shape-checkpoint" }` |
| Post-refinement architecture review | Between P4 and P5 (optional) | `pause-entered { trigger: "architecture-post-refinement-review" }` |
| Slice-shape checkpoint | Between P5 (slice drafting) and slice-set refinement | `pause-entered { trigger: "slice-shape-checkpoint" }` |
| Plan-shape checkpoint | Between P8 (plan drafted) and P9 (plan refinement) | `pause-entered { trigger: "plan-shape-checkpoint" }` |
| Between-slice review | Between P12 (slice-landed) and next P7 (optional) | `pause-entered { trigger: "between-slice-review" }` |
| Epic steering pre-flight | Start of epic work on a branch | `epic-steering-preference-set` event |

**Reactive vs scheduled — the load-bearing distinction.**

**Scheduled checkpoints** respect the epic-level steering preference (always-consult / best-guess-and-flag / ask-in-the-moment). These are moments where the user can choose whether to engage.

**Reactive pauses** — R1 blocking discoveries, non-convergence, unverifiable chunks — **ignore the steering preference** and always surface to the user. These are blocks on real decisions the user cannot delegate. A reactive pause means the workflow has hit something that requires genuine judgment the LLM is not authorized to make.

**Invariant `pause.reactive-ignores-steering-preference`**: any `pause-entered` event with a reactive trigger must be surfaced to the user regardless of epic steering preference; the best-guess-and-flag path does not apply.

**Every session start is a return experience** — for humans returning after a gap AND for fresh Claude sessions with no prior conversation memory. The `gp:status` skill and `gp:workflow-guide` skill both open by reading the most-recent briefing in scope (session > epic > side-quest > project), treating its content as the narrative spine for orientation. Orientation is not reconstructed from events at return time; the briefing is the primary artifact and events are the fill-in.

**User-away protocol.** The epic-level steering preference governs scheduled checkpoint behavior when the user is not actively engaged:

- **always-consult** — LLM pauses at the checkpoint, emits a notification, and waits indefinitely. The slice does not progress until the user engages.
- **best-guess-and-flag** — LLM drafts a best-guess shape, moves to refinement, records a `pause-auto-shaped` event, and flags the decision in the return briefing so the user sees it at the next natural pause.
- **ask-in-the-moment** — LLM emits a notification and proceeds based on the user response; after a reasonable wait with no response, it defaults to best-guess-and-flag behavior.

The user can override the preference at any time. The preference only applies to scheduled checkpoints; reactive pauses always block.

**Cross-references.** The events referenced above — `pre-flight-emitted`, `briefing-written`, `pause-entered`, `pause-resolved`, `steering-preference-set`, `epic-steering-preference-set` — are defined in §4.3. The primary consumers of briefing artifacts are the `gp:status` and `gp:workflow-guide` skills, which read the most-recent briefing in scope as the orientation spine.

---

## 4. Event schemas

### 4.1 Common envelope

Every event is a single JSONL line with this shape:

```ts
type EventEnvelope = {
  id: string;                        // UUID v4 — globally unique across branches to prevent merge conflicts
  ts: string;                       // ISO-8601 UTC with milliseconds
  scope: "project" | "epic" | "side-quest";
  scopeRef: string | null;          // slug of the epic or side-quest (null for project)
  actor: { kind: "user" | "cli" | "skill" | "agent"; id: string };
  branch: string;                   // current git branch
  commitHint: string | null;        // HEAD at emit time; null if unborn
  type: string;                     // kebab-case event type
  payload: Record<string, unknown>; // validated by the event's Zod schema
  prevId: string | null;            // UUID of previous event in this scope, for log-chain integrity
};
```

All events extend the envelope; schemas below specify the `payload` shape only.

### 4.2 Content references

Artifact bodies are stored as git blobs and referenced by 40-char SHA-1. The payload type for these references:

```ts
type ContentRef = {
  sha: string;                      // 40-char hex (git blob id, from `git hash-object -w`)
  bytes: number;                    // size
  path: string;                     // logical path relative to scope (e.g., "slices/03_foo/plan.md")
  mediaType: "text/markdown" | "application/json" | "text/plain";
};
```

### 4.3 Event types (payload fields)

#### Entity lifecycle

**`project-initialized`**
- Required: `repoRoot: string`, `detectedSubsystems: string[]`, `mode: "onboard" | "fresh"`
- Optional: `importedFrom: string` (legacy `.project/` or old `.goodplan/`)
- Invariants triggered: `project.exists`

**`epic-created`**
- Required: `slug: string`, `dir: string` (`<YYYY-MM-DD>_<slug>`), `date: string` (YYYY-MM-DD)
- Invariants triggered: `epic.dir.unique`, `epic.single-active-per-branch` precondition

**`epic-goal-drafted`** — `artifact: ContentRef`, `version: number`
**`epic-goal-committed`** — `artifact: ContentRef`, `extracted: EpicGoalExtract` (see §8)
**`epic-steering-preference-set`** — `value: "always-consult" | "best-guess-and-flag" | "ask-in-the-moment"`, `scope: "epic" | { upcomingCheckpoints: number }`
**`epic-activated`** — `userConfirmation: string`
**`epic-paused`** — `reason: string`, `resumeHint: string`
**`epic-resumed`** — (no payload)
**`epic-completed`** — `synthesis: ContentRef`
**`epic-synthesis-drafted`** — `epicId: string`, `artifactRef: ContentRef`
**`epic-synthesis-committed`** — `epicId: string`, `artifactRef: ContentRef`, `crossSliceLearnings: string[]`, `architectureReconciliationStatus: "clean" | "manual-required" | "resolved"`, `sideQuestProposals: Array<{ title: string; rationale: string }>`
**`epic-abandoned`** — `reason: string`, `learningsCaptured: number`

**`side-quest-created`** — `slug: string`, `dir: string` (`<YYYY-MM-DD>_<slug>`), `date: string`, `parentEpic: string | null`
**`side-quest-goal-committed`** — `artifact: ContentRef`, `extracted: SideQuestGoalExtract`
**`side-quest-plan-drafted`** — `sideQuestId: string`, `artifactRef: ContentRef`, `extracted: PlanExtract`
**`side-quest-plan-shape-approved`** — `sideQuestId: string`, `approvedBy: "user" | "auto-best-guess"`
**`side-quest-plan-committed`** — `sideQuestId: string`, `artifactRef: ContentRef`, `extracted: PlanExtract`
**`side-quest-landed`** — `summary: ContentRef`
**`side-quest-abandoned`** — `reason: string`

**`slice-set-drafted`** — `epicId: string`, `artifactRef: ContentRef`
**`slice-shape-checkpoint-reached`** — `epicId: string`, `sliceSet: ContentRef`, `preference: string`
**`slice-shape-approved`** — `epicId: string`, `sliceSet: ContentRef`, `userConfirmation: string`
**`slice-shape-checkpoint-auto-shaped`** — `epicId: string`, `sliceSet: ContentRef`, `guessSummary: string`, `reasoning: string`, `flaggedInBriefing: string` (briefing ID)
**`slice-set-committed`** — `epicId: string`, `sliceCount: number`, `sliceIds: string[]`, `extracted: SliceSetExtract`
**`slice-created`** — `slug: string`, `index: number`, `dependsOn: string[]` (slice slugs), `goal: ContentRef`, `extracted: SliceGoalExtract`
**`slice-plan-drafted`** — `plan: ContentRef`, `chunkCount: number`
**`plan-shape-checkpoint-reached`** — `plan: ContentRef`, `preference: string`
**`plan-shape-revision-proposed`** — `from: ContentRef`, `to: ContentRef`, `note: string`
**`plan-shape-approved`** — `plan: ContentRef`, `userConfirmation: string`
**`plan-shape-checkpoint-auto-shaped`** — `plan: ContentRef`, `guessSummary: string`, `reasoning: string`, `flaggedInBriefing: string` (briefing ID)
**`slice-plan-committed`** — `plan: ContentRef`, `extracted: PlanExtract`
**`slice-implementation-started`** — (no payload)
**`slice-implementation-chunk-started`** — `chunkId: string`
**`chunk-red-test-written`** — `chunkId: string`, `testPath: string`, `diff: ContentRef`
**`chunk-red-test-failed`** — `chunkId: string`, `runOutput: ContentRef`, `failureMatchesIntent: boolean`
**`chunk-green-achieved`** — `chunkId: string`, `diff: ContentRef`, `runOutput: ContentRef`
**`chunk-verified`** — `chunkId: string`, `method: "live" | "supplementary-tests"`, `expectation: string`, `observation: ContentRef`, `redTestInitialFailure: ContentRef`, `redTestFinalPass: ContentRef`, `matched: true`, `evidenceRef: ContentRef`
**`chunk-unverifiable`** — `chunkId: string`, `reason: string`, `attempts: ContentRef`
**`chunk-unverifiable-decided`** — `chunkId: string`, `choice: "redesign" | "accept-approximation" | "awaiting-user-verification" | "rethink"`, `reason: string`, `limitation: string | null`
**`chunk-impossibility-accepted`** — `sliceId: string`, `chunkId: string`, `reason: string`, `acceptedAt: ISO8601`, `acceptedBy: "user" | "auto"`
**`chunk-verification-demoted`** — `chunkId: string`, `reason: string`, `byFindingId: string`, `demotedAt: ISO8601`
**`slice-code-refinement-started`** — `diff: ContentRef`
**`code-refinement-round-started`** — `round: number`
**`slice-code-revised`** — `diff: ContentRef`
**`code-refinement-converged`** — `finalDiff: ContentRef`, `roundsTaken: number`
**`slice-landed`** — `summary: ContentRef`, `deltasPromoted: number`, `findingsTriaged: number`
**`slice-abandoned`** — `reason: string`

#### Spine updates

**`architecture-committed`** — `artifact: ContentRef`, `target: "current" | "target"`, `extracted: ArchitectureExtract`
**`architecture-target-drafted`** — `epicId: string`, `artifactRef: ContentRef`, `extracted: ArchitectureTargetExtract`
**`architecture-target-committed`** — `epicId: string`, `artifactRef: ContentRef`, `extracted: ArchitectureTargetExtract`, `delta: { subsystemsAdded: string[]; subsystemsModified: string[]; subsystemsRemoved: string[] }`
**`architecture-current-reconciled`** — `epicId: string`, `reconciliationMethod: "auto" | "manual-merge" | "user-override"`, `changesFromEpic: string[]`, `newCurrentRef: ContentRef`
**`architecture-shape-checkpoint-reached`** — `epicId: string`, `architecture: ContentRef`, `preference: string`
**`architecture-shape-approved`** — `epicId: string`, `architecture: ContentRef`, `userConfirmation: string`
**`architecture-shape-checkpoint-auto-shaped`** — `epicId: string`, `architecture: ContentRef`, `guessSummary: string`, `reasoning: string`, `flaggedInBriefing: string` (briefing ID)
**`conventions-committed`** — `artifact: ContentRef`
**`invariants-committed`** — `artifact: ContentRef`, `changeset: { added: string[]; removed: string[]; modified: string[] }`
**`subsystem-registered`** — `slug: string`, `maturity: "experimental" | "stabilizing" | "stable" | "foundational"`, `dependentCount: number`, `file: ContentRef`
**`subsystem-maturity-updated`** — `slug: string`, `from: string`, `to: string`, `rationale: string`
**`subsystem-retired`** — `slug: string`, `reason: string`

#### Findings & discoveries

**`finding-captured`** — `id: string` (slug, e.g. `sse-compression-interaction`), `whatDoing: string`, `whatFound: string`, `whyMatters: string`, `whyNotNow: string`, `relatedSubsystems: string[]`, `blocking: boolean`, `inScope: boolean`
**`finding-triaged`** — `findingId: string`, `disposition: "expand-current-slice" | "insert-slice-before" | "insert-slice-after" | "reshape-epic" | "promote-to-epic" | "new-epic" | "expand-target" | "defer-side-quest" | "defer-task" | "drop"`, `rationale: string`

**Discovery matrix.** When a finding is captured during autonomous work, it's triaged on two dimensions: is it *blocking* (must be addressed before this slice/epic can proceed)? and is it *in-scope* (part of the current epic's target)?

|                     | In-scope                  | Out-of-scope                     |
|---------------------|---------------------------|----------------------------------|
| **Blocking**        | Reshape (5 options below) | New epic; pause current epic     |
| **Non-blocking**    | Expand target             | Defer (side quest or task)       |

**Five reshape options for blocking + in-scope findings**, ordered by cost:

| Response | When to pick | Cost |
|---|---|---|
| **Expand current slice** | Discovery is small, directly on the slice's path, doesn't change its goal. | Low. Plan edited; reviewers re-run on the delta only. |
| **Insert a slice before this one** | Discovery is a prerequisite — distinct unit of work, blocks the current slice. | Medium. Current slice pauses; new slice runs through Plan/Build; current slice resumes against updated architecture. |
| **Insert a slice after this one** | Discovery is needed for the epic to land but does NOT block the current slice. | Medium. Current slice continues; target updated; sequencing adjusted. |
| **Reshape the epic** | Discovery invalidates `architecture-target.md` — the shape of what the epic is building has changed. | High. Return to Shape with accumulated context; re-draft target; re-slice affected portions. |
| **Stop and promote to its own epic** | Discovery is out of scope entirely but blocking. | Very high. Only correct when in-place options would cause more damage. |

Any reshape must update `architecture-target.md` first — you cannot edit slice plans in place without updating the target. Reshapes inherit upstream invariants (a reshape triggered by a pressure-test assumption must update the Pressure-Test Summary; one triggered by convergence failure must record that as the cause).

The `finding-triaged` event records the disposition: `expand-current-slice | insert-slice-before | insert-slice-after | reshape-epic | promote-to-epic | new-epic | expand-target | defer-side-quest | defer-task | drop`. Each disposition triggers a specific follow-up:

- **Expand current slice**: revise the current slice's plan; reviewers re-run on the delta
- **Insert slice before/after**: emit `slice-created` with dependency on the relevant slice; update slice-set sequencing
- **Reshape the epic**: emit `reshape-proposed`; the slicing step re-evaluates affected slices; the epic's target is updated
- **Promote to its own epic / New epic; pause current**: emit `epic-paused` on current, `epic-created` for new; the current epic resumes after the new one lands
- **Expand target**: add scope to the current epic's `architecture-target.md`; trigger a refinement round on the expanded target
- **Defer side quest**: emit `side-quest-created` linked to the finding; runs independently after current epic lands (or in parallel if steering allows)
- **Defer task**: append a lightweight task entry; no separate epic or side quest

**Decay.** Findings older than N epics (default: 3) without promotion or reference are surfaced for culling during slice-land triage (and final-slice epic completion). The orientation skill presents each stale finding with a two-second prompt: promote, keep, or drop. This prevents the ledger from accumulating stale TODOs that no one reads. The decay trigger is `finding.age-in-epics > N AND NOT (promoted OR referenced-in-context-bundle-since-capture)`.

#### Exploration

**`exploration-cycle-started`** — `epicId: string`, `cycleNumber: number`, `scope: string`
**`research-captured`** — `epicId: string`, `cycleNumber: number`, `artifactRef: ContentRef`
**`brainstorm-captured`** — `epicId: string`, `cycleNumber: number`, `artifactRef: ContentRef`
**`prototype-captured`** — `epicId: string`, `cycleNumber: number`, `artifactRef: ContentRef`, `outcome: string`
**`exploration-cycle-completed`** — `epicId: string`, `cycleNumber: number`, `artifactsProduced: number`
**`exploration-concluded`** — `epicId: string`, `cyclesCompleted: number`, `totalArtifacts: number`

#### Refinement

**`artifact-drafted`** — `artifactType: string`, `artifact: ContentRef`, `producer: string`
**`artifact-revised`** — `artifactType: string`, `from: ContentRef`, `to: ContentRef`, `producer: string`
**`refinement-round-started`** — `artifactType: string`, `artifactRef: ContentRef`, `round: number`, `reviewers: string[]`, `rigor: "minimum" | "standard" | "full"`
**`refinement-round-completed`** — `artifactType: string`, `artifactRef: ContentRef`, `round: number`, `scores: Record<string, number>`, `convergenceStatus: "converged" | "continue" | "circuit-broken"`, `reviewersRun: string[]`
**`reviewer-scored`** — `artifactType: string`, `artifactVersion: ContentRef`, `reviewerId: string`, `reviewerVersion: string`, `round: number`, `dimensions: Record<string, number>`, `findings: Array<{ severity: "BLOCKING" | "CRITICAL" | "IMPORTANT" | "MINOR"; dimension: string; message: string; location: string | null }>`, `rationale: string`, `relevanceWeight: "high" | "medium" | "low"`

**Relevance weighting.** The routing function assigns a `relevanceWeight` to each reviewer based on how central that reviewer's domain is to the artifact. A TypeScript reviewer scores `high` on a TS-heavy plan and `low` on a data-model-heavy plan. The convergence evaluator uses weight as a multiplier: `high`-weight below threshold is BLOCKING; `low`-weight below threshold is a WARNING (surfaced but non-blocking). This prevents low-relevance reviewers from gating convergence while ensuring high-relevance reviewers are load-bearing.
**`refinement-synthesized`** — `artifactType: string`, `round: number`, `aggregated: ContentRef`
**`refinement-converged`** — `artifactType: string`, `artifact: ContentRef`, `roundsTaken: number`, `bar: string` (rubric id)
**`refinement-circuit-breaker-tripped`** — `artifactType: string`, `reason: "stuck-finding" | "reviewer-disagreement" | "round-budget-exceeded"`, `details: ContentRef`
**`convergence-overridden`** — `artifactType: string`, `artifact: ContentRef`, `userReason: string`

#### Pressure test

**`pressure-test-drafted`** — `artifact: ContentRef`
**`pressure-test-committed`** — `artifact: ContentRef`, `extracted: PressureTestExtract`
**`pressure-test-finding-proposed`** — `findingId: string`, `failureMode: string`, `class: "failure-mode" | "scaling-cliff" | "optionality-loss" | "locked-in-assumption" | "error-class"`, `fakeableChunk: boolean`
**`pressure-test-finding-accepted`** — `findingId: string`, `disposition: "addressed" | "accepted-with-justification"`, `promotedTo: string | null` (invariant id if accepted)

#### Briefings

**`briefing-written`** — `id: string` (slug, e.g. `pre-flight-slice-01`), `trigger: "r1" | "pre-flight" | "end-of-autonomy" | "non-convergence" | "unverifiable-chunk" | "shape-checkpoint" | "session-pause"`, `artifact: ContentRef`, `extracted: BriefingExtract`

#### Decisions & learnings

**`decision-recorded`** — `id: string` (slug), `domain: string`, `title: string`, `summary: string`, `supersedes: string | null`, `reconsiderWhen: string[]`, `file: ContentRef`
**`learning-captured`** — `id: string` (slug), `category: "domain" | "worked" | "didnt-work" | "do-differently"`, `summary: string`, `tags: string[]`, `subsystems: string[]`, `validUntil: string[] | null`, `file: ContentRef`
**`learning-promoted`** — `learningId: string`, `to: "convention" | "invariant" | "architecture" | "subsystem-doc"`, `rationale: string`

#### Pauses & steering

**`pre-flight-emitted`** — `sessionId: string`, `artifactType: "explore" | "plan" | "implement" | "code-refine" | "other"`, `plannedActions: string[]`, `expectedReturn: string`, `expectedBlocks: string[]`, `knownContext: string[]`, `scope: { type: "project" | "epic" | "side-quest" | "slice"; id: string }`
**`pause-entered`** — `trigger: string`, `briefingId: string`
**`pause-resolved`** — `briefingId: string`, `userChoice: string`
**`steering-preference-set`** — (see epic-steering-preference-set; this is the generic form for non-epic scopes)

#### Reshape

**`reshape-proposed`** — `scope: "epic" | "slice"`, `rationale: string`, `artifact: ContentRef`
**`reshape-approved`** — `proposalId: string`, `userConfirmation: string`
**`reshape-applied`** — `proposalId: string`, `changes: ContentRef`

#### Invariants (events about the invariant set itself)

**`invariant-proposed`** — `id: string`, `description: string`, `ruleType: string`, `rule: Record<string, unknown>`
**`invariant-activated`** — `id: string`, `appliesTo: string[]`, `scope: "core" | "extensible"`
**`invariant-deactivated`** — `id: string`, `reason: string`

#### Milestone

**`milestone-committed`** — `commitSha: string`, `eventsIncluded: number`, `label: string`

### 4.4 Example payload

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "ts": "2026-04-08T17:22:11.431Z",
  "scope": "epic",
  "scopeRef": "workflow-bug-fixes",
  "actor": { "kind": "agent", "id": "reviewer-verification-plausibility@v1" },
  "branch": "epic/workflow-bug-fixes",
  "commitHint": "6f94683a",
  "type": "reviewer-scored",
  "prevId": "f0e1d2c3-b4a5-4968-8f7e-6d5c4b3a2190",
  "payload": {
    "artifactType": "plan",
    "artifactVersion": {
      "sha": "4b1a2f3e8c9d7a6b5e4f3d2c1b0a9f8e7d6c5b4a",
      "bytes": 18423,
      "path": "slices/03_routing-function/plan.md",
      "mediaType": "text/markdown"
    },
    "reviewerId": "reviewer-verification-plausibility",
    "reviewerVersion": "v1",
    "round": 2,
    "dimensions": {
      "expectation-falsifiability": 4,
      "method-exercises-change": 5,
      "red-test-distinct-from-verification": 3,
      "cargo-cult-risk": 2
    },
    "findings": [
      {
        "severity": "BLOCKING",
        "dimension": "red-test-distinct-from-verification",
        "message": "Chunk c4's red-test and verification-method both run the same CLI command with the same flags. Red-test must exercise the unit in isolation; verification-method must run in production-shape conditions.",
        "location": "plan.md#chunk-c4"
      }
    ],
    "rationale": "Three of four chunks pass; c4 collapses the two gates into one run, losing the independence property."
  }
}
```

---

## 5. Invariants

Invariants are pure functions over the event stream for a scope. Core invariants ship in TypeScript; extensible invariants are authored as YAML and loaded at CLI startup. The hybrid model lets goodplan enforce universal rules while letting individual projects add their own.

### 5.1 Core invariants (TypeScript)

| ID | Description | Applies to | Rule type | Check | Error |
|---|---|---|---|---|---|
| `project.exists` | A project must be initialized before any other event | all non-init events | precondition | `project-initialized` exists in scope=project | "no project — run `gp init`" |
| `epic.single-active-per-branch` | At most one active epic per branch | `epic-activated` | count_limit | count of active epics on current branch ≤ 1 | "active epic already exists: {slug}" |
| `epic.dir.unique` | Epic dir must be unique across history | `epic-created` | unique | no prior `epic-created` with same `dir` | "epic dir collision: {dir}" |
| `epic.goal.committed-before-explore` | Goal must be committed before exploration | `exploration-cycle-started` | precondition | `epic-goal-committed` for this epic exists | "epic goal not committed" |
| `epic.architecture-target-required-before-slice-set` | Shape must produce an architecture before slices | `slice-set-drafted` | precondition | `architecture-target-committed` for this epic exists | "architecture-target not committed" |
| `epic.pressure-test-required-before-slice-set` | Pressure test runs before slicing | `slice-set-drafted` | precondition | `pressure-test-committed` exists for this epic | "pressure-test not committed" |
| `slice.single-active-per-branch` | At most one slice may be in P10 (Implement) or P11 (Code refine) per branch at a time. Slices in earlier phases (P7 Plan-draft, P8 Plan-shape, P9 Plan-refine) may run in parallel across different slices on the same branch. Preserves focused implementation while allowing planning in parallel for independent slices. | `slice-implementation-started` | count_limit | count of slices on branch currently in P10–P11 ≤ 1 | "active slice already in implement/code-refine: {slug}" |
| `side-quest.single-active-per-branch` | At most one active side quest per branch | `side-quest-plan-committed` | count_limit | count of in-flight side quests on branch ≤ 1 | "active side quest already exists: {slug}" |
| `epic.architecture-shape-approval-required` | Pressure test cannot run on an unshaped architecture | `pressure-test-drafted` | precondition | `architecture-shape-approved` OR `architecture-shape-checkpoint-auto-shaped` for this epic | "architecture-shape checkpoint not closed" |
| `epic.slice-shape-approval-required` | Slice-set refinement cannot run on unshaped slices | `refinement-round-started` where artifactType=slice-set | precondition | `slice-shape-approved` OR `slice-shape-checkpoint-auto-shaped` for this epic | "slice-shape checkpoint not closed" |
| `slice.plan-shape-approval-required` | Refinement cannot run on an unshaped plan | `refinement-round-started` where artifactType=plan | precondition | `plan-shape-approved` OR `plan-shape-checkpoint-auto-shaped` for this plan | "plan-shape checkpoint not closed" |
| `slice.plan-converged-before-implement` | No implementation without a converged plan | `slice-implementation-started` | precondition | `slice-plan-committed` for slice | "plan not converged" |
| `slice.plan-chunks-decidable` | Every chunk must have a verificationType the CLI accepts | `slice-plan-committed` | all_match | every chunk in extracted plan has `verificationType` ∈ {live, supplementary-tests, impossible-with-reason} | "chunk {id} has no verificationType" |
| `slice.chunks-all-decided-before-code-refine` | Code refinement cannot start until every chunk is decided | `slice-code-refinement-started` | all_match | every chunk has `chunk-verified{matched:true}` OR `chunk-unverifiable-decided{choice ∈ accept-approximation, awaiting-user-verification}` | "chunk {id} undecided" |
| `slice.code-refinement-converged-before-land` | No slice land without code refinement convergence | `slice-landed` | precondition | `code-refinement-converged` for slice | "code not refined" |
| `slice.deps-landed-before-start` | Slice dependencies must be landed | `slice-plan-drafted` | foreign_key | every declared `dependsOn` has `slice-landed` | "dep {slug} not landed" |
| `chunk.evidence-non-empty` | Verified events must carry concrete observation | `chunk-verified` | required | `observation.bytes > 0` AND `evidenceRef.bytes > 0` | "chunk-verified lacks evidence" |
| `chunk.red-test-failed-before-green` | TDD ordering preserved | `chunk-green-achieved` | precondition | `chunk-red-test-failed{failureMatchesIntent:true}` exists for chunk | "no failing red test recorded" |
| `refinement.bar-matches-rubric` | Convergence must be computed against a known rubric | `refinement-converged` | foreign_key | `bar` ∈ loaded rubric registry | "unknown rubric {id}" |
| `epic.all-slices-landed-before-complete` | No epic land with in-flight slices | `epic-completed` | all_match | every slice-created has `slice-landed` OR `slice-abandoned` | "slice {slug} not landed" |
| `spine.write-only-via-milestone` | Spine files only change through `milestone-committed` events | architecture-committed, conventions-committed, invariants-committed | custom | writes bundled into a milestone | "spine write outside milestone" |
| `event.prev-id-chain` | Log chain integrity | every event | custom | `prevId` matches the previous event's `id` within the same scope | "prevId mismatch at {id}" |
| `pressure-test.findings-all-accepted-before-slice-set` | Every pressure-test finding must be accepted or dismissed | `slice-set-drafted` | all_match | every `pressure-test-finding-proposed` has a matching `pressure-test-finding-accepted` | "finding {id} undispositioned" |
| `briefing.written-at-pause` | Every pause must write a briefing | `pause-entered` | required | same-scope `briefing-written` before next non-briefing event in scope | "pause without briefing" |

**Clarifications on two invariants above:**

- **`briefing.written-at-pause`**: after any `pause-entered` event, a `briefing-written` event with `scope` matching the pause context must appear in the event log before the next non-briefing event in that scope. In other words: pauses must be immediately followed by their briefing, with no other intervening events in the same scope. This prevents pauses without briefings and prevents briefings from being attached to the wrong pause context.

- **`spine.write-only-via-milestone`**: any spine-committing event (`architecture-committed`, `conventions-committed`, `invariants-committed`, `subsystem-registered`, `subsystem-maturity-updated`) must be followed by a `milestone-committed` event in the same session before the session ends. If a session ends with a spine-committing event but no subsequent `milestone-committed`, the spine write is considered **orphaned** and requires user resolution on next session (the orientation skill surfaces the orphaned spine event and the user decides: accept as part of a new milestone, roll back, or amend). This prevents spine drift from transient autonomy work.

### 5.2 Extensible invariants (YAML)

Extensible invariants live at `.goodplan/invariants.md` with a trailing fenced `yaml` block that the CLI parses. Example:

```yaml
invariants:
  - id: subsystem.doc-depth-scales-with-maturity
    description: Foundational subsystems must have populated API and data-model sections
    applies_to: [subsystem-registered, subsystem-maturity-updated]
    rule_type: all_match
    rule:
      when: { field: maturity, equals: foundational }
      require:
        - subsystem_doc_section_present: api
        - subsystem_doc_section_present: data-model
        - subsystem_doc_section_present: invariants
    error: "foundational subsystem {slug} missing required sections: {missing}"

  - id: decision.superseded-has-replacement
    applies_to: [decision-recorded]
    rule_type: custom
    rule:
      check: supersedes_implies_replacement
    error: "decision supersedes {supersedes} but provides no replacement rationale"
```

The `rule_type` vocabulary is: `unique`, `count_limit`, `required`, `foreign_key`, `all_match`, `precondition`, `custom`. `custom` rules delegate to a named function registered in the core invariant table, and are how projects escape the declarative model when needed.

Invariants are versioned via `invariant-activated` and `invariant-deactivated` events so history can replay against the active set at event emission time.

---

## 6. CLI command tree

All commands support global flags: `--json`, `--query <jq>`, `--quiet`, `--verbose`, `--force`. `--force` bypasses user prompts but **never** bypasses invariants; only `--force-override-with-reason=<text>` on specific commands can do that, and it emits a `convergence-overridden` event.

Commands are entity-namespaced (`gp <entity>:<verb>`). Phase-boundary subagent commands move under `phase:` (was the unnamespaced `start-*` / `submit-*`).

### 6.0 Command renames from current codebase

Explicit old → new mappings this draft introduces:

| Old | New |
|---|---|
| `gp epic:define-architecture` | `gp epic:architecture-draft` |
| `gp epic:refine-architecture` | merged into the general `gp refine:*` loop (see §3, §6.6) |
| `gp epic:define-slices` | `gp epic:slices-draft` |
| `gp epic:refine-slices` | merged into the general `gp refine:*` loop |
| `gp quest:*` (all) | `gp side-quest:*` — full namespace rename |
| bare `start-*` / `submit-*` | `gp phase:start` / `gp phase:submit` / `gp phase:transition` |

Phase-boundary commands move from bare top-level verbs to the `gp phase:*` namespace, matching the entity-namespace convention used by every other command family.

### 6.1 Global

| Command | Purpose | Emits |
|---|---|---|
| `gp init` | Initialize project (auto-detect onboard vs fresh) | `project-initialized`, `architecture-committed`, `conventions-committed`, `subsystem-registered`×n |
| `gp status [--json]` | Derived-state snapshot + suggested next steps | (read-only) |
| `gp state [--scope=project\|epic\|side-quest]` | Dump full derived state | (read-only) |
| `gp schema [--entity=<name>]` | Print Zod schemas for events and records | (read-only) |
| `gp migrate [--from=<version>]` | Migrate legacy `.project/` or old `.goodplan/` | `project-initialized`, plus history import events |
| `gp events:tail [--scope=] [--follow]` | Read log | (read-only) |
| `gp events:query --filter=<jq>` | Query log | (read-only) |

### 6.2 Project

| Command | Stdin | Stdout | Emits |
|---|---|---|---|
| `gp project:show` | — | project snapshot | — |
| `gp project:set-steering` | `{ default: "always-consult" \| ... }` | ok | `steering-preference-set` |

### 6.3 Epic

| Command | Args/Flags | Stdin (Zod) | Emits |
|---|---|---|---|
| `gp epic:create --slug=<s>` | `--slug` required | — | `epic-created` |
| `gp epic:list [--status=]` | — | — | — |
| `gp epic:show <slug>` | — | — | — |
| `gp epic:goal-draft <slug>` | — | `{ artifactPath: string }` | `epic-goal-drafted`, `artifact-drafted` |
| `gp epic:goal-commit <slug>` | — | `{ artifactPath: string }` | `epic-goal-committed` |
| `gp epic:set-steering <slug>` | — | `{ value: "always-consult" \| "best-guess-and-flag" \| "ask-in-the-moment"; scope: "epic" \| { upcomingCheckpoints: number } }` | `epic-steering-preference-set` |
| `gp epic:activate <slug>` | — | `{ userConfirmation: string }` | `epic-activated` |
| `gp epic:pause <slug>` | `--reason=<s>` | — | `epic-paused` |
| `gp epic:resume <slug>` | — | — | `epic-resumed` |
| `gp epic:complete <slug>` | — | `{ synthesisPath: string }` | `epic-completed`, `epic-synthesis-committed` |
| `gp epic:abandon <slug>` | `--reason=<s>` | — | `epic-abandoned` |
| `gp epic:architecture-draft <slug>` | — | `{ target: "target"; artifactPath: string }` | `architecture-target-drafted` |
| `gp epic:architecture-commit <slug>` | — | `{ artifactPath: string }` | `architecture-committed{target:target}` |
| `gp epic:pressure-test-draft <slug>` | — | `{ artifactPath: string }` | `pressure-test-drafted` |
| `gp epic:pressure-test-commit <slug>` | — | `{ artifactPath: string }` | `pressure-test-committed`, `pressure-test-finding-proposed`×n |
| `gp epic:pressure-test-finding-disposition` | — | `{ findingId; disposition; promotedTo? }` | `pressure-test-finding-accepted`; MAY ALSO emit `invariant-proposed` when disposition includes `promotedTo: <invariant-id>` (mechanism by which accepted findings become durable constraints) |
| `gp epic:architecture-shape-start <slug>` | — | — | `architecture-shape-checkpoint-reached` |
| `gp epic:architecture-shape-approve <slug>` | `{ userConfirmation: string }` | — | `architecture-shape-approved` |
| `gp epic:architecture-shape-auto <slug>` | `{ guessSummary, reasoning, briefingId }` | — | `architecture-shape-checkpoint-auto-shaped` |
| `gp epic:slices-draft <slug>` | — | `{ artifactPath: string }` | `slice-set-drafted` |
| `gp epic:slices-shape-start <slug>` | — | — | `slice-shape-checkpoint-reached` |
| `gp epic:slices-shape-approve <slug>` | `{ userConfirmation: string }` | — | `slice-shape-approved` |
| `gp epic:slices-shape-auto <slug>` | `{ guessSummary, reasoning, briefingId }` | — | `slice-shape-checkpoint-auto-shaped` |
| `gp epic:slices-commit <slug>` | — | `{ artifactPath: string }` | `slice-set-committed`, `slice-created`×n |

### 6.4 Slice

| Command | Stdin | Emits |
|---|---|---|
| `gp slice:list --epic=<s>` | — | — |
| `gp slice:show <epic>/<slice>` | — | — |
| `gp slice:plan-draft <epic>/<slice>` | `{ artifactPath: string }` | `slice-plan-drafted` |
| `gp slice:plan-shape-start <epic>/<slice>` | — | `plan-shape-checkpoint-reached` |
| `gp slice:plan-shape-revise <epic>/<slice>` | `{ fromPath, toPath, note }` | `plan-shape-revision-proposed` |
| `gp slice:plan-shape-approve <epic>/<slice>` | `{ userConfirmation: string }` | `plan-shape-approved` |
| `gp slice:plan-shape-auto <epic>/<slice>` | `{ guessSummary, reasoning, briefingId }` | `plan-shape-checkpoint-auto-shaped` |
| `gp slice:plan-commit <epic>/<slice>` | `{ artifactPath: string }` | `slice-plan-committed` |
| `gp slice:implement-start <epic>/<slice>` | — | `slice-implementation-started` |
| `gp slice:chunk-start <epic>/<slice> --chunk=<id>` | — | `slice-implementation-chunk-started` |
| `gp slice:chunk-red-written --chunk=<id>` | `{ testPath; diffPath }` | `chunk-red-test-written` |
| `gp slice:chunk-red-failed --chunk=<id>` | `{ runOutputPath; failureMatchesIntent: bool }` | `chunk-red-test-failed` |
| `gp slice:chunk-green --chunk=<id>` | `{ diffPath; runOutputPath }` | `chunk-green-achieved` |
| `gp slice:chunk-verify --chunk=<id>` | `{ method; expectation; observationPath; evidencePath }` | `chunk-verified` |
| `gp slice:chunk-unverifiable --chunk=<id>` | `{ reason; attemptsPath }` | `chunk-unverifiable` |
| `gp slice:chunk-decide --chunk=<id>` | `{ choice; reason; limitation? }` | `chunk-unverifiable-decided` |
| `gp slice:code-refine-start <epic>/<slice>` | — | `slice-code-refinement-started` |
| `gp slice:code-refine-commit <epic>/<slice>` | `{ finalDiffPath; rounds }` | `code-refinement-converged` |
| `gp slice:land <epic>/<slice>` | `{ summaryPath }` | `slice-landed`, `milestone-committed` |
| `gp slice:abandon <epic>/<slice>` | `--reason=<s>` | `slice-abandoned` |

### 6.5 Side-quest

Same command set as slice, namespaced `side-quest:*`. Differs only in: no `dependsOn` resolution, no `activeEpic` parent relationship, compressed `plan-shape` checkpoint (can be auto-shaped without briefing if `always-consult` not set).

### 6.6 Refinement (artifact-type-agnostic)

The refinement loop is driven by commands under `refine:`. Skills use these to route any artifact through the substrate.

| Command | Stdin | Emits |
|---|---|---|
| `gp refine:start` | `{ artifactType; artifactPath; rigor?: "minimum"\|"standard"\|"full"; subsystems?: string[] }` | `refinement-round-started` |
| `gp refine:score` | `{ artifactType; artifactPath; reviewerId; round; dimensions; findings; rationale; relevanceWeight }` | `reviewer-scored` |
| `gp refine:synthesize` | `{ artifactType; round; aggregatedPath }` | `refinement-synthesized` |
| `gp refine:revise` | `{ artifactType; fromPath; toPath }` | `artifact-revised` |
| `gp refine:evaluate --artifact=<path>` | — | stdout: `{ status: "CONVERGED" \| "NOT_CONVERGED" \| "STUCK", details }` (read-only; no event) |
| `gp refine:converge` | `{ artifactType; artifactPath; rounds }` | `refinement-converged` |
| `gp refine:stuck` | `{ artifactType; reason; detailsPath }` | `refinement-circuit-breaker-tripped` |
| `gp refine:override` | `{ artifactType; artifactPath; userReason }` | `convergence-overridden` (+ pauses) |

`gp refine:evaluate` is the pure-function query. The convergence evaluator reads the event stream and applies the rubric; nothing is emitted.

### 6.7 Phase (replaces bare `start-*`/`submit-*`)

| Command | Stdin | Emits |
|---|---|---|
| `gp phase:start --name=<phase> --scope=<ref>` | `{ plan: string }` (phase-specific) | phase-specific start events |
| `gp phase:submit --name=<phase> --scope=<ref>` | `{ results: ... }` | phase-specific completion events |
| `gp phase:transition --from=<p> --to=<q> --scope=<ref>` | — | verifies invariants; refuses if evidence missing; on success allows the skill to proceed |

Phase names: `explore`, `architecture`, `pressure-test`, `slices`, `plan`, `plan-shape`, `refinement`, `implementation`, `code-refinement`, `slice-land`, plus side-quest equivalents.

### 6.8 Reviewer / rubric registry

| Command | Purpose | Emits |
|---|---|---|
| `gp reviewer:list [--for-artifact=<type>] [--subsystem=<id>]` | Route | (read-only) |
| `gp reviewer:show <id>` | Reviewer contract & rubric reference | (read-only) |
| `gp rubric:list [--artifact-type=]` | Known rubrics | (read-only) |
| `gp rubric:show <id>` | Full rubric YAML | (read-only) |
| `gp rubric:validate <path>` | Check a rubric file | (read-only) |

### 6.9 Decisions, learnings, findings, briefings

| Command | Stdin | Emits |
|---|---|---|
| `gp decision:record` | `{ domain; title; summary; reconsiderWhen; supersedes? }` | `decision-recorded` |
| `gp decision:list [--status=] [--domain=]` | — | — |
| `gp decision:show <id>` | — | — |
| `gp decision:supersede <id>` | `{ bySupersedesId; rationale }` | `decision-recorded` with `supersedes` |
| `gp learning:capture` | `{ category; summary; tags; subsystems; validUntil?; filePath }` | `learning-captured` |
| `gp learning:list [--category=] [--subsystem=] [--json]` | — | — |
| `gp learning:promote <id>` | `{ to; rationale }` | `learning-promoted` |
| `gp finding:capture` | `{ whatDoing; whatFound; whyMatters; whyNotNow; relatedSubsystems; blocking; inScope }` | `finding-captured` |
| `gp finding:list [--scope=] [--disposition=]` | — | — |
| `gp finding:triage <id>` | `{ disposition; rationale }` | `finding-triaged` |
| `gp briefing:write` | `{ trigger; artifactPath; extracted }` | `briefing-written` |
| `gp briefing:latest --scope=<ref>` | — | read-only |

### 6.10 Subsystems & invariants

| Command | Stdin | Emits |
|---|---|---|
| `gp subsystem:register` | `{ slug; maturity; dependentCount; filePath }` | `subsystem-registered` |
| `gp subsystem:update-maturity <slug>` | `{ to; rationale }` | `subsystem-maturity-updated` |
| `gp subsystem:retire <slug>` | `{ reason }` | `subsystem-retired` |
| `gp subsystem:list [--maturity=]` | — | — |
| `gp subsystem:show <slug>` | — | — |
| `gp invariant:list [--scope=core\|extensible]` | — | — |
| `gp invariant:propose` | `{ id; description; appliesTo; ruleType; rule }` | `invariant-proposed` |
| `gp invariant:activate <id>` | — | `invariant-activated` |
| `gp invariant:deactivate <id>` | `{ reason }` | `invariant-deactivated` |
| `gp invariant:check --event=<path>` | — | stdout: pass/fail + failing invariants |

### 6.11 Milestone

| Command | Purpose | Emits |
|---|---|---|
| `gp milestone:commit --label=<s>` | Stage spine files + events.jsonl and git-commit | `milestone-committed` |

### 6.12 Suggested next steps (`gp status`)

`gp status --json` includes a `suggestedNextSteps` array derived from the event log and invariant engine. The CLI computes:

- **Current phase** — derived from the latest events per scope.
- **Valid transitions** — which invariants are satisfied for which next actions.
- **Blockers** — which invariants would fail and why.
- **Recommendations** — heuristic ordering (next slice in dependency order, deferred findings count, etc.).

```json
{
  "suggestedNextSteps": [
    {
      "command": "/gp:plan-slice real-time-notifications/02_notification-persistence",
      "reason": "slice 01 landed, slice 02 has no unmet dependencies",
      "priority": "primary"
    },
    {
      "command": "/gp:create-side-quest",
      "reason": "3 deferred findings from slice 01 available for promotion",
      "priority": "optional"
    }
  ],
  "blockers": []
}
```

Skills use this to orient themselves: rather than re-deriving "where are we?", the skill reads the CLI's recommendation and acts on it. The `gp:status` skill surfaces these recommendations to the user in its orientation message.

### 6.13 Error output

All commands return JSON errors on stderr when `--json` is set:

```json
{ "error": { "code": "INVARIANT_FAILED", "invariant": "slice.plan-shape-approval-required", "message": "plan-shape checkpoint not closed", "details": { ... } } }
```

Error codes: `INVARIANT_FAILED`, `SCHEMA_INVALID`, `NOT_FOUND`, `ALREADY_EXISTS`, `STATE_CONFLICT`, `EVIDENCE_MISSING`, `HOOK_BLOCKED`, `ROUTING_NO_REVIEWERS`, `CONVERGENCE_STUCK`, `USER_ABORTED`, `INTERNAL`.

---

## 7. Reviewer registry (populated)

**Artifacts are context transport.** The refinement loop's most important function is not catching mistakes — it is accumulating context. Every reviewer adds missing context, corrects wrong context, and verifies the context that's already there. By the end, the artifact is a self-contained specification: a downstream consumer who has never seen the full history can execute against it without re-discovering anything.

*"A plan can be correct and still useless if it assumes context the implementer doesn't have."* This is why context-accumulation is a first-class reviewer question, not a side effect. Every reviewer is asked, regardless of domain: "what context will the downstream consumer need that isn't in this artifact?"

Reviewers are YAML-fronted markdown files at `.goodplan/reviewers/<id>.md` (project-level overrides) or shipped in the plugin at `plugin/reviewers/<id>.md` (default set). The initial set uses the project's existing reviewer set as the starting point, mapped into the new registry format.

**Retained reviewer diversity.** The existing reviewer set spans multiple domains and should carry over in full:

- **Language-specific:** TypeScript/JavaScript, Python, Rust
- **Web:** backend/API, frontend/UI, data layer, DevOps & infrastructure
- **AI tooling:** agents & skills, MCP servers, hooks, plugins
- **Specialists:** TUI & CLI, repo/tooling/docs, CI & GitHub workflows, UX & information architecture, API contracts
- **Scientific specialists:** algorithm & numerical, performance & optimization, ML pipelines, data handling/validation & file formats & streaming ETL patterns & schemas

Each is mapped to the new registry format with domains, applies_to, rubric dimensions, and prompt sketches. The routing function selects which reviewers apply based on artifact type and affected subsystems. Updates to reviewer contracts to include refinement-loop-specific requirements (change-scoped re-review, relevance weighting) are applied during the mapping.

Every reviewer declares:

```yaml
id: reviewer-<slug>
version: v1
domains: [context-transport, verification-plausibility, ...]
applies_to: [plan, architecture-target, code-diff, ...]
rubric_ref: plan/v1#context-transport  # optional per-dimension ref
score_range: 1-5
passing_threshold_per_dimension: 3
```

### 7.1 Always-on trio (attached to every artifact)

**`reviewer-holistic`** — Internal consistency and claims-vs-content.
- Domains: coherence, claims-vs-content.
- Applies to: all.
- Rubric dimensions: `internal-consistency`, `claim-support`, `scope-alignment`, `prose-density` (1–5 each).
  - `prose-density` (1–5): No hedging, no preambles, density over length. Tables and lists where denser than prose. Filler phrases ("it's important to note," "one could argue," excessive qualifiers) are flagged. Cut throat-clearing. Say important things once and reference them. Applies to all prose artifacts.
- Threshold: ≥3 each; BLOCKING on any 1.
- Prompt sketch: *"Read this artifact as a skeptical peer reviewer who knows nothing about the project. Every claim must be supported by content earlier in the artifact or by a reference. Every reference to 'as we discussed' or 'it's obvious' is a finding. Note where the artifact says one thing in section X and another in section Y. Note where the stated scope does not match the delivered content."*

**`reviewer-invariant-checker`** — Verifies no invariant violated.
- Domains: invariants.
- Applies to: all.
- Rubric dimensions: `invariant-compliance` (pass/fail per invariant).
- Threshold: zero fails.
- Prompt sketch: *"The project's invariant set is attached. For each invariant that applies to this artifact type, cite the specific check and whether the artifact satisfies it. Output per-invariant pass/fail; any fail is BLOCKING."*

**`reviewer-context-transport`** — Artifacts as context transport.
- Domains: context-transport.
- Applies to: all.
- Rubric dimensions: `fresh-implementer-completeness` (1–5), `stale-context-crowding` (1–5).
- Threshold: ≥4 each; IMPORTANT below.
- Prompt sketch: *"Ask exactly two questions: (1) What context would a fresh implementer with the codebase open but no prior conversation have to stop and figure out before acting on this? List concretely. (2) What context in this artifact is stale, unused, or crowding out what matters? Note: artifacts are context transport. A plan can be correct and still useless if it assumes context the implementer doesn't have. Remember: mid-rename is mid-rename — honest intermediate state only."*

### 7.2 Artifact-specific reviewers

**`reviewer-plan`** — Plan-shape, ordering, chunk well-formedness.
- Applies to: `plan`.
- Dimensions: `chunk-atomicity`, `ordering-justified`, `cross-chunk-dependencies-explicit`, `rollback-path-present` (1–5).
- Threshold: ≥3 each.
- Prompt sketch: *"Does this plan have chunks small enough to verify independently? Is the ordering justified by dependency or de-risking, not alphabetical? Are cross-chunk dependencies called out so a reader knows which chunks block which? If a chunk fails, can the plan retreat without unwinding unrelated work?"*

**`reviewer-verification-plausibility`** — BLOCKING for plans.
- Applies to: `plan`.
- Dimensions (per chunk, pass/fail): `expectation-falsifiable`, `method-exercises-change`, `red-test-exercises-intent`, `red-test-behavior-not-impl`, `red-test-meaningful`, `red-test-distinct-from-verification`, `cargo-cult-risk`.
- Threshold: all pass; any BLOCKING.
- Prompt sketch: *"For every chunk: Does the verification-method actually exercise what the chunk's description says changes? Is the expectation falsifiable? If `live`, is it really live (not a type check pretending)? If `supplementary-tests`, is the coverage demonstration concrete? Does the red-test exercise the chunk's expectation — not an adjacent property? Does the red-test test behavior, not implementation details? Is the red-test meaningful — if the chunk's change were reverted, would this test actually fail for the intended reason? Is the red-test distinct from the verification-method (unit-level vs live)? Remember: a test that passes because it tests almost nothing is worse than no test, because it manufactures confidence. End with live observation. Any chunk failing any check is BLOCKING."*

**`reviewer-software-architecture`** — Architecture-level design quality.
- Applies to: `architecture-target`, `architecture-current`.
- Dimensions (1–5 each):
  - `subsystem-boundary-clarity` — boundaries defined by what each subsystem owns and what crosses them, not by file location.
  - `dependency-direction-sound` — dependency graph is acyclic and justified; each dependency is intentional.
  - `api-depth-vs-surface-area` — subsystems are deep (hide significant complexity behind simple, powerful APIs) not shallow (thin wrappers that force callers to understand internals). The ideal is maximum abstracted complexity per unit of API surface.
  - `abstraction-leakage` — consumers can use each subsystem's API without knowing implementation details. No leaked internal types, no required knowledge of internal state transitions, no "you need to call X before Y" patterns that aren't enforced by the type system.
  - `future-directions-preserved` — the architecture makes known long-term goals possible/easy without over-engineering for them. Explicitly identify which future directions become harder or impossible under this architecture.
  - `user-flow-ergonomics` — the user flows captured in the goal and exploration can be accomplished naturally and ergonomically through the proposed subsystem APIs. Awkward multi-step patterns or workarounds are findings.
  - `invalid-state-prevention` — the type system and API design make invalid states/actions hard or impossible to express. Classes of errors that are structurally prevented should be called out as design wins; classes that remain possible should be called out as risks.
  - `edge-case-coverage` — null/empty/error/boundary cases in user flows have explicit architectural handling, not ad-hoc patches at call sites.
  - `maturity-promotion-justified` — where maturity changes, the promotion is justified by evidence (dependent count, API stability, test coverage).
  - `breaking-change-surfaced` — breaking changes to stable/foundational APIs are surfaced explicitly, not buried in subsystem docs.
- Threshold: ≥3 each.
- Prompt sketch: *"Evaluate this architecture for design quality, not just structural correctness. For each subsystem: is it deep (hides complexity, simple API) or shallow (thin wrapper, leaks internals)? Can consumers use it without knowing how it works inside? For the overall architecture: do the user flows from the goal work naturally through these APIs, or do they require awkward workarounds? What classes of errors does this design make impossible by construction? What future directions does it preserve vs foreclose? Where maturity changes, is the promotion evidence-based? Any breaking changes to stable APIs must be surfaced explicitly."*

**`reviewer-slice-set`** — Slice-set heuristics & justification.
- Applies to: `slice-set`.
- Dimensions: `tracer-bullet-applied-or-justified`, `observability-early-applied-or-justified`, `known-unknowns-first-applied-or-justified`, `slice-scope-thin` (1–5).
- **Blocking checks (pass/fail, not scored):** `slice-dependency-dag-acyclic` — if the slice dependency graph has a cycle, the review fails immediately regardless of other scores, and the slice set must be revised before refinement can continue.
- Threshold: ≥3 on each scored dimension; any blocking check failure is an immediate rejection.
- Prompt sketch: *"The slicing techniques (tracer bullet, observability early, known unknowns first) are heuristics, not rules. Your job is not to check 'did they apply this' — it is to ask 'if they didn't apply this, why not?' A slicing that applies none but records clear justification passes. A slicing that omits them silently or with weak reasoning fails. Also: are the slices actually thin cross-sections, or fat vertical silos? Does the dependency graph have cycles?"*

**`reviewer-goal`** — Goal artifacts (epic, side-quest, slice).
- Applies to: `epic-goal`, `side-quest-goal`, `slice-goal`.
- Dimensions: `scope-bounded`, `non-goals-explicit`, `success-criteria-falsifiable`, `stakes-matched-to-rigor` (1–5).
- Threshold: ≥3 each.
- Prompt sketch: *"Is the scope bounded (a reader can tell whether a proposed change is in or out)? Are non-goals explicit? Are success criteria falsifiable — can you point at an observation that would prove the goal unmet? Is the rigor being asked for proportional to the stakes of what's being built?"*

### 7.3 Code-quality reviewers (code refinement loop)

**`reviewer-performance`** — `code-diff` — `hot-path-complexity`, `allocation-patterns`, `io-batching`, `query-shape` — ≥3 each — *"Identify hot paths in the diff and evaluate their algorithmic complexity. Flag allocations in inner loops. Note I/O that is not batched where it could be. For data-layer changes, examine the query shape — N+1, missing indexes, full-table scans."*

**`reviewer-reliability`** — `code-diff` — `error-handling-completeness`, `edge-case-coverage`, `recovery-path-present`, `failure-mode-documented` — ≥3 each — *"For every error path in the diff, is it handled, logged, and recoverable? Identify edge cases the code does not cover (empty, null, max, concurrent, partial). Is there a recovery path when this code's assumptions break? Are known failure modes documented?"*

**`reviewer-security`** — `code-diff` — `input-validation`, `auth-authz-check`, `secrets-handling`, `injection-surface` — ≥3 each; BLOCKING on missing input validation at trust boundaries — *"Every input from outside the trust boundary must be validated. Every auth check must be enforced on the server side. No secrets in source, logs, or error messages. Identify injection surfaces (SQL, command, path, template) and confirm they are parameterized or escaped."*

**`reviewer-domain-correctness`** — `code-diff` — `business-rule-adherence`, `invariant-maintenance`, `contract-fidelity` — ≥3 each — *"Does this diff implement the business rules stated in the plan and the affected subsystem docs? Does it maintain invariants marked on those subsystems? Where it implements a declared contract (API, interface, schema), is the implementation faithful?"*

**`reviewer-test-meaningfulness`** — `code-diff` — `tests-exercise-change`, `tests-test-behavior`, `tests-fail-for-right-reasons`, `no-cargo-cult` — ≥3 each; BLOCKING on any cargo-cult finding — *"For every test added or changed in this diff, trace: does it exercise the specific behavior the diff is supposed to add? Does it test observable behavior rather than implementation details? If the production change were reverted, would the test fail for the right reason? A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence. End with live observation. Flag cargo-culted tests."*

**`reviewer-code-style`** — `code-diff` — `consistency-with-codebase`, `naming-clarity`, `structure-fit`, `dead-code-absent` — ≥3 each — *"Does the code match the conventions file and the style of neighboring files? Are names clear and domain-accurate? Does the structure fit the existing module layout, or does it invent a parallel structure? Is all introduced code actually used?"*

### 7.4 Subsystem reviewers (dynamically routed)

**`reviewer-typescript`** — `code-diff` where subsystem is TypeScript-authored — `strict-flags-honored`, `unsafe-cast-absent`, `narrowing-idiomatic`, `type-expressiveness` — ≥3 each — *"Does this diff honor `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`? No `as any`, no `@ts-ignore`. Is narrowing done with idioms that keep the type system useful? Are types concrete and specific rather than `unknown`-laden escape hatches?"*

**`reviewer-data-layer`** — `code-diff` where subsystem is data-layer — `schema-compatibility`, `migration-reversibility`, `query-performance`, `consistency-model` — ≥3 each — *"Are schema changes backward-compatible at the wire level or explicitly versioned? Are migrations reversible, or is the irreversibility justified? Are queries indexed and avoid full scans on large tables? Is the consistency model (eventual, strong, transactional) stated and honored?"*

**`reviewer-tui-cli`** — `code-diff` where subsystem is CLI — `flag-naming-consistency`, `json-contract-stable`, `error-output-structured`, `help-text-present` — ≥3 each — *"Flag names match existing patterns (`--json`, `--query`, kebab-case). JSON output contract is stable or versioned. Errors go through the structured error envelope. Every subcommand has `--help` output that explains purpose, args, examples."*

**`reviewer-agent-skill`** — `code-diff` or `artifact=skill.md/agent.md` — `description-matches-behavior`, `tool-set-minimal`, `return-shape-honored`, `prompt-tight` — ≥3 each — *"For skills: does the description match the behavior? For agents: is the tool set the minimal sufficient set? Does the agent honor the sub-agent return format? Is the prompt tight — no preambles, no hedging, no redundant instructions?"*

**`reviewer-api-contract`** — `code-diff` where public API surface changes — `backward-compatibility`, `versioning-explicit`, `doc-updated` — ≥3 each — *"Are changes additive or behind a versioned surface? Is the change explicitly versioned, or is backward compatibility preserved? Is the API doc updated in the same slice?"*

**`reviewer-verification-spot-check`** — audit role at slice-land — samples N% of `chunk-verified` events, re-runs the verification method, compares observation to the one recorded. Divergence → IMPORTANT finding against the build agent; may retro-demote a chunk to unverified. *"Your job is to catch fabricated verification. Sample events. Re-run. Compare. Report divergence."*

---

## 8. Extractor specs

Extractors run at commit time (after refinement converges, before the event is emitted). They read the committed artifact and produce a structured payload attached to the commit event. Schemas below are Zod-shaped TypeScript.

**Extractors run in the CLI, not in the LLM.** When a command like `gp slice:plan-commit` is invoked, stdin carries `{ artifactPath }`, not an `extracted` payload. The CLI reads the artifact at the path, runs the appropriate extractor function, and produces the `extracted` struct that goes into the event payload. The LLM does not produce the extract; the CLI does. This guarantees that the extracted structured metadata is deterministic and consistent with the artifact content, rather than being whatever the LLM happened to send along. (Note: several stdin schemas in §6 currently show `extracted:` fields — `epic:goal-commit`, `epic:architecture-commit`, `epic:pressure-test-commit`, `epic:slices-draft`, `slice:plan-commit`. These are flagged for a later pass; the authoritative contract is that the CLI runs extractors, not the caller.)

**`ArchitectureExtract`**
```ts
{
  subsystems: Array<{
    id: string;
    name: string;
    maturity: "experimental" | "stabilizing" | "stable" | "foundational";
    description: string;
    owns: string[];          // module paths, interface names
    dependsOn: string[];     // subsystem ids
  }>;
  communicationPatterns: Array<{ from: string; to: string; mechanism: string }>;
  projectInvariants: string[]; // invariant ids proposed by this artifact
}
```

**`PlanExtract`**
```ts
{
  chunks: Array<{
    id: string;              // "c1", "c2", ...
    description: string;
    expectation: string;
    redTest: string;         // YAML/markdown snippet
    verificationMethod: string;
    verificationType: "live" | "supplementary-tests" | "impossible-with-reason";
    impossibilityReason?: string;
  }>;
  chunkDependencies: Array<{ from: string; to: string }>;
  affectedSubsystems: string[];
  rollbackPath: string;
}
```

**`SliceGoalExtract`**
```ts
{
  description: string;
  acceptanceCriteria: string[];
  affectedSubsystems: string[];
  dependsOn: string[];       // slice slugs
  scopeExclusions: string[];
}
```

**`EpicGoalExtract`**
```ts
{
  description: string;
  scope: string;
  nonGoals: string[];
  successCriteria: string[];
  initialSubsystemsAffected: string[];
}
```

**`SideQuestGoalExtract`**
```ts
{
  description: string;
  scope: string;
  verificationMethod: string;
  parentEpic: string | null;
}
```

**`BriefingExtract`**
```ts
{
  timeContext: string;       // "Today is 2026-04-08, epic X, 3 slices in"
  currentPosition: string;   // phase + slice + chunk
  lastActionNarrative: string;
  whereStopped: string;
  nextAction: string;
  attentionItems: string[];
  deepLinks: Array<{ label: string; path: string }>;
}
```

**`PressureTestExtract`**
```ts
{
  failureModes: Array<{ id: string; description: string; fakeableChunk: boolean }>;
  scalingCliffs: Array<{ dimension: string; threshold: string; consequence: string }>;
  optionalityLedger: Array<{ option: string; preservedBy: string }>;
  errorClassInventory: Array<{ class: string; example: string; preventable: boolean }>;
  lockedInAssumptions: string[];
  findings: Array<{ id: string; disposition?: "addressed" | "accepted-with-justification"; rationale?: string }>;
}
```

**`FindingExtract`**
```ts
{
  whatDoing: string;
  whatFound: string;
  whyMatters: string;
  whyNotNow: string;
  relatedSubsystems: string[];
  blocking: boolean;
  inScope: boolean;
}
```

**`SubsystemExtract`** (per-subsystem markdown file)
```ts
{
  slug: string;
  description: string;
  api: Array<{ name: string; signature: string; stability: "experimental" | "stable" | "frozen" }>;
  dataModels: Array<{ name: string; shape: string }>;
  dependentCount: number; // falsifiability check: "experimental" with 12 dependents is lying
  maintainedInvariants: string[]; // invariant ids
  knownLimitations: string[];
  futureDirections: string[];
  maturity: "experimental" | "stabilizing" | "stable" | "foundational";
}
```

Extractors are pure functions from (artifact text, schema) → extract. They run under the CLI, not the LLM; the LLM is responsible for producing a markdown file in the expected shape, and the extractor parses it. The rubric includes "extractable" as a hidden dimension: if the extractor cannot parse the artifact, the refinement loop reports a BLOCKING finding from the invariant-checker.

---

## 9. Skill set

Skills are orchestrators — they emit events through the CLI and consume derived state. They never touch `.goodplan/` directly.

### 9.1 Skill catalog

| Skill | Trigger | Phase(s) | Agents spawned | CLI surface used |
|---|---|---|---|---|
| `gp:init` | user | P0 | `onboard-phase` | `init`, `subsystem:register`, `milestone-committed` |
| `gp:status` | user | any (read) | — | `status`, `state`, `events:tail` |
| `gp:workflow-guide` | always-on | any (read) | — | `reviewer:list`, `rubric:show`, `events:query` |
| `gp:create-epic` | user | P1, P3, P4, P5 | `explore-phase`, `architecture-phase`, `pressure-test-phase`, `slices-phase`, reviewers, `editor`, `synthesis` | `epic:*`, `refine:*`, `phase:*` |
| `gp:explore` | user | P2 | `explore-phase`, reviewers | `phase:start explore`, `refine:*` |
| `gp:start-epic` | user | P6 | — | `epic:activate` |
| `gp:plan-slice` | user | P7, P8, P9 | `plan-phase`, reviewers, `editor`, `synthesis` | `slice:plan-*`, `refine:*` |
| `gp:implement-slice` | user | P10, P11 | `implement-phase` (per chunk), code-quality reviewers, `editor`, `synthesis` | `slice:chunk-*`, `slice:code-refine-*`, `refine:*` |
| `gp:land-slice` | user | P12 (+ epic completion if final slice) | `completion-slice`, `reviewer-verification-spot-check` (sampling); if final: `completion-epic` | `slice:land`, `architecture:commit`, `finding:triage`, `milestone-committed`; if final: `epic:complete` |
| `gp:create-side-quest` | user | S0, S1 | `explore-phase`, `plan-phase`, reviewers | `side-quest:*`, `refine:*` |
| `gp:implement-side-quest` | user | S2 | `implement-phase`, reviewers | `side-quest:chunk-*`, `side-quest:code-refine-*` |
| `gp:land-side-quest` | user | S3 | `completion-side-quest` | `side-quest:land`, `milestone-committed` |
| `gp:task` | user | any | — | `finding:capture` (categorized as task-style finding) |
| `gp:audit` | user | any | `audit-architecture-phase`, `audit-docs-phase`, `audit-tests-phase` | `events:query`, `finding:capture`×n |
| `gp:upgrade` | user | migration | `onboard-phase` | `migrate` |

**Skill splits vs. renames.** `gp:implement-slice` and `gp:land-slice` are **splits** of the current `plugin/skills/implement/` skill (one skill becomes two, divided at the P11/P12 boundary), not renames. `gp:implement-side-quest` and `gp:land-side-quest` are **new** skills: no current equivalent exists. The existing `plugin/skills/create-side-quest/` only handles side-quest creation (S0–S1); implementation and landing of side quests are new surface area in this design.

### 9.2 Sample skill prompt skeletons

**`gp:plan-slice` skeleton** (P7 → P8 → P9):

```
You are the plan-slice skill. You own phases P7 (plan-draft), P8 (plan-shape-checkpoint), and P9 (plan-refine).

CONTEXT (loaded by harness via CLI queries):
  <slice goal>
  <architecture-target>
  <affected subsystem docs>
  <rubric plan/v1>
  <recent learnings filtered by subsystem>
  <epic steering preference>

PHASE P7: Draft the plan.
  - Spawn plan-phase agent with the context above.
  - Receive draft; call `gp slice:plan-draft` with the draft path.
  - Read the verification-plausibility rubric dimensions and self-check before exiting draft.

PHASE P8: Plan-shape checkpoint.
  - Branch on the steering preference:
    - always-consult: call `gp slice:plan-shape-start`, present the draft to the user, iterate; on user "shape-approved" call `gp slice:plan-shape-approve`.
    - best-guess-and-flag: auto-shape the best skeleton you can, call `gp slice:plan-shape-auto`, and WRITE A BRIEFING flagging the decision.
    - ask-in-the-moment: notify user, wait briefly, proceed with best-guess on timeout.
  - REFUSE to enter P9 without a plan-shape-approved or plan-shape-auto-shaped event.

PHASE P9: Refine the plan.
  - Call `gp refine:start --artifact-type=plan --rigor=<routed>`.
  - For each round:
    - Dispatch reviewers in parallel via the Task tool.
    - Each reviewer calls `gp refine:score`.
    - Call `gp refine:synthesize`.
    - Call `gp refine:evaluate`.
      - If CONVERGED: `gp slice:plan-commit`, return SUCCESS.
      - If NOT_CONVERGED: spawn editor to apply changes, `gp refine:revise`, next round.
      - If STUCK: call `gp refine:stuck`, enter Pause Discipline with non-convergence briefing, return PARTIAL. **Convergence cost is a slicing signal:** a plan that won't converge is evidence the slice is too big or ambiguous. The non-convergence briefing must include this framing and present reshape (split the slice, simplify scope) as the default recommendation over "more rounds."

HARD RULES:
  - Never edit `.goodplan/` directly. Only CLI commands.
  - Never skip P8. The invariant engine will reject P9 without it anyway.
  - Never declare "done" without `refinement-converged`.
  - Tight writing: no preambles, no hedging, no redundant explanations in anything you write to the user.
```

**`gp:implement-slice` skeleton** (P10 → P11):

```
You are the implement-slice skill. You own phases P10 (implement) and P11 (code-refine).

CONTEXT:
  <committed plan with chunks>
  <architecture-target>
  <affected subsystem docs>
  <relevant learnings>

PHASE P10: Per-chunk red-green-verify loop.
  For each chunk in dependency order:
    1. `gp slice:chunk-start --chunk=<id>`
    2. Spawn implement-phase agent with the chunk contract:
       { description, expectation, redTest, verificationMethod, verificationType }
    3. Agent writes the red-test exactly as specified.
    4. Agent runs the red-test. Test MUST FAIL. If it passes, halt: the test is not exercising the intended behavior.
       `gp slice:chunk-red-written`, then `gp slice:chunk-red-failed` with failureMatchesIntent: true.
    5. Agent writes implementation until red-test passes.
       `gp slice:chunk-green`.
    6. Agent runs verification-method in the live environment. Captures observation (output, state, screenshot, curl response, log excerpt).
    7. Compare observation against expectation.
       - Match: `gp slice:chunk-verify` with evidence.
       - Mismatch: diagnose. Fix and retry, OR (if the expectation itself was wrong) pause — the plan must be revised, which re-enters P9.
       - Impossible at build time: `gp slice:chunk-unverifiable`, Pause Discipline → Unverifiable-Chunk Decision.

PHASE P11: Code refinement.
  1. `gp slice:code-refine-start`.
  2. Dispatch code-quality reviewers (routed by subsystem maturity).
  3. Loop: score → synthesize → evaluate → revise (as in P9).
  4. On CONVERGED: `gp slice:code-refine-commit`.

HARD RULES:
  - A test that passes because it tests almost nothing is worse than no test, because it manufactures confidence. If your red-test passes before code exists, the test is wrong; halt.
  - End with live observation.
  - Silent substitution with proxy signals is forbidden. If verification is impossible, surface it.
  - Evidence in `chunk-verified` must be non-empty. A bare boolean does not satisfy the schema.
```

**`gp:land-slice` skeleton** (P12):

```
You are the land-slice skill. You own P12.

CONTEXT:
  <committed plan>
  <slice diff>
  <mid-flight findings captured during implementation>
  <architecture-target>
  <architecture-current>

STEPS:
  1. Spawn completion-slice. It produces: discovery triage, proposed architecture deltas, proposed learnings, proposed side quests.
  2. Sample N% of chunk-verified events; dispatch reviewer-verification-spot-check. If divergence, flag IMPORTANT finding.
  3. For each proposed architecture delta:
     a. Run it through light refinement (holistic + invariant + context-transport).
     b. `gp epic:architecture-commit` if CONVERGED.
  4. For each proposed learning: `gp learning:capture`. Promote to invariant/convention if synthesis recommends.
  5. For each triaged finding: `gp finding:triage`.
  6. Write the slice-land briefing (next-action menu), `gp briefing:write`.
  7. `gp slice:land` — emits slice-landed + milestone-committed.

HARD RULES:
  - Never commit an architecture delta without refinement.
  - Never close P12 with untriaged findings.
```

### 9.3 Rename: quest → side-quest

All CLI commands and events use `side-quest`. The historical `quest-*` module names, transition files, and schemas rename to `side-quest-*`. The `gp:create-side-quest` skill keeps its name. The `quest:` CLI namespace is removed.

---

## 10. Agent types and contracts

Agents are stateless sub-processes invoked via the Task tool. They receive a structured prompt + context bundle and return structured JSON per the sub-agent return format.

### 10.1 Types

All agent types have access to all tools (Read, Grep, Glob, Write, Edit, Bash, etc.). Starting permissive; tool restrictions can be added later based on actual problems. The type distinction is about **role and return contract**, not tool access.

| Type | Role | Primary return | Escalation |
|---|---|---|---|
| **Phase agent** | Orchestrate a phase of work, produce artifacts | SUCCESS with artifact path OR PARTIAL with continuation | PARTIAL when user input genuinely needed; ask *one* answerable question |
| **Reviewer agent** | Evaluate an artifact against rubric dimensions | SUCCESS with `{ dimensions, findings, rationale }` | never PARTIAL; if the artifact is unreadable, return FAILED |
| **Editor agent** | Apply synthesized feedback to an artifact | SUCCESS with diff-paths | FAILED if the synthesized feedback is internally inconsistent |
| **Synthesis agent** | Merge multiple reviewer outputs into aggregate assessment | SUCCESS with `{ aggregatedPath, disagreements }` | never PARTIAL |
| **Pressure-test agent** | Adversarial analysis of architecture targets | SUCCESS with `{ artifactPath }` | PARTIAL if a locked-in assumption needs user confirmation to name |
| **Extractor agent** | Parse structured data from artifacts | SUCCESS with structured extract | FAILED if the artifact cannot be parsed |
| **Verifier agent** (build-time) | Run verification methods, capture evidence | SUCCESS with `{ evidencePath, matched }` | PARTIAL on "verification impossible in environment" with structured reason |
| **Completion agent** (slice, epic) | Triage findings, propose spine updates, capture learnings | SUCCESS with proposals | PARTIAL if a promotion decision needs user input |

### 10.2 Return format

```ts
type AgentReturn =
  | { status: "SUCCESS"; summary: string; filesWritten: string[]; payload: Record<string, unknown> }
  | { status: "PARTIAL"; summary: string; continuationFile: string; question?: string }
  | { status: "FAILED"; summary: string; reason: string };
```

PARTIAL questions must be answerable with a single response; *"a question that requires the user to guess what you were thinking is not a question — it is a puzzle."* The skill presents PARTIAL output to the user and resumes after the answer.

### 10.3 Reviewer prompt template

```
You are <reviewer-id>, version <version>.

Your domain: <domains joined>
You are reviewing: <artifact type> at <artifact path>
Round: <n>
Rigor level: <minimum | standard | full>

RUBRIC (you must score each dimension on the stated scale):
  <rubric dimensions inlined from rubric library>

CONTEXT:
  <always-on context: conventions snippet, invariant list for affected subsystems>
  <round-specific context: for round > 1, the DIFF since your prior pass, your prior findings, and the single question: "did your prior concerns get resolved, and are there new ones in the changed region?">

OUTPUT (strict JSON to stdin of `gp refine:score`):
  {
    "dimensions": { "<id>": <number>, ... },
    "findings": [ { "severity": "BLOCKING|CRITICAL|IMPORTANT|MINOR", "dimension": "<id>", "message": "<text>", "location": "<path#anchor or null>" }, ... ],
    "rationale": "<short paragraph>"
  }

HARD RULES:
  - Be specific. Generic findings are rejected.
  - Severity matters. BLOCKING means downstream cannot proceed; do not use lightly.
  - In round > 1, answer the single re-review question. Do not re-open settled dimensions.
```

---

## 11. Context bundle shape per phase

Each phase skill loads a context bundle at start. The CLI command `gp context:bundle --phase=<p> --scope=<ref>` assembles it; skills read from its output.

| Phase | Inlined (full content) | Referenced (path) | Derived state queries | Event history filters |
|---|---|---|---|---|
| P0 init | README.md, package.json, top-level tree | deep dirs | — | — |
| P1 epic-capture | architecture-current, conventions, subsystems summary | full subsystem docs, recent briefings | active decisions (top 20), open findings | last N=50 project events |
| P2 explore | epic goal, architecture-current | affected subsystems, prior research | related learnings by subsystem tag | epic exploration events |
| P3 architecture | epic goal, exploration outputs (budgeted), architecture-current, affected subsystems (full) | full prior research | active invariants | epic events since goal-committed |
| P4 pressure-test | architecture-target, architecture-current, invariants, conventions, affected subsystem docs | exploration | accepted findings from similar epics | epic events since architecture-target-committed |
| P5 slice-set | architecture-target, pressure-test report | affected subsystem docs | subsystem maturity | full epic events |
| P6 start-epic | epic goal, architecture-target, slice-set summary, active invariants | full architecture-current, affected subsystem docs | subsystem maturity, open findings | epic events since goal-committed |
| P7 plan-draft | slice goal, architecture-target, affected subsystem docs, rubric plan/v1 | related learnings, related decisions | findings tagged to affected subsystems | slice events |
| P8 plan-shape | drafted plan, slice goal, architecture-target | affected subsystem docs, rubric plan/v1 | prior plan-shape history for slice | slice plan events |
| P9 plan-refine | shaped plan, rubric plan/v1, subsystem invariants | plan-shape history | reviewer-registry list for this artifact | refinement events from current slice |
| P10 implement | committed plan (chunks), affected subsystem docs, red-test harness config | learnings by subsystem | — | chunk events |
| P11 code-refine | slice diff, committed plan, code/v1 rubric, affected subsystem docs | learnings | — | chunk verification events |
| P12 slice-land | slice plan, diff, findings captured in slice, architecture-target, architecture-current, conventions, invariants | learnings | pending findings for epic | slice events + findings |
| P12 (final slice) | above + epic goal, all slice summaries, all learnings | per-slice plans | subsystem maturity changes during epic | full epic events |

**Budget discipline.** The context bundler has a token budget. Inlined items consume budget first; referenced items are added to the bundle as path + 1-line summary so the agent can decide whether to Read them. "What context in this artifact is stale, unused, or crowding out what matters?" is answered at routing time, not by the agent.

---

## 12. Key command flows (worked examples)

### 12.1 Creating a new epic from scratch

```
User: "/gp:create-epic workflow-bug-fixes"

Skill:
  gp epic:create --slug=workflow-bug-fixes
    → epic-created { slug: "workflow-bug-fixes", dir: "2026-04-08_workflow-bug-fixes", ... }
  gp context:bundle --phase=epic-capture --scope=epic/workflow-bug-fixes...
  [design-tree interview with user]
  gp epic:set-steering < { value: "best-guess-and-flag", scope: "epic" }
    → epic-steering-preference-set
  [user confirms goal]
  gp epic:goal-draft
    → epic-goal-drafted
  gp refine:start --artifact-type=epic-goal --rigor=minimum
    → refinement-round-started
  [dispatch holistic, context-transport, goal reviewers in parallel via Task]
  [each reviewer calls] gp refine:score
    → reviewer-scored (×3)
  gp refine:synthesize
  gp refine:evaluate → CONVERGED
  gp refine:converge
  gp epic:goal-commit
    → epic-goal-committed

  [P2: explore]
  gp:explore runs iteratively; each cycle:
    gp phase:start --name=explore
    [explore-phase agent runs; writes research/brainstorm files]
    gp refine:start --artifact-type=research --rigor=minimum (per file)
    ...
    gp phase:submit --name=explore

  [P3: architecture]
  gp phase:start --name=architecture
  [architecture-phase agent drafts architecture-target.md]
  gp epic:architecture-draft
  gp refine:start --artifact-type=architecture-target --rigor=full
  [multi-round with reviewer-software-architecture + subsystem reviewers + always-on trio]
  gp refine:converge
  gp epic:architecture-commit
    → architecture-committed{target:target}

  [P4: pressure-test]
  gp phase:start --name=pressure-test
  [pressure-test-phase agent with "errors made impossible" prompt]
  gp epic:pressure-test-draft
  gp refine:start --artifact-type=pressure-test-report --rigor=minimum
  gp refine:converge
  gp epic:pressure-test-commit
  [for each finding] gp epic:pressure-test-finding-disposition

  [P5: slice-set]
  gp phase:start --name=slices
  [slices-phase agent drafts slice-set.md]
  gp epic:slices-draft
  gp refine:start --artifact-type=slice-set --rigor=full
  gp refine:converge
  gp epic:slices-commit
    → slice-created ×n, slice-set-committed

  gp milestone:commit --label="epic shaped"
  [user reviews via gp:start-epic]
  gp epic:activate
    → epic-activated
  gp milestone:commit --label="epic activated"
```

### 12.2 Planning a slice

```
gp slice:plan-draft workflow-bug-fixes/03_routing-function
  [plan-phase agent]
  → slice-plan-drafted

gp slice:plan-shape-start
  → plan-shape-checkpoint-reached
[preference is best-guess-and-flag, so auto-shape]
gp slice:plan-shape-auto < { guessSummary, reasoning, briefingId }
  → plan-shape-checkpoint-auto-shaped
gp briefing:write --trigger=shape-checkpoint

gp refine:start --artifact-type=plan --rigor=full
  [dispatch always-on trio + reviewer-plan + reviewer-verification-plausibility (BLOCKING) + reviewer-tui-cli + reviewer-typescript]
  [round 1: 2 BLOCKING findings on chunk c4's red-test]
gp refine:synthesize
gp refine:evaluate → NOT_CONVERGED
  [editor agent applies revisions]
gp refine:revise
  [round 2 — reviewers see DIFF, answer "are prior concerns resolved"]
gp refine:synthesize
gp refine:evaluate → CONVERGED
gp refine:converge
gp slice:plan-commit
  → slice-plan-committed
```

### 12.3 Implementing a slice (chunk c1)

```
gp slice:implement-start
gp slice:chunk-start --chunk=c1

  [verifier agent writes red-test]
  gp slice:chunk-red-written < { testPath, diffPath }

  [verifier runs test; captures failure output]
  gp slice:chunk-red-failed < { runOutputPath, failureMatchesIntent: true }
  [if failureMatchesIntent=false, halt]

  [implement-phase agent writes code until red-test passes]
  gp slice:chunk-green < { diffPath, runOutputPath }

  [verifier runs verification-method in live env]
  [captures stdout, state dump, and a JSON diff]
  gp slice:chunk-verify < {
    chunkId: "c1",
    method: "live",
    expectation: "After `task:defer 42 --until=2026-04-09`, `task:list --pending` excludes 42 today and includes it tomorrow.",
    observationPath: ".goodplan/.../evidence/c1-observation.json",
    evidencePath: ".goodplan/.../evidence/c1-full.tar"
  }
  → chunk-verified

[repeat for c2..cN]

[all chunks verified]
gp slice:code-refine-start
  [code-quality reviewers run; 1 IMPORTANT style finding]
gp refine:revise
gp refine:converge
gp slice:code-refine-commit
  → code-refinement-converged

gp slice:land
  → slice-landed, milestone-committed
```

### 12.4 Finding triggers triggered reshape

```
[During chunk c2 implementation, verifier discovers the plan's assumption about subsystem X's API is wrong.]
gp finding:capture < {
  whatDoing: "implementing c2 of slice 03",
  whatFound: "subsystem X's method `route()` returns a Promise, not a sync result",
  whyMatters: "chunks c3-c5 all assume sync. Plan is wrong.",
  whyNotNow: "c2's specific path doesn't hit this, but c3 does",
  relatedSubsystems: ["routing"],
  blocking: true,
  inScope: true
}
  → finding-captured

[Skill pauses current chunk, fires reshape flow]
gp briefing:write --trigger=non-convergence (or a new `reshape` trigger)
[user is presented the 2x2 decision]
  - Blocking + in-scope → reshape current slice's plan
gp reshape:propose --scope=slice
gp reshape:approve
gp reshape:apply
  → plan re-enters P9 (re-refinement on the revised plan)
  → chunk c2 work either rolls back or is re-scoped
```

### 12.5 Returning after a multi-day absence

```
User: "/gp:status"

Skill:
  gp briefing:latest --scope=current-branch
    → returns the most recent briefing-written event (sorted by timestamp)
  gp status --json
    → derived state: active epic, active slice, last chunk, last phase
  Skill presents:
    - Time context from the briefing
    - Current position (phase + slice + chunk)
    - Last action narrative
    - Where you stopped
    - Next action (from the briefing's next-action menu)
    - Attention items (auto-shaped checkpoints flagged, non-convergences, unresolved findings)
  User chooses from the next-action menu.
```

Every session start is a return experience.

---

## 13. Phase-to-skill-to-agent mapping

| Phase | Skill | Agents | Events (selected) | Artifacts | Trust gate |
|---|---|---|---|---|---|
| P0 init | `gp:init` | onboard-phase | project-initialized, architecture-committed, conventions-committed, subsystem-registered | architecture-current.md, conventions.md, invariants.md, subsystems/*.md | user approval |
| P1 epic-capture | `gp:create-epic` | design-tree interactive (skill), goal reviewers | epic-created, epic-goal-drafted, refinement-converged, epic-goal-committed | goal.md | goal refinement |
| P2 explore | `gp:explore` | explore-phase (iterative) | exploration-cycle-*, artifact-drafted, refinement-converged | research/*, brainstorm/*, prototypes/* | per-artifact light refinement |
| P3 architecture | `gp:create-epic` | architecture-phase, architecture + subsystem reviewers, editor, synthesis | architecture-target-drafted, reviewer-scored, refinement-converged, architecture-committed | architecture-target.md | full refinement |
| P4 pressure-test | `gp:create-epic` | pressure-test-phase (adversarial), light refiners | pressure-test-drafted/committed, pressure-test-finding-proposed/accepted | pressure-test.md | finding disposition + light refinement |
| P5 slice-set | `gp:create-epic` | slices-phase, slice-set reviewer, always-on trio | slice-set-drafted, refinement-converged, slice-set-committed, slice-created ×n | slice-set.md, slices/*/goal.md | full refinement |
| P6 epic-activate | `gp:start-epic` | — | epic-activated | — | user approval |
| P7 plan-draft | `gp:plan-slice` | plan-phase | slice-plan-drafted | plan.md | — |
| P8 plan-shape | `gp:plan-slice` | (interactive) | plan-shape-checkpoint-reached, plan-shape-approved or plan-shape-checkpoint-auto-shaped | plan.md revisions | shape-approved event |
| P9 plan-refine | `gp:plan-slice` | always-on trio, reviewer-plan, reviewer-verification-plausibility (BLOCKING), subsystem reviewers, editor, synthesis | refinement-round-*, reviewer-scored, refinement-converged, slice-plan-committed | plan.md (final) | plan refinement (BLOCKING on verification-plausibility) |
| P10 implement | `gp:implement-slice` | implement-phase, verifier (per chunk) | chunk-red-*, chunk-green-achieved, chunk-verified, chunk-unverifiable, chunk-unverifiable-decided | code, evidence/* | all chunks decided |
| P11 code-refine | `gp:implement-slice` | performance, reliability, security, domain-correctness, test-meaningfulness, code-style, subsystem reviewers, editor, synthesis | code-refinement-*, reviewer-scored, code-refinement-converged | code (revised) | code refinement convergence |
| P12 slice-land | `gp:land-slice` | completion-slice, reviewer-verification-spot-check (sampling), light refiners for spine deltas; if final: completion-epic | architecture-delta-committed, conventions-committed (if changed), invariants-committed (if changed), learning-captured, finding-triaged, slice-landed, milestone-committed; if final: epic-synthesis-committed, architecture-current-reconciled, epic-completed | architecture-current.md, conventions.md (if changed), invariants.md (if changed); if final: epic-synthesis.md | spine deltas refined + discoveries triaged; if final: synthesis refined + reconcile converged |
| S0 SQ-capture | `gp:create-side-quest` | goal reviewers | side-quest-created, side-quest-goal-committed | goal.md | goal refinement (light) |
| S1 SQ-explore-plan | `gp:create-side-quest` | explore-phase, plan-phase, reviewers | side-quest-plan-drafted, plan-shape-*, refinement-converged, side-quest-plan-committed | research/*, plan.md | plan refinement |
| S2 SQ-implement | `gp:implement-side-quest` | implement-phase, verifier, code reviewers | chunk-*, code-refinement-converged | code, evidence/* | all chunks decided + code-refined |
| S3 SQ-land | `gp:land-side-quest` | completion-side-quest | side-quest-landed, milestone-committed | side-quest-land.md | light refinement |

---

## 14. Judgment calls I made

Continuing from A–J in 07.

**K. Events use a single envelope with a discriminated-union `payload`, not per-type top-level fields.** Alternative: a Zod discriminatedUnion where every event type is its own top-level schema. I chose the envelope because the event log is append-only JSONL and a single shape simplifies streaming, schema migration, and grep-ability. Zod still validates the `payload` per type; the top-level envelope is stable.

**L. Content-addressed artifacts use `git hash-object -w` rather than a separate content-addressed store.** Alternative: a `.goodplan/blobs/` directory. I chose git's object store because it's already present, is incrementally packed, integrates with `git fsck`, and survives branch operations trivially. Downside: content isn't human-browsable without `git show`, but events carry `path` so it's traceable.

**M. Extractors run in the CLI, not in reviewers or skills.** Alternative: have the LLM emit the extract alongside the artifact. I chose CLI-side because the extract is the trust boundary between prose and machine-queryable state; letting the LLM emit it directly lets the LLM lie about what the artifact contains. The LLM's job is to produce parseable markdown; the extractor's job is to pull structure out.

**N. Refinement is invoked through `gp refine:*` commands that are artifact-type-agnostic rather than per-artifact commands.** Alternative: `gp plan:refine`, `gp architecture:refine`, etc. I chose type-agnostic because the substrate logic is identical; per-artifact commands would duplicate 90% of the surface. The artifact type is a parameter.

**O. The reviewer registry lives at `plugin/reviewers/<id>.md` (shipped defaults) with project-level overrides at `.goodplan/reviewers/<id>.md`.** Alternative: registry as a single JSON file. I chose markdown-with-YAML-frontmatter because it mirrors how skills and agents already live and because reviewers *are* prompts plus metadata, not pure config.

**P. Rubrics use YAML files at `plugin/rubrics/<artifact-type>/<version>.yaml`.** Alternative: TypeScript modules. I chose YAML because rubrics are frequently edited, are read by both humans and the convergence evaluator, and don't execute logic. The convergence evaluator is TypeScript and consumes the parsed YAML.

**Q. "code" as an artifact type goes through the substrate as a diff (not full files).** Alternative: review the whole repo. I chose diff because reviewers fatigue on unchanged code and the change-scoped re-review principle (C-P5) applies at the first round too, not just re-review rounds. The rubric includes "changes are complete" dimensions that catch missing-file issues.

**R. Phase-boundary commands moved from unnamespaced (`start-plan`) under `gp phase:*`.** Alternative: keep bare verbs. The codebase inventory calls this out as a cleanup target. I namespaced for consistency with the "every command is entity-namespaced" rule; the entity is `phase`.

**S. Side-quests share the `refine:*` surface with epics and slices rather than having a dedicated `side-quest:refine:*` namespace.** Alternative: parallel surfaces. Same reasoning as N.

**T. Pre-tool-use hooks protect these path patterns only: `.goodplan/**/*.jsonl`, `.goodplan/**/architecture-*.md`, `.goodplan/**/invariants.md`, `.goodplan/conventions.md`, `.goodplan/subsystems/**/*.md`, and `.goodplan/learnings/**/*.md`.** Alternative: block the entire `.goodplan/` tree. I chose narrow protection so that CLI-created scratch files inside epic dirs (draft artifacts, extracted content) can be edited during iterative drafting without hook fighting. The integrity targets are the spine and the log.

**U. Briefings are full first-class artifacts written to `.goodplan/briefings/<slug>.md`** (e.g. `pre-flight-slice-01.md`, `r1-routing-complexity.md`) and tracked by event, not reconstructed from the event log on demand. Alternative: lazy reconstruction. I chose eager because briefings are written *when context is fresh* and reconstruction after-the-fact loses the reasoning narrative. This is per the briefing discipline in 07.

**V. The "architecture delta" during slice-land is not a separate artifact type.** It's an in-place edit of `architecture-current.md` that goes through the substrate as an `architecture-current` refinement round before commit. Alternative: a dedicated `architecture-delta` artifact type. I chose in-place because the delta is only meaningful relative to the current state; a separate type would invite drift where the delta "exists" but hasn't been applied.

**W. Decisions and learnings use per-record `.md` files referenced by events**, not inline prose in events. Alternative: inline. I chose per-record files because (a) the current schema already has `learning.file`, so this extends a working pattern; (b) events are JSONL lines and large prose blows up the log.

**X. The convergence evaluator takes the event stream for an artifact (not the artifact text).** The evaluator is a pure function of `reviewer-scored` events + the rubric; it never reads the artifact itself. The rubric defines the bar in terms of scores and findings. This keeps convergence checkable without loading artifact content.

**Y. `gp phase:transition` is a read-only check command that the skill consults** before invoking the actual transition-emitting command. Alternative: fold the check into every emit command. I kept it separate so skills can *ask* "am I allowed to transition?" without attempting; this supports dry-run and planning logic.

**Z. The verifier agent is a distinct agent type from the implement-phase agent.** Alternative: fold verification into implement-phase. I chose separation because the two roles have different postures: implement-phase builds, verifier adversarially checks. A single agent that did both would be tempted to claim verification without running it (C-P12). Both have access to all tools (per the permissive-first policy), but the role separation in their prompts makes fakery structurally harder.

**AA. Red-test evidence requires the captured output showing the initial failure, not just a boolean flag.** Alternative: record only the `failureMatchesIntent` boolean. I chose the full output because without it, the "test was observed to fail" claim collapses to an LLM assertion, which the meta-principle forbids.

**BB. The `chunk.red-test-failed-before-green` invariant requires the red-test-failed event to have `failureMatchesIntent: true`.** Alternative: any red-test-failed counts. I chose the stricter version because a test that fails for the wrong reason (e.g., a syntax error) is not evidence that the test exercises the intended behavior, and the invariant's purpose is to guarantee that evidence.

**CC. Invariants are versioned via events, not file edits.** `invariant-activated` and `invariant-deactivated` events drive the active set at event-emission time. Alternative: compile-time invariant set. I chose event-versioning because the same log must replay correctly against whatever invariants were active when an event was emitted, which is a property of the log itself, not of the current CLI binary.

**DD. The hybrid TypeScript-core + YAML-extensible invariant model ships with ~22 core invariants and 0 extensible invariants in the default project.** Projects add their own YAML invariants via `gp invariant:propose`. Alternative: all YAML. I chose the hybrid because core invariants guard the substrate itself and must not be overridable; allowing them in YAML would let a project disable "chunk.evidence-non-empty," which would defeat the whole design.

**EE. The rigor dial maps maturity → rigor as a table, not a function.** `experimental → minimum`, `stabilizing → standard`, `stable → standard`, `foundational → full`. Four maturity levels, three rigor tiers. `stabilizing` and `stable` both map to `standard` rigor — the distinction is API stability expectations (stable means API is fixed, multiple dependents, breaking changes need justification), not review depth. Alternative: a weighted function over multiple inputs. I chose a simple table because the whole point of the dial is to remove judgment from the gating; the simplest deterministic mapping is the clearest. Projects that want a richer function can override via an extensible invariant.

**FF. Milestones commit at: epic-shaped, epic-activated, each slice-landed, epic-completed, each side-quest-landed.** These are the points where the event log makes sense to a human reader and where rollback cost is bounded. Alternative: commit per event or per session. Per-event is too noisy; per-session is too coarse.

### 14b. Judgment calls added in refinement

**GG. Pause Discipline placed as a new subsection under §3 (Phases) rather than as a separate top-level section or integrated into each phase.** Rationale: the discipline applies across phases, so consolidating it in one place prevents duplication; placing it under §3 after the phase catalog lets it reference specific phases by number. Alternative considered: integrating the pre-flight rule into each autonomy-window phase's description (P2, P7–P9, P10, P11). Rejected because it would scatter the discipline and make it harder to see the reactive-vs-scheduled distinction as a coherent system.

**HH. `architecture-target-*` events are distinct from the generic `architecture-committed`.** Rationale: invariants literally check the specific type strings, and having distinct event names matches how other scope-specific events are named. Alternative: use `architecture-committed { target: "target" }` predicate. Rejected for clarity and ease of invariant matching.

**II. `exploration-cycle-*` is multiple distinct events** (started, research/brainstorm/prototype captured, completed, concluded) rather than a single event family with a discriminator. Rationale: each event has different payload fields and different invariant triggers; merging them would require discriminated unions that complicate the schema. Alternative: one `exploration-event { subtype: ... }` event. Rejected for field-level specificity.

**JJ. Determinism-vs-judgment acknowledgment placed in §2 Foundational decisions as a new bullet.** Rationale: §2 is where premises live; this is a premise about how the workflow handles the deterministic gating / judgment-laden content boundary. Alternative considered: separate section. Rejected as over-structuring for what is a framing statement.

**KK. "TDD is additive" stated explicitly in §3.2 P10 introduction rather than only in reviewer prompts.** Rationale: the rule is load-bearing and must be visible to any reader of the implementation phase, not only reviewers. Alternative: reviewer-only placement. Rejected because it buries the rule.

**LL. Discovery matrix placed as a standalone subsection near finding events.** Rationale: the matrix is referenced throughout the doc but never defined; a single definition point prevents future drift. Alternative: scattered in finding events and reshape commands. Rejected for consistency.

**MM. Slicing heuristics expansion preserves the verbatim framing from 07 §4.7 rather than summarizing.** Rationale: reviewers need the exact phrasings to enforce the "why didn't you?" contract; paraphrasing would weaken it.

**NN. `finding-triaged` disposition vocabulary updated to match the Discovery matrix subsection** (`reshape-epic | new-epic | expand-target | defer-side-quest | defer-task | drop`). Rationale: the matrix provides the conceptually correct decomposition; the original event vocabulary conflated "reshape current epic" with "expand target" and didn't distinguish "new epic" from "side quest." The matrix vocabulary is canonical going forward. Alternative: keep both vocabularies. Rejected because it creates drift.

**OO. Renames applied as surgical edits rather than global search-replace, with each occurrence verified for context.** Specifically, `milestone:commit` left in place where it references the CLI command, and renamed where it references the event. This matches the existing code conventions in the codebase where commands and events are intentionally distinguished.

**QQ. Blocking checks (like DAG acyclicity) separated from scored dimensions in reviewer contracts.** Rationale: binary facts don't belong on a 1-5 spectrum; conflating them creates false precision. Blocking checks are pass/fail and failing one causes immediate rejection regardless of other scores. Alternative: hack a 5=pass/1=fail scoring. Rejected for clarity and to avoid reviewer confusion.

**PP. Multi-person merge subsection placed in §2 Foundational decisions.** Rationale: this is a premise about how the workflow handles concurrent collaboration, and §2 is where premises live. Alternative considered: §15 Scope boundary (as an implication of Option 1 PR policy). Rejected because it is a design assertion, not a scope statement.

**RR. P2 (Explore) classified as collaborative with research/brainstorm cycles requiring user presence.** Rationale: the user explicitly stated "brainstorming and exploration sessions are extremely collaborative; they generally can't be done alone by the LLM." The research portions are autonomous; the brainstorming portions require the user. Alternative: keep P2 as autonomous with check-ins. Rejected per user direction.

**SS. P5 (Slice definition) classified as autonomous-with-checkpoint, not collaborative.** Rationale: the user explicitly stated that once the architecture exists, "the LLM usually has enough information to propose a good set of slices." The user reviews and adjusts at a checkpoint rather than co-creating. Alternative: collaborative like P3. Rejected per user direction.

**TT. Architecture-shape checkpoint added between P3 and P4.** Rationale: same pattern as plan-shape checkpoint; the user wants to shape the architecture before autonomous refinement begins. Post-refinement optional checkpoint also added so the user can review what refinement changed. Both follow the generalized artifact lifecycle pattern: collaborative design → shape checkpoint → autonomous refinement → optional post-refinement review → committed.

**UU. Between-slice review checkpoint added as optional between P12 and next P7.** Rationale: the user said "there might be times when the user wants to check the implementation before we move on to the next slice." Controlled by steering preference; in `always-consult` mode, the workflow pauses; in `best-guess-and-flag` mode, it proceeds and flags.

**VV. Six IMPORTANT drift fixes from 08-vs-01 comparison (I1–I6).** Applied in a single pass:
- **I1:** Restored 4-level maturity taxonomy (`experimental → stabilizing → stable → foundational`). 08 had collapsed `stable` out; 01 requires it. `stabilizing` and `stable` both map to `standard` rigor; the distinction is API stability expectations and breaking-change sensitivity.
- **I2:** Added Discovery Ledger decay trigger. Findings older than N epics without promotion or reference are surfaced for culling during slice-land triage. Directly from 01's "explicit decay" requirement.
- **I3:** Added convergence-cost-as-slicing-signal to the STUCK path in P9. When a plan won't converge, the non-convergence briefing now frames reshape (split/simplify) as the default recommendation. From 01: "the right response is reshape, not more rounds."
- **I4:** Restored 5 granular reshape options for blocking+in-scope findings (expand current slice, insert before, insert after, reshape epic, promote to own epic). 08 had collapsed these into a single "reshape-epic" disposition. The `finding-triaged` event disposition enum now includes all five plus the existing out-of-scope options.
- **I5:** Added `relevanceWeight` field (`high | medium | low`) to `reviewer-scored` events and `gp refine:score` command. The convergence evaluator uses weight as a multiplier: high-weight below threshold blocks; low-weight below threshold warns. From 01's "weighted scoring by relevance."
- **I6:** Added `dependentCount` to `SubsystemExtract` and `subsystem-registered` event. The count is a falsifiability check: "experimental" with twelve dependents is lying. From 01's maturity tracking section.

**WW. Collaboration-model event schemas and CLI commands added for architecture-shape and slice-shape checkpoints.** These were referenced in phase descriptions (P3, P5) and the Pause Discipline table but not formally defined. Added: 7 new events (`architecture-shape-checkpoint-reached`, `architecture-shape-approved`, `architecture-shape-checkpoint-auto-shaped`, `slice-set-drafted`, `slice-shape-checkpoint-reached`, `slice-shape-approved`, `slice-shape-checkpoint-auto-shaped`), 6 CLI commands (`gp epic:architecture-shape-{start,approve,auto}`, `gp epic:slices-shape-{start,approve,auto}`), and 2 invariants (`epic.architecture-shape-approval-required`, `epic.slice-shape-approval-required`). All follow the same pattern as the existing plan-shape checkpoint infrastructure.

**XX. User feedback pass — 9 structural changes applied:**
- **Simplified ID model.** Entity IDs = slugs (human-readable). Event IDs = UUIDs (globally unique across branches to prevent merge conflicts in JSONL files). Directory names = `<YYYY-MM-DD>_<slug>/` (date prefix for chronological sorting, no random suffix). ULIDs dropped in favor of standard UUIDs. Rationale: slugs are unique enough given the one-person-per-epic model; UUIDs prevent merge conflicts when branches append to the same event logs; dates in directory names help humans navigate.
- **Hook-protected files, not write-blessed directories.** Reframed from "three write-blessed directories" to a specific list of integrity-critical files (events.jsonl, spine files) that are hook-protected from direct LLM writes. Artifact content files are LLM-writable. Aligns with judgment call T's narrow protection model.
- **One person per epic, merge at completion.** Replaced the multi-person merge resilience section. One person works on one epic at a time, branched off main. Main has no active epic. Multiple people can work on different epics simultaneously on different branches. Merge conflicts resolved at merge time. Eliminates significant complexity.
- **Enriched slice-land, eliminated separate epic-land.** P12 now updates architecture-current, conventions, invariants, and captures learnings at every slice boundary. The final slice detects it's the last one and triggers epic completion automatically (cross-slice synthesis, architecture reconciliation, maturity transitions, side-quest proposals). P13 removed from the phase list. Rationale: incremental spine updates are more accurate (context is fresh) and make epic-land redundant.
- **Expanded reviewer-software-architecture.** Added 6 new dimensions: api-depth-vs-surface-area, abstraction-leakage, future-directions-preserved, user-flow-ergonomics, invalid-state-prevention, edge-case-coverage. Richer prompt that evaluates design quality, not just structural correctness.
- **CLI status with suggested next steps.** `gp status --json` now returns a `suggestedNextSteps` array derived from the event log and invariant engine. Skills use this to orient themselves rather than re-deriving state.
- **All 8 open questions resolved.** See §16 for decisions. Key: existing reviewer set as bootstrap starting point; maturity inference from git logs on onboarding; side-quests allowed during epic work; evidence stored in repo; task grouping on promotion to side-quest/epic.
- **Agent tool restrictions: start permissive.** All agent types have access to all tools. Type distinction is about role and return contract, not tool access. Restrictions can be added later based on actual problems.
- **Retained full reviewer diversity.** The existing reviewer set (language, web, AI tooling, specialists, scientific) is explicitly listed and carries over into the new registry format.

---

## 15. Scope boundary

What this document covers: the target implementation at specification level. What it does not cover:

| Deferred to | Topic |
|---|---|
| Implementation time | Concrete module layout, file paths inside `src/`, test harness wiring |
| Implementation time | TypeScript type-level encoding of the event discriminator (Zod v4 `exactOptionalPropertyTypes` workarounds per the project memory note) |
| Implementation time | SQLite caching of derived state (deferred until profiling) |
| Implementation time | Performance tuning and context-bundle budgeter implementation |
| Migration plan | Sequencing of work to move from current `.goodplan/` to target |
| Migration plan | Legacy event translation (if any events exist in the current state machine's history that need replaying) |
| Migration plan | Rollout strategy to installed plugin |
| A later refinement pass | Full reviewer prompts (sketched here only) |
| A later refinement pass | Full rubric YAML contents per rubric version (dimensions sketched here only) |
| Bootstrapping | Mapping existing reviewer set into new YAML registry format (starting point defined; mapping is implementation work) |

**Code drafter is authorized to decide:** module decomposition, helper function extraction, internal derived-state representation, test file layout, citty subcommand tree wiring, concrete reviewer registry file names, commit-hook script details, how context bundler implements token budgeting.

**Code drafter must return to the user for:** adding new event types, changing invariant behavior, altering the phase set, changing the two non-negotiable constraints, changing the verification-type taxonomy, changing the rigor dial mapping.

---

## 16. Resolved questions

These were open questions resolved by user decisions:

1. **Reviewer registry bootstrapping.** **Resolved: use existing reviewer set as starting point.** The project already has a rich reviewer set (language-specific, web, AI tooling, specialists, scientific). These are mapped into the new YAML registry format, updated to include refinement-loop-specific requirements (change-scoped re-review, relevance weighting), and refined from there. This is much better than hand-authoring from scratch. The reviewer set is flagged as "bootstrap — trusted by fiat" until the first full refinement cycle validates them.

2. **Git-blob content addressing vs. a readable mirror.** **Resolved: no mirror; CLI blob retrieval is sufficient.** `gp events:show <id> --blob` retrieves historical versions. The user can ask the LLM to pull up any historical document. No extra path to protect, no extra spec complexity.

3. **Should `learning-captured` events be protected by hooks?** **Resolved: yes, protected, CLI-only.** All edits go through `gp learning:*` commands. Start strict; relax later if this creates friction.

4. **`gp:task` semantics.** **Resolved: keep as marker-field variant.** Tasks are `finding-captured` with `kind: "task"`. When a task is promoted to a side quest or epic, the LLM scans all open tasks and proposes grouping related tasks into the same side-quest/epic ("these 3 tasks all touch the notification routing module — want to group them?").

5. **Pre-existing subsystem maturity on onboarding.** **Resolved: LLM proposes maturity based on heuristics; user confirms.** The onboard agent examines git log frequency, contributor count, API stability (how often function signatures change), test coverage, and PR review patterns (if `gh` CLI is available and authenticated) to propose maturity levels per subsystem. The user corrects any that are wrong. This is better than defaulting everything to `experimental` and better than asking the user to classify from scratch.

6. **Concurrent side-quests during P10.** **Resolved: allow side-quests during epic/slice work.** Side quests may be needed to unblock the current slice (e.g., fix an unrelated bug). The `side-quest.single-active-per-branch` invariant still limits to one active side quest at a time, but it can run concurrent with an in-progress slice.

7. **`architecture-current` editorial locking.** **Resolved: no branch-freshness check.** Landing an epic without being up-to-date with main is fine. Merge conflicts in both code and `.goodplan/` state are resolved at merge time, same as today. The one-person-per-epic model makes this a normal rebase workflow.

8. **Evidence-storage path.** **Resolved: keep evidence in the repo under the epic/side-quest directory.** Evidence files live at `.goodplan/epics/<dir>/slices/<slice>/evidence/` (or equivalent for side quests). They are part of the project's decision history, are small (markdown + small text files), and belong in the repo for auditability. No temp dirs, no vacuum.

---

*"Trust is earned through evidence, not asserted through production."* Everything in this document is a consequence.
