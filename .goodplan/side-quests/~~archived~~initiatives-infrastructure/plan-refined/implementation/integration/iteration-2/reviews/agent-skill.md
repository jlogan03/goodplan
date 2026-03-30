# Agent Skill Review — Final Integration (Iteration 2)

## Issues

**[MINOR]** implement-plan shared-preamble lacks "orchestrator already checked" qualifier

`implement-plan/references/shared-preamble.md` (line 36) tells reviewers: "if you notice conflicts between the implementation and the initiative's target architecture, flag them in your review output." The `refine-plan` version is more precise: "The orchestrator has already checked for initiative architecture conflicts in Step 2b — if you notice additional conflicts the orchestrator may have missed, note them in your review output for the orchestrator to surface to the user."

The `implement-plan` version is functionally correct but creates a noise risk: both the codebase context step (`codebase-context-discovery.md` Section 5) and individual reviewers will independently check for initiative conflicts and may surface the same finding twice. The `refine-plan` version acknowledges the division of responsibility and positions reviewer checks as a second-pass safety net rather than an independent check.

Fix: Update `implement-plan/references/shared-preamble.md` line 36 to match `refine-plan`'s wording: "The orchestrator has already checked for initiative architecture conflicts in Step 2b — if you notice additional conflicts the orchestrator may have missed, note them in your review output."

File: ~/.claude/skills/implement-plan/references/shared-preamble.md:36
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** create-plan SKILL.md Step 3 list skips item 4 (pre-existing gap surfaced by changes)

Step 3's numbered context loading list goes: 1, 2, 3, [nothing], 5, 6, 7, 8, 9 — item 4 is absent. The `guidance.md` Context Loading section includes `.project/decisions/` loading (with Loading Protocol from `decisions-format.md`), but the SKILL.md numbered list omits it entirely. An agent following only SKILL.md Step 3 would skip decisions loading.

This gap pre-dates the current changes but was introduced/exposed by the item 6 sequencing fix (which renumbered item 6 to be initiative-aware). The decisions loading is mentioned in `guidance.md` (loaded inline as prose at line 13), so it's not completely missing — but the SKILL.md is the primary entry point, and agents following it step-by-step will miss this.

Fix: Add item 4 to the Step 3 numbered list in `create-plan/SKILL.md`: `4. \`.project/decisions/\` — follow Loading Protocol from \`decisions-format.md\`: glob \`*.md\`, skip superseded, flag any with \`revisiting\` status to user.`

File: ~/.claude/skills/create-plan/SKILL.md:48
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All five IMPORTANT issues from iteration 1 are properly fixed:
- IMP-1: implement-plan now has initiative architecture awareness in three places (shared-preamble, sub-agent prompt, and transitively via codebase-context-discovery)
- IMP-2: codebase-context-discovery.md Section 5 adds proper initiative architecture awareness
- IMP-3: create-plan auto-detect scans initiative slice directories
- IMP-4: create-plan name resolution searches initiative slice directories
- IMP-5: create-plan sequencing loads from initiative path with top-level fallback

MIN-1 (Consumer Guide missing refine-slices) is fixed.

Two MINOR issues remain: a precision gap in shared-preamble wording (no functional consequence, just noise risk), and a pre-existing numbered list gap in SKILL.md (low risk since guidance.md compensates). Fixing both would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
