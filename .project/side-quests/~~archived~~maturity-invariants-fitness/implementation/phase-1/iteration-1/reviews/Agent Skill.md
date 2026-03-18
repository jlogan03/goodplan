# Agent Skill Review: Phase 01 — Shared Convention File

## Issues

**[IMPORTANT]** Missing `/complete` from Consumer Guide

The Consumer Guide table maps artifacts to "Created by", "Evaluated by", "Audited by", and "Checked by reviewers" — but the design spec (lines 173, 191-192) explicitly states that `/complete` suggests maturity promotions and checks fitness function status. The Consumer Guide should either add a "Promotion suggested by" column including `/complete`, or add `/complete` to the "Evaluated by" column. Without this, skills consuming `maturity-conventions.md` won't know that `/complete` is a key participant in the maturity lifecycle.

File: ~/.claude/skills/_shared/references/maturity-conventions.md:196
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Invariants lifecycle missing initiative architecture proposal interaction

The design spec (line 229) states: "Initiative architecture proposals must state which invariants they preserve and justify any amendments." The Invariants Format lifecycle section (lines 140-143) documents Add, Amend, and Retire but does not mention that initiative architecture proposals must explicitly state which invariants they preserve. This is a key workflow requirement from the spec that consuming skills need to know about. The "Amend" bullet partially covers it ("Initiative architecture proposals must state which invariants they preserve and justify any amendments") but this text is not present — only "with justification, captured as a decision record" appears.

File: ~/.claude/skills/_shared/references/maturity-conventions.md:141
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Fitness Function lifecycle missing plan refinement reviewer check

The Fitness Function Convention lifecycle (lines 179-183) covers Identify, Convert, and Maintain — but the design spec (line 211) also says "Plan refinement reviewers check that plans don't violate existing fitness functions." This is already partially covered by the Consumer Guide's "Checked by reviewers" column, but the lifecycle section itself (which is what consuming skills will reference for sequencing) omits this step. Adding a brief "Review" lifecycle entry would make it self-contained.

File: ~/.claude/skills/_shared/references/maturity-conventions.md:179
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Maturity Promotion Criteria section doesn't reference `/complete` by name

The design spec (line 173) says promotions are "suggested by `/complete` and `/audit-architecture`". The convention file's Promotion Criteria section (line 81) correctly says "Who suggests promotions: `/complete` (for slices and initiatives) and `/audit-architecture`" — this is actually fine. Disregard; on re-read this is present and correct.

(Withdrawn — no issue here.)

---

**[MINOR]** Table of contents uses anchor links that depend on rendering context

The TOC (lines 7-12) uses `#maturity-levels` style anchors. These work in GitHub-flavored Markdown but may not resolve in all contexts where an LLM agent reads the file via `Read` tool (plain text). This is a very minor concern since the file is short enough (203 lines) that agents will read it in full regardless. No action needed — just noting for awareness.

File: ~/.claude/skills/_shared/references/maturity-conventions.md:7
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The convention file is well-structured, follows the existing `_shared/references/` patterns (similar structure to `decisions-format.md`), includes a table of contents as required by the plan, covers all six required sections, and faithfully reproduces the design spec's definitions. The examples are clear and the format descriptions are precise enough for consuming skills to implement without ambiguity.

To reach 9+: Address the two IMPORTANT issues — the Consumer Guide should reflect `/complete`'s role in the maturity lifecycle, and the invariants lifecycle should include the initiative architecture proposal requirement from the design spec. These are not cosmetic — they are workflow requirements that consuming skills will rely on this file to communicate.

Progressive disclosure is appropriate: at 203 lines with a TOC, it's well within the 500-line guidance and doesn't need splitting. The file is agent-agnostic (no agent-specific instructions), correctly placed in `_shared/references/`, and uses relative paths for cross-references to architecture files.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
