# Ideal Implementation

The implementation spec for the workflow-bug-fixes epic. Code drafted from this doc should be able to start writing TypeScript against citty, Zod v4, and an append-only JSONL event log without guessing the shapes of events, commands, reviewers, extractors, or skills. This is not the migration plan and it is not the code; it is the target the code is written *to*.

> **Trust is earned through evidence, not asserted through production.**
>
> *LLM output is a claim; evidence is what makes the claim true.*

The entire design is a consequence of two non-negotiable constraints:

1. **Refinement before handoff.** Any substantive LLM-produced artifact is untrusted until multiple specialized sub-agents have reviewed it across multiple rounds, producing structured scores against a defined rubric, converging on a mechanical bar that signals it is ready to hand off. No handoff happens until the bar is met.
2. **Execution verification before done.** When an LLM implements code, the work is not "done" until the LLM has directly executed the code in a live environment, observed the actual result, and verified that the observation matches a pre-specified expectation. Tests alone are not sufficient. When verification is impossible, that fact is surfaced to the user as a real decision.

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
| Naming: `<YYYY-MM-DD>_<slug>_<6charsuffix>` for epic and side-quest directories and artifact files | Collision-resistant across branches; suffix is 6 chars of Crockford base32 over a random 30-bit value. |
| ULIDs for system IDs (events, findings, briefings, reviewer scores); slugs for user-facing entity names | ULIDs sort lexicographically by time; slugs are stable identifiers readable in briefings and prompts. |
| `architecture-current.md` at `.goodplan/` root; `architecture-target.md` inside each active epic directory | The spine always reflects what the codebase *is*; the epic holds what it is becoming. |
| Three write-blessed directories for CLI output | `.goodplan/`, `.goodplan/epics/<dir>/`, `.goodplan/side-quests/<dir>/`. Anything else is a hook-blocked path. |
| Single branch, single active epic, single active side-quest | `≤1 active epic per branch`, `≤1 active side-quest per branch`, parallel slices within an epic gated by declared dependencies, same slice on two branches forbidden. |
| PR Option 1 | Epic branches stay alive until the epic is complete, then merge to `main`. Multi-person collab happens on the epic branch. |

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
| P12 | Slice-land | slice | `gp:land-slice` | spine deltas refined; discoveries triaged |
| P13 | Epic-land | epic | `gp:complete-epic` | cross-slice synthesis refined; architecture-current reconciled |
| S0 | Side-quest-capture | side-quest | `gp:create-side-quest` | goal refined (light) |
| S1 | Side-quest-explore-plan | side-quest | `gp:create-side-quest` | plan refinement |
| S2 | Side-quest-implement | side-quest | `gp:implement-side-quest` | per-chunk verification |
| S3 | Side-quest-land | side-quest | `gp:land-side-quest` | light refinement |

The epic path is **P0 → P1 → P2 → P3 → P4 → P5 → P6 → (P7 → P8 → P9 → P10 → P11 → P12)* → P13**. The side-quest path is **S0 → S1 → S2 → S3** and is concurrent with, but cannot interleave inside, a single slice's P7–P12 sequence on the same branch.

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

#### P2 — Explore

- **Entry:** `epic-goal-committed` present; user triggered exploration OR skill decides exploration is needed.
- **Skill:** `gp:explore`.
- **Context bundle:** epic goal (inline), architecture-current (inline), conventions (reference), prior research in this epic (references), design-tree state (if prior).
- **Agents spawned:** `explore-phase` (one per cycle, iterative, returns PARTIAL).
- **Events emitted:** `exploration-cycle-started`, `research-captured`, `brainstorm-captured`, `prototype-captured`, `exploration-cycle-completed`, `exploration-concluded`.
- **Artifacts:** `.goodplan/epics/<dir>/research/<date>_<slug>_<suffix>.md`, `.goodplan/epics/<dir>/brainstorm/<date>_<slug>_<suffix>.md`, `.goodplan/epics/<dir>/prototypes/<slug>/`.
- **Trust gate:** each artifact goes through light refinement (holistic + context-transport only). Prototypes are not refined — they are evidence for brainstorms.
- **Exit:** user signals exploration-done OR skill detects design-tree "no open high-value branches."

#### P3 — Shape: architecture

- **Entry:** `epic-goal-committed`; exploration artifacts available.
- **Skill:** `gp:create-epic` (resumes for shape sub-phase).
- **Context bundle:** epic goal, architecture-current, affected subsystems (inline full contents), exploration outputs (inline tightly budgeted), pressure-test history for affected subsystems.
- **Agents spawned:** `architecture-phase` (drafts `architecture-target.md`), reviewer set at full rigor.
- **Events emitted:** `architecture-target-drafted`, `reviewer-scored` (multiple), `refinement-round-*`, `architecture-target-committed`.
- **Artifacts:** `.goodplan/epics/<dir>/architecture-target.md`.
- **Trust gate:** architecture artifact refinement, **rigor = max(maturity of affected subsystems)**. Always-on reviewers + subsystem-specific reviewers + `reviewer-software-architecture` + `reviewer-invariant-checker`.
- **Exit:** `artifact-converged { artifact: architecture-target }`.

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

#### P5 — Shape: slice set

- **Entry:** `pressure-test-committed`.
- **Skill:** `gp:create-epic` (resumes).
- **Context bundle:** architecture-target, pressure-test report, affected subsystems with maturity, epic goal.
- **Agents spawned:** `slices-phase`, reviewer set including the slicing reviewer whose contract is **"why didn't you apply this technique?"** not "did you apply it?"
- **Events emitted:** `slice-set-drafted`, `reviewer-scored`, `slice-set-committed`, `slice-created` (one per slice).
- **Artifacts:** `.goodplan/epics/<dir>/slices/<n>_<slug>/goal.md` per slice; `.goodplan/epics/<dir>/slice-set.md` (the set as a unit).
- **Trust gate:** slice-set refinement. Slicing techniques (tracer bullet, observability early, known unknowns first) checked as heuristics; omissions need justification.
- **Exit:** `slice-set-committed` AND every slice has a `slice-created` event with a committed goal.

#### P6 — Epic-activate

- **Entry:** `slice-set-committed`.
- **Skill:** `gp:start-epic`.
- **Context bundle:** architecture-target, slice set, pressure-test findings, steering preference.
- **Agents spawned:** none (user-interactive review).
- **Events emitted:** `epic-activated`.
- **Trust gate:** user explicitly approves.
- **Exit:** `epic-activated` present; `epic.single-active-per-branch` now holds with this epic as the active one.

#### P7 — Slice-plan-draft

- **Entry:** `epic-activated` AND target slice has `slice-created` but no `slice-plan-drafted`; slice dependencies (declared in its goal) are all `slice-landed`.
- **Skill:** `gp:plan-slice`.
- **Context bundle:** slice goal, architecture-target, affected-subsystem files, related decisions, related learnings by subsystem tag, recent findings, reviewer rubric for `plan/v1`.
- **Agents spawned:** `plan-phase`.
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
- **Events emitted:** `refinement-round-started`, `reviewer-scored` (n per round), `refinement-synthesized`, `slice-plan-revised`, `refinement-converged` OR `refinement-circuit-breaker-tripped`.
- **Trust gate:** convergence evaluator returns `CONVERGED` for `plan.md`.
- **Exit:** `slice-plan-committed`.

If convergence returns `STUCK`, the Pause Discipline fires. If any chunk is `impossible-with-reason`, the Unverifiable-Chunk Decision fires.

#### P10 — Slice-implement (red-green-verify loop per chunk)

- **Entry:** `slice-plan-committed` AND every chunk has a decidable verification-type (`live`, `supplementary-tests`, or `impossible-with-reason` with an accepted user decision).
- **Skill:** `gp:implement-slice`.
- **Context bundle:** committed plan, affected subsystem files, architecture-target, relevant learnings, red-test harness config.
- **Agents spawned:** `implement-phase` (per chunk), no reviewers during implementation (reviewers run in P11).
- **Events emitted per chunk:** `slice-implementation-chunk-started`, `chunk-red-test-written`, `chunk-red-test-failed` (evidence: run output), `chunk-green-achieved` (evidence: test output), `chunk-verified { chunk-id, method, expectation, observation, red-test-initial-failure, red-test-final-pass, matched: true, evidence-ref }` OR `chunk-unverifiable { chunk-id, reason, user-decision }`. On chunk failure with plan revision: `slice-plan-revision-proposed`, routing back to P9.
- **Trust gate:** every chunk has `chunk-verified { matched: true }` OR `chunk-unverifiable-decided { choice: accepted-with-reason OR awaiting-user-verification }`.
- **Exit:** invariant `chunk.all-decided` holds for the slice.

#### P11 — Slice-code-refine

- **Entry:** `chunk.all-decided` holds.
- **Skill:** `gp:implement-slice` (continues).
- **Context bundle:** full slice diff (against `main`), committed plan, subsystems touched.
- **Agents spawned:** reviewers from the code-quality set: `reviewer-performance`, `reviewer-reliability`, `reviewer-security`, `reviewer-domain-correctness`, `reviewer-test-meaningfulness`, `reviewer-code-style`, + subsystem-specific reviewers (e.g., `reviewer-typescript`, `reviewer-data-layer`, `reviewer-cli`). `editor` and `synthesis` agents as in P9.
- **Events emitted:** `code-refinement-round-started`, `reviewer-scored`, `code-refinement-synthesized`, `slice-code-revised`, `code-refinement-converged`.
- **Trust gate:** convergence evaluator returns `CONVERGED` against `code/v1` rubric.
- **Exit:** `code-refinement-converged`.

**Slice cannot land** until every chunk has `chunk-verified { matched: true }` (or accepted alternative) **and** the slice's code has `code-refinement-converged`.

#### P12 — Slice-land

- **Entry:** `code-refinement-converged`.
- **Skill:** `gp:land-slice`.
- **Context bundle:** slice plan, diff, mid-flight findings for this slice, architecture-target.
- **Agents spawned:** `completion-slice` (triages discoveries, proposes spine deltas, proposes side quests), optionally `reviewer-verification-spot-check` (samples N% of `chunk-verified` events and re-runs verification).
- **Events emitted:** `findings-triaged`, `architecture-delta-proposed`, `architecture-delta-committed`, `learning-captured`, `decision-recorded` (if any), `side-quest-proposed`, `slice-landed`, `milestone:commit`.
- **Artifacts:** architecture deltas written into `architecture-current.md` AND (if the epic's target deviates) into `architecture-target.md`; learnings at `.goodplan/learnings/<date>_<slug>_<suffix>.md`.
- **Trust gate:** each spine delta is itself a small refined artifact (light rigor).
- **Exit:** `slice-landed`.

#### P13 — Epic-land

- **Entry:** every slice in the epic has `slice-landed` OR `slice-abandoned` with recorded reason; no unresolved blocking findings.
- **Skill:** `gp:complete-epic`.
- **Context bundle:** epic goal, all slice summaries, all learnings, architecture-current, architecture-target.
- **Agents spawned:** `completion-epic`, reviewer set for the synthesis artifact (light-to-standard rigor).
- **Events emitted:** `epic-synthesis-drafted`, `reviewer-scored`, `epic-synthesis-committed`, `architecture-current-reconciled`, `epic-completed`.
- **Artifacts:** `.goodplan/epics/<dir>/epic-land.md`, updates to `architecture-current.md`, `invariants.md`, `conventions.md`, per-subsystem files.
- **Trust gate:** reconciliation between `architecture-current` and `architecture-target` runs through refinement; conflicts flagged as STUCK if unresolved.
- **Exit:** `epic-completed`.

#### S0–S3 — Side-quest lifecycle

Side quests use a compressed path: capture → plan (with optional exploration folded in) → implement → land. They use the **same** trust gates as slices (refinement on plan, red-green-verify per chunk, code refinement after implementation) but default to minimum-rigor routing unless affected subsystems force higher rigor.

| Phase | Entry | Events | Exit |
|---|---|---|---|
| S0 Capture | no active side-quest on branch | `side-quest-created`, `side-quest-goal-committed` (light refine) | goal committed |
| S1 Explore-plan | goal committed | `side-quest-plan-drafted`, `plan-shape-approved`, `refinement-converged`, `side-quest-plan-committed` | plan committed |
| S2 Implement | plan committed | `chunk-*` as in P10 | `chunk.all-decided` |
| S3 Land | chunks decided & code-refined | `side-quest-landed`, `milestone:commit` | landed |

Side quests do not produce spine updates unless the `completion-side-quest` agent proposes them and the user accepts. Findings triggered during a side quest escalate to the active epic (if any) through the discovery matrix.

---

## 4. Event schemas

### 4.1 Common envelope

Every event is a single JSONL line with this shape:

```ts
type EventEnvelope = {
  id: string;                       // ULID (26 chars)
  ts: string;                       // ISO-8601 UTC with milliseconds
  scope: "project" | "epic" | "side-quest";
  scopeRef: string | null;          // slug/dir of the epic or side-quest (null for project)
  actor: { kind: "user" | "cli" | "skill" | "agent"; id: string };
  branch: string;                   // current git branch
  commitHint: string | null;        // HEAD at emit time; null if unborn
  type: string;                     // kebab-case event type
  payload: Record<string, unknown>; // validated by the event's Zod schema
  prevId: string | null;            // ULID of previous event in this scope, for log-chain sanity
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
- Required: `slug: string`, `dir: string`, `date: string` (YYYY-MM-DD), `suffix: string` (6 chars)
- Invariants triggered: `epic.dir.unique`, `epic.single-active-per-branch` precondition

**`epic-goal-drafted`** — `artifact: ContentRef`, `version: number`
**`epic-goal-committed`** — `artifact: ContentRef`, `extracted: EpicGoalExtract` (see §8)
**`epic-steering-preference-set`** — `value: "always-consult" | "best-guess-and-flag" | "ask-in-the-moment"`, `scope: "epic" | { upcomingCheckpoints: number }`
**`epic-activated`** — `userConfirmation: string`
**`epic-paused`** — `reason: string`, `resumeHint: string`
**`epic-resumed`** — (no payload)
**`epic-completed`** — `synthesis: ContentRef`
**`epic-abandoned`** — `reason: string`, `learningsCaptured: number`

**`side-quest-created`** — `slug: string`, `dir: string`, `date: string`, `suffix: string`, `parentEpic: string | null`
**`side-quest-goal-committed`** — `artifact: ContentRef`, `extracted: SideQuestGoalExtract`
**`side-quest-landed`** — `summary: ContentRef`
**`side-quest-abandoned`** — `reason: string`

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
**`slice-code-refinement-started`** — `diff: ContentRef`
**`code-refinement-round-started`** — `round: number`
**`slice-code-revised`** — `diff: ContentRef`
**`code-refinement-converged`** — `finalDiff: ContentRef`, `roundsTaken: number`
**`slice-landed`** — `summary: ContentRef`, `deltasPromoted: number`, `findingsTriaged: number`
**`slice-abandoned`** — `reason: string`

#### Spine updates

**`architecture-committed`** — `artifact: ContentRef`, `target: "current" | "target"`, `extracted: ArchitectureExtract`
**`conventions-committed`** — `artifact: ContentRef`
**`invariants-committed`** — `artifact: ContentRef`, `changeset: { added: string[]; removed: string[]; modified: string[] }`
**`subsystem-registered`** — `slug: string`, `maturity: "experimental" | "stabilizing" | "foundational"`, `file: ContentRef`
**`subsystem-maturity-updated`** — `slug: string`, `from: string`, `to: string`, `rationale: string`
**`subsystem-retired`** — `slug: string`, `reason: string`

#### Findings & discoveries

**`finding-captured`** — `id: string` (ULID), `whatDoing: string`, `whatFound: string`, `whyMatters: string`, `whyNotNow: string`, `relatedSubsystems: string[]`, `blocking: boolean`, `inScope: boolean`
**`finding-triaged`** — `findingId: string`, `disposition: "in-slice" | "new-slice-in-epic" | "side-quest" | "backlog" | "drop"`, `rationale: string`

#### Refinement

**`artifact-drafted`** — `artifactType: string`, `artifact: ContentRef`, `producer: string`
**`artifact-revised`** — `artifactType: string`, `from: ContentRef`, `to: ContentRef`, `producer: string`
**`refinement-round-started`** — `artifactType: string`, `artifactRef: ContentRef`, `round: number`, `reviewers: string[]`, `rigor: "minimum" | "standard" | "full"`
**`reviewer-scored`** — `artifactType: string`, `artifactVersion: ContentRef`, `reviewerId: string`, `reviewerVersion: string`, `round: number`, `dimensions: Record<string, number>`, `findings: Array<{ severity: "BLOCKING" | "CRITICAL" | "IMPORTANT" | "MINOR"; dimension: string; message: string; location: string | null }>`, `rationale: string`
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

**`briefing-written`** — `id: string` (ULID), `trigger: "r1" | "pre-flight" | "end-of-autonomy" | "non-convergence" | "unverifiable-chunk" | "shape-checkpoint" | "session-pause"`, `artifact: ContentRef`, `extracted: BriefingExtract`

#### Decisions & learnings

**`decision-recorded`** — `id: string` (ULID), `domain: string`, `title: string`, `summary: string`, `supersedes: string | null`, `reconsiderWhen: string[]`, `file: ContentRef`
**`learning-captured`** — `id: string` (ULID), `category: "domain" | "worked" | "didnt-work" | "do-differently"`, `summary: string`, `tags: string[]`, `subsystems: string[]`, `validUntil: string[] | null`, `file: ContentRef`
**`learning-promoted`** — `learningId: string`, `to: "convention" | "invariant" | "architecture" | "subsystem-doc"`, `rationale: string`

#### Pauses & steering

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
  "id": "01JPV5C6W3QK6Y7E8BZ3N1X4YF",
  "ts": "2026-04-08T17:22:11.431Z",
  "scope": "epic",
  "scopeRef": "2026-04-06_workflow-bug-fixes_a7k2z8",
  "actor": { "kind": "agent", "id": "reviewer-verification-plausibility@v1" },
  "branch": "epic/workflow-bug-fixes",
  "commitHint": "6f94683a",
  "type": "reviewer-scored",
  "prevId": "01JPV5C6S8K4Q9M2N5B7T3H6WX",
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
| `slice.single-active-per-branch` | At most one active slice per branch | `slice-implementation-started` | count_limit | count of in-flight slices on branch ≤ 1 | "active slice already exists: {slug}" |
| `side-quest.single-active-per-branch` | At most one active side quest per branch | `side-quest-plan-committed` | count_limit | count of in-flight side quests on branch ≤ 1 | "active side quest already exists: {slug}" |
| `slice.plan-shape-approval-required` | Refinement cannot run on an unshaped plan | `refinement-round-started` where artifactType=plan | precondition | `plan-shape-approved` OR `plan-shape-checkpoint-auto-shaped` for this plan | "plan-shape checkpoint not closed" |
| `slice.plan-converged-before-implement` | No implementation without a converged plan | `slice-implementation-started` | precondition | `slice-plan-committed` for slice | "plan not converged" |
| `slice.plan-chunks-decidable` | Every chunk must have a verification-type the CLI accepts | `slice-plan-committed` | all_match | every chunk in extracted plan has `verification-type` ∈ {live, supplementary-tests, impossible-with-reason} | "chunk {id} has no verification-type" |
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
| `briefing.written-at-pause` | Every pause must write a briefing | `pause-entered` | required | same-scope `briefing-written` within a 1-event window | "pause without briefing" |

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

### 6.1 Global

| Command | Purpose | Emits |
|---|---|---|
| `gp init` | Initialize project (auto-detect onboard vs fresh) | `project-initialized`, `architecture-committed`, `conventions-committed`, `subsystem-registered`×n |
| `gp status [--json]` | Derived-state snapshot of current scope | (read-only) |
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
| `gp epic:goal-commit <slug>` | — | `{ artifactPath: string; extracted: EpicGoalExtract }` | `epic-goal-committed` |
| `gp epic:set-steering <slug>` | — | `{ value: "always-consult" \| "best-guess-and-flag" \| "ask-in-the-moment"; scope: "epic" \| { upcomingCheckpoints: number } }` | `epic-steering-preference-set` |
| `gp epic:activate <slug>` | — | `{ userConfirmation: string }` | `epic-activated` |
| `gp epic:pause <slug>` | `--reason=<s>` | — | `epic-paused` |
| `gp epic:resume <slug>` | — | — | `epic-resumed` |
| `gp epic:complete <slug>` | — | `{ synthesisPath: string }` | `epic-completed`, `epic-synthesis-committed` |
| `gp epic:abandon <slug>` | `--reason=<s>` | — | `epic-abandoned` |
| `gp epic:architecture-draft <slug>` | — | `{ target: "target"; artifactPath: string }` | `architecture-target-drafted` |
| `gp epic:architecture-commit <slug>` | — | `{ artifactPath: string; extracted: ArchitectureExtract }` | `architecture-committed{target:target}` |
| `gp epic:pressure-test-draft <slug>` | — | `{ artifactPath: string }` | `pressure-test-drafted` |
| `gp epic:pressure-test-commit <slug>` | — | `{ artifactPath: string; extracted: PressureTestExtract }` | `pressure-test-committed`, `pressure-test-finding-proposed`×n |
| `gp epic:pressure-test-finding-disposition` | — | `{ findingId; disposition; promotedTo? }` | `pressure-test-finding-accepted` |
| `gp epic:slices-draft <slug>` | — | `{ artifactPath: string; slices: Array<SliceGoalExtract> }` | `slice-set-drafted` |
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
| `gp slice:plan-commit <epic>/<slice>` | `{ artifactPath; extracted: PlanExtract }` | `slice-plan-committed` |
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
| `gp refine:score` | `{ artifactType; artifactPath; reviewerId; round; dimensions; findings; rationale }` | `reviewer-scored` |
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

Phase names: `explore`, `architecture`, `pressure-test`, `slices`, `plan`, `plan-shape`, `refinement`, `implementation`, `code-refinement`, `slice-land`, `epic-land`, plus side-quest equivalents.

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
| `gp subsystem:register` | `{ slug; maturity; filePath }` | `subsystem-registered` |
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

### 6.12 Error output

All commands return JSON errors on stderr when `--json` is set:

```json
{ "error": { "code": "INVARIANT_FAILED", "invariant": "slice.plan-shape-approval-required", "message": "plan-shape checkpoint not closed", "details": { ... } } }
```

Error codes: `INVARIANT_FAILED`, `SCHEMA_INVALID`, `NOT_FOUND`, `ALREADY_EXISTS`, `STATE_CONFLICT`, `EVIDENCE_MISSING`, `HOOK_BLOCKED`, `ROUTING_NO_REVIEWERS`, `CONVERGENCE_STUCK`, `USER_ABORTED`, `INTERNAL`.

---

## 7. Reviewer registry (populated)

Reviewers are YAML-fronted markdown files at `.goodplan/reviewers/<id>.md` (project-level overrides) or shipped in the plugin at `plugin/reviewers/<id>.md` (default set). The initial set bootstraps hand-authored; subsequent changes go through refinement.

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
- Rubric dimensions: `internal-consistency`, `claim-support`, `scope-alignment` (1–5 each).
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

**`reviewer-architecture`** — Architecture-level design.
- Applies to: `architecture-target`, `architecture-current`.
- Dimensions: `subsystem-boundary-clarity`, `dependency-direction-sound`, `maturity-promotion-justified`, `breaking-change-surfaced` (1–5).
- Threshold: ≥3 each.
- Prompt sketch: *"Are subsystem boundaries defined by what they own and what crosses them, not by file location? Are dependency directions acyclic and justified? Where maturity changes, is the promotion justified by evidence? Any breaking changes to stable APIs must be surfaced to the user explicitly, not buried in subsystem docs."*

**`reviewer-slice-set`** — Slice-set heuristics & justification.
- Applies to: `slice-set`.
- Dimensions: `tracer-bullet-applied-or-justified`, `observability-early-applied-or-justified`, `known-unknowns-first-applied-or-justified`, `slice-scope-thin`, `slice-dependency-dag-acyclic` (1–5).
- Threshold: ≥3; BLOCKING on acyclic violation.
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

**`reviewer-cli`** — `code-diff` where subsystem is CLI — `flag-naming-consistency`, `json-contract-stable`, `error-output-structured`, `help-text-present` — ≥3 each — *"Flag names match existing patterns (`--json`, `--query`, kebab-case). JSON output contract is stable or versioned. Errors go through the structured error envelope. Every subcommand has `--help` output that explains purpose, args, examples."*

**`reviewer-agent-skill`** — `code-diff` or `artifact=skill.md/agent.md` — `description-matches-behavior`, `tool-set-minimal`, `return-shape-honored`, `prompt-tight` — ≥3 each — *"For skills: does the description match the behavior? For agents: is the tool set the minimal sufficient set? Does the agent honor the sub-agent return format? Is the prompt tight — no preambles, no hedging, no redundant instructions?"*

**`reviewer-api-contract`** — `code-diff` where public API surface changes — `backward-compatibility`, `versioning-explicit`, `doc-updated` — ≥3 each — *"Are changes additive or behind a versioned surface? Is the change explicitly versioned, or is backward compatibility preserved? Is the API doc updated in the same slice?"*

**`reviewer-verification-spot-check`** — audit role at slice-land and epic-land — samples N% of `chunk-verified` events, re-runs the verification method, compares observation to the one recorded. Divergence → IMPORTANT finding against the build agent; may retro-demote a chunk to unverified. *"Your job is to catch fabricated verification. Sample events. Re-run. Compare. Report divergence."*

---

## 8. Extractor specs

Extractors run at commit time (after refinement converges, before the event is emitted). They read the committed artifact and produce a structured payload attached to the commit event. Schemas below are Zod-shaped TypeScript.

**`ArchitectureExtract`**
```ts
{
  subsystems: Array<{
    id: string;
    name: string;
    maturity: "experimental" | "stabilizing" | "foundational";
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
  steeringPreference: "always-consult" | "best-guess-and-flag" | "ask-in-the-moment";
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
  maintainedInvariants: string[]; // invariant ids
  knownLimitations: string[];
  futureDirections: string[];
  maturity: "experimental" | "stabilizing" | "foundational";
}
```

Extractors are pure functions from (artifact text, schema) → extract. They run under the CLI, not the LLM; the LLM is responsible for producing a markdown file in the expected shape, and the extractor parses it. The rubric includes "extractable" as a hidden dimension: if the extractor cannot parse the artifact, the refinement loop reports a BLOCKING finding from the invariant-checker.

---

## 9. Skill set

Skills are orchestrators — they emit events through the CLI and consume derived state. They never touch `.goodplan/` directly.

### 9.1 Skill catalog

| Skill | Trigger | Phase(s) | Agents spawned | CLI surface used |
|---|---|---|---|---|
| `gp:init` | user | P0 | `onboard-phase` | `init`, `subsystem:register`, `milestone:commit` |
| `gp:status` | user | any (read) | — | `status`, `state`, `events:tail` |
| `gp:workflow-guide` | always-on | any (read) | — | `reviewer:list`, `rubric:show`, `events:query` |
| `gp:create-epic` | user | P1, P3, P4, P5 | `explore-phase`, `architecture-phase`, `pressure-test-phase`, `slices-phase`, reviewers, `editor`, `synthesis` | `epic:*`, `refine:*`, `phase:*` |
| `gp:explore` | user | P2 | `explore-phase`, reviewers | `phase:start explore`, `refine:*` |
| `gp:start-epic` | user | P6 | — | `epic:activate` |
| `gp:plan-slice` | user | P7, P8, P9 | `plan-phase`, reviewers, `editor`, `synthesis` | `slice:plan-*`, `refine:*` |
| `gp:implement-slice` | user | P10, P11 | `implement-phase` (per chunk), code-quality reviewers, `editor`, `synthesis` | `slice:chunk-*`, `slice:code-refine-*`, `refine:*` |
| `gp:land-slice` | user | P12 | `completion-slice`, `reviewer-verification-spot-check` (sampling) | `slice:land`, `architecture:commit`, `finding:triage`, `milestone:commit` |
| `gp:complete-epic` | user | P13 | `completion-epic`, reviewers | `epic:complete`, `architecture:commit`, `milestone:commit` |
| `gp:create-side-quest` | user | S0, S1 | `explore-phase`, `plan-phase`, reviewers | `side-quest:*`, `refine:*` |
| `gp:implement-side-quest` | user | S2, S3 | `implement-phase`, reviewers | `side-quest:chunk-*`, `side-quest:code-refine-*`, `side-quest:land`, `milestone:commit` |
| `gp:task` | user | any | — | `finding:capture` (categorized as task-style finding) |
| `gp:audit` | user | any | `audit-architecture-phase`, `audit-docs-phase`, `audit-tests-phase` | `events:query`, `finding:capture`×n |
| `gp:upgrade` | user | migration | `onboard-phase` | `migrate` |

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
      - If STUCK: call `gp refine:stuck`, enter Pause Discipline with non-convergence briefing, return PARTIAL.

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

| Type | Tool allowance | Primary return | Escalation |
|---|---|---|---|
| **Phase agent** | Read, Grep, Glob, Write (scoped to temp output dir) | SUCCESS with artifact path OR PARTIAL with continuation | PARTIAL when user input genuinely needed; ask *one* answerable question |
| **Reviewer agent** | Read, Grep, Glob, (no Write) | SUCCESS with `{ dimensions, findings, rationale }` | never PARTIAL; if the artifact is unreadable, return FAILED |
| **Editor agent** | Read, Edit, Write (scoped) | SUCCESS with diff-paths | FAILED if the synthesized feedback is internally inconsistent |
| **Synthesis agent** | Read (no Write) | SUCCESS with `{ aggregatedPath, disagreements }` | never PARTIAL |
| **Pressure-test agent** | Read, Grep, Glob, Write (pressure-test.md) | SUCCESS with `{ artifactPath }` | PARTIAL if a locked-in assumption needs user confirmation to name |
| **Extractor agent** | Read (no Write) | SUCCESS with structured extract | FAILED if the artifact cannot be parsed |
| **Verifier agent** (build-time) | Read, Bash (for running verification methods), Write (scoped to evidence dir) | SUCCESS with `{ evidencePath, matched }` | PARTIAL on "verification impossible in environment" with structured reason |
| **Completion agent** (slice, epic) | Read, Grep, Glob, Write (scoped) | SUCCESS with proposals | PARTIAL if a promotion decision needs user input |

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
| P7 plan-draft | slice goal, architecture-target, affected subsystem docs, rubric plan/v1 | related learnings, related decisions | findings tagged to affected subsystems | slice events |
| P9 plan-refine | shaped plan, rubric plan/v1, subsystem invariants | plan-shape history | reviewer-registry list for this artifact | refinement events from current slice |
| P10 implement | committed plan (chunks), affected subsystem docs, red-test harness config | learnings by subsystem | — | chunk events |
| P11 code-refine | slice diff, committed plan, code/v1 rubric, affected subsystem docs | learnings | — | chunk verification events |
| P12 slice-land | slice plan, diff, findings captured in slice, architecture-target, architecture-current | learnings | pending findings for epic | slice events + findings |
| P13 epic-land | epic goal, all slice summaries, all learnings, architecture-current, architecture-target | per-slice plans | subsystem maturity changes during epic | full epic events |

**Budget discipline.** The context bundler has a token budget. Inlined items consume budget first; referenced items are added to the bundle as path + 1-line summary so the agent can decide whether to Read them. "What context in this artifact is stale, unused, or crowding out what matters?" is answered at routing time, not by the agent.

---

## 12. Key command flows (worked examples)

### 12.1 Creating a new epic from scratch

```
User: "/gp:create-epic workflow-bug-fixes"

Skill:
  gp epic:create --slug=workflow-bug-fixes
    → epic-created { slug, dir: "2026-04-08_workflow-bug-fixes_x7k2z8", ... }
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
  [multi-round with reviewer-architecture + subsystem reviewers + always-on trio]
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
gp slice:plan-draft 2026-04-08_wbf_x7k2z8/03_routing-function
  [plan-phase agent]
  → slice-plan-drafted

gp slice:plan-shape-start
  → plan-shape-checkpoint-reached
[preference is best-guess-and-flag, so auto-shape]
gp slice:plan-shape-auto < { guessSummary, reasoning, briefingId }
  → plan-shape-checkpoint-auto-shaped
gp briefing:write --trigger=shape-checkpoint

gp refine:start --artifact-type=plan --rigor=full
  [dispatch always-on trio + reviewer-plan + reviewer-verification-plausibility (BLOCKING) + reviewer-cli + reviewer-typescript]
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
    → returns the most recent briefing-written event (ULID-sorted)
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
| P12 slice-land | `gp:land-slice` | completion-slice, reviewer-verification-spot-check (sampling), light refiners for spine deltas | architecture-delta-committed, learning-captured, finding-triaged, slice-landed, milestone-committed | architecture-current.md (partial), slice-land.md | spine deltas refined + discoveries triaged |
| P13 epic-land | `gp:complete-epic` | completion-epic, light refiners | epic-synthesis-committed, architecture-current-reconciled, epic-completed, milestone-committed | epic-land.md, architecture-current.md (final reconcile) | synthesis refined + reconcile converged |
| S0 SQ-capture | `gp:create-side-quest` | goal reviewers | side-quest-created, side-quest-goal-committed | goal.md | goal refinement (light) |
| S1 SQ-explore-plan | `gp:create-side-quest` | explore-phase, plan-phase, reviewers | side-quest-plan-drafted, plan-shape-*, refinement-converged, side-quest-plan-committed | research/*, plan.md | plan refinement |
| S2 SQ-implement | `gp:implement-side-quest` | implement-phase, verifier, code reviewers | chunk-*, code-refinement-converged | code, evidence/* | all chunks decided + code-refined |
| S3 SQ-land | `gp:implement-side-quest` | completion-side-quest | side-quest-landed, milestone-committed | side-quest-land.md | light refinement |

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

**T. Pre-tool-use hooks protect three path patterns only: `.goodplan/**/*.jsonl`, `.goodplan/**/architecture-*.md`, `.goodplan/**/invariants.md`, `.goodplan/conventions.md`, `.goodplan/subsystems/**/*.md`, and `.goodplan/learnings/**/*.md`.** Alternative: block the entire `.goodplan/` tree. I chose narrow protection so that CLI-created scratch files inside epic dirs (draft artifacts, extracted content) can be edited during iterative drafting without hook fighting. The integrity targets are the spine and the log.

**U. Briefings are full first-class artifacts written to `.goodplan/briefings/<ulid>.md`** and tracked by event, not reconstructed from the event log on demand. Alternative: lazy reconstruction. I chose eager because briefings are written *when context is fresh* and reconstruction after-the-fact loses the reasoning narrative. This is per the briefing discipline in 07.

**V. The "architecture delta" during slice-land is not a separate artifact type.** It's an in-place edit of `architecture-current.md` that goes through the substrate as an `architecture-current` refinement round before commit. Alternative: a dedicated `architecture-delta` artifact type. I chose in-place because the delta is only meaningful relative to the current state; a separate type would invite drift where the delta "exists" but hasn't been applied.

**W. Decisions and learnings use per-record `.md` files referenced by events**, not inline prose in events. Alternative: inline. I chose per-record files because (a) the current schema already has `learning.file`, so this extends a working pattern; (b) events are JSONL lines and large prose blows up the log.

**X. The convergence evaluator takes the event stream for an artifact (not the artifact text).** The evaluator is a pure function of `reviewer-scored` events + the rubric; it never reads the artifact itself. The rubric defines the bar in terms of scores and findings. This keeps convergence checkable without loading artifact content.

**Y. `gp phase:transition` is a read-only check command that the skill consults** before invoking the actual transition-emitting command. Alternative: fold the check into every emit command. I kept it separate so skills can *ask* "am I allowed to transition?" without attempting; this supports dry-run and planning logic.

**Z. The verifier agent is a distinct agent type from the implement-phase agent.** Alternative: fold verification into implement-phase. I chose separation because the two roles have different postures: implement-phase builds, verifier adversarially checks. A single agent that did both would be tempted to claim verification without running it (C-P12). The verifier has Bash and evidence-writing tools; the implementer has code-writing tools. The separation makes fakery structurally harder.

**AA. Red-test evidence requires the captured output showing the initial failure, not just a boolean flag.** Alternative: record only the `failureMatchesIntent` boolean. I chose the full output because without it, the "test was observed to fail" claim collapses to an LLM assertion, which the meta-principle forbids.

**BB. The `chunk.red-test-failed-before-green` invariant requires the red-test-failed event to have `failureMatchesIntent: true`.** Alternative: any red-test-failed counts. I chose the stricter version because a test that fails for the wrong reason (e.g., a syntax error) is not evidence that the test exercises the intended behavior, and the invariant's purpose is to guarantee that evidence.

**CC. Invariants are versioned via events, not file edits.** `invariant-activated` and `invariant-deactivated` events drive the active set at event-emission time. Alternative: compile-time invariant set. I chose event-versioning because the same log must replay correctly against whatever invariants were active when an event was emitted, which is a property of the log itself, not of the current CLI binary.

**DD. The hybrid TypeScript-core + YAML-extensible invariant model ships with ~22 core invariants and 0 extensible invariants in the default project.** Projects add their own YAML invariants via `gp invariant:propose`. Alternative: all YAML. I chose the hybrid because core invariants guard the substrate itself and must not be overridable; allowing them in YAML would let a project disable "chunk.evidence-non-empty," which would defeat the whole design.

**EE. The rigor dial maps maturity → rigor as a table, not a function.** `experimental → minimum`, `stabilizing → standard`, `foundational → full`. Alternative: a weighted function over multiple inputs. I chose a simple table because the whole point of the dial is to remove judgment from the gating; the simplest deterministic mapping is the clearest. Projects that want a richer function can override via an extensible invariant.

**FF. Milestones commit at: epic-shaped, epic-activated, each slice-landed, epic-completed, each side-quest-landed.** These are the points where the event log makes sense to a human reader and where rollback cost is bounded. Alternative: commit per event or per session. Per-event is too noisy; per-session is too coarse.

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
| Bootstrapping | Initial reviewer registry — hand-authored; the honest loss from 07 §7 |

**Code drafter is authorized to decide:** module decomposition, helper function extraction, internal derived-state representation, test file layout, citty subcommand tree wiring, concrete reviewer registry file names, commit-hook script details, how context bundler implements token budgeting.

**Code drafter must return to the user for:** adding new event types, changing invariant behavior, altering the phase set, changing the two non-negotiable constraints, changing the verification-type taxonomy, changing the rigor dial mapping.

---

## 16. Open questions for the user

These are genuine uncertainties I could not resolve with best judgment alone.

1. **Reviewer registry bootstrapping.** The honest loss from 07 §7 is still open. The initial reviewer set is hand-authored and not reviewed by the substrate (chicken-and-egg). Do you want: (a) user hand-authors ~15 reviewers as a one-time bootstrap, flagged in the repo as "trusted by fiat"; (b) write a small "bootstrap pressure test" that the user runs once to sanity-check the initial set against known good/bad artifacts; (c) import an existing reviewer set from a sibling project if one exists? I've assumed (a) in the doc; confirm or redirect.

2. **Git-blob content addressing vs. a readable mirror.** §14.L chooses `git hash-object -w`. This makes artifact bodies addressable via git but means `cat .goodplan/epics/<dir>/slices/03/plan.md` always reads the *live* working-copy file, not the committed-at-event version. Do you want a readable mirror (e.g., a copy-on-commit into `.goodplan/events/<ulid>/plan.md`) in addition to the blob? If yes, it's another 50 lines of spec and one extra path to protect; if no, readers will need `gp events:show <id> --blob` to retrieve a historical version.

3. **Should `learning-captured` events be protected by hooks?** §14.T excludes `.goodplan/learnings/**/*.md` from hook protection — wait, I actually added it to the list. Double-check: learnings are referenced from events and are ground-truth for grounding decisions, so protecting them matches the spine. But they are also frequently edited ad-hoc by users as they learn things. Should users be able to edit learning files directly, or must all edits go through `gp learning:*` commands? I defaulted to "protected, CLI-only" in §14.T; confirm.

4. **`gp:task` semantics.** The current skill is a lightweight quick-capture ("bug, idea, todo"). In the new model it becomes a specialization of `finding-captured`, but tasks are not the same as mid-flight findings — a task is captured *out of flow* (no "what I was doing" at the moment), while a finding is captured *in flow*. Do we keep `gp:task` as a distinct skill that emits `finding-captured` with a marker field `kind: "task"`, or fold it entirely into `gp:explore` / `gp:create-side-quest`? I've kept it as a marker-field variant; if that's wrong, `finding-captured`'s schema needs a discriminator.

5. **Pre-existing subsystem maturity on onboarding.** When `gp init` runs `onboard-phase` on an existing codebase, what maturity does it assign to detected subsystems? All `experimental` is safe but means nothing is foundational until promotion, which means the rigor dial runs at minimum everywhere for a long time. Alternatives: (a) let the onboarding agent propose a maturity per detected subsystem based on heuristics (test coverage, file count, churn) and ask the user to confirm; (b) default everything to `stabilizing`; (c) default to `experimental` as I've specified. (a) is the honest answer but adds onboarding time. Confirm default.

6. **Concurrent side-quests during P10.** The doc says "no active side-quest while a slice is in P10-P11." That's strict. A common pattern during implementation is "I need to fix an unrelated bug before I can continue" — a side-quest. Do we want to allow side-quest insertion mid-slice (with the slice paused) or forbid it? The current design forbids; the user may prefer "allowed but only when the current slice explicitly enters `slice-paused` status."

7. **`architecture-current` editorial locking.** During P13 epic-land, the reconcile step edits `architecture-current.md`. If the user has concurrent work on another branch (they shouldn't, per Option 1, but in practice might), the reconciliation is a merge hazard. Do we want epic-land to refuse if the branch is not up to date with `main`? I've left this at invariant-level ("spine.write-only-via-milestone") but not added a pre-reconcile branch-freshness check.

8. **Evidence-storage path.** `chunk-verified` carries `observation: ContentRef` and `evidenceRef: ContentRef`. Where do those bodies actually live physically before being blobbed? I've implied a scoped temp dir under `.goodplan/.scratch/<slice>/evidence/` that the CLI vacuums on `milestone:commit`. If the user wants evidence kept long-term as readable files, it needs a permanent home.

---

*"Trust is earned through evidence, not asserted through production."* Everything in this document is a consequence.
