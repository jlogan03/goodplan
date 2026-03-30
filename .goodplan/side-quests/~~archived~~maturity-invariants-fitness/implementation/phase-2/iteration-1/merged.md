# Merged Review — Phase 2: `/define-architecture` Update

**Composite Score:** 8.5/10 (Generalist: 9/10, Agent Skill: 8/10)
**Critical:** 0 | **Important:** 3 | **Minor:** 4

---

## Summary

The implementation is correct and complete. Steps 8f/8g/8h are properly sequenced between 8e and Step 9, graceful stop cases cover all new steps, templates are updated, and cross-references to `maturity-conventions.md` are consistent throughout. The issues below are structural refinements, not correctness bugs.

---

## Important Issues

### I-1: `invariants.md` missing from CLAUDE.md template comment examples
**Source:** Agent Skill (unique)
**File:** `~/.claude/skills/define-architecture/references/guidance.md:16`

The Project Context template comment lists example architecture files (`data-model.md`, `flows.md`, `ui-ux.md`) but omits `invariants.md`. Step 9's generic instruction to add a reference for "each architecture file written in Step 8" should cover it, but an agent following the examples in the comment could easily overlook `invariants.md`. Adding it as an explicit example removes the ambiguity.

**Resolution:** Add `invariants.md` to the example list in the template comment.

---

### I-2: Step 8g uses AskUserQuestion inconsistently for draft approval
**Source:** Agent Skill (unique)
**File:** `~/.claude/skills/define-architecture/SKILL.md:185`

Steps 8f and 8h explicitly name `AskUserQuestion` for user confirmation. Step 8g names it for the initial question but the draft approval iteration says "Present the draft and iterate until the user approves" without specifying `AskUserQuestion`. An agent may use inline questions for approval, deviating from the established interaction pattern.

**Resolution:** Add explicit `AskUserQuestion` call for draft approval in Step 8g.

---

### I-3: Graceful stop cases for 8f/8g/8h appear inside Step 8e, before the steps they protect
**Source:** Generalist (unique)
**File:** `~/.claude/skills/define-architecture/SKILL.md` (8e section, lines 162-164)

The graceful stop handlers for Steps 8f/8g/8h are located inside the existing 8e block, which precedes those steps in the document. An agent reading linearly encounters interrupt handling for steps it hasn't read yet. This was implemented as specified by the plan ("Insert between existing Step 8e cases and Step 9 cases"), so it is not an implementation error — but it is a structural ordering concern worth noting for the next revision.

**Resolution:** Consider moving the 8f/8g/8h graceful stop cases to follow their respective steps in a future pass, or add a note explaining why the stop cases are pre-positioned.

---

## Minor Issues

### M-1: `guidance.md` Early Stop section not updated for 8f/8g/8h
**Source:** Generalist (unique)
**File:** `~/.claude/skills/define-architecture/references/guidance.md:54-59`

The Early Stop section lists only cases (a), (b), and (c). The three new stop scenarios in SKILL.md are correct and complete, but `guidance.md` doesn't reflect them. Agents using `guidance.md` for early-stop context would miss the new cases (though SKILL.md is the authoritative source and is loaded first).

**Resolution:** Add cases covering 8f/8g/8h interruption to the Early Stop section of `guidance.md`.

---

### M-2: No merge guidance for re-entry into an existing `_overview.md` Subsystem Maturity table
**Source:** Generalist (unique)
**File:** `~/.claude/skills/define-architecture/SKILL.md` (Step 8f)

The re-entry check (Step 3, Case D) handles file-level revisiting, but Step 8f says "populate the section" without addressing whether to merge with or replace an already-populated Subsystem Maturity table. This is a gap only surfaced during re-entry.

**Resolution:** Add a note to Step 8f specifying behavior when the Subsystem Maturity table already has content (e.g., merge rows for new subsystems, update existing rows).

---

### M-3: Graceful stop for Step 8f has a potentially ambiguous "(Step 9)" parenthetical
**Source:** Agent Skill (unique)
**File:** `~/.claude/skills/define-architecture/SKILL.md:162`

The stop case for 8f says "Update CLAUDE.md Project Context to reference all files written so far (Step 9)." The parenthetical is a cross-reference, not a directive, but existing graceful stop cases don't use this pattern. An agent might interpret it as "run the full Step 9 procedure."

**Resolution:** Rephrase to disambiguate, e.g., "...written so far (following the same process as Step 9 but scoped to files written so far)."

---

### M-4: `## Fitness Functions` placeholder in API template uses angle-bracket format inconsistently
**Source:** Agent Skill (unique)
**File:** `~/.claude/skills/define-architecture/references/architecture-logic-templates.md:146`

The `## Fitness Functions` section contains `<Candidate fitness functions identified during architecture definition. Full entries added as the subsystem matures.>` in angle brackets. The rest of the template uses angle brackets for fill-in-the-blank content; this is guidance text that Step 8h populates later. An agent executing Step 8b (initial file writing) might try to replace it prematurely.

**Resolution:** Change to a markdown comment (`<!-- ... -->`) or a fenced note so it's clearly not immediate fill-in content.

---

## No-Action / Noted

- **Step 8h only covers subsystems with API files:** Subsystems documented only in `_overview.md` will permanently show "—" in the Fitness Functions column. This is intentional (no file to append to), but could be noted explicitly in `guidance.md` to prevent confusion during execution. Low priority.
