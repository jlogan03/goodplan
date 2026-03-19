# Software Architecture Review — Phase 4, Iteration 2: `/project-status` Update

Reviewing iteration 2 fixes against the 4 IMPORTANT issues from iteration 1.

## Issues

**[MINOR]** Step 6 opening clarification is present but ambiguous about scanning unconditionally

The iteration-2 fix added: "Initiative scanning always runs when `.project/initiatives/` exists — it is needed for Format B reporting regardless of what the active scope resolved to." This is the right intent, but the opening sentence of Step 6 still reads: "For the active scope, run `ls` commands on the relevant directory to inspect which files exist." This creates a mild tension — a reader following the skill top-to-bottom sees "for the active scope" and then a carve-out for initiatives. The relationship between the initiative scan and the scope-specific state machine check is structurally clearer than before, but "For the active scope" still implies the step is scoped to a single thing. A reader could still conflate the two passes.

This is MINOR because the inserted paragraph immediately below resolves the ambiguity in practice — the intent is unambiguous at the paragraph level, just slightly awkward at the heading level.

File: ~/.claude/skills/project-status/SKILL.md:72
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** status-logic.md Per Initiative section uses "note" rather than a table row for first-vs-subsequent disambiguation

The iteration-2 fix added a paragraph starting "**First vs subsequent initiative**: The first initiative is named `initial`..." in status-logic.md. This is accurate and addresses the previous IMPORTANT issue. However, it is inline prose in a section that otherwise uses tables and bullet lists. The primary consumers of status-logic.md are AI agents scanning for structured rules — a brief note embedded in prose is harder to pattern-match on than a table row or a clearly marked callout. The information is present; the formatting is slightly inconsistent with the rest of the file.

File: ~/.claude/skills/project-status/references/status-logic.md:56
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All 4 IMPORTANT issues from iteration 1 are resolved:

1. **Scope resolution alignment** — SKILL.md Step 5 now has 5 numbered items matching status-logic.md. Confirmed.
2. **Eager loading of initiative-conventions.md** — Step 2 now includes the conditional load when `.project/initiatives/` exists. Confirmed.
3. **"No active initiative" mapping split** — status-logic.md now correctly distinguishes "non-archived/non-abandoned initiatives exist → suggest next skill" from "all archived/abandoned → `/create-initiative`". Confirmed. The two-row split at lines 101-102 covers the case the previous row missed.
4. **`/complete-slice` naming** — A parenthetical note was added: "(note: skill is currently named `/complete-slice`, may be renamed to `/complete` later)". This is the minimal viable fix and correctly defers the rename.

The two remaining items are MINOR formatting concerns. The architecture is sound — initiative-conventions.md remains the single source of truth for the initiative state machine, status-logic.md references it without duplicating it, scope resolution layering is now structurally consistent across both files, and the two Format B variants maintain backward compatibility.

To reach 10: (1) Reframe the Step 6 opening to read "Apply the state machine to the active scope; also scan all initiatives for the full reporting picture." (2) Promote the first-vs-subsequent initiative disambiguation in status-logic.md to a boldly-marked inline callout or a single-row table so it is structurally scannable.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
