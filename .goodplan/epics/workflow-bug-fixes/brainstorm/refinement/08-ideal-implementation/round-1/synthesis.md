# Refinement Round 1 — Synthesis

Three parallel reviewers (holistic, grounding, internal-consistency) reviewed `08-ideal-implementation.md` (104 KB, 16 sections, 22 judgment calls K-FF). This synthesis consolidates their findings into actionable fixes.

## Bottom line

**The draft has solid bones but needs a focused refinement round before it is usable.** No fundamental architectural problems. All CRITICAL issues are additive fixes (add missing events, add a Pause Discipline section, fix name drifts). No user input required for these fixes — the original sources (01, 07, the codebase inventory) have enough to resolve them.

The holistic reviewer explicitly said: *"a single refinement pass by the same drafter with this review as input should close the gaps."*

---

## CRITICAL issues

### C-1. Pause Discipline is effectively missing as a cohesive section

**From holistic reviewer (C1-C5).** The single most important gap.

07 §4.3 has a complete Pause Discipline element with the R1 rule, pre-flight discipline, reactive/scheduled distinction, user-away protocol, and load-bearing verbatim phrasings. In 08, this is scattered across briefing event types, phase mentions, and skill skeletons — no cohesive section. A code drafter reading 08 cannot build pause handling without going back to 07.

**Specifically missing:**
- "If the user knew this, would they want to reconsider?" — the core R1 rule, not stated anywhere
- "A question that requires the user to guess what you were thinking is not a question — it is a puzzle" — not present
- "If the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight" — not present
- Pre-flight discipline: no pre-flight statement format, no rule that every autonomy window must emit one, no `pre-flight-emitted` event
- Reactive-vs-scheduled checkpoint distinction: lost entirely
- Rule that reactive pauses (non-convergence, unverifiable-chunk) ignore the steering preference: missing

**Fix:** Add a dedicated **Pause Discipline** section (proposed placement: §3.3 or a new §5a between Phases and Event schemas). The section must include:

1. **The R1 rule, verbatim**: *"Pause on trade-off-shifting discoveries. The question to ask yourself: 'If the user knew this, would they want to reconsider?'"* Plus the puzzle framing verbatim.

2. **The four moments of the Pause Discipline** (from 07 §4.3): *before* an autonomy window (pre-flight), *during* an autonomy window (R1 blocks), *at* a pause (session-boundary briefings), *on return* (orientation). One rule, four moments.

3. **The pre-flight statement format**: *"I'm about to do X. I plan to return Y. I expect to block on Z if I hit it. Here's what I think I know that matters: A, B, C. Anything to change before I start?"* Plus the load-bearing phrase: *"If the LLM is asking the user something during an autonomy window, that question should have been asked at pre-flight."*

4. **New event type**: `pre-flight-emitted { artifactType, plannedActions, expectedReturn, expectedBlocks, knownContext, scope }`. Add to §4.3 Pauses & steering block.

5. **New invariant**: `autonomy.pre-flight-required` — refuses entry to P2 (Explore), P7-P9 (Slice refinement), P10 (Implement), P11 (Code refine) without a matching `pre-flight-emitted` event in the session.

6. **Reactive vs scheduled checkpoint distinction** with the steering-preference applicability rule:
   - *Scheduled checkpoints* (plan-shape, epic pre-flight): respect the epic-level steering preference (always-consult / best-guess-and-flag / ask-in-the-moment)
   - *Reactive pauses* (non-convergence, unverifiable-chunk, R1 blocking discoveries): **ignore the preference** and always surface to the user. These are blocks on real decisions the user cannot delegate.
   - New invariant: `pause.reactive-ignores-steering-preference`

7. **"Every session start is a return experience"** as a stated discipline bound to `gp:status` and `gp:workflow-guide` skill contracts. Currently only a closing aside in §12.5; promote to Pause Discipline section.

8. **The five triggers**: pre-flight, R1-during-autonomy, end-of-autonomy, non-convergence, unverifiable-chunk, plus scheduled shape-checkpoint and session-pause. Enumerate them with their event types.

### C-2. Missing event definitions in §4.3

**From internal-consistency reviewer (C1-C7).** The draft references events in phases, invariants, and commands that are not defined in §4.3. The invariant engine literally cannot be implemented against the spec because several triggers reference nonexistent event types.

**Events to add to §4.3:**

1. `slice-set-committed` — referenced by P5/P6 exits, invariants, and `gp epic:slices-commit`. Currently only `slice-set-drafted` is defined.

2. `architecture-target-drafted` and `architecture-target-committed` — separate events for the target diff, distinct from the generic `architecture-committed`. Invariants literally check `architecture-target-committed` as a string. Two options: define these as distinct events (preferred), or rewrite the invariants to check `architecture-committed` with a `target: "target"` predicate. Choose the first for clarity.

3. `architecture-current-reconciled` — referenced by P13 (Epic Land). Define or remove.

4. `architecture-delta-proposed` and `architecture-delta-committed` — referenced by P12. BUT §14.V says delta is NOT a separate artifact type. Resolution: replace these events with `architecture-committed { target: "current" }` plus standard `refinement-*` events. This preserves the §14.V position and eliminates two undefined events.

5. `epic-synthesis-drafted` and `epic-synthesis-committed` — referenced by P13 and `gp epic:complete`. Define.

6. `side-quest-plan-drafted`, `side-quest-plan-committed`, `side-quest-plan-shape-approved` — referenced by S1/S2 and `side-quest.single-active-per-branch` invariant. Define as side-quest-scoped parallels of the slice-plan events.

7. `exploration-cycle-started`, `research-captured`, `brainstorm-captured`, `prototype-captured`, `exploration-cycle-completed`, `exploration-concluded` — referenced by P2 (Explore) and `epic.goal.committed-before-explore` invariant. Define all six.

8. `refinement-round-completed` — missing counterpart to `refinement-round-started`. The P3 wildcard `refinement-round-*` suggests both should exist.

9. `chunk-impossibility-accepted` — needed for C-5 (P10 entry condition). When a plan chunk is marked `impossible-with-reason` at plan-commit time, this event records the user's acceptance. Without it, P10's entry condition is unsatisfiable.

10. `pre-flight-emitted` — from C-1 above.

### C-3. Event/command name drift: `milestone:commit` vs `milestone-committed`

**From internal-consistency (I1).** §3.2 phases P10/P12/P13 and §9 prompt skeletons list `milestone:commit` as an event name. But `milestone:commit` is a CLI command; the event is `milestone-committed`. Fix: replace every occurrence of `milestone:commit` in phase "Events emitted" lists with `milestone-committed`.

### C-4. Field naming drift: `verification-type` vs `verificationType`

**From internal-consistency (C11).** §5.1 invariant `slice.plan-chunks-decidable` checks `extracted plan` fields using kebab-case names (`verification-type`). But §8 `PlanExtract` uses camelCase (`verificationType`). The invariant is keyed on a field the extractor does not produce. Fix: align all invariant field references to camelCase, matching the Zod schemas in §8.

### C-5. `chunk-unverifiable-decided` choice enum mismatch

**From internal-consistency (C8).** §3.2 P10 text says `{ choice: "accepted-with-reason" | "awaiting-user-verification" }`. §4.3 defines `choice: "redesign" | "accept-approximation" | "awaiting-user-verification" | "rethink"`. Invariant `slice.chunks-all-decided-before-code-refine` accepts `accept-approximation` or `awaiting-user-verification`. Fix: use the §4.3 set as canonical; update §3.2 P10 wording to match.

### C-6. P10 entry condition unsatisfiable

**From internal-consistency (C13).** §3.2 P10 entry: *"every chunk has a decidable verification-type with an accepted user decision"*. For a chunk whose plan says `impossible-with-reason`, there must be a pre-implement acceptance event. Add `chunk-impossibility-accepted` event (see C-2 item 9) emitted during P9 (or at plan-commit time), and update the invariant to accept it.

### C-7. `reshape-*` events defined but no commands emit them

**From internal-consistency (C9).** §4.3 defines `reshape-proposed`, `reshape-approved`, `reshape-applied`. §12.4 worked example invokes `gp reshape:propose|approve|apply`. But §6 has no `gp reshape:*` command section. Fix: add a `gp reshape:*` subsection to §6 with three commands matching the events.

### C-8. Judgment-laden-by-design acknowledgment missing

**From holistic reviewer (I3).** 01 §Framing explicitly acknowledges that central judgment calls (findings, reshape decisions, scope calls) are irreducibly judgment-laden by design. 08 reads as pure deterministic invariants and rubrics. A code drafter may try to make reviewers fully deterministic and crush the judgment the model is meant to exercise.

**Fix:** Add a short "Determinism vs. judgment" paragraph to §2 Foundational decisions. Wording approximately:

> *Gating is deterministic — invariants check, rubrics score, convergence is mechanical. But the CONTENT that reviewers and agents produce — findings, reshape proposals, scope judgments, verification-plausibility assessments — is irreducibly judgment-laden by design. The mental models throughout this doc (the R1 question, the honest-intermediate-state rule, the tests-manufacture-confidence warning) exist precisely because checklists fail at these boundaries. The model is trusted to exercise judgment; the workflow provides scaffolding (context, prompts, blocking options) rather than rules.*

---

## IMPORTANT issues

### I-1. Load-bearing phrasings buried or weakened

**From holistic reviewer (I1, I2, I4, I5).** Several phrases are present but not at top-level placement:

- **"A test that passes because it tests almost nothing..."** — present in reviewer prompts (lines 734, 764, 1014) but NOT in the top-level Constraint 2 unpacking in §1. Fix: quote verbatim in the opening Constraint 2 statement.
- **"Artifacts are context transport"** — paraphrased as a reviewer subtitle (line 715) but never stated as a principle. Fix: add at top of §7 or §3 as a framing statement.
- **"A plan can be correct and still useless if it assumes context the implementer doesn't have"** — present only inside a reviewer prompt (line 720). Fix: lift to §3 or §7 as the motivating principle for context-transport reviewers.
- **"TDD is additive, not a substitute for live execution"** — not stated at top level. Risk: drafter reads red-green-verify loop and thinks red-green IS Constraint 2. Fix: explicit paragraph in §3 or §3.2 P10 stating the additive rule.

### I-2. Slicing techniques heuristics framing understated

**From holistic reviewer (I6).** 07 §4.7 has a full block on heuristics-not-rules, meta-rule ("techniques serve the epic's goals"), conflict resolution, and valid-deviation examples. 08 has a brief "checked as heuristics" mention and a `reviewer-slice-set` "why didn't you" framing, but no meta-rule or examples. A reviewer agent built against 08's prompt will not know how to assess a slicing that applies none of the techniques.

**Fix:** Expand §3.1 P5 OR add a dedicated slicing techniques subsection with:
- Meta-rule: "techniques serve the epic's goals, not the other way around"
- Conflict resolution: "tracer bullet and known-unknowns-first can conflict; the slicing step names the conflict and justifies its choice"
- Valid deviation examples: pure backend refactor (no tracer bullet), already-well-instrumented code (no observability slice), no known unknowns (no de-risking slice)
- Reviewer contract: "asks why didn't you?, not did you?"

### I-3. Design tree interviewing bias acknowledgment dropped

**From holistic reviewer (I7).** 07 §4.8: *"The tree is biased; the user co-authors it."* 08 references design-tree interview but never carries the bias acknowledgment, the "are there branches I missed" prompt, or the non-tree-shaped spaces (graph/matrix/flat). Silent drop of judgment call J.

**Fix:** Add a design-tree interviewing subsection (probably under §9 or a new §11a) with:
- Bias acknowledgment: the tree is the LLM's view of the design space; invite the user to add branches the LLM didn't think of
- Non-tree shapes: when the space isn't naturally tree-shaped (graph, matrix, flat list), use an appropriate alternative structure
- The "are there branches I missed?" prompt as a required part of interview skill contracts

### I-4. Discovery Ledger 2x2 matrix not stated explicitly

**From holistic reviewer (I10).** 07 §4.5 and 01 describe the Work-Discovered 2x2 as a named mechanism. 08 has `finding-captured`/`finding-triaged` events with `blocking`/`inScope` booleans — the matrix is implied — but the matrix, the four dispositions, and the "reshape current epic / new epic / expand target / defer" routing are never stated as rules.

**Fix:** Add a subsection (§5 or §6.9) with the 2x2 matrix and the disposition rules:

|                     | In-scope          | Out-of-scope             |
|---------------------|-------------------|--------------------------|
| **Blocking**        | Reshape epic      | New epic, pause current  |
| **Non-blocking**    | Expand target     | Defer (side quest/task)  |

### I-5. `chunk-verification-demoted` missing as first-class event

**From holistic reviewer (I11).** 07 §4.5 calls out "discoveries that reveal a verification was shallow" as a first-class discovery type that can retro-demote an earlier chunk. 08 has `reviewer-verification-spot-check` at land time but no in-slice mechanism.

**Fix:** Add `chunk-verification-demoted { chunkId, reason, byFindingId, demotedAt }` event and wire it into the finding schema. When a later chunk's implementation reveals an earlier chunk's verification was shallow, emit this event.

### I-6. Structural event list gaps in phases

**From internal-consistency (I5, I7).** P9 "Events emitted" is missing `slice-plan-committed` (emitted by `gp slice:plan-commit`). P10 is missing `slice-implementation-started` (precondition for chunks per invariant `slice.single-active-per-branch`). Fix: add these to their respective P emitted-events lists.

### I-7. `slice.single-active-per-branch` contradicts parallel-slices claim

**From internal-consistency (I17).** Line 52 says "parallel slices within an epic gated by declared dependencies." Line 470 invariant: "At most one active slice per branch." These contradict.

**Fix:** Clarify the invariant. Probably: *"at most one slice in P10-P11 (implementation or code-refine) per branch at a time, but P7-P9 (planning) can be parallel"*. Or: *"parallel slices are allowed across branches but the same slice cannot be in P10 on two branches."* Pick one and state it precisely.

### I-8. Extract field vs extractor contract

**From internal-consistency (I18).** Many events carry `extracted: XyzExtract` (e.g., `epic-goal-committed`). But judgment call M says extractors run server-side (CLI), not client-side (LLM). If `extracted` is passed in via stdin, that contradicts M.

**Fix:** Clarify that stdin payloads carry `{ artifactPath }`, the CLI runs the extractor against the artifact, and the event's `extracted` field is produced by the CLI, not the caller. Update §6 command stdin schemas accordingly.

### I-9. `epic-synthesis-*` events (part of C-2) — specific context

The epic synthesis at completion is a distinct artifact produced during P13. Its events need fields for: `synthesisArtifactRef`, `crossSliceLearnings`, `architectureReconciliationStatus`, `sideQuestProposals`.

### I-10. `gp:implement-side-quest` vs `gp:land-side-quest` ownership

**From internal-consistency (I13).** §3.1 says S3 owner is `gp:land-side-quest`. §9.1 and §13 say `gp:implement-side-quest` owns S2 AND S3. Pick one — probably split into two skills matching the slice pattern (implement + land).

### I-11. `EpicGoalExtract.steeringPreference` vs `epic-steering-preference-set` event

**From internal-consistency (I19).** Both carry the same data, can diverge. Fix: remove `steeringPreference` from `EpicGoalExtract`, or treat it as derived-from-event.

### I-12. `pressure-test-finding-accepted.promotedTo` mechanism unspecified

**From internal-consistency (C10).** The `promotedTo` field references invariant IDs, but the mechanism to register a new invariant from pressure-test triage isn't wired up. Fix: specify that `gp epic:pressure-test-finding-disposition` MAY also emit `invariant-proposed` when `promotedTo` is set.

### I-13. `reviewer-architecture` vs `reviewer-software-architecture` name inconsistency

**From internal-consistency (I16).** Line 131 uses `reviewer-software-architecture`; line 737 defines `reviewer-architecture`. Pick one. The existing codebase has `reviewer-software-architecture.md`, so use that.

### I-14. Reviewer names that don't match existing codebase

**From grounding review.** `reviewer-cli` should be `reviewer-tui-cli` (existing file at `plugin/agents/reviewer-tui-cli.md`). Fix: rename to `reviewer-tui-cli` in §7.4 and wherever else it appears.

### I-15. Renamed commands: mark as renames, not new commands

**From grounding review.** The draft introduces `gp epic:slices-draft`/`gp epic:slices-commit` and `gp epic:architecture-draft`/`gp epic:architecture-commit` without noting these replace the existing `gp epic:define-slices`/`gp epic:refine-slices` and `gp epic:define-architecture`/`gp epic:refine-architecture` pairs.

**Fix:** Add a short note at the top of §6.3 (or in §15 scope boundary) listing the intentional command renames from the current codebase, with old-name → new-name mapping. Helps the code drafter know what to modify vs. what to create new.

### I-16. Skill splits: `implement-slice` / `land-slice` are splits of `implement`

**From grounding review.** The current codebase has a single `plugin/skills/implement/` skill covering both implementation and slice-land. 08 splits into `gp:implement-slice` and `gp:land-slice`. Not acknowledged as a split.

**Fix:** Add a note where `gp:implement-slice` first appears that it is a split of the current `plugin/skills/implement/SKILL.md` — not a rename. Also for `gp:implement-side-quest` / `gp:land-side-quest`: note they are new skills (current codebase has no side-quest implementation or land skill).

### I-17. Multi-person merge resilience preference not addressed in implications

**From holistic reviewer (I15).** The user preference (from the return briefing) is explicit: multi-person collaboration on epic branches must work naturally. 08 names Option 1 but doesn't work through the implications: what if two people hit a plan-shape checkpoint simultaneously? How do briefings from two agents on the same epic merge? How do findings from parallel implementers reconcile into one log?

**Fix:** Add a short subsection (perhaps in §2 or §15) addressing multi-person merge explicitly:
- JSONL append-only resolves most conflicts automatically
- Cross-agent findings merge by ULID ordering
- Per-slice locking: the `slice.single-active-per-branch` invariant plus content-addressed git blob storage means two people can't silently clobber each other
- Plan-shape checkpoints coordinate via the epic's steering preference and explicit invariant checks

### I-18. Open question 3 has draft-note leak

**From holistic reviewer (M7).** §16 Q3 reads like it narrates an edit mid-sentence ("excludes... wait, I actually added it"). Cleanup required.

**Fix:** Clean up the prose to state the open question cleanly.

### I-19. `reviewer-slice-set` DAG acyclic should be pass/fail not 1-5

**From holistic reviewer (M8).** A DAG either has a cycle or doesn't — not a spectrum. Fix: change from 1-5 dimension to pass/fail blocking check.

### I-20. Tight writing not a rubric dimension on prose artifacts

**From holistic reviewer (M10).** The user explicitly wants tight writing. It's mentioned in `gp:plan-slice` hard rules and `reviewer-agent-skill` but never made a rubric dimension on prose artifacts generally.

**Fix:** Add `prose-density` (or equivalent) as a rubric dimension on `reviewer-holistic` or a new `reviewer-tight-writing` reviewer that applies to all prose artifacts. Dimension checks: no hedging, no preambles, density over length.

### I-21. Invariant `briefing.written-at-pause` "within a 1-event window" ambiguous

**From internal-consistency (I9).** Specify: strict next-event-in-scope vs bounded lookahead.

### I-22. `spine.write-only-via-milestone` custom rule text too vague

**From internal-consistency (I8).** Specify what the check actually computes.

---

## MINOR issues (fix if easy, otherwise note)

- **M-1. §6.3 `gp epic:slices-draft` stdin takes `{ slices: Array<SliceGoalExtract> }` but emitted event is just `slice-set-drafted`** — document that `slices-commit` runs the extractor per-slice to produce `slice-created` events with proper fields.
- **M-2. `reviewer-holistic` dimension names are invented in 08** — mark them as "new" explicitly (don't imply they match existing rubrics).
- **M-3. Pre-tool-use hook protected-path list** — note that these replace current hook rules (not additive).
- **M-4. `discovery matrix` mentioned in passing** (line 259) as if defined — define it in the new subsection from I-4.
- **M-5. Context bundle table omits P6, P8, P13** — fill in the gaps.
- **M-6. §14.T typo: "three path patterns only" followed by six items** — fix the count.
- **M-7. `gp:task` emits `finding-capture` — typo, should be `finding-captured`**.
- **M-8. `gp phase:transition` side-effect contradiction** — §14.Y says read-only but §6.7 says "allows the skill to proceed". Reconcile (likely: read-only verification, skill uses the result to decide).

---

## What NOT to change

- **The overall architecture** (Trust Substrate + supporting elements + constraints). Do not restructure.
- **The 22 existing judgment calls (K-FF)**. Leave numbering intact. Any new judgment calls from this refinement go in a new §14 sub-block labeled GG onward.
- **Load-bearing phrasings that are already correctly placed.** Only ADD missing ones; don't touch ones that are working.
- **Section numbering §1-§16.** Add subsections as needed but preserve top-level structure.
- **The 102 KB is fine.** High specificity was the mandate. Don't trim to save space.

---

## Priority order for the refinement agent

If time-constrained, address in this order:

1. **C-1 Pause Discipline section** — largest and most important gap
2. **C-2 Missing event definitions** — unblocks invariant engine implementability
3. **C-8 Judgment-laden acknowledgment** — prevents determinism-crush in implementation
4. **C-3 through C-7** — name drifts and enum mismatches (quick fixes)
5. **I-1 Load-bearing phrase lifting** — preserves intent
6. **I-2, I-3 Framing expansions** — preserves disciplines
7. **I-4, I-5 Discovery Ledger + chunk demotion** — fills mechanism gaps
8. **I-6 through I-22** — structural corrections
9. **M-1 through M-8** — minor cleanups

Every critical (C-*) and important (I-*) issue should be addressed. Minor issues (M-*) are best-effort.

---

## New judgment calls expected

The refinement will likely introduce new judgment calls labeled GG-onward in a new §14 sub-block. Expected areas:

- GG: How the Pause Discipline section is placed (new §3.3 vs §5a vs integrated into phase descriptions)
- HH: Whether `architecture-target-*` events are distinct from generic `architecture-committed` (recommended: distinct for clarity)
- II: Whether `exploration-cycle-*` is one event family or multiple (recommended: multiple for field-level specificity)
- JJ: Which command names win in renames (recommended: the draft's new names, with the rename mapping explicit)
- KK: The multi-person merge subsection placement
- LL: Whether a new `reviewer-tight-writing` reviewer is added or the dimension is added to `reviewer-holistic` (recommended: add to holistic to avoid reviewer proliferation)
- Others as needed

Each new judgment call should include: what was decided, alternatives considered, why this option was picked.
