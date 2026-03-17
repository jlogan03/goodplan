# Guidance

## Scope Resolution

1. **Argument**: resolve path or name (match `vertical-slices/` or `side-quests/`).
2. **state.md**: if no argument, read active slice from `.project/state.md`.
3. **Auto-detect**: scan for first dir where implementation is complete (`plan-refined.md` or `plan-refined/` exists AND `implementation/` has content) but `completion/learnings.md` does not. Note: `after-implementation-fixes-and-polish.md` is optional — clean implementations won't have it.
4. **Ambiguous**: AskUserQuestion.

## Artifact Loading

Scope dir (skip missing): `plan-refined.md` (or dir), `implementation/` (per phase, read last iteration's `merged.md` only; read `result.md` only if review references issues; skip earlier iterations unless investigating recurring problems), `refinement/` (last round's `merged.md`), `research/`, `after-implementation-fixes-and-polish.md`, `plan-learnings-and-feedback.md`, existing `completion/`.

Project-level: `.project/architecture/`, `decisions/`, `learnings.md`, `vertical-slices/sequencing.md`.

## Learnings Synthesis

Four questions: (1) domain learnings, (2) plan quality — cross-ref `plan-learnings-and-feedback.md`, (3) implementation surprises — check reviews for recurring issues, (4) what differently next time. Actionable insights only, compare plan vs. reality.

## Learnings.md Entry Format

```markdown
## <Concise insight>
_Source: <slice-name>_

<2-3 sentence actionable summary.>
```

Newest first, below header. **Idempotency:** in top-level `.project/learnings.md`, check for existing `_Source: <slice-name>_` before adding — offer replace if found.

## Architecture Update Protocol

1. Read `.project/architecture/`, compare against what was built.
2. Per divergence: explain change + why, impact on subsystems. AskUserQuestion: "Update / Flag as tech debt / Skip".
3. Approved: edit arch file, write decision file.
4. No divergences: "Architecture files still accurate."
5. Write `completion/architecture-updates.md` (changes made/declined/flagged).
6. If new learnings surfaced, append to `completion/learnings.md` + update rollup.

## Decision File Format

Use the format defined in `~/.claude/skills/_shared/references/decisions-format.md`. When writing decisions from complete-slice, use `Context: complete-slice for <scope>` in the Context field.

## Remaining Slice Review

Read unimplemented `goal.md` files + `sequencing.md`. Assess: goals/ordering/new slices needed? AskUserQuestion per proposed change.

## CLAUDE.md Update

If architecture files were added or changed during completion, update CLAUDE.md Project Context references. Follow the three-case logic from define-slices (no file / no section / existing section).

## Graceful Stop

Triggers: "that's enough", "stop here", "let's stop".
- **(a)** No files written — don't touch state.
- **(b)** Learnings written, arch review pending — state: `complete-slice in-progress — learnings written for <scope>`. Flow-log: `started`.
- **(c)** Done — normal completion per formats.md.

## Re-entry

If `completion/learnings.md` exists: AskUserQuestion "Revise / Skip to arch review / Cancel". Partial state: offer resume.
