# Phase 8: `/complete-slice` + `/refine-slices` Scope Resolution

Update both skills to resolve initiative-scoped slices, not just top-level `vertical-slices/` and `side-quests/`.

### Tasks

**`/complete-slice`:**

- [x] **Update scope resolution in SKILL.md**: Add initiative slice path pattern. Currently hardcoded to `.project/vertical-slices/` and `.project/side-quests/`. Add `initiatives/__active__<name>/vertical-slices/<slice>/` as a valid scope. When the active scope (from state.md or argument) points to an initiative slice, resolve paths accordingly.

- [x] **Extend auto-detect scan (Step 2.3)**: Currently auto-detect globs `.project/vertical-slices/` and `.project/side-quests/` for completion-ready slices. Add `.project/initiatives/__active__*/vertical-slices/*/` to the auto-detect scan using the same completion-readiness criteria. This ensures running `/complete-slice` with no argument while an initiative slice is ready will find it.

- [x] **Update architecture updates for initiative slices**: When completing an initiative slice, `/complete-slice` should: (a) compare the implementation against the initiative's `architecture/` (the target) to verify alignment, (b) propose updates to top-level `.project/architecture/` (current reality — reflecting what was actually built), (c) leave the initiative's `architecture/` unchanged. Top-level updates are incremental per-slice; `/complete` at initiative completion handles the final merge.

- [x] **Update description in SKILL.md frontmatter**: Reflect that the skill now handles initiative-scoped slices in addition to top-level slices and side quests.

**`/refine-slices`:**

- [x] **Update scope resolution in SKILL.md**: Currently hardcoded to `.project/vertical-slices/`. When an active initiative exists, resolve to `initiatives/__active__<name>/vertical-slices/` instead. Load initiative's `goal.md` and `architecture/` as context for refinement. Update the "Scope Exclusion" clause from "Only vertical slice goal files under `.project/vertical-slices/` are in scope" to: "Only vertical slice goal files under `.project/vertical-slices/` or `initiatives/__active__*/vertical-slices/` are in scope."

- [x] **Update sequencing.md path**: Ensure `sequencing.md` reads/writes are relative to the initiative's `vertical-slices/`, not the project root.

- [x] **Update run directory path**: For initiative-scoped refinement, use `.project/initiatives/__active__<name>/vertical-slices/slices-refining/` as the run directory (replacing the current hardcoded `.project/vertical-slices/slices-refining/`). Update working dir, run dir, and manifest paths accordingly.

- [x] **Update manifest construction paths**: The manifest construction logic — which globs for `goal.md` files and creates `goal-refining.md` working copies — is a separate code path from scope resolution. Update the glob pattern from `.project/vertical-slices/*/goal.md` to also support `initiatives/__active__<name>/vertical-slices/*/goal.md` when initiative-scoped. Ensure the working copies are created in the initiative-scoped run directory.

- [x] **Update description in SKILL.md frontmatter**: Reflect initiative-scoped slice refinement.

### Verification

- Read both updated SKILL.md files. Confirm:
  - `/complete-slice` resolves initiative slice paths correctly
  - `/refine-slices` finds slices within the active initiative's directory
  - Both descriptions reflect initiative awareness
- Grep both skills for hardcoded `vertical-slices/` paths — all should be parameterized or include initiative variants.
