# Side Quest: Side Quest Interruption Lifecycle

## What We're Building

The mechanics for interrupting a slice with a side quest and resuming afterward. Today `workflow.md` describes this flow and the state machine checks for `interrupted.md` and work stack entries, but no skill implements the transitions. The work stack in `state.md` is dead infrastructure — nothing pushes to or pops from it.

Three connected gaps:
1. **No skill creates `interrupted.md`** — `project-status` checks for it, `workflow.md` defines its contents (quest name, phase when interrupted), but nothing writes it.
2. **No skill creates `abandoned.md`** — `workflow.md` defines a multi-step abandonment process (write file with reason/learnings/code disposition, roll up learnings, archive), but no skill guides it. `epic-conventions.md` labels it "User action" but the process is too involved for manual handling.
3. **Work stack push/pop never happens** — every skill writes "Work Stack: unchanged". `/create-epic` initializes it as `(empty)`. The stack exists in the state format but is never mutated.

## Dependencies

- No skill dependencies — this builds on existing infrastructure (`state.md`, `project-status`, `/complete`)

## What Changes

### Option A: New skills

- **`/interrupt`** (or `/start-side-quest`) — Handles mid-slice interruption:
  1. Write `interrupted.md` in the current slice (quest name, current phase)
  2. Push current slice onto work stack in `state.md`
  3. Create `side-quests/<name>/goal.md` (interactive goal capture)
  4. Update state.md active slice to the new side quest
  5. Log to activity-log

- **`/abandon`** — Handles abandonment of any scope (slice, side quest, epic):
  1. Write `abandoned.md` (reason, what was learned, code disposition, revisit likelihood)
  2. Roll up learnings to `learnings.md` (reuse `/complete` Step 4-5 pattern)
  3. If the abandoned scope was interrupting something, pop work stack and delete `interrupted.md`
  4. Archive with `~~archived~~` prefix
  5. Update state.md, log to activity-log

### Option B: Extend existing skills

- Extend `/complete` to handle work stack pop and `interrupted.md` cleanup when a side quest finishes
- Add interruption handling to `/create-plan` or `/explore` (since those are typical entry points for side quests)
- Add `/abandon` as a mode of `/complete`

### Decision needed during planning

Whether to create new standalone skills or extend existing ones. Standalone is cleaner but adds skill count. Extending `/complete` for the resume-after-quest flow is natural since it already handles side quest completion.

## Success Criteria

- [ ] Mid-slice interruption creates `interrupted.md` with quest name and current phase
- [ ] Work stack in `state.md` is pushed when interrupting and popped when resuming
- [ ] `/project-status` correctly reports interrupted slices (already works — just needs data)
- [ ] Completing a side quest that interrupted a slice resumes the interrupted work (pop stack, remove `interrupted.md`, update active slice)
- [ ] Abandonment writes `abandoned.md` with reason, learnings, code disposition
- [ ] Abandoned work learnings still roll up to `learnings.md`
- [ ] Abandoned interrupting work correctly resumes the interrupted scope
- [ ] Abandoned scopes get `~~archived~~` prefix
- [ ] All transitions log to activity-log

## Scope Boundaries

**In scope**: `interrupted.md` creation/cleanup, work stack push/pop, `abandoned.md` creation, learnings rollup from abandoned work, state transitions for interruption and abandonment

**Out of scope**: Changes to `workflow.md` state machine (it already describes this correctly), changes to `project-status` (it already checks for these files), the `after-implementation-fixes-and-polish.md` gap (separate minor issue)
