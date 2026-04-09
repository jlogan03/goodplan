# Pre-Draft Session Boundary Briefing

## Time context
- Briefing written: 2026-04-08
- Epic: workflow-bug-fixes
- Phase: post-premises, pre-draft of ideal implementation doc

## Current position
- Ideal flow (01), implementation premises (07), and all supporting brainstorm/research files are in place.
- About to draft `08-ideal-implementation.md` as the actual implementation spec.
- High-specificity draft planned: event schemas at field level, complete CLI command tree, populated reviewer registry, extractor specs, sample skill prompts.

## How we got here
Exploration ran a three-step plan: ideal flow → ideal implementation premises → delta vs. current. A drift review on the first premises pass (03) prompted a rewrite. Six alternative synthesis documents were produced (04 expanded option, 05 option-3 synthesis, 06 problems-first, 07 constraints-first) to explore different framings. 07 was selected as the basis.

After selection, two non-negotiable constraints were added and 07 was rewritten from first principles around them:
1. Refinement before handoff (LLM artifacts reviewed multi-round against rubrics before downstream use)
2. Execution verification before done (LLM code live-executed and observed to match expectations)

A subsequent refinement pass added four techniques (plan-shape checkpoint, red-green TDD, slicing techniques, design-tree interviewing) and closed gaps (code refinement loop after execution verification, strengthened reviewer bullets, heuristics framing, bias acknowledgment on design-tree interviewing).

## Key design decisions (with rationale)
- **Three-step exploration** (flow → premises → delta), not flow → delta directly — delta step conflates design and migration reasoning.
- **Keep the CLI** — provides integrity, validation, ground truth, debuggability, testability. Pain is execution gap, not conception.
- **Invariants + events + derived state** instead of rigid forward-only state machine. Enables backward movement, insertion, parallel branches, natural merge resilience.
- **Content-addressed via git's internal object store** — no separate blobs/ directory. Events reference content by git blob hash.
- **JSONL event logs, one per scope**: `.goodplan/events.jsonl`, `.goodplan/epics/<slug>/events.jsonl`, `.goodplan/side-quests/<slug>/events.jsonl`.
- **SQLite caching deferred** — start with in-memory parsing per CLI invocation; add only when profiling shows need.
- **Directory structure flat** — `epics/` and `side-quests/` at `.goodplan` root; workspace concept dropped.
- **Date + slug + suffix naming** for epic and side-quest dirs (collision-resistant across branches).
- **ULIDs** for system-generated IDs (events, findings, briefings); **slugs** for user-facing entity names.
- **`architecture-current.md`** at root; **`architecture-target.md`** inside epic directories.
- **`events.jsonl` everywhere** consistently.
- **Briefings as first-class artifacts** written eagerly at pause points, not reconstructed from events at return.
- **HMAC dropped, pre-tool-use hooks** for JSONL and spine-doc protection.
- **Parallelism**: ≤1 active epic per branch, ≤1 active side quest per branch, parallel slices within an epic gated by dependencies, same-slice multi-branch forbidden.
- **PR Option 1**: epics must be complete before their branch merges to main; long-lived epic branches OK; multi-person collab happens via the epic branch, not main. Chosen over Option 2 — simpler, known to work.
- **Subsystems as first-class entities** with stable slug IDs, shared across maturity tracking, slice dependencies, learning/decision tagging, reviewer routing.
- **Per-subsystem files** at `.goodplan/subsystems/<slug>.md` for APIs, data models, invariants; depth scales with maturity (enforced by invariant).
- **Tight writing discipline** for LLM-produced content and skills.
- **Two non-negotiable constraints** (see above) — hard rules, not guidelines.
- **Meta-principle**: trust is earned through evidence, not asserted through production.
- **Post-implementation code refinement loop**: code goes through reviewer evaluation after execution verification for performance, reliability, security, domain correctness, code style, test meaningfulness (cargo-cult detection), and subsystem-specific review.
- **Four techniques** (refinement pass):
  - Plan-shape checkpoint: user-interactive pause between plan drafting and plan refinement; steering preference set during design-tree interview at epic level.
  - Red-green TDD as planning technique for implementation chunks. Additive to execution verification, not substitute.
  - Slicing techniques: tracer bullet, observability early, known unknowns first — framed as heuristics, not rules.
  - Design-tree interviewing for brainstorming/architecture design, with bias acknowledgment and non-tree-shaped alternatives.

## Current state of 07 (architecture basis for drafting)
- Path: `.goodplan/epics/workflow-bug-fixes/brainstorm/07-constraints-first-synthesis.md`
- ~700 lines, ~75 KB.
- Architecture: Trust Substrate + 5 supporting elements (Spine, Pause Discipline, Pressure Test, Work Discovered, and one more — verify in file).
- §8 — 12 original judgment calls (1–12).
- §8a — 4 addition-pass judgment calls (A–D).
- §8b — 6 refinement-pass judgment calls (E–J).
- User reviewed and approved the judgment calls.

## User preferences to honor
- **Tight writing**: density over length; tables and structured sections where denser than prose; single-voice; cut preambles and hedging.
- **Dogfooding**: use the workflow on itself wherever possible; this briefing is an example.
- **Non-negotiable constraints**: both Constraint 1 and Constraint 2 are hard rules; any deviation is wrong.
- **Cargo-cult tests are a real concern**: reviewer checks must enforce meaningful tests, not just existence.
- **In-place modification, not rewrite**: every change to existing code framed as a bounded shippable delta.
- **Multi-person merge resilience**: workflow must handle different people on different branches naturally.
- **PR Option 1 specifically** over Option 2.

## Outstanding items
- 22 judgment calls across §8 + §8a + §8b — user-approved as of last message before drafting.
- Reviewer registry bootstrapping is an honest loss (initial reviewer set not yet specified).
- Event schemas in 07 are at sketch level; draft will specify field level.
- Phase structure: 07 inherits phases from 01/06 implicitly; draft will define explicitly.
- Delta from current implementation deferred until after 08 is drafted.

## Next action
Draft `08-ideal-implementation.md` at high specificity, including:
- Opening with meta-principle + two constraints.
- Phases defined explicitly: entry conditions, skill ownership, events emitted, artifacts produced, exit conditions (trust gates).
- Event schemas at field level (per event type, with payload structure).
- Complete CLI command tree with flags, payloads, semantics.
- Populated initial reviewer registry with domain coverage and rubric sketches.
- Extractor specs per artifact type.
- Sample skill prompts for key skills.
- Agent contracts (phase agents, reviewer agents, editor agents).
- Context bundle shape per phase.
- Key command flows for major workflows (create-epic, plan-slice, implement, land, complete-epic).

Drafter authorized to do its own research via Grep, Read, Glob, WebSearch, WebFetch. Codebase inventory pre-gathered at `.goodplan/epics/workflow-bug-fixes/research/2026-04-08_codebase-inventory_<suffix>.md` and passed as starting context.

After drafter returns, small multi-reviewer pass (holistic + grounding + internal-consistency) checks the draft before presenting to user.

## File pointers
- `.goodplan/epics/workflow-bug-fixes/brainstorm/01-ideal-flow-from-first-principles.md` — ideal workflow (first principles)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/02-delta-vs-current-implementation.md` — stale delta (research scaffolding; will regenerate later)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/03-ideal-implementation-premises.md` — first premises pass (drifted, superseded)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/04-ideal-implementation-option-1-expanded.md` — alternative (parts bin)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/05-ideal-implementation-option-3-synthesis.md` — alternative (safe fallback; has phase-to-skill mapping)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/06-problems-first-synthesis.md` — alternative (problems-first; superseded by 07)
- `.goodplan/epics/workflow-bug-fixes/brainstorm/07-constraints-first-synthesis.md` — **current basis for drafting**
- `.goodplan/epics/workflow-bug-fixes/research/current-system-snapshot.md` — baseline snapshot from cycle-1 exploration
- `.goodplan/epics/workflow-bug-fixes/goal.md` — epic goal (original scope)

## Key commit hashes
- `6fa76c1` — fresh onboarding + cycle-1 brainstorm
- `e385f87` — cohesion pass + first premises captured
- `5f49c66` — three alternatives (04, 05, 06)
- `c428091` — 07 first draft
- `6f94683` — 07 refined with techniques and gap-closers
- (this briefing commit will follow)

## How to resume from this briefing
1. Read this briefing first to reconstruct context.
2. Read 07 (`brainstorm/07-constraints-first-synthesis.md`) for architecture basis.
3. Optionally read 01 (`brainstorm/01-ideal-flow-from-first-principles.md`) for conceptual ideal flow with original mechanism descriptions and load-bearing phrasings.
4. Proceed to drafting `08-ideal-implementation.md` with high specificity.
5. Spawn the drafter sub-agent with the codebase inventory as starting context.
