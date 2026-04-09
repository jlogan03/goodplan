# Ideal Implementation Premises

This file captures design decisions made during the explore phase of workflow-bug-fixes before the ideal implementation is drafted. These are foundational premises — `02-ideal-implementation.md` works out specifics on top of them.

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
│       ├── briefings/
│       │   └── <date>_briefing_<suffix>.md
│       ├── slices/
│       │   └── <slug>/                       # slice slugs scoped within epic, no suffix
│       │       ├── goal.md
│       │       ├── plan.md                   # or plan/ directory for multi-file plans
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

## Per-subsystem learnings, decisions, and invariants via tagging

- **Learnings and decisions** get an optional `related_subsystems: [ids]` field in their extracted metadata
- **Invariants** can declare `scope: subsystem` with `target_subsystem: <id>` to apply only when events touch that subsystem
- **Context bundles load targeted subsystem context:** when planning a slice that touches `auth`, the bundle includes learnings/decisions/invariants tagged with `auth` plus untagged project-level wisdom
- **Storage is tag-based, not directory-based.** Flat directories (`.goodplan/learnings/`, `.goodplan/decisions/`); views like `gp learnings:list --subsystem auth` filter by tag
- **Subsystem renames** produce `subsystem-renamed` events that map old ID to new; the CLI can auto-rewrite references or leave them stale with resolution via the mapping

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

- Event schemas (by type)
- The canonical invariant set (starting ~20)
- Skill set and phase ownership
- CLI command surface
- Agent types (phase, reviewer, editor) and their contracts
- Context bundle shape per phase
- Key command flows for major workflows (create-epic, plan-slice, implement, land, complete-epic, side-quest lifecycle)
- Extractor specs for each artifact type
- Directory layout (this doc has the overview; the ideal implementation can expand)

The doc should NOT cover:

- Migration strategy from current implementation (that's the delta step, done separately)
- Implementation details below the skill/CLI interface
- Performance optimization (deferred until profiling shows a need)
- Backward compatibility with the current state format
