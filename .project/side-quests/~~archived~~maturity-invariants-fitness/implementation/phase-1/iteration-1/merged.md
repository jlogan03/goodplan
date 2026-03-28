# Merged Review — Phase 1: Shared Convention File

**Composite Score: 8/10** (Generalist: 9/10, Agent Skill: 8/10)
Critical: 0 | Important: 2 | Minor: 2

---

## Summary

`~/.claude/skills/_shared/references/maturity-conventions.md` is well-structured, accurate against the design spec, and precise enough for consuming skills to implement without ambiguity. Two important gaps exist: the Consumer Guide omits `/complete`'s role, and the invariants lifecycle omits the initiative architecture proposal requirement. Two minor improvements would further tighten self-containedness.

---

## Issues

### [IMPORTANT] Consumer Guide missing `/complete` as a maturity lifecycle participant

The design spec (lines 173, 191–192) explicitly states that `/complete` suggests maturity promotions and checks fitness function status. The Consumer Guide table (line ~196) maps artifacts to "Created by", "Evaluated by", "Audited by", and "Checked by reviewers" — but `/complete` does not appear. Skills consuming this file won't know that `/complete` is a key participant in the maturity lifecycle.

**Resolution:** Add a "Promotion suggested by" column to the Consumer Guide table that includes `/complete` (for slices and initiatives) and `/audit-architecture`, or expand the "Evaluated by" column to cover this role.

File: `~/.claude/skills/_shared/references/maturity-conventions.md` line ~196

---

### [IMPORTANT] Invariants lifecycle missing initiative architecture proposal requirement

The design spec (line 229) states: "Initiative architecture proposals must state which invariants they preserve and justify any amendments." The lifecycle section (lines 140–143) documents Add, Amend, and Retire but does not surface this requirement. The "Amend" bullet currently says only "with justification, captured as a decision record" — the explicit constraint that architecture proposals must declare invariant preservation is absent.

**Resolution:** Expand the "Amend" lifecycle bullet to include: "Initiative architecture proposals must explicitly state which invariants they preserve and justify any amendments."

File: `~/.claude/skills/_shared/references/maturity-conventions.md` line ~141

---

### [MINOR] Demotion triggers don't name which skill surfaces demotion signals

The demotion criteria list (lines 83–88) describes when subsystems regress but doesn't mention which skill surfaces demotion signals. The promotion section correctly names `/complete` and `/audit-architecture` as suggesters; the demotion section lacks the same specificity.

**Resolution:** Add a "Who surfaces demotion signals: `/audit-architecture`" note parallel to the promotion section's naming convention. Low impact since consuming skills will follow the Consumer Guide table.

File: `~/.claude/skills/_shared/references/maturity-conventions.md` lines 83–88

---

### [MINOR] Invariants lifecycle "Add" scope excludes side-quest-surfaced constraints

Line 141 says invariants are added "during `/define-architecture` (first initiative) or initiative architecture proposals (subsequent initiatives)." The design spec (line 227) also says invariants are "refined over time," which could include side quests surfacing new cross-cutting constraints.

**Resolution:** Add a parenthetical: "(or when a side quest reveals a cross-cutting constraint)" to close the edge case. Defensible as-is since side quests don't typically define new invariants.

File: `~/.claude/skills/_shared/references/maturity-conventions.md` line ~141

---

## Withdrawn / Non-Issues

- **Maturity Promotion Criteria referencing `/complete`** — Present and correct at line ~81. No action needed.
- **TOC anchor links** — Work in GFM; file is short enough (203 lines) that agents read it in full. No action needed.
- **Fitness Function lifecycle missing plan refinement reviewer check** — Already covered by the Consumer Guide's "Checked by reviewers" column. Adding it to the lifecycle section would improve self-containedness but is not a gap affecting correctness.

---

## Strengths (both reviewers agreed)

- Complete coverage of all 6 required sections with TOC linking each.
- Spec fidelity: 4-level maturity table, invariant examples, fitness function examples, and consumer guide all match the design spec precisely.
- Field-level definitions (Field/Description tables), canonical file locations, format examples, and lifecycle rules give consuming skills enough detail to implement without ambiguity.
- Appropriate length (203 lines, well within 500-line guidance); no splitting needed.
- Correctly placed in `_shared/references/`, agent-agnostic, uses relative cross-references.

---

## Required Changes to Proceed

Address both IMPORTANT issues before marking Phase 1 complete:

1. Add `/complete` to the Consumer Guide as a maturity lifecycle participant.
2. Expand the "Amend" invariants lifecycle bullet to include the initiative architecture proposal requirement.

The two MINOR issues may be addressed now or deferred — neither blocks consuming skills from implementing correctly.
