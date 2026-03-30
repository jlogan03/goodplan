# Phase 4: `/project-status` Update

Teach project-status the initiative state machine, `__active__` detection, and initiative-level reporting.

### Tasks

- [x] **Update `references/status-logic.md`**: Add initiative states to the state machine section. Keep per-slice states as-is. Add:
  - Initiative state machine reference: "Load `initiative-conventions.md` for initiative states and state-to-skill mappings" — `initiative-conventions.md` is the single source of truth; `status-logic.md` should reference it rather than duplicating the mappings
  - `__active__` detection: `ls initiatives/__active__*/ 2>/dev/null` to find active initiative
  - Initiative-level scope resolution: when active initiative exists, it's the active scope (below Work Stack, above project level)
  - Stale Active Slice: if state.md's Active Slice references an initiative path that no longer exists in the file system (e.g., the directory was renamed or deleted but state.md wasn't updated), treat it as stale and fall through to project level

- [x] **Update SKILL.md — Step 5 (Determine Active Scope)**: Add initiative awareness:
  1. Work Stack top (existing)
  2. Active initiative's active slice (NEW — check `__active__` initiative's slices via file-existence)
  3. Active initiative itself (NEW — if no active slice within it)
  4. Active Slice from state.md (existing fallback — only when no active initiative found in steps 2-3; file-existence takes precedence per `status-logic.md` convention)
  5. Project level (existing fallback)

- [x] **Update SKILL.md — Step 6 (State Machine)**: Add initiative directory scanning:
  - Scan `initiatives/` for non-archived directories
  - Apply initiative state machine from conventions file
  - For `__active__` initiative, also scan its `vertical-slices/` and apply per-slice state machine
  - Add `initiatives/__active__*/vertical-slices/*/interrupted.md` to interrupted work check. Note: side quests remain at `.project/side-quests/` (unchanged)

- [x] **Update Format B (Between Work Items)**: Add initiative reporting:
  - Show active initiative and its phase
  - Show initiatives in exploration/proposal (not yet active)
  - Show count of archived initiatives
  - Replace "Up next (vertical slices)" with initiative-scoped slice listing when an active initiative exists
  - Template sketch:
    ```
    ## Active Initiative: <name>
    State: <state> | Next: <skill>
    Slices: <completed>/<total> complete

    ## Other Initiatives
    - <name>: <state>

    ## Side Quests
    - <name>: <state>

    ## Archived: <count> initiatives
    ```

- [x] **Update `project-status` state-to-next-skill mapping**: Add initiative state mappings. Update `/start-project` references to `/create-initiative`.

- [x] **Update SKILL.md `description` field**: Update the frontmatter description to reflect initiative awareness (e.g., mention initiative state detection and reporting).

### Verification

- Read updated SKILL.md and status-logic.md. Confirm initiative state machine is referenced, `__active__` detection works, scope resolution includes initiative layer.
- Confirm Format B shows initiative information.
- Confirm state-to-next-skill mappings cover all initiative states.
