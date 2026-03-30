# Software Architecture Review — Round 2

## Issues

**[IMPORTANT]** Phase 8 `/complete-slice` architecture merge instruction is ambiguous about which architecture to update

Phase 8 says: "`/complete-slice` should update the initiative's own architecture if needed, not the top-level." But the design spec (workflow.md line 424) says top-level is "updated incrementally as slices and side quests complete" via `/complete`. This creates a question: does `/complete-slice` (for initiative slices) update the initiative's `architecture/`, the top-level `architecture/`, or both? The current `/complete-slice` SKILL.md (Step 7 in the actual file — architecture comparison) compares implementation against `.project/architecture/` and proposes updates there. For initiative slices, the primary architecture is the initiative's `architecture/`, but incremental updates to top-level are also needed per the design spec. Phase 8 needs to specify: (a) compare against initiative `architecture/` (the target state the slice was planned against), (b) propose updates to top-level `architecture/` (current reality reflecting what was built), and (c) leave initiative `architecture/` unchanged (it represents the target, not current state).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 5 output path passing mechanism is underspecified

The round-1 fix correctly made `/define-architecture` path-agnostic ("writes architecture files to whatever path it receives"). But the plan doesn't specify the mechanism for passing the output path. Three options exist: (a) command-line argument to the skill, (b) derived from state.md, (c) the calling skill sets it up. The plan says "Callers pass the output path" and "The convention file and `/project-status` next-step suggestions provide the correct path" — but these are different mechanisms. `/project-status` suggests the next command (e.g., `/define-architecture initiatives/__active__initial/architecture/`), which implies the path is a CLI argument. But `/define-architecture` currently takes no arguments — it reads from `.project/` paths. The plan needs to specify: does `/define-architecture` accept an output-path argument, or does it read from state.md, or does it resolve from the active initiative?

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 7 stale detection — scaffold skip logic needs a concrete test

Round 1 feedback (I4) led to adding scaffold detection to skip stale checks. The plan says: "skip if the top-level architecture is a scaffold (contains only a pointer to the active initiative's architecture)." But there's no specified mechanism for detecting a scaffold. Is it a content check (grep for "Architecture is being defined in the active initiative")? A file size check? A marker file? If the scaffold wording changes slightly (during implementation or future edits), content-based detection breaks silently and stale checks start firing false positives. Specify the detection mechanism — e.g., a `scaffold: true` marker in the file's frontmatter, or checking that `_overview.md` has fewer than N lines, or checking for absence of a `## Subsystem Maturity` table with actual entries.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 state machine — `abandoned.md` check position differs from design spec

The plan's Phase 1 state machine puts `abandoned.md` as row #1 in the "Shared states" section, which is correct (first-match-wins, takes precedence). But the design spec (workflow.md line 482) lists it after all the phase-specific states: "abandoned.md exists → abandoned (takes precedence over all other states)." The parenthetical "(takes precedence)" is the spec's mechanism for overriding position. The plan's approach (row #1) is actually better — it makes the precedence structural rather than relying on a parenthetical. No change needed, but the convention file should note that this ordering difference from the design spec is intentional, to avoid future confusion when someone cross-references.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 transition table missing `architecture-proposal-skipped` transitions for first initiative

The transition table (Phase 1) shows `needs-architecture-proposal → user skips proposal → needs-slice-planning (writes architecture-proposal-skipped.md)`. But the first initiative never enters `needs-architecture-proposal` — it goes from exploring to `needs-architecture` (definition, not proposal). The table has no explicit "first initiative: needs-architecture → /define-architecture → needs-slice-planning" transition. The shared states handle the condition check correctly (row #5 checks `architecture/` exists), but the transition table is supposed to be complete for verification. The missing transitions are: `needs-architecture → /define-architecture → needs-slice-planning` and `ready-for-exploration → user skips explore → needs-architecture` (for first initiative).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 6 doesn't address what happens to top-level `vertical-slices/` references in CLAUDE.md

Phase 6 updates `/define-slices` to write to initiative-scoped paths, and its Step 8 (CLAUDE.md update) "will need to reference the initiative's sequencing.md instead." But existing projects that ran `/define-slices` before initiatives existed will have `.project/vertical-slices/sequencing.md` in their CLAUDE.md. When initiative support is added and slices move inside initiatives, those CLAUDE.md references become stale. The plan should note that this is a migration concern for existing projects — either `/create-initiative` Mode A (re-setup) handles it, or `/project-status` detects and reports the stale reference.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 8 `/refine-slices` scope resolution doesn't address the `slices-refining/` run directory path

The plan says "resolve to `initiatives/__active__<name>/vertical-slices/` instead" for the working directory and mentions updating `sequencing.md` paths. But the run directory for `/refine-slices` is currently `.project/vertical-slices/slices-refining/` (hardcoded in the loop parameters). This needs to move to `initiatives/__active__<name>/vertical-slices/slices-refining/`. The plan's task list mentions updating "working dir, run dir, manifest" but only specifies the fix for scope resolution and sequencing.md — the run directory path should be explicitly called out since it's where round reviews are stored.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 1's critical issues (state machine conflation, top-level commit contradiction, complete-slice omission) are all resolved. The plan now correctly separates first-initiative and subsequent-initiative state machine paths, defers top-level architecture updates to `/complete`, includes both `complete-slice` and `refine-slices` in scope, and makes `/define-architecture` path-agnostic. The remaining issues are at the IMPORTANT level — the `/complete-slice` dual-architecture question (which layer to compare, which to update) and the output-path-passing mechanism for `/define-architecture` are the two that could cause implementation confusion if not clarified. To reach 9+: specify the `/complete-slice` architecture update semantics for initiative slices, nail down how `/define-architecture` receives its output path, and add a concrete scaffold detection mechanism for stale checks.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
