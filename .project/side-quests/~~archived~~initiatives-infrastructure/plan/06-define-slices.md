# Phase 6: `/define-slices` Update

Update `/define-slices` to work within an initiative's `vertical-slices/` directory instead of the project root.

### Tasks

- [ ] **Update scope resolution in SKILL.md**: When an active initiative exists (`__active__` prefix), slices are defined within `initiatives/__active__<name>/vertical-slices/`. The skill should:
  - Detect the active initiative by scanning `initiatives/__active__*/`
  - Write `sequencing.md` to `initiatives/__active__<name>/vertical-slices/sequencing.md`
  - Write per-slice `goal.md` to `initiatives/__active__<name>/vertical-slices/<NN-slice-name>/goal.md`
  - Load initiative's architecture files for context (not just top-level)

- [ ] **Update context loading**: Read both the initiative's `architecture/` and the initiative's `goal.md` for context. The initiative goal informs slice decomposition.

- [ ] **Update references to sequencing.md**: Ensure any reference to `.project/vertical-slices/sequencing.md` in the skill is relative to the initiative, not hardcoded to project root.

- [ ] **Update state.md Next Step**: After slices defined, suggest `/create-plan` for the first slice (scoped to initiative).

- [ ] **Per-slice explore phase removed**: Note that individual slices within initiatives do NOT have an explore phase. All exploration happens at the initiative level. Narrow research during slice planning is handled by `/create-plan`'s existing research step.

### Verification

- Read updated SKILL.md. Confirm:
  - Slices are created within the active initiative's directory
  - `sequencing.md` is written to the initiative's `vertical-slices/`
  - Initiative architecture and goal are loaded as context
  - No per-slice explore phase
