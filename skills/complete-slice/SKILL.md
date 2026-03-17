---
name: complete-slice
description: >
  Closes out a completed slice or side quest by synthesizing learnings, proposing
  architecture updates, reviewing remaining slice goals, and offering a cleanup pass.
  Outputs: completion/learnings.md, updated learnings.md, potential architecture and
  decision file updates. Run after implementation is done.
  Common triggers: 'complete this slice', 'finish this slice', 'wrap up',
  'complete slice', 'slice is done', 'we're done with this slice'.
---

# Complete Slice

Reflection point after implementation. Reads all slice artifacts, synthesizes learnings, compares what was built against architecture, reviews remaining slices, and updates project state. Re-entrant — detects partial completion and offers to resume.

## Step 1 — Load References

Use the Read tool to load `references/guidance.md` (relative to this skill's directory). It contains scope resolution, artifact loading strategy, learnings synthesis, architecture update protocol, remaining slice review, CLAUDE.md update rules, graceful stop cases, and re-entry handling.

Also load `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for architecture comparison and learnings synthesis.

## Step 2 — Determine Scope

1. **Argument passed**: resolve path or name (match `vertical-slices/` or `side-quests/`).
2. **No argument**: read `.project/state.md` for the active slice.
3. **Auto-detect**: scan `.project/vertical-slices/` and `.project/side-quests/` for the first directory where implementation is complete but completion hasn't run. A slice is implementation-complete if it has `plan-refined.md` (or `plan-refined/`) AND `implementation/` with content. `after-implementation-fixes-and-polish.md` may or may not exist (clean implementations won't have it). The slice is not yet completed if `completion/learnings.md` does not exist.
4. **Ambiguous**: use AskUserQuestion to choose.
5. **Verify implementation**: confirm the scope has `plan-refined.md` (or `plan-refined/`) and `implementation/` with content. If not, tell the user the slice doesn't appear to be implemented yet and stop.
6. **Re-entry check**: if `completion/learnings.md` already exists, use AskUserQuestion: "Revise existing learnings / Skip to architecture review / Cancel". If partial state (learnings written but architecture review pending), offer to resume from where it stopped.

## Step 3 — Load Artifacts

Read all implementation artifacts for the scope (skip missing):

1. `plan-refined.md` (or `plan-refined/` — read `_overview.md` + phase files)
2. `implementation/` — for each phase, read only the last iteration's `merged.md`. Read `result.md` only if the review references specific issues. Skip earlier iterations unless investigating recurring problems.
3. `plan-learnings-and-feedback.md` (written by `/refine-plan`)
4. `refinement/` — last round's `merged.md`
5. `research/` — scan for research files
6. `after-implementation-fixes-and-polish.md`
7. `.project/architecture/` — current architecture for comparison
8. `.project/decisions/` — existing decisions for context
9. `.project/learnings.md` — existing learnings to avoid duplication

Present summary: "Found: plan (N phases), M implementation reviews, K research files, [plan-learnings-and-feedback], [fixes-and-polish]. Architecture: N files."

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

## Step 4 — Synthesize Learnings

First, review architecture files against what was built (quick scan for divergences — the formal propose-and-approve process is in Step 6). Note divergences found here for Step 6; reference them in the learnings draft where they affected implementation. This informs learnings. Then run `mkdir -p <scope>/completion/` and draft `completion/learnings.md` by analyzing the gap between plan and implementation:

1. What did we learn about the problem domain that we didn't know before?
2. What worked well in the plan? What didn't? (Cross-reference `plan-learnings-and-feedback.md` if loaded)
3. What surprised us during implementation? (Check reviews for recurring issues, unexpected blockers, plan deviations)
4. What would we do differently next time?
5. Patterns or anti-patterns worth calling out for future slices?

Present the draft. Iterate on corrections. Write `completion/learnings.md` when approved.

## Step 5 — Roll Up to Top-Level Learnings

Re-load `references/guidance.md` (relative to this skill's directory) for the learnings entry format.

Read `.project/learnings.md`. **Idempotency check**: scan for existing `_Source: <slice-name>_` tag matching the current slice — if found, use AskUserQuestion: "Replace existing entry / Keep both / Skip". Add new entries at the top (newest first). Each entry: heading, `_Source: <slice-name>_` tag, 2-3 sentence actionable summary.

**Cross-project tool learnings**: If any learnings are about general-purpose tools, libraries, or frameworks (not project-specific), save them to the user's auto memory system as well. These learnings are likely useful across projects — for example, "pnpm 10 replaces corepack" or "oxfmt beta has stability issues with certain config patterns." Use the memory Write tool to save these as project-type memories with the tool name in the filename.

## Step 6 — Propose Architecture Updates

Re-read `.project/architecture/` files (they may have left context in a long session). Re-load `references/guidance.md` (session may be long). Check `.project/state.md` Work Stack — if other slices are in-flight, warn that architecture changes may conflict (informational only).

Compare what was actually built (from implementation artifacts) against canonical architecture files. For each divergence:

1. Explain what changed and why
2. Assess impact on other subsystems
3. Present agent recommendation: update architecture to match reality, or flag as tech debt
4. Use AskUserQuestion: "Update architecture? / Flag as tech debt / Skip"
5. For approved updates: run `mkdir -p .project/decisions/`, edit the relevant architecture file, write a decision file to `.project/decisions/` using the format from `decisions-format.md`. Use `Context: complete-slice for <scope>` in the Context field.

If no divergences: "Architecture files still accurately describe the system."

Run `mkdir -p <scope>/completion/` (covers re-entry path where Step 4 was skipped). Write `completion/architecture-updates.md` summarizing changes made, declined, and flagged as tech debt. If none needed, write "No architecture updates needed."

If architecture updates revealed additional learnings, append to `completion/learnings.md` and update the top-level learnings rollup.

## Step 7 — CLAUDE.md Update

Check if architecture files were added or renamed during this slice. Three cases:

1. **No changes** → skip.
2. **Files added** → add references to CLAUDE.md Project Context "Read these" list.
3. **Files renamed/removed** → update existing references.

Load `~/.claude/skills/define-architecture/references/guidance.md` for the Project Context section format (dependency: if define-architecture's guidance.md moves, update this path). Follow the three-case CLAUDE.md update logic from define-slices: no CLAUDE.md → create with Write; no `## Project Context` section → append with Edit; existing section → extract old_string from `## Project Context` through next `## ` heading (or EOF), replace with Edit (fall back to full Write if Edit fails).

After updating: "Updated CLAUDE.md to reference new architecture files."

## Step 8 — Review Remaining Slices

Read each unimplemented slice's `goal.md` and `.project/vertical-slices/sequencing.md`. Assess:

1. Does anything we learned warrant updating this goal?
2. Should ordering change based on what we now know?
3. Are new slices or side quests needed?

Present findings. For each proposed change, use AskUserQuestion. Apply approved changes.

## Step 9 — Cleanup Check

Ask: "Do you want a cleanup/refactor pass before moving to the next slice?" If yes, help scope it — quick inline fix or a side quest with its own plan?

## Step 9b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 10 — Write Back State

Load `~/.claude/skills/_shared/references/state-and-flow-formats.md` (explicit Read).

Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`

Update `.project/state.md` using the 4-section format from the shared formats reference. Set:
- Current Phase: `complete-slice complete — learnings and review done for <scope>`
- Active Slice: the scope path
- Work Stack: unchanged
- Next Step: `/create-plan` for the next unimplemented slice (or `/explore-project` if it needs exploration first)

Append to `.project/flow-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"complete-slice","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/flow-log.jsonl
```

## Step 11 — Done Summary

List: learnings written, architecture updates made (if any), decisions written during this run (if any), slice goal changes (if any), recommended next step.

## Graceful Stop (Steps 4-9)

Trigger phrases: "that's enough", "stop here", "let's stop".

- **(a) No files written** → don't touch state.md or flow-log. Stop.
- **(b) Learnings written, architecture review not done** → load `~/.claude/skills/_shared/references/state-and-flow-formats.md`. Update state.md Current Phase to `complete-slice in-progress — learnings written for <scope>`. Append to flow-log with `"status":"started"`. Next Step: `Resume /complete-slice for <scope> (architecture review pending)`. Stop. Note: if stopped during Step 7 (CLAUDE.md update), treat as case (b) — the CLAUDE.md update is non-critical and can be completed on re-entry.
- **(c) Everything done** → normal completion (Step 10).

## Error Handling

If a Write or Edit tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with remaining steps.
