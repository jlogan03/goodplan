# Overnight Drafting Complete — Wake-Up Briefing

**Date:** 2026-04-09
**Session:** autonomous overnight (drafting → multi-reviewer → refinement → commit)
**Prior briefing:** `2026-04-08_pre-draft-session-boundary_a7k2z.md`

## TL;DR

08-ideal-implementation.md drafted at high specificity (1635 lines, ~125 KB) and refined in six focused cycles against three parallel reviewers. Architecture unchanged; Pause Discipline added as §3.3; 33 judgment calls made without you. Ready for your review — decide whether to accept, run round-2, or iterate.

## What Was Produced

| Artifact | Path | Size |
|---|---|---|
| 08 (final) | `brainstorm/08-ideal-implementation.md` | 1635 lines / ~125 KB (was 1448 / ~104 KB) |
| Codebase inventory | `research/2026-04-08_codebase-inventory_a7k2z.md` | drafter starting context |
| Review synthesis | `brainstorm/refinement/08-ideal-implementation/round-1/synthesis.md` | prioritized fix list |
| Pre-draft briefing | `briefings/2026-04-08_pre-draft-session-boundary_a7k2z.md` | session boundary save |

**Commits:**
- `61a0a38` — pre-draft save (§7 honest-loss fix, briefing, inventory)
- `43292d0` — first draft of 08
- `b418f49` — refined 08 via six-cycle review pass

## Read First (Priority Order)

1. **§3.3 Pause Discipline** — biggest new addition (R1 rule, 4 moments, 5 triggers, reactive-vs-scheduled, user-away protocol, "every session start is a return experience"). +64 lines. Most likely to have subtleties worth challenging.
2. **§14b (GG-QQ)** — 11 judgment calls made during refinement. Scan for any that feel wrong.
3. **§14 (K-FF)** — 22 judgment calls made during initial drafting. Also un-vetted.
4. **§1 Constraint 2 unpacking** — confirm "tests manufacture confidence" and "end with live observation" landed verbatim at top-level.
5. **§7 opening** — "artifacts are context transport" framing.
6. **§2 determinism-vs-judgment paragraph** — foundational principle added late.

## Reviewer Findings (Round 1)

| Lens | Verdict | Key issues |
|---|---|---|
| Holistic | "single refinement pass should close gaps" | Pause Discipline missing as cohesive section (CRITICAL); load-bearing phrasings buried in reviewer prompts; weak slicing heuristics framing; design-tree bias unacknowledged; Discovery 2x2 not stated |
| Grounding | No CRITICAL | Name slippages (reviewer-cli vs reviewer-tui-cli, reviewer-architecture vs reviewer-software-architecture); command renames not marked as renames; skill splits not flagged |
| Internal-consistency | 13 CRITICAL | Events referenced in phases/invariants/commands but undefined in §4.3 (slice-set-committed, architecture-target-*, epic-synthesis-*, side-quest-plan-*, exploration-cycle-*, chunk-impossibility-accepted, pre-flight-emitted, etc.) + 25 IMPORTANT structural |

## Refinement Cycles (all succeeded)

| Cycle | Focus | Δ lines |
|---|---|---|
| A | Pause Discipline §3.3 (R1, moments, triggers, user-away, return experience) | +64 |
| B | 19 missing event definitions in §4.3 | +26 |
| C | Framings (determinism/judgment, verbatim lifts to §1, artifacts-as-transport §7, TDD-additive P10, slicing meta-rule, design-tree bias, Discovery matrix) | +51 |
| D | Discovery-matrix vocabulary ↔ finding-triaged enum | +2 |
| E | Renames (milestone:commit→milestone-committed, verification-type→verificationType, accept-approximation, reviewer-software-architecture, reviewer-tui-cli) | +2 |
| F | P9/P10 event gaps, slice.single-active-per-branch, extractor server-side, S3 ownership, EpicGoalExtract, pressure-test wiring, command renames subsection, skill splits, multi-person merge | +30 |
| G | DAG acyclicity blocking, prose-density rubric, briefing.written-at-pause, spine write-only-via-milestone, stdin schema `extracted:` cleanup (5 commands), §16 Q3, P6/P8 context bundle, §14.T count typo | +12 |

Note: first attempt was a single all-in-one cycle; sub-agent declined as too risky on a 104 KB file. Split into six focused cycles worked.

## Judgment Calls §14b (GG-QQ) — Brief

These were made during refinement without your input. Flag any that feel wrong.

- **GG** — R1 Pause Discipline rule phrasing and the four-moment taxonomy
- **HH** — Reactive vs scheduled pause distinction
- **II** — "User-away protocol" branch (what autonomous mode is allowed to do)
- **JJ** — "Every session start is a return experience" placement and framing
- **KK** — 19 new event payload shapes (fields chosen to match neighboring conventions)
- **LL** — Determinism-vs-judgment paragraph placement in §2 and its boundary language
- **MM** — Slicing meta-rule wording and valid-deviation list
- **NN** — Design-tree bias acknowledgment framing
- **OO** — Discovery 2x2 matrix axis labels and disposition enum reconciliation
- **PP** — Rename targets treated as canonical (reviewer-tui-cli, reviewer-software-architecture, accept-approximation, verificationType, milestone-committed)
- **QQ** — Multi-person merge resilience subsection scope

(§14 K-FF are the 22 drafter-era calls; same review discipline applies.)

## Unresolved / Not Addressed

- **§14.T pre-tool-use hooks** — count typo fixed, but the list wasn't audited against the actual codebase.
- **No round-2 review run.** The refinement loop's own rule says "converge or circuit-break"; we only ran round 1. You may want another pass before declaring 08 final.
- **Delta vs. current implementation** — still deferred. That's the next step once 08 is locked.
- **Existing event payloads vs. synthesis proposals** — Cycle D preserved existing payloads per "leave existing alone" instruction; synthesis had richer field coverage in places. Worth a reconciliation pass.
- **`extracted:` in stdin schemas** — Cycle G cleaned 5 commands; others may have slipped through.
- **Spot-check needed:** Discovery matrix references reshape-proposed / epic-paused; confirmed they exist in §4.3 with slightly different payloads than synthesis proposed. Existing ones probably right but worth eyeballing.

## Decision Points (for you)

1. **Accept 08 as basis** for the delta/migration plan? — proceed to next phase
2. **Run round-2 review?** — validate the round-1 fixes before locking
3. **Iterate on specific sections** that aren't right? — surgical cycles
4. **Return to earlier judgment calls** (K-FF or GG-QQ) that feel wrong? — targeted rework

## Meta-Learnings From the Night

- High-specificity ~100 KB drafts can't be refined in a single sub-agent cycle; per-cluster splits are required.
- Pause Discipline is load-bearing — a draft without it is dramatically weaker even when the shape is right.
- Load-bearing phrasings buried in reviewer prompts are silently lost; they must live at top-level section placements.
- Name drift on renames is a real risk; grep-based audits work.
- The refinement loop pattern from the workflow design worked **on its own draft**. Deepest form of dogfooding we've done.

## Final State

- Architecture: **unchanged** (Trust Substrate + supporting elements + the two non-negotiable constraints preserved)
- Structure: 16 sections + new §3.3 Pause Discipline + new §14b judgment sub-block
- Load-bearing phrasings: all present at top-level placements
- Judgment calls: K-FF (22 drafter) + GG-QQ (11 refinement) = 33 total, none renumbered
