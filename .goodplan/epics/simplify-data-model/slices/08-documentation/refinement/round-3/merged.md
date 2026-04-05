# Merged Review Feedback — Round 3

## Critical Issues

None.

## Important Issues

**[IMPORTANT-1] Phase 3 `/explore` verification grep anchor misses all real occurrences**
Source: holistic
The Phase 3 `/explore` check uses `grep -rn '/explore$'` with an end-of-line anchor. All actual `/explore` references in `status-logic.md` (lines 90, 91, 100, 107, 122) and `explore/SKILL.md` (line 58) are mid-line (followed by space, backtick, or other text), so the grep matches zero real occurrences. Verification would pass even if no `/explore` references were updated.
Fix: Change to `grep -rn '/explore[ )\`"]' skills/ agents/ --include='*.md' | grep -v '\$GP \|gp \|/gp:explore'` — match `/explore` followed by space, backtick, quote, or closing paren, excluding CLI commands and already-correct references.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-2] Phase 3 explore/SKILL.md task scope is incomplete — misses line 58**
Source: holistic
The task for `skills/explore/SKILL.md` only addresses lines 242-245 (next-step guidance), but misses line 58 which contains `Run /explore at the epic scope instead (e.g., /explore epics/foo)`. This should become `/gp:explore`.
Fix: Expand the explore/SKILL.md task to include updating line ~58 self-reference from `/explore` to `/gp:explore`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-3] Phase 1 Step 2 missing explicit wrong-status guidance for intermediate and terminal statuses**
Source: software-architecture
The plan lists remedies for `activated`, `created`, `explored`, and `slices-defined`, with a generic "Any other status" catch-all. Several statuses deserve explicit handling: `exploring`, `defining-architecture`, `architecture-defined`, `refining-architecture`, `architecture-refined`, `defining-slices`, `refining-slices` (all in-progress states), plus `completed` and `abandoned` (terminal states that should never suggest running another skill).
Fix: Add explicit messages for in-progress statuses ("X is in progress. Run /gp:Y to continue.") and terminal statuses ("This epic is already completed/abandoned.").
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-4] Phase 2 Bug C: `verificationResultSchema` shape not specified**
Source: agent-skill
The plan instructs the implementer to construct `verificationResults` for the `epic:complete` payload but never specifies the required object shape. The actual schema is `{ index: number, passed: boolean, notes?: string }`. Without this, the implementer must reverse-engineer it from source.
Fix: Add the `verificationResultSchema` shape to the Bug C task description.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT-5] Phase 3: `\b` word boundary in grep patterns is not portable on macOS**
Source: agent-skill
The Before/After sections and verification patterns use `\b` (e.g., `/complete\b`). macOS BSD grep does not support `\b` without `-P`, and `-P` is unavailable on macOS. Replace with POSIX-compatible alternatives: `/complete[^d]`, `/complete ` (trailing space), or use `grep -E` consistently.
Resolution: DIRECTLY_ACTIONABLE

## Minor Issues

**[MINOR-1] Phase 3 init/SKILL.md `/gp:create-architecture` fix is invisible to all verification grep patterns**
Source: holistic
Line 209 of `skills/init/SKILL.md` has `/gp:create-architecture` — the main Phase 3 grep searches for `/create-architecture` (no `gp:` prefix) and the `/explore$` check also doesn't cover it. The task could be skipped without verification catching it.
Fix: Add targeted verification: `grep -c '/gp:create-architecture' skills/init/SKILL.md` — expect 0.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-2] Phase 3 status-logic.md task description should enumerate `/explore` references (lines 90, 91, 100, 107, 122)**
Source: holistic
The task says "Cover both Epic States table (line ~100) and Slice/Quest States table (lines ~108-114)" but omits lines 90-91 (`/explore <epic-path>`) and line 122 (`/explore` or `/create-architecture`).
Fix: Expand to: "Cover Epic States table (lines ~90-100, including `/explore` entries on lines 90-91), Slice/Quest States table (lines ~108-114), and Project States table (lines ~122-123)."
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-3] Phase 2 Bug C verification assessment spawn mechanics unclear**
Source: software-architecture
It's unclear whether the verification assessment reuses the completion-epic agent from Step 4 or requires a separate spawn. The plan should clarify spawn mechanics to avoid implementation ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-4] Phase 1 Step 2: hardcoded status messages could use CLI `nextCommands`**
Source: agent-skill (also noted by software-architecture as part of IMPORTANT-3)
The start-epic rewrite lists explicit per-status error messages with hardcoded skill recommendations. The CLI's `epic:show --json` already provides `nextCommands` for each status. Consulting `nextCommands` first would make the skill resilient to future status additions.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-5] Phase 2 Bug B: `scope` field semantics could be clearer in goal synthesis**
Source: agent-skill
The plan says to synthesize the quest goal from "description + scope fields" but `scope` is `"small"|"medium"|"large"` (a size estimate, not a description). "Scope: small" reads oddly. Consider "Estimated effort: {scope}" or omit size from the goal string.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-6] Phase 3 expertise-profiling.md and migration-heuristics.md references are descriptive, not invocations**
Source: repo-tooling-docs
These files contain documentation comments like `"Used by /onboard-repo Step 10"` rather than skill invocations. The fixes are correctly listed but implementers should understand they are updating descriptive text.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR-7] Phase 4 README verification check is weak**
Source: repo-tooling-docs
`grep -c '/gp:' README.md` returning at least 12 would pass even with wrong names or duplicates. A stronger check would verify all 12 skill names appear individually. Combined with the negative grep for old names, current coverage is reasonable.
Resolution: DIRECTLY_ACTIONABLE

## Deduplication Notes

- Agent-skill's first "IMPORTANT" about `learningInputSchema` field mismatch was self-withdrawn after closer inspection.
- Agent-skill's `nextCommands` suggestion (MINOR) overlaps with software-architecture's IMPORTANT about intermediate status handling. Kept both: the IMPORTANT focuses on completeness of status handling, the MINOR focuses on the resilience pattern.
- Holistic's observation about pre-activation guard vs CLI's `epic:activate` guard was informational only (no action needed) and excluded.

## Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 9/10 | 0 | 2 | 3 |
| software-architecture | 9/10 | 0 | 1 | 1 |
| agent-skill | 9/10 | 0 | 2 | 2 |
| repo-tooling-docs | 9/10 | 0 | 0 | 3 |

**Merged: 0 Critical, 5 Important, 7 Minor**
