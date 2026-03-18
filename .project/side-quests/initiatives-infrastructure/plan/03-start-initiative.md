# Phase 3: `/start-initiative` Skill

New skill. The approval/activation gate — reviews architecture proposal, gets user confirmation, commits architectural changes to top-level, and activates the initiative.

### Tasks

- [ ] **Create skill directory**: `~/.claude/skills/start-initiative/` with SKILL.md and references/.

- [ ] **Write SKILL.md** with workflow:
  1. **Load context**: Read `initiative-conventions.md`, the initiative's `goal.md`, and `architecture-proposal/` (if exists).
  2. **Validate state**: Check initiative is in `proposal-pending` or `needs-architecture-proposal` state. If not, explain what state it's in and what needs to happen first.
  3. **Check no active initiative**: Glob `initiatives/__active__*/`. If found, tell user which initiative is active and that it must be completed or abandoned first.
  4. **Handle architecture proposal**:
     - If `architecture-proposal/` exists: present a summary of proposed changes. Use AskUserQuestion: "Approve and activate / Review in detail / Reject and go back to exploration / Skip architecture changes".
     - If no proposal and no `architecture-proposal-skipped.md`: ask if architecture changes are needed. If no, write `architecture-proposal-skipped.md`.
  5. **On approval**: Write `approved.md` with decision rationale, conditions, and list of architecture files modified. Commit proposed architecture changes to top-level `.project/architecture/`.
  6. **Activate**: Rename `initiatives/<name>/` to `initiatives/__active__<name>/`.
  7. **Update state**: state.md, flow-log.

- [ ] **Add trigger to SKILL.md frontmatter**: Common triggers: 'start initiative', 'activate initiative', 'pull the trigger', 'approve initiative', 'let's start building'.

- [ ] **Update `project-status` state-to-next-skill mapping** (in Phase 4's scope, but note the dependency here): `proposal-pending` → `/start-initiative`.

### Verification

- Read SKILL.md. Confirm it validates state, checks for active initiative, handles both proposal and no-proposal cases.
- Confirm `approved.md` writing includes rationale and architecture file list.
- Confirm activation renames directory correctly.
