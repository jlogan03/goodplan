# Review: Phase 1 — Upgrade Step 9 — Refactor Intelligence

## Plan Adherence

All 3 tasks completed and checkboxes marked:
- [x] Refactor Intelligence Protocol added to guidance.md
- [x] SKILL.md Step 9 updated
- [x] Graceful stop case (d2) added to both files

The implementation faithfully reproduces the plan's specifications across both files.

## Cross-File Integration

**SKILL.md references guidance.md correctly**: Step 9 sub-step 1 says "Load the Refactor Intelligence Protocol from `references/guidance.md`" — matches the existing pattern used by other steps (e.g., Step 1, Step 5, Step 6).

**Graceful stop (d2) is consistent across both files**: SKILL.md has the full version with state handling ("treat as case (d) for state purposes"), guidance.md has the condensed version. Both describe the same recovery semantics (re-run detection, already-applied fixes won't re-surface, side quest goals harmless to re-detect). This matches the existing pattern where SKILL.md is verbose and guidance.md is terse.

**Scope routing is correct**: SKILL.md Step 9 has two branches — slices/quests run the protocol, initiative scope skips detection and does cleanup instead. guidance.md protocol has an explicit "Skip for initiative scope" note. These align.

## Code Reuse

- Step 6c deduplication is referenced correctly in both SKILL.md (step 3 of the flow) and guidance.md (dedicated subsection).
- Flow-log format for "skip all" case (`refactor-intelligence: skipped`) — this doesn't follow the standard flow-log JSON format from `state-and-flow-formats.md`. The plan says "Log `refactor-intelligence: skipped` to flow-log" but the flow-log uses `{"ts":..., "phase":..., "scope":..., "status":..., "summary":...}` JSONL format. This is ambiguous — see Important finding #1 below.
- AskUserQuestion patterns match the plan's specifications (multiSelect, option format with `[inline]`/`[side-quest]` prefixes).
- Side quest creation pattern (mkdir -p, write goal.md after approval) matches existing patterns in Step 6c and initiative reconciliation.

## Completeness Check

### Present and correct:
- Detection algorithm: all 4 sources (review feedback, git diff, rule-of-three, plan deviations)
- Pre-implementation commit detection with edge cases (no commits, multiple commits, no flow-log entry)
- Classification: inline fix (low) / side quest (medium) / side quest (high) — 3 risk levels across 2 scope tiers
- Presentation format: batch table with specified columns, AskUserQuestion with exact format
- Action handling: 5-fix cap, overflow to side quest, draft-then-approve for side quests
- Step 6c deduplication step
- Skip conditions (silent skip when no findings)
- Initiative scope exclusion

## Findings

### Important (1)

**Flow-log format for "skip all" case is underspecified.** The Action Handling section in guidance.md says: "Log `refactor-intelligence: skipped` to flow-log and proceed to the next step." The flow-log uses structured JSONL format (`{"ts":..., "phase":..., "scope":..., "status":..., "summary":...}`). The literal string `refactor-intelligence: skipped` doesn't match this format. The plan itself says the same thing, so this is a faithful reproduction of the plan — but it creates ambiguity for the executing agent. It will likely interpret it correctly (as a summary field value), but making the format explicit would be cleaner.

Suggestion: Change to something like: `Log to flow-log: {"ts":"<timestamp>","phase":"complete","scope":"<scope>","status":"refactor-skipped","summary":"refactor-intelligence: no items selected"}` — or clarify that "log to flow-log" means appending a standard-format entry with this as the summary.

### Minor (1)

**The step title in SKILL.md section header changed from "Cleanup Check" to "Refactor Intelligence"** — this is correct per the plan. However, the Graceful Stop section header still says "Graceful Stop (Steps 4-9)" which is fine since Step 9 is still included in the range. No issue, just noting the title change was clean.

### Minor (2)

**guidance.md placement is correct** — the Refactor Intelligence Protocol section is placed after Signal Tracking Algorithm and before Archive Convention, matching the plan's specification ("after the Signal Tracking Algorithm section (Step 6d), before the Archive Convention section").

## Trace-Through Results

| Scope Type | Behavior | Correct? |
|---|---|---|
| `top-level-slice` | Runs detection -> presents table -> handles selections | Yes |
| `side-quest` | Same as above | Yes |
| `initiative-slice` | Same as above (per-slice completion) | Yes |
| `initiative` | Skips detection, presents cleanup findings | Yes |

Graceful stop traces:
- **(d)** Stopped before Step 9: system-profile updated, debt evaluation pending — still valid, Step 9 hasn't started.
- **(d2)** Stopped during Step 9: refactor table presented, fixes pending. Re-run detection on partially modified code either re-detects (partial apply) or skips (fully applied). Side quest goals not yet written are harmless to re-detect. Recovery path is sound.

## Score: 9/10

Strong implementation that faithfully reproduces all plan specifications. The only notable issue is the underspecified flow-log format for the "skip all" case, which is minor in practice (agents will likely do the right thing) but worth tightening for precision.
