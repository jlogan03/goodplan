# Merged Review — Phase 2: Convention Doc

**Scores:** Generalist 9/10 | Agent-Skill 8/10
**Critical: 0 | Important: 2 | Minor: 4**

---

## Critical Issues (0)

None.

---

## Important Issues (2)

### IMP-1: `start-complete` inconsistency in convention doc
**Source:** Agent-Skill (primary); Generalist (related, framed as architecture source being stale)

The convention doc has an internal inconsistency: the `start-*` list context in section 4 implies `start-complete` may exist, while section 9 explicitly states it does not. The authoritative command surface (`commands-api.md`) omits `start-complete`. The correct position is that it does not exist.

The architecture source (`cli-interaction-conventions.md`) also uses `start-complete` in a worked example (line 206) — this is a stale reference in the architecture source, not in the convention doc. The convention doc itself is correct in omitting `start-complete` from its section 4 enumeration (line 113 lists the 8 valid `start-*` commands) and in the section 9 callout.

**Action:** Verify section 4 line 113 does not include `start-complete` in the parenthetical list. Flag the architecture source inconsistency for cleanup in a future pass (non-blocking for this slice since the convention doc is correct).

**File:** `skills/_shared/references/cli-interaction.md:113`

---

### IMP-2: `--json` consistency in `state` examples and guidance
**Source:** Agent-Skill (primary); Generalist (related, minor-2)

The convention doc correctly documents two "always JSON" exceptions — `start-*` and `state` — but handles them inconsistently:
- For `start-*`: explicitly says "You should still include `--json` for consistency"
- For `state`: no equivalent guidance; the `--inline` example on line 347 omits `--json`

Additionally, `--json` flag placement varies across examples (some after command, some after `--query`). This creates ambiguity for skill authors about whether to pass `--json` to `state`.

**Action:**
1. Add "include `--json` for consistency" guidance to the `state` exception in section 8 (parallel to `start-*` section)
2. Standardize all `state` examples to `goodplan state --json --query ...` flag ordering
3. Ensure the `--inline` example on line 347 includes `--json`

**File:** `skills/_shared/references/cli-interaction.md:287, 347`

---

## Minor Issues (4)

### MIN-1: `start-*` list may become stale
**Source:** Generalist

Section 4 lists 8 `start-*` commands by name (line 113). If new `start-*` commands are added, this list becomes stale. Consider adding "including but not limited to" or a pointer to `schema --json` for the authoritative list.

**File:** `skills/_shared/references/cli-interaction.md:113`

---

### MIN-2: Missing table of contents
**Source:** Agent-Skill

The file is 517 lines. A TOC at the top would allow skill authors and agents to navigate directly to relevant sections without reading linearly. This is above the 100-line threshold for progressive disclosure.

**File:** `skills/_shared/references/cli-interaction.md:1`

---

### MIN-3: `state-and-activity-formats.md` deprecation notice could be stronger
**Source:** Agent-Skill

The deprecation notice correctly points to the new convention doc, but the old `state.md` format content remains fully documented below it. A note clarifying the content is retained only for migration reference (and will be removed in a future slice) would prevent skill authors from accidentally following the old format.

**File:** `skills/_shared/references/state-and-activity-formats.md:3`

---

### MIN-4: `--quiet` behavior not mentioned
**Source:** Generalist

Phase 1 implementation documents that the `state` command handles `--quiet` specially (bypasses `output()`). The convention doc doesn't mention this. Low priority since skills shouldn't use `--quiet` (it's for human operators), but a brief note would be thorough.

**File:** `skills/_shared/references/cli-interaction.md` (state command section)

---

## Deduplication Notes

- Agent-Skill MIN-1 (section 4 `start-complete` list) is subsumed into IMP-1 — same root issue, different framing.
- Agent-Skill MIN-3 (`--json` with `--inline`) is subsumed into IMP-2 — same root issue.
- Agent-Skill MIN-5 (section 7 `artifacts` temporal caveat) — both reviewers agree the "Available after slice 02" callout is sufficient. No action needed; omitted from merged issues.
- Generalist IMP-1 and Agent-Skill IMP-1 both reference the `start-complete` architecture source inconsistency — merged into IMP-1 above. The convention doc itself is correct; the architecture source needs a future cleanup.

---

## Verdict

The convention doc is correct and shippable as-is. IMP-1 is already handled correctly in the doc; the flagged concern is about the architecture source (non-blocking). IMP-2 requires minor edits to add `--json` consistency guidance and standardize flag ordering in examples. The minor issues are polish. No blocking issues.

**Recommended action before shipping:** Address IMP-2 (standardize `--json` usage and add consistency guidance). The remaining issues can be addressed in a follow-up pass or future slice.
