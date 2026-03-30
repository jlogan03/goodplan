# Merged Feedback — Initiatives Infrastructure (Round 1)

## Critical

**[C1] State machine rows #5 and #7 overlap — row #7 is unreachable**
Sources: Holistic (IMPORTANT), Agent Skill (CRITICAL)

Row #5 matches `approved.md` OR `architecture-proposal-skipped.md` (no sequencing) → "Needs slice planning." Row #7 matches `architecture-proposal-skipped.md` → "No arch changes needed." First-match-wins means #7 never fires. The design spec confirms `architecture-proposal-skipped.md` means "advance to slice planning" — #7 is dead code. Remove row #7 entirely.

Resolution: DIRECTLY_ACTIONABLE

---

**[C2] State machine conflates first-initiative and subsequent-initiative paths**
Sources: Software Architecture (CRITICAL), Agent Skill (IMPORTANT)

The flat state machine table cannot represent both paths. For the first initiative: no `approved.md`, no `architecture-proposal/` — it writes directly to `architecture/`. Rows #5-#8 check for `approved.md` and `architecture-proposal/`, which the first initiative never creates. After `/define-architecture` writes to `architecture/`, the state machine falls through to row #8 ("needs architecture proposal") because it checks for proposal markers, not `architecture/` existence.

The design spec handles this with explicit branches ("For the first initiative" vs "For subsequent initiatives"). The convention file must either: (a) split the table into two sections, or (b) add a condition recognizing `architecture/` without `architecture-proposal/` as "approved" for the first initiative, or (c) add an `architecture-complete.md` marker.

Resolution: DIRECTLY_ACTIONABLE

---

**[C3] Phase 3 `/start-initiative` commits architecture proposal to top-level — contradicts two-layer model**
Sources: Holistic (IMPORTANT), Software Architecture (IMPORTANT), Agent Skill (IMPORTANT)

All three reviewers flag the same issue. Phase 3 Step 5: "Commit proposed architecture changes to top-level `.project/architecture/`." The design spec says top-level = current reality, updated incrementally as slices complete via `/complete`. Committing the full proposal at approval time makes top-level reflect future intent, not current reality. Fix: Step 5 writes `approved.md` only; top-level updates are deferred to `/complete`.

Additionally (Software Architecture), the merge semantics are undefined even if the commit were correct — no specification of overwrite vs merge, handling of new files, or removal of subsystems.

Resolution: DIRECTLY_ACTIONABLE

---

## Important

**[I1] `complete-slice` will break for initiative slices — not addressed in plan**
Sources: Holistic (IMPORTANT), Software Architecture (CRITICAL), Agent Skill (IMPORTANT)

All three reviewers flag this. `complete-slice/SKILL.md` hardcodes scope resolution to `vertical-slices/` and `side-quests/`. Initiative slices at `initiatives/__active__<name>/vertical-slices/<slice>/` will be missed entirely. The goal says "Done when all skills work within initiative scope." This is a hard dependency of initiative infrastructure, not a nice-to-have follow-up.

At minimum: add `complete-slice` scope resolution update to this plan (Phase 4 or new phase), or explicitly document in the plan overview that `/complete-slice` will NOT work for initiative slices until a follow-up quest.

Resolution: USER_INPUT — decide: add to plan scope or explicitly defer with follow-up quest reference

---

**[I2] `refine-slices` will also break for initiative slices**
Sources: Holistic (IMPORTANT), Software Architecture (IMPORTANT), Agent Skill (IMPORTANT)

Same pattern as `complete-slice`. `refine-slices/SKILL.md` is hardcoded to `.project/vertical-slices/`. After `/define-slices` creates slices inside an initiative, `/refine-slices` will find nothing. Same resolution needed.

Resolution: USER_INPUT — decide: add to plan scope or explicitly defer with follow-up quest reference

---

**[I3] Phase 5 `/define-architecture` leaks initiative-type knowledge**
Sources: Software Architecture (IMPORTANT), Agent Skill (IMPORTANT)

Phase 5 asks `/define-architecture` to branch on `__active__initial` vs subsequent, writing to `architecture/` vs `architecture-proposal/`. This creates coupling — the skill now needs to know initiative naming conventions and semantic differences between types. Better: the calling context (convention file or `/create-initiative`/`/start-initiative`) determines the output path; `/define-architecture` writes to whatever path it's given.

Also (Agent Skill): the detection mechanism for "first vs subsequent" is underspecified. Is it name-based (`__active__initial`)? Content-based (scaffold check)?

Resolution: DIRECTLY_ACTIONABLE

---

**[I4] Phase 7 stale detection is too coarse**
Sources: Software Architecture (IMPORTANT), Holistic (MINOR)

Compares `git log -1` on the entire `.project/architecture/` directory against a slice's `goal.md`. If any architecture file changed (even unrelated subsystems), all goals are flagged stale — creates alert fatigue. Better: compare per-file or at minimum against `_overview.md` only.

Additionally (Holistic): for the first initiative, top-level is just a scaffold — stale detection would always trigger. Add scaffold detection to skip the check.

Additionally (Agent Skill): if architecture files were never committed, `git log` returns nothing — add `stat` fallback.

Resolution: DIRECTLY_ACTIONABLE

---

**[I5] No rollback path if `/start-initiative` approval is regretted**
Source: Software Architecture (IMPORTANT)

No "unapprove" transition exists. If approved architecture changes turn out wrong after slices execute, there's no mechanism to revert. The `approved.md` records the decision but committed architecture changes persist. This matters because the two-layer model's integrity depends on top-level being "current reality."

Note: C3 above (don't commit to top-level at approval) partially mitigates this — if top-level isn't changed at approval, there's less to roll back.

Resolution: DIRECTLY_ACTIONABLE

---

**[I6] `/create-initiative` Mode B lacks guidance on concurrent `__active__` initiatives**
Source: Agent Skill (IMPORTANT)

Design spec allows multiple initiatives in exploration/proposal simultaneously. Mode B should state this explicitly to prevent unnecessary guard checks. Also (Software Architecture MINOR): no uniqueness check on initiative names, no reserved name handling (e.g., "initial"), no length bounds.

Resolution: DIRECTLY_ACTIONABLE

---

**[I7] Missing skill description updates in Phases 4-7**
Source: Agent Skill (IMPORTANT)

Phases 4-7 modify skill behavior but don't update the `description` field in SKILL.md frontmatter. Examples: `/define-architecture` still says "Run after `/start-project`", `/define-slices` still says "Requires idea.md from /start-project". Stale descriptions reduce trigger accuracy.

Resolution: DIRECTLY_ACTIONABLE

---

## Minor

**[M1] `state-and-flow-formats.md` scope value update missing from plan**
Sources: Holistic (MINOR), Software Architecture (MINOR), Agent Skill (MINOR)

All three reviewers flag this. Research identifies that `state-and-flow-formats.md` needs `initiatives/<name>/vertical-slices/<name>` as a valid scope value. No phase includes this task.

Resolution: DIRECTLY_ACTIONABLE

---

**[M2] Phase 2 Mode A `mkdir` replacement is underspecified**
Source: Holistic (MINOR)

Plan says "Do NOT create top-level `vertical-slices/`" but doesn't provide the replacement `mkdir` command. Should explicitly replace `vertical-slices` with `initiatives/__active__initial` in the mkdir invocation.

Resolution: DIRECTLY_ACTIONABLE (minor clarification)

---

**[M3] Phase 1 transition table uses `/complete` but skill is named `complete-slice`**
Source: Holistic (MINOR)

Convention file references `/complete` which doesn't exist yet. Should use current name `/complete-slice` or note the rename dependency.

Resolution: DIRECTLY_ACTIONABLE

---

**[M4] Phase 1 consumer guide and Phase 4 status-logic.md duplicate state-to-skill mappings**
Source: Software Architecture (MINOR)

Both track which skills interact with initiative state. If they diverge, skills get contradictory guidance. Make convention file the single source; have `status-logic.md` reference it.

Resolution: DIRECTLY_ACTIONABLE

---

**[M5] Phase 4 interrupted work scan should note side quests are unchanged**
Source: Holistic (MINOR)

Phase 4 adds `initiatives/__active__*/vertical-slices/*/interrupted.md` to interrupted work check. Should also note that `side-quests/` remains at `.project/side-quests/` for clarity.

Resolution: DIRECTLY_ACTIONABLE (minor clarification)

---

**[M6] Phase 3 `/start-initiative` should accept initiative name as argument**
Source: Agent Skill (MINOR)

With multiple initiatives in proposal-pending state, user needs a way to specify which one to activate. Add optional initiative name argument.

Resolution: DIRECTLY_ACTIONABLE

---

**[M7] Phase 4 Format B initiative reporting lacks a concrete template**
Source: Agent Skill (MINOR)

Describes what to show but doesn't provide a template. Providing even a sketch reduces implementer ambiguity.

Resolution: DIRECTLY_ACTIONABLE

---

**[M8] Phase 5 top-level scaffold content is vague**
Source: Holistic (MINOR)

Doesn't specify whether scaffold `_overview.md` should include maturity table headers per `maturity-conventions.md`. Should at minimum include `## Subsystem Maturity` header with empty table, or explicitly say "no maturity table until first slice completes."

Resolution: DIRECTLY_ACTIONABLE

---

**[M9] Verification tasks lack runtime verification**
Source: Holistic (MINOR)

All verification is static ("read the file, confirm sections present"). Consider adding at least one end-to-end smoke test per phase: run the skill in a test directory and confirm expected output structure.

Resolution: DIRECTLY_ACTIONABLE

---

## Deduplication Notes

| Merged Issue | Sources Collapsed |
|---|---|
| C1 (row #7 unreachable) | Holistic IMPORTANT + Agent Skill CRITICAL — kept Agent Skill's severity |
| C3 (top-level commit) | Holistic IMPORTANT + SA IMPORTANT + Agent Skill IMPORTANT — all agree, SA adds merge semantics concern |
| I1 (complete-slice) | Holistic IMPORTANT + SA CRITICAL + Agent Skill IMPORTANT — SA's severity reflects lifecycle-breaking impact but USER_INPUT needed |
| I2 (refine-slices) | Holistic IMPORTANT + SA IMPORTANT + Agent Skill IMPORTANT — all agree |
| I4 (stale detection) | SA IMPORTANT + Holistic MINOR + Agent Skill MINOR — kept SA's severity, merged sub-issues |
| M1 (state-and-flow-formats) | All three reviewers — identical issue |

## Contradictions Resolved

1. **Severity of row #7 overlap**: Holistic rated IMPORTANT, Agent Skill rated CRITICAL. Resolved as CRITICAL — an unreachable state machine row is a logic error that causes incorrect behavior, not merely an important oversight.

2. **Severity of `complete-slice` gap**: Software Architecture rated CRITICAL, others IMPORTANT. Resolved as IMPORTANT (requiring USER_INPUT) — the issue is real and lifecycle-breaking, but the resolution requires a scoping decision (add to plan vs defer), not just a code fix. If the decision is "add to plan," it becomes critical implementation work.

3. **Phase 3 top-level commit**: All reviewers flag this but Holistic says "remove the commit step," SA says "define merge semantics," Agent Skill says "defer to /complete." Resolved as: the commit step should be removed (per design spec's two-layer model), making the merge semantics question moot.

### USER_INPUT Resolved

1. **complete-slice scope**: User chose "Add to this plan" — add scope resolution fixes for complete-slice to handle initiative slices at `initiatives/__active__<name>/vertical-slices/<slice>/`.
2. **refine-slices scope**: User chose "Add to this plan" (same answer) — add scope resolution fixes for refine-slices to handle initiative slices.
