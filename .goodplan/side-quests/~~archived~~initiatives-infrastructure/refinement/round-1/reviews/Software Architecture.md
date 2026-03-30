# Software Architecture Review

## Issues

**[CRITICAL]** `complete-slice` will break when slices live inside initiatives — not in plan scope

The research file correctly identifies that `complete-slice/SKILL.md` and `complete-slice/references/guidance.md` hardcode scope resolution to `vertical-slices/` and `side-quests/`. When initiative slices live at `initiatives/__active__<name>/vertical-slices/<slice>/`, the auto-detect scan (`scan .project/vertical-slices/`) will miss them entirely. The artifact loading step also reads `.project/vertical-slices/sequencing.md` — wrong path for initiative slices. The plan notes this as a "follow-up quest" but does not add a task to Phase 4 or Phase 6 to at minimum update `complete-slice`'s scope resolution to also scan `initiatives/__active__*/vertical-slices/`. Without this, the core slice lifecycle (plan -> refine -> implement -> complete) is broken for initiative slices — the workflow cannot complete.

This is not a "nice to have follow-up" — it is a hard dependency of the initiative infrastructure itself. At minimum, `complete-slice`'s scope resolution and artifact loading paths must be updated in this plan.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** State machine in Phase 1 has conflicting entries for first initiative vs subsequent initiative

The state machine table in Phase 1 (rows 5-8) mixes first-initiative and subsequent-initiative logic without distinguishing them. Row 5 says `approved.md` or `architecture-proposal-skipped.md` leads to "Needs slice planning" — but for the first initiative, neither file exists (first initiative skips the approval gate and writes directly to `architecture/`). Row 8 says `explore-complete.md` without a proposal leads to "Needs architecture proposal (or skip)" — but for the first initiative it should be "Needs architecture definition" (writing to `architecture/`, not `architecture-proposal/`).

The design spec in `workflow.md` handles this with explicit branches ("For the first initiative" vs "For subsequent initiatives") in the File Existence as State Machine section. The convention file must do the same — a single flat table cannot capture both paths without ambiguity. Skills consuming this table will implement incorrect state transitions for the first initiative.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 creates a coupling between `/define-architecture` and initiative type that leaks implementation details

Phase 5 asks `/define-architecture` to branch on whether the scope is `__active__initial` vs a subsequent initiative, writing to `architecture/` vs `architecture-proposal/`. This creates a leaky abstraction — `/define-architecture` now needs to know the naming convention of the first initiative and the semantic difference between initiative types. A better design: the convention file or the calling context should tell `/define-architecture` the output path. The skill writes architecture files to whatever path it's given. The "is this first or subsequent?" decision belongs in `/create-initiative` (which sets up the directory structure) and `/start-initiative` (which handles the proposal), not in `/define-architecture`.

This reduces coupling: `/define-architecture` writes to a target directory. The initiative infrastructure decides what that directory is.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `refine-slices` gap undermines the plan's completeness claim

Like `complete-slice`, `refine-slices` is hardcoded to `.project/vertical-slices/`. The plan's overview says "Each skill update is additive — new initiative-aware paths inserted without changing existing behavior for side quests." But `refine-slices` is listed in the "Skills to Build" table in `idea.md` as `/refine-slices`. If a user runs `/refine-slices` after defining slices within an initiative (the natural next step suggested by the workflow), it will find nothing. The plan should either (a) include `refine-slices` scope updates or (b) explicitly document it as out-of-scope in the overview with a note that `/refine-slices` will not work for initiative slices until a follow-up quest completes.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 7 stale detection uses architecture directory date — too coarse

The stale check compares `git log -1 --format="%ai" -- .project/architecture/` against `<scope>/goal.md`. This compares the last modification to *any* file in the architecture directory against the goal. If architecture has 10 files and only one unrelated subsystem changed, all goals will be flagged as stale. This creates alert fatigue and trains users to ignore the warning.

Better: compare per-file. Track which architecture files a slice's goal.md references (from `sequencing.md` or goal content), and only flag staleness when those specific files changed. If that's too complex for this phase, at minimum compare against `_overview.md` only (the summary document), not the entire directory.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 (`/start-initiative`) commits architecture proposal to top-level but plan doesn't specify merge semantics

Step 5 of Phase 3 says "Commit proposed architecture changes to top-level `.project/architecture/`." But what does "commit" mean architecturally? Overwrite? Merge? The initiative's `architecture-proposal/` may contain `_overview.md` changes, new subsystem files, and modifications to existing files. The plan doesn't define:
- What happens if a file exists in both top-level and proposal (merge strategy)
- What happens if the proposal adds new files (copy)
- What happens if the proposal removes or replaces a subsystem (confirmation)
- Whether the initiative's own `architecture/` directory is populated from the merged result

This is a critical operation — getting it wrong corrupts the architecture source of truth.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** No rollback path if `/start-initiative` approval is regretted

Phase 3 handles approve/reject at decision time, but there's no defined path if the user approves and then realizes the architectural changes were wrong after some slices execute. The state machine has no "unapprove" transition. The `approved.md` file records the decision but there's no mechanism to revert the top-level architecture changes that were committed during approval. An "abandon initiative" transition exists but doesn't address reverting committed architecture changes.

This matters architecturally because the two-layer model's integrity depends on top-level architecture being "current reality." If approved changes turn out wrong, the top-level becomes fiction.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 consumer guide and Phase 4 state-to-skill mapping are duplicated concerns

Phase 1 creates a "Consumer Guide: Which skills create/read/update initiative artifacts" in the convention file. Phase 4 updates `status-logic.md` with state-to-next-skill mappings. These overlap — both track which skills interact with initiative state. If they diverge, skills will get contradictory guidance. Consider making the convention file the single source and having `status-logic.md` reference it rather than maintaining a parallel mapping.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Mode B auto-detect of initiative name is underspecified

"Auto-detect initiative name from conversation (kebab-case, 2-4 words). If unclear, ask via AskUserQuestion." This is the only guidance for name derivation. There's no uniqueness check against existing initiative directories, no reserved name handling (what if someone names an initiative "initial"?), and no length bounds beyond word count. These edge cases should be specified in the convention file (Phase 1) since naming is a cross-cutting concern.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `state-and-flow-formats.md` scope value update missing from plan

The research file identifies that `_shared/references/state-and-flow-formats.md` needs `initiatives/<name>/vertical-slices/<name>` added as a valid scope value. No phase in the plan includes this task. Scope values appear in flow-log entries and state.md — if initiative scope values aren't documented, skills will invent inconsistent formats.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan demonstrates strong understanding of the domain and thorough research, but has critical architectural gaps. The `complete-slice` omission breaks the slice lifecycle for initiative scopes. The state machine conflation of first/subsequent initiative logic will cause incorrect state transitions. The `/define-architecture` coupling leaks initiative-type knowledge into a skill that should be path-agnostic. The merge semantics for architecture proposal approval are undefined despite being a high-stakes operation. To reach 9+: (1) add `complete-slice` initiative awareness to plan scope, (2) split state machine into first-initiative and subsequent-initiative branches, (3) make `/define-architecture` path-agnostic by passing the output directory as context, (4) define architecture merge semantics in Phase 3, (5) address the stale detection granularity.

## Summary
- Critical: 2
- Important: 5
- Minor: 3
