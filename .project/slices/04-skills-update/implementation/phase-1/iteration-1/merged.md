# Merged Review Feedback — Phase 1, Iteration 1

**Composite Score: 8.5/10** | Critical: 0 | Important: 2 | Minor: 1 (1 informational dropped)

## Important

1. **`create-plan/references/guidance.md` scan order inconsistent with SKILL.md** — guidance.md line 7 lists flat path first and scans both unconditionally, while SKILL.md Step 2.3 conditionally prioritizes the epic path based on `.activeEpic` presence. Agents using guidance as a condensed reference will follow the wrong scan logic.
   - File: `skills/create-plan/references/guidance.md:7`
   - Resolution: Update to match SKILL.md conditional logic (epic path first when active epic exists, flat path otherwise).

2. **`create-plan/references/guidance.md` "No argument" case missing epic-nested path resolution** — guidance.md line 6 doesn't specify conditional path resolution for `.activeSlice` + `.activeEpic`, while SKILL.md Step 2.2 correctly differentiates between epic-nested and flat paths. Agents loading guidance will miss the nested path logic.
   - File: `skills/create-plan/references/guidance.md:6`
   - Resolution: Add conditional path resolution matching SKILL.md Step 2.2.

## Minor

1. **`explore/SKILL.md` line 47 example uses flat path only** — The "use as-is" example shows `.project/slices/03-explore` but doesn't demonstrate the epic-nested path. While functionally correct, the example reinforces the flat path pattern for agents.
   - File: `skills/explore/SKILL.md:47`
   - Resolution: Update example to show both flat and epic-nested paths.

## Dropped

- **Plan estimate mismatch** (generalist minor) — The plan estimated ~10-12 remaining `.project/slices/` references but actual is 33. The build report already explains this discrepancy (12 standalone fallbacks + 21 dual-path mentions). Informational only, no action needed.
