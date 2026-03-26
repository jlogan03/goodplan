# Codebase Context: complete-rename

## Current Skill Structure

**Directory**: `~/.claude/skills/complete-slice/`

| File | Purpose |
|---|---|
| `SKILL.md` | 238 lines. 11-step workflow: scope resolution, artifact loading, learnings synthesis, architecture updates, system-profile, debt evaluation, signal tracking, CLAUDE.md update, remaining slice review, cleanup, state write-back + archive. Handles three scope types: `initiative-slice`, `top-level-slice`, `side-quest`. |
| `references/guidance.md` | 117 lines. Detailed protocols for scope resolution, artifact loading, learnings format, architecture update protocol, decision file format, graceful stop states, system profile update, debt evaluation, signal tracking algorithm, archive convention, re-entry. |

No other files in the skill directory.

## Files Referencing `complete-slice` (Non-Archived, Needs Updating)

### Skill files (`~/.claude/skills/`)

| File | Occurrences | What to change |
|---|---|---|
| `complete-slice/SKILL.md` | ~10 | Frontmatter `name:`, decision Context field, recency marker, flow-log phase, state.md phase, graceful stop states. All become `complete`. |
| `complete-slice/references/guidance.md` | ~5 | Decision format Context field, graceful stop state strings, recency marker, flow-log phase filter. |
| `project-status/references/status-logic.md` | 1 | Line 113: `/complete-slice <path>` with parenthetical "(currently named /complete-slice, may be renamed to /complete later)". Change to `/complete <path>`, remove parenthetical. |
| `_shared/references/system-profile-format.md` | 5 | References to `/complete-slice` as primary writer, recency marker format, consumer list. |
| `_shared/references/decisions-format.md` | 1 | Writers list includes `/complete-slice`. |
| `_shared/references/expertise-tracking.md` | 1 | Consumer list includes `/complete-slice`. |

**Note**: `_shared/references/initiative-conventions.md` already uses `/complete` (no `complete-slice` references). It does NOT have parenthetical annotations to clean up.

### Repo files (`/Users/iwhite/Repos/goodplan/`)

| File | Occurrences | What to change |
|---|---|---|
| `.project/learnings.md` | 4 | Lines 65, 68: learning title + body mentioning `complete-slice`. Lines 101, 106: `_Source: 07-complete-slice_` tags. These are historical records — the plan should decide whether to update or leave as-is. |
| `.project/system-profile.md` | ~8 | Recency markers (`<!-- Last updated by: complete-slice ...`), signal tracking description, Recent Changes entry. Historical markers — plan should decide. |
| `.project/idea.md` | 0 | Already uses `/complete`. No changes needed. |
| `CLAUDE.md` | 0 | Already uses `/complete`. No changes needed. |
| `workflow.md` | 0 | Already uses `/complete`. No changes needed. |
| `.project/flow-log.jsonl` | ~12 | Historical entries with `"phase":"complete-slice"`. These are immutable log entries — do NOT change. But signal tracking in the skill filters on `phase: "complete-slice"`, so the new skill must handle both `"complete-slice"` and `"complete"` phase values in flow-log queries. |
| `.project/side-quests/onboard-repo/goal.md` | 1 | Line 51: "complete-slice refactor intelligence" in Out of scope. |
| `.project/side-quests/refactor-intelligence/goal.md` | 3 | Lines 5, 9, 13: references to `/complete-slice` Step 9. |
| `.project/side-quests/maturity-context-loading/goal.md` | 1 | Line 33: "(formerly `/complete-slice`)" — already uses the new name with parenthetical. |
| `docs/superpowers/specs/2026-03-18-initiatives-and-maturity-design.md` | 1 | Line 255: already says "renamed from `/complete-slice`" — historical note, likely leave as-is. |

### Archived files (leave unchanged)

Files under `~~archived~~` prefixed directories contain historical references. These should NOT be updated — they reflect the state at time of completion.

## Parenthetical Annotations to Remove

Only one found across all skills:

- `~/.claude/skills/project-status/references/status-logic.md` line 113: `(note: skill is currently named /complete-slice, may be renamed to /complete later)`

## Convention References Already Correct

These files already use `/complete` (not `complete-slice`):

- `~/.claude/skills/_shared/references/initiative-conventions.md` — transition tables, consumer guide, two-layer architecture model all say `/complete`
- `/Users/iwhite/Repos/goodplan/CLAUDE.md` — skill list uses `/complete`
- `/Users/iwhite/Repos/goodplan/workflow.md` — uses `/complete`
- `/Users/iwhite/Repos/goodplan/.project/idea.md` — uses `/complete`

## Architecture State

- No `.project/architecture/` directory exists (this is a skill-only project)
- No `.project/initiatives/` directory exists
- No active initiative architecture to consider

## Flow-Log Phase Backward Compatibility

The flow-log contains 12+ entries with `"phase":"complete-slice"`. The signal tracking algorithm (Step 6d) filters on `phase: "complete-slice"`. After rename, the skill must:

1. Write new entries with `"phase":"complete"` (the new name)
2. Query flow-log matching BOTH `"complete-slice"` and `"complete"` phase values to find historical completions

## Recent Git Activity (complete-slice skill)

Last 7 commits touching `~/.claude/skills/complete-slice/`:

```
cbea357 [initiatives-infra] Phase 8: Update complete-slice and refine-slices for initiative scope
c1a41be [decisions-expertise] Phase 4: Add expertise awareness to all skills
139f7ef [decisions-expertise] Phase 3: Add decisions loading and writing to all skills
65133e7 [decisions-expertise] Phase 0: Consolidate shared references
539f44d [complete-slice] Fix auto-detect and add cross-project tool memories
68b6870 [complete-slice] Phase 2: Write SKILL.md
fd658cd [complete-slice] Phase 1: Reference files
```

Most recent change was the initiatives-infrastructure quest (Phase 8) which added initiative-slice scope type. The skill is currently stable — no active churn from other quests.

## Areas of Stability vs Churn

**Stable** (no pending changes from other quests):
- Core completion workflow (Steps 1-11)
- Learnings synthesis and rollup
- Architecture update protocol
- Signal tracking algorithm
- Graceful stop states
- Archive convention

**Active/planned changes from other quests**:
- `refactor-intelligence` quest plans to upgrade Step 9 (cleanup check) — not yet implemented, references `/complete-slice`
- `maturity-context-loading` quest references `/complete` with "(formerly `/complete-slice`)" — already forward-looking
- `onboard-repo` quest mentions `complete-slice` in out-of-scope section
