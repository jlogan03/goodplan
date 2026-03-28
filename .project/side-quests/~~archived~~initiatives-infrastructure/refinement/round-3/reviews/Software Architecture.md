# Software Architecture Review — Round 3

## Issues

**[IMPORTANT]** Phase 5 `/define-architecture` state.md-based path resolution creates a circular dependency for the first initiative

Phase 5 says: "The skill reads `state.md` to detect the active initiative and derives the output path by looking up the initiative type in `initiative-conventions.md`." But for the first initiative, `/define-architecture` runs *before* any initiative state has been written to `state.md` by `/project-status`. The sequence is: `/create-initiative` (Mode A) creates `initiatives/__active__initial/goal.md` and writes state.md with Next Step `/explore`. After explore, the user runs `/define-architecture`. At that point, state.md's Active Slice field says something like `"none (working at project level)"` or points to the initiative — but the plan doesn't specify what `/create-initiative` writes to Active Slice for the first initiative. If it writes `"none"`, then `/define-architecture`'s state.md lookup finds no initiative context and falls back to `.project/architecture/` (the legacy path). The plan should specify: (a) what `/create-initiative` Mode A writes to Active Slice in state.md (e.g., `initiatives/__active__initial`), and (b) how `/define-architecture` resolves this to the correct output path. Without this, the path derivation chain has a gap at the first initiative's first architecture run.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `/audit-architecture` and `/refine-architecture` are missing from plan scope but read/write architecture files

The maturity-conventions.md consumer guide shows `/audit-architecture` audits the maturity table, invariants, and fitness functions in `architecture/`. `/refine-architecture` evaluates and updates them. Both skills hardcode reads to `.project/architecture/`. When initiative architecture lives in `initiatives/__active__<name>/architecture/`, these skills will read the wrong location for initiative-scoped work. The plan updates 7 skills but omits these two. Unlike `/implement-plan` (which is genuinely unchanged), these skills operate directly on architecture files whose location changes. At minimum, note this as a known gap with a follow-up quest — or add a lightweight phase that updates their scope resolution.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 scope resolution expansion (3-step to 5-step) doesn't specify precedence between initiative's active slice and state.md's Active Slice

Phase 4 defines scope resolution as: (1) Work Stack top, (2) Active initiative's active slice, (3) Active initiative itself, (4) Active Slice from state.md, (5) Project level. But steps 2 and 4 could both be present — if the active initiative has an active slice AND state.md's Active Slice also points somewhere (possibly to the same slice, or to a stale value). The plan should clarify: when an active initiative exists, does step 4 (state.md Active Slice) become redundant? If state.md and the file-existence scan disagree (state.md says slice A, but file scan says slice B is further along), which wins? The existing convention is "file-existence overrides state.md" (status-logic.md line 16: "these rules override it"). The plan should explicitly state that step 2 (file-existence-based) takes precedence over step 4 (state.md-based), and that step 4 exists only as a fallback when no active initiative exists.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 two-layer architecture model missing read/write table

Phase 1 tasks say the convention file should "Include a table showing who reads/writes each layer." This is explicitly called out as a deliverable, but the plan doesn't draft the table contents. The maturity-conventions.md already has a consumer guide table as a pattern. Phase 1 should include at least a sketch of what this table looks like — which skills read top-level, which read initiative architecture, which write to each. Without this, the implementer must reverse-engineer it from scattered references across all 8 phases.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-1 critical issues and round-2 important issues are resolved. The plan correctly separates first/subsequent initiative state machines, defers top-level architecture updates to `/complete`, includes `/complete-slice` and `/refine-slices` in scope, specifies the path-passing mechanism (state.md + convention lookup), defines scaffold detection (`<!-- scaffold -->` marker), and explicitly documents the `abandoned.md` ordering rationale. The two remaining IMPORTANT issues are: (1) a gap in the state.md path resolution chain for the first initiative's `/define-architecture` run, and (2) two architecture-operating skills (`/audit-architecture`, `/refine-architecture`) that are omitted from scope without acknowledgment. Both are straightforward to fix. The MINOR issues are clarifications that would help implementers but won't cause incorrect behavior.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
