# complete-epic should refuse to complete an epic with 0 landed slices

## Problem

During E2E validation (2026-04-13), the complete-epic skill happily completed the spaced-repetition epic with this outcome:
- **Slices completed: 0 (3 abandoned)**
- Side quests created: 2 (to pick up the unfinished work)
- Status: completed

The LLM self-reported in its summary: "The SM-2 engine and review store are fully implemented and tested (slice 01), but were never integrated into the running app."

The epic passed through complete-epic as "success" even though nothing actually shipped from the epic's goal. All quality metrics evaluated the artifacts that WERE produced as high-quality — but the epic failed its actual purpose (delivering spaced repetition integrated into the app).

## Expected Behavior

`complete-epic` should:
1. **Refuse to complete an epic with zero landed slices** — that's a failed epic, not a completed one
2. If user still wants to close it out, require `gp epic:abandon` (with reason) instead of `gp epic:complete`
3. OR require explicit `--force --reason="..."` flag with strong prompt to user, AND emit a distinct `epic-completed-vacuous` event so the event log captures the anomaly

## Why It Matters

This is a workflow integrity issue. If complete-epic accepts any combination of landed/abandoned slices as success, then:
- Epic metrics become meaningless (we can't tell successful epics from failed ones)
- Users won't notice when their epics produce no output
- The "everything got abandoned, everything is fine" pattern becomes acceptable

## Fix

1. **CLI invariant**: Add invariant `epic.complete-requires-landed-slice` that rejects `epic:complete` if all slices are abandoned
2. **Skill behavior**: complete-epic detects zero-landed case and redirects user to `epic:abandon`
3. **Alternative**: Allow with force flag but emit `epic-completed-vacuous` event type for downstream analytics

## Files

- `src/commands/epic/complete.ts` — add precondition check
- `src/engine/invariants/` — new invariant rule
- `plugin/skills/complete-epic/SKILL.md` — zero-landed detection + user prompt
