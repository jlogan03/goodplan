# Generalist Review — Phase 1: Reference Files

## Score: 9/10

## Summary

Both reference files are well-structured, concise, and closely follow the plan. The formats.md correctly mirrors the canonical skill-conventions.md patterns with appropriate complete-slice scope notes. The guidance.md covers all 10 required sections with actionable, specific instructions. A few minor issues below.

## Critical Issues

None.

## Important Issues

1. **Learnings entry format in guidance.md omits idempotency detail location** — The formats.md says "See guidance.md for... idempotency rules" and guidance.md does mention idempotency ("check for existing `_Source: <slice-name>_` before adding — offer replace if found"), but the plan specifies the format should include "heading, source tag, actionable summary" which is present. However, the idempotency check should clarify it applies to the **top-level** `.project/learnings.md`, not the per-slice `completion/learnings.md`. Currently ambiguous which file gets the duplicate check.

## Minor Issues

1. **Guidance.md "Remaining Slice Review" lacks `sequencing.md` mention in artifact loading** — Guidance section 6 (Remaining Slice Review) says to read "unimplemented `goal.md` files + `sequencing.md`", but the Artifact Loading section (section 2) does not list `sequencing.md` among scope-dir artifacts. The plan's Step 7 explicitly reads `sequencing.md`. It would be cleaner to mention `sequencing.md` in the Artifact Loading section too, or note it's loaded on-demand in Step 7.

2. **CLAUDE.md Update section is terse** — The guidance says "no CLAUDE.md — skip" and "no Project Context — skip" which correctly handles edge cases, but doesn't reference the define-slices skill pattern the plan mentions ("Follow the pattern from define-slices"). This is minor since the SKILL.md (Phase 2) will provide the full step detail.

3. **Decision file format missing example filename** — The plan specifies an example (`2026-03-17-adopt-event-sourcing.md`) but guidance.md only shows the pattern. Not essential since the pattern is clear, but an example aids agent compliance.

## Plan Adherence

| Plan Requirement | Status |
|---|---|
| formats.md with state.md 4-section format | Present, matches skill-conventions.md |
| formats.md with flow-log.jsonl entry format | Present, correct fields and example |
| formats.md sync comment referencing skill-conventions.md | Present (line 1) |
| formats.md scope note for complete-slice | Present (line 5) |
| formats.md cross-reference to guidance.md for learnings format | Present (line 50) |
| guidance.md scope resolution (arg, state.md, auto-detect, ask) | Present, auto-detect correctly uses after-implementation-fixes-and-polish.md gate |
| guidance.md artifact loading | Present, covers all listed artifacts |
| guidance.md learnings synthesis (4 questions) | Present |
| guidance.md learnings.md entry format | Present with heading + source tag + summary |
| guidance.md architecture update protocol | Present, 6-step protocol matches plan |
| guidance.md decision file format | Present |
| guidance.md remaining slice review | Present |
| guidance.md CLAUDE.md update | Present |
| guidance.md graceful stop (3 cases) | Present, cases a/b/c match plan |
| guidance.md re-entry | Present |
| Each file under 3KB | formats.md ~1.6KB, guidance.md ~2KB — both pass |

## Verification

- Both files exist at correct path
- Both under 3KB size limit
- All 10 guidance sections present (Scope Resolution, Artifact Loading, Learnings Synthesis, Learnings.md Entry Format, Architecture Update Protocol, Decision File Format, Remaining Slice Review, CLAUDE.md Update, Graceful Stop, Re-entry)
- Formats match skill-conventions.md canonical source
- Flow-log status values correctly include `started` (needed for graceful stop case b)
