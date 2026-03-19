# Phase 4: `/project-status` Update

Teach project-status the initiative state machine, `__active__` detection, and initiative-level reporting.

### Tasks

- [ ] **Update `references/status-logic.md`**: Add initiative states to the state machine section. Keep per-slice states as-is. Add:
  - Initiative state machine reference: "Load `initiative-conventions.md` for initiative states"
  - `__active__` detection: `ls initiatives/__active__*/ 2>/dev/null` to find active initiative
  - Initiative-level scope resolution: when active initiative exists, it's the active scope (below Work Stack, above project level)
  - State-to-next-skill mapping for initiative states (ready-for-exploration → `/explore`, needs-architecture-proposal → `/define-architecture`, proposal-pending → `/start-initiative`, needs-slice-planning → `/define-slices`, needs-completion → `/complete`)

- [ ] **Update SKILL.md — Step 5 (Determine Active Scope)**: Add initiative awareness:
  1. Work Stack top (existing)
  2. Active initiative's active slice (NEW — check `__active__` initiative's slices)
  3. Active initiative itself (NEW — if no active slice within it)
  4. Active Slice from state.md (existing fallback)
  5. Project level (existing fallback)

- [ ] **Update SKILL.md — Step 6 (State Machine)**: Add initiative directory scanning:
  - Scan `initiatives/` for non-archived directories
  - Apply initiative state machine from conventions file
  - For `__active__` initiative, also scan its `vertical-slices/` and apply per-slice state machine

- [ ] **Update Format B (Between Work Items)**: Add initiative reporting:
  - Show active initiative and its phase
  - Show initiatives in exploration/proposal (not yet active)
  - Show count of archived initiatives
  - Replace "Up next (vertical slices)" with initiative-scoped slice listing when an active initiative exists

- [ ] **Update `project-status` state-to-next-skill mapping**: Add initiative state mappings. Update `/start-project` references to `/create-initiative`.

### Verification

- Read updated SKILL.md and status-logic.md. Confirm initiative state machine is referenced, `__active__` detection works, scope resolution includes initiative layer.
- Confirm Format B shows initiative information.
- Confirm state-to-next-skill mappings cover all initiative states.
