# Holistic Review — Round 2

## Issues

**[IMPORTANT] Phase 2 before-check `architectureDefined === false` is nested under `artifacts`, not top-level**

Phase 2 Expected Behavior states: `goodplan epic:show --epic core-provider --json` returns `architectureDefined === false`, `slicesDefined === false`. Codebase exploration of `src/commands/epic/show.ts` (line 42) shows the JSON output is `{ ...epic, artifacts }` — the `architectureDefined` and `slicesDefined` fields are under the `artifacts` key, not top-level. The before-check should reference `artifacts.architectureDefined === false` and `artifacts.slicesDefined === false`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Phase 4 approval workflow steps are underspecified — who writes `approved.md` and copies architecture-proposal to architecture?**

Phase 4 task "Handle skill-layer operations separately" says: "The approval workflow (copying proposal to `architecture/`, writing `approved.md`) is skill-owned behavior. If `/start-epic` is exercised, note any inconsistencies... If skipped, perform approval steps manually and note the gap."

This is too vague for an implementer. Since `/start-epic` is known to be unmigrated (documented as friction), the plan should explicitly state the manual steps: (1) write `approved.md`, (2) create `architecture/` from `architecture-proposal/`, (3) run `goodplan epic:activate --epic llm-judge --json`. Without this, the implementer must reverse-engineer the `start-epic` skill to figure out what to do manually.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 before-check for slices uses `ls` instead of CLI command**

Phase 2 Expected Behavior "Before implementation" includes `ls .project/epics/core-provider/architecture/` to check absence. Round 1 feedback (I4) called for replacing `ls`-based verification with CLI commands. This check should use `goodplan epic:show --epic core-provider --json` and check `artifacts.architectureDefined === false` (which already appears as the first before-check). The `ls` line is redundant and inconsistent with the convention.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 1 "Build goodplan binary" task is ambiguous about PATH setup**

The task says: "Copy binary to a PATH-accessible location or use absolute path." This leaves the implementer guessing. Since this is a dogfooding exercise where the implementer will run `goodplan` commands repeatedly, one concrete approach should be specified (e.g., `ln -sf ~/Repos/goodplan/dist/goodplan /usr/local/bin/goodplan` or `export PATH="$HOME/Repos/goodplan/dist:$PATH"`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 "Planning & Implementation" section says "For each slice" but does not specify iteration order**

The plan says "For each slice defined above" but Phase 2's `/create-slices` step defines "2-3 small slices." Slice execution order matters because of sequential enforcement (INV-004 mentions stateless commands, but the state machine enforces sequential slice execution). The plan should note that slices must be executed in sequencing order as defined by `/create-slices`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 organic quest creation from `/complete` output lacks specificity on what to look for**

The task says "Review `/complete` output from Phase 2 for proposed quests (refactoring, debt, gaps)." The `/complete` skill synthesizes learnings and may suggest deferred work, but the plan does not specify what section of `/complete` output contains quest suggestions or how to distinguish actionable quests from general learnings. Adding a note like "look for deferred work items or suggested improvements in the completion summary" would help.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 5 cross-skill grep excludes `_shared` but the flag should be `--exclude-dir='_shared'` with context about what this catches**

The grep command `grep -rn --exclude-dir='_shared' 'Read.*\.project/.*\.json\|...' skills/` is correct syntactically but does not clarify that the exclusion targets `skills/_shared/references/` which contains documentation examples showing "before" patterns. Adding a brief inline comment or note would prevent confusion about why matches in `_shared/` are acceptable.

This was actually addressed in the current plan text ("excluding `_shared/references/` which contains 'before' examples") -- so this is already handled. Withdrawing this issue.

---

**[MINOR] No documentation update task for this slice's learnings**

The plan does not include a task to update `.project/learnings.md` with findings from dogfooding. Phase 5 addresses convention doc updates and friction resolution, but accumulated learnings from running the full workflow (which is the primary value of dogfooding) should be captured. The `/complete` skill at slice completion may handle this, but an explicit task to synthesize dogfooding learnings into a consumable form would ensure nothing is lost.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Significant improvement from round 1 (6/10). All 4 CRITICAL issues are resolved. The plan now correctly uses CLI commands as primary verification, references correct entity paths (`quests/` not `side-quests/`), avoids `__active__` prefix assumptions, and properly separates CLI vs skill behavior. The remaining issues are IMPORTANT (2) and MINOR (5) -- the artifacts nesting and Phase 4 approval workflow specificity are the main gaps preventing a 9+. Fixing those would bring this to 9/10.

## Summary
- Critical: 0
- Important: 2
- Minor: 5
