# Merged Review Feedback — Round 1

## Critical Issues

### C1. Slice 03 epic phase completions are unexecutable without submit-* commands
**Sources:** Tracer Bullet (CRITICAL), Architecture Alignment (MINOR), Software Architecture (IMPORTANT)

Slice 03 needs to exercise the full epic phase chain (explore -> architecture -> slicing -> activate), but `submit-explore`, `submit-architecture`, `submit-slices` etc. are deferred to slice 05. The transition tables require these to trigger COMPLETE_* events. Skip paths also require triggering state events but no CLI mechanism is specified.

**Resolution:** DIRECTLY_ACTIONABLE — Pick one:
- (a) Include minimal submit-* commands for epic phases in slice 03 (contradicts slice 05 scope but makes 03 self-contained)
- (b) Explicitly state that slice 03 verification uses direct `reduce()` calls or manual file creation, and show those steps concretely in the verification section
- (c) Expose skip-path commands (e.g., `epic:skip-explore`) in slice 03

Whichever option is chosen, the verification steps must be literally executable with concrete commands/calls and expected outputs.

---

### C2. Slice 05 verification exercises only 2 of 8+ start-*/submit-* pairs
**Source:** Tracer Bullet (CRITICAL)

Behavior section lists all start-*/submit-* pairs but verification only tests start-plan/submit-plan and start-refinement/submit-refinement. The 6 epic-phase pairs and start-implementation/submit-implementation have no verification steps.

**Resolution:** DIRECTLY_ACTIONABLE — Add verification steps exercising at least one epic-phase pair (e.g., start-explore + submit-explore) and the implementation pair, with concrete expected outputs.

---

### C3. Slice 04 verification is unexecutable — plan.md and plan-refined.md cannot appear without submit-* commands
**Sources:** Tracer Bullet (CRITICAL via C1 dependency), Software Architecture (IMPORTANT x2)

Slice 04's COMPLETE_PLAN guard checks `hasChild(state, "slices/<name>", "plan.md")` and BEGIN_IMPLEMENTATION checks for `plan-refined.md`. Without submit-plan/submit-refinement (slice 05), these files cannot appear. The verification says "Walk 01-auth through full lifecycle: plan -> refine -> implement -> complete" but doesn't explain how.

**Resolution:** DIRECTLY_ACTIONABLE — State explicitly in the Verification section that plan.md and plan-refined.md are created via manual file writes (which loadState picks up via directory scanning), or via direct reduce() calls with file-writing side effects. Show the concrete steps.

---

## Important Issues

### I1. Slice 02 scope is disproportionately large — highest delivery risk
**Sources:** Software Architecture (IMPORTANT), Risk/Dependency (IMPORTANT x2)

Slice 02 bundles: recursive tree types, all tree navigation helpers, schema registry, assembleState (zero-state + filesystem scanning), commitState (recursive diff + atomic writes + concurrent modification detection), loadState with cache, debug logging, reduce() scaffold, INIT_PROJECT handler, ALL 9+ Zod entity schemas, and init command refactor. This is the entire data layer + state machine scaffold + all schemas in one slice, and every subsequent slice depends on it.

**Resolution:** USER_INPUT — Options:
- (a) Split into two sub-slices: (i) core types + data layer + schemas (verifiable via round-trip tests), (ii) state machine scaffold + INIT_PROJECT + init refactor (verifiable end-to-end)
- (b) Keep unified but explicitly acknowledge this is the largest slice and identify deferrable items (cache, concurrent modification detection, debug logging can move later without breaking init)
- (c) Accept the risk and proceed as-is

---

### I2. Slice 06 dependency should include slice 05, not just 04
**Sources:** Software Architecture (IMPORTANT), Architecture Alignment (MINOR), Risk/Dependency (MINOR)

Slice 06's full status command needs quest information (slice 05). `learning:rollup` needs quest-level learnings (slice 05). The sequencing table lists dependency as "04" but the actual dependency is "05" (which transitively includes 04).

**Resolution:** DIRECTLY_ACTIONABLE — Update dependency to "05" (or "04, 05") in sequencing-refining.md.

---

### I3. Slice 08 dependency should include slice 05, not just 06
**Sources:** Tracer Bullet (IMPORTANT), Risk/Dependency (IMPORTANT)

Integration test slice lists dependency on 06 only, but success criteria include "Full quest lifecycle integration test" (quest = slice 05) and state machine completeness fitness function covering quest events (slice 05).

**Resolution:** DIRECTLY_ACTIONABLE — Update dependency to "05, 06" in sequencing-refining.md (or note 05 is transitively included via 06 if I2 is fixed).

---

### I4. Command syntax in goals uses flags (--name, --goal) but architecture uses stdin JSON
**Sources:** Architecture Alignment (IMPORTANT), Software Architecture (MINOR)

Slice 03 shows `epic:create --name my-epic --goal "Build X"` and slice 04 shows `slice:create --name 01-auth --goal "Auth"`. The commands-api.md pattern uses stdin JSON for entity creation payloads: `echo '{"name":"...","goal":"..."}' | goodplan epic:create`. Keep `--epic` as a target flag for slice:create.

**Resolution:** DIRECTLY_ACTIONABLE — Update creation command examples in goal-refining.md for slices 03 and 04 to use stdin JSON, matching commands-api.md.

---

### I5. Learnings-at-completion vs. learning:rollup distinction needs clarification
**Sources:** Software Architecture (IMPORTANT), Architecture Alignment (IMPORTANT)

Slice 04 handles "learnings append at completion" (COMPLETE_SLICE apply function with rollupTo-based writes). Slice 05 handles quest completion learnings similarly. Slice 06 handles the standalone `learning:rollup` command (ROLLUP_LEARNINGS event). This distinction is architecturally sound but not explicit in the goal files.

**Resolution:** DIRECTLY_ACTIONABLE — In slice 04's goal, clarify that learnings-at-completion means the state machine's apply function handles rollupTo writes. In slice 06's goal, clarify that learning:rollup is the manual/explicit rollup command. Note the distinction in both.

---

### I6. Slice 05 context bundling verification doesn't test decisions/learnings inclusion
**Source:** Architecture Alignment (IMPORTANT)

Context bundling priority tables include "active decisions" and "recent learnings" in nearly every phase. But slice 05's verification doesn't populate decisions/learnings data to test inclusion. The ContextBundle type includes `decisions` and `learnings` fields.

**Resolution:** DIRECTLY_ACTIONABLE — Add a verification step that manually creates decisions.jsonl and learnings.jsonl entries before testing context bundling. Note in scope boundaries that context reads decisions/learnings from state tree even though decision/learning *commands* are slice 06.

---

### I7. Schema command not explicitly claimed in any slice's scope
**Sources:** Software Architecture (MINOR), Architecture Alignment (IMPORTANT), Tracer Bullet (IMPORTANT)

`goodplan schema` appears in slice 06's success criteria but not in its "In scope" list. It's a cross-cutting introspection feature unrelated to decisions/learnings.

**Resolution:** DIRECTLY_ACTIONABLE — Add `schema` command explicitly to slice 06's scope boundaries with a note that it exercises INV-006. If it stays in slice 06, expand verification to test multiple commands.

---

### I8. Slice 02 success criteria include cache verification but verification section omits it
**Source:** Tracer Bullet (IMPORTANT)

Success criteria items 7-8 describe cache behavior but no verification step tests it.

**Resolution:** DIRECTLY_ACTIONABLE — Add verification step: "Delete .state-cache.json, run `goodplan status --json`, verify it works (full reassembly) and cache is recreated."

---

### I9. Slice 04 verification step for completion doesn't show concrete stdin JSON
**Source:** Tracer Bullet (IMPORTANT)

Verification says "complete (with deferred item targeting 02-api)" but doesn't show the stdin JSON needed for `slice:complete`. Commands-api.md requires `verificationPassed`, `deferred`, `learnings`, `architectureDelta` fields.

**Resolution:** DIRECTLY_ACTIONABLE — Include exact command with stdin pipe in verification, e.g.: `echo '{"verificationPassed":true,"deferred":[...],...}' | goodplan slice:complete --slice 01-auth --json`

---

### I10. Slice 07 skills contradiction: success criteria say "verify CLI commands" but scope says "don't modify skill content"
**Source:** Software Architecture (MINOR), Tracer Bullet (IMPORTANT)

Out of scope says "Modifying skill content to use the new CLI commands" but success criteria say "Skills reference correct CLI commands -- grep for `goodplan` in skill files." If skills aren't modified, they won't reference `goodplan` commands.

**Resolution:** DIRECTLY_ACTIONABLE — Clarify whether this is an audit (identifying what needs updating) or actual modification. Reword success criterion accordingly. Also note why end-to-end skill exercise isn't possible (skills are markdown prompts, not executable scripts).

---

### I11. Fitness function mechanism for state machine completeness is unspecified
**Sources:** Software Architecture (MINOR), Architecture Alignment (MINOR), Tracer Bullet (IMPORTANT)

Success criteria say "count derived from the StateEvent discriminated union" but TypeScript unions are erased at runtime. No reflection mechanism is specified.

**Resolution:** DIRECTLY_ACTIONABLE — Use the transition table data structure (exists at runtime as `Transition[]` arrays) to enumerate all `(from, event.type)` rows and verify test coverage. Alternatively, use a const array of event types validated exhaustively against the union at compile time. Specify the chosen mechanism in slice 08's goal.

---

## Minor Issues

### M1. Slice 03 skip paths not in success criteria
**Source:** Software Architecture (MINOR)

Skip paths (e.g., `created -> COMPLETE_EXPLORE -> explored`) are in scope but no success criterion tests them.

**Resolution:** DIRECTLY_ACTIONABLE — Add at least one skip-path success criterion.

---

### M2. Slice 02 "reconcile conventions.md" is vague
**Source:** Architecture Alignment (MINOR)

Unclear what "reconcile" means architecturally.

**Resolution:** DIRECTLY_ACTIONABLE — Clarify this means updating `.project/conventions.md` to reflect the actual `src/` directory structure post-tracer-bullet. Make it a success criterion bullet, not a scope item.

---

### M3. Slice 02 defines all Zod schemas but most aren't exercised until later slices
**Source:** Tracer Bullet (MINOR)

Only project and overview schemas are used by init/status. The rest exist for type inference but aren't end-to-end tested until slices 03-06.

**Resolution:** DIRECTLY_ACTIONABLE — Note as accepted trade-off: schemas defined early for type inference, validated via unit tests in slice 02, fully exercised end-to-end in respective slices.

---

### M4. Slice 04 epicComplete implicit transition not tested in verification
**Source:** Tracer Bullet (MINOR)

Behavior mentions `epicComplete: true` when last slice completes, but verification walks only a two-slice lifecycle and never completes both.

**Resolution:** DIRECTLY_ACTIONABLE — Add verification step: complete both slices, verify final response includes `epicComplete: true`.

---

### M5. Slice 05 --inline budget default not tested
**Source:** Tracer Bullet (MINOR)

Verification tests `--inline=500` (explicit budget) but not the default (~20KB) budget path.

**Resolution:** DIRECTLY_ACTIONABLE — Add step: `start-plan --inline --json`, verify inlined content size is under default budget.

---

### M6. Slice 07 soft dependency on 06 is effectively hard
**Source:** Risk/Dependency (MINOR)

Command surface changes during slices 03-06 make starting 07 early a rework risk.

**Resolution:** DIRECTLY_ACTIONABLE — Either make it a hard dependency on 06 or explicitly state the rework risk of starting earlier.

---

### M7. Epic lifecycle (slice 03) has ~20 transition rows — large for one slice
**Source:** Risk/Dependency (MINOR)

Epic has the most complex lifecycle (12+ statuses, ~20 transition rows). This is described as the "first full entity lifecycle" but is actually the hardest.

**Resolution:** DIRECTLY_ACTIONABLE — Acknowledge the complexity in the goal. Consider whether defining-slices/refining-slices transitions could be deferred, or accept the scope as-is.

---

### M8. No cascade failure mitigation documented in sequencing
**Source:** Risk/Dependency (MINOR)

Slices 03-06 form a strict sequential chain. If any stalls, the rest are blocked. Slice 07 is the only parallel option.

**Resolution:** DIRECTLY_ACTIONABLE — Note in sequencing rationale that slice 07 is the "escape valve" for parallel work if the main chain stalls.

---

### M9. Slice 05 context bundling has deep dependency chain with compounding risk
**Source:** Risk/Dependency (IMPORTANT — downgraded to MINOR per dedup since core concern is covered by I1)

The --inline feature reads the entire tree model. Dependency chain 02->03->04->05 means tree model issues compound. This is correct ordering but the depth amplifies slice 02 risk.

**Resolution:** Covered by I1 (slice 02 scope/risk). No additional action needed beyond I1.

---

### M10. `--query` auto-implying `--json` inconsistency
**Source:** Software Architecture (MINOR)

Commands-api.md says `--query` "implies `--json` for the intermediate representation" but existing tracer bullet code requires both flags. Resolve before implementation.

**Resolution:** DIRECTLY_ACTIONABLE — Decide: does `--query` auto-imply `--json`? Update commands-api.md and tracer bullet code to be consistent.

---

## Scores

| Reviewer | Score |
|---|---|
| Software Architecture | 6/10 |
| Architecture Alignment | 7/10 |
| Tracer Bullet Quality | 5/10 |
| Risk/Dependency Analysis | 7/10 |
| **Merged** | **6/10** |

## Summary

| Severity | Count |
|---|---|
| Critical | 3 |
| Important | 11 |
| Minor | 10 |

The three critical issues all stem from the same root cause: slices 03 and 04 define entity lifecycles with phase completions that require submit-* commands deferred to slice 05. This makes their verification steps unexecutable as written. The most impactful fix is deciding how phase completions are triggered in slices 03-04 (direct reduce() calls, manual file creation, or pulling submit-* commands forward).

The highest-risk item is slice 02's scope (I1) -- it bundles the entire data layer, all schemas, and the state machine scaffold. Splitting it or identifying deferrable items would reduce delivery risk significantly.

Dependency corrections (I2, I3) and command syntax fixes (I4) are straightforward. The remaining important issues are mostly about making verification steps concrete and executable.
