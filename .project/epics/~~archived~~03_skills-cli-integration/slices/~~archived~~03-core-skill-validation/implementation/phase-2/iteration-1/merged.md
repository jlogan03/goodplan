# Merged Review — Phase 2: complete Migration (Iteration 1)

**Scores:** Generalist 9/10 | Agent-skill 7/10
**Merged issue counts:** Critical: 1, Important: 3, Minor: 3

---

## Overall Assessment

The migration is thorough and well-structured. All targeted direct structured-state access patterns (`state.md`, `activity-log.jsonl`, `.project/decisions/` direct writes, `.project/*.json` direct reads) have been replaced with CLI commands. Cross-file integration between SKILL.md and guidance.md is consistent. The graceful stop simplification (eliminating state.md writes) is a significant improvement. The critical `$EPIC_DIR` path bug and two convention-tension items without inline justification need addressing before a higher score is warranted.

---

## Critical

### C1: `$EPIC_DIR` path omits `__active__` prefix — agents will construct a non-existent path
**Files:** `skills/complete/SKILL.md:36`
**Both reviewers flagged this (merged from Generalist Important #1 and Agent-skill Critical).**

Step 0 defines `$EPIC_DIR` as `.project/epics/<epic-name>/` but Step 4 (line 150) and Step 10b (lines 415–421) correctly reference `.project/epics/__active__<name>/`. The preamble states "the filesystem path uses `__active__<name>` but CLI commands use just `<name>`" yet the variable it assigns omits the prefix. An agent following Step 0 literally builds a path that doesn't exist.

**Resolution:** Set `$EPIC_DIR` to `.project/epics/__active__<epic-name>/` in Step 0. Add a note: "CLI commands accept `<epic-name>` without the prefix; the `__active__` prefix is a filesystem-only convention."

---

## Important

### I1: Empty-stdin not piped for read-only CLI commands — agents may hang
**File:** `skills/complete/SKILL.md:46`
**Agent-skill only.**

`cli-interaction.md` documents: "Always pipe empty stdin even when no input is needed — the compiled binary reads stdin and will block if nothing is piped." Read-only commands throughout the skill (`goodplan status --json`, `goodplan --version --json`, `goodplan state --json --query ...`, `goodplan slice:show ...`, `goodplan slice:list --json`) are shown without `< /dev/null` or equivalent. Whether this is a documentation overstatement or a real bug needs investigation by checking how the binary actually behaves.

**Resolution:** CODEBASE_EXPLORATION required. Verify whether the binary blocks on empty stdin for read-only commands. If it does, add `< /dev/null` (or `echo '' |`) to all read-only command examples. If not, update `cli-interaction.md` to exempt read-only commands.

### I2: `stat` for re-entry detection lacks inline justification against "Must NOT Do" convention
**File:** `skills/complete/SKILL.md:82`
**Agent-skill only.**

The skill uses `stat .project/slices/<name>/completion/learnings.md` for re-entry detection. The shared conventions doc prohibits "use `ls` or file-existence checks to infer entity status." The plan approves this as a "legitimate directory-structure read" because `completion/` is LLM-owned and the CLI `artifacts` object has no `completion` field — but the skill lacks an inline note explaining the exception. A future reviewer or agent scanning the skill against conventions will incorrectly flag it.

**Resolution:** Add inline comment near first `stat` usage: "Note: `stat` on LLM-owned `completion/` artifacts is permitted — the CLI has no `completion` field in `artifacts`; see plan rationale."

### I3: `mkdir -p` for `completion/` lacks inline justification against "Must NOT Do" convention
**File:** `skills/complete/SKILL.md:145`
**Agent-skill only.**

Same pattern. The skill runs `mkdir -p <scope-dir>/completion/` in Steps 4 and 6. Shared conventions prohibit "use `mkdir` to create `.project/` subdirectories." The plan documents this as the intended filesystem-backed accumulation pattern, but without an inline note, future reviewers will flag it.

**Resolution:** Add inline comment near first `mkdir -p` usage: "Note: `completion/` is a skill-owned LLM artifact directory, not a CLI-managed entity directory; direct filesystem operations are permitted here."

---

## Minor

### M1: Epic guardrail (Step 2.8) mixes CLI status check with stale `abandoned.md` filesystem reference
**File:** `skills/complete/SKILL.md:93`
**Both reviewers flagged this (deduplicated).**

The guardrail prose says "all slices are either completed or contain `abandoned.md`" but the actual check uses `goodplan slice:list --json` with `status === "completed"` or `status === "abandoned"`. The `abandoned.md` mention is a leftover from the pre-CLI pattern.

**Resolution:** Remove "or contain `abandoned.md`" from the prose. The CLI status values are the authoritative check.

### M2: `[...]` array placeholders in payload examples may be misread by LLM executor
**File:** `skills/complete/SKILL.md:376, 383, 388`
**Generalist only.**

`slice:complete` and `quest:complete` payload examples use literal `[...]` as array placeholders (e.g., `"deferred": [...]`). An LLM executor might attempt to use these literally.

**Resolution:** Replace `[...]` with `[]` or `[<items>]` to make the placeholder intent unambiguous.

### M3: guidance.md auto-detect (section 3) references "slices/quests" but only queries slices
**File:** `skills/complete/references/guidance.md:7`
**Agent-skill only.**

The text says "After scanning slices/quests, scan for epic completion readiness" but the jq expression only queries `.slices`. No corresponding quest auto-detect query is present.

**Resolution:** Either add a parallel `state --json --query` for quests, or update the text to say "slices only" if quest auto-detect is not intended at this stage.

---

## Non-Issues / Resolved Contradictions

- **SKILL.md line count (~450 lines):** Agent-skill flagged proximity to the 500-line limit as minor. Generalist did not flag it. Included above (M1–M3 are the three minors); the line count is noted as a watch item but does not require action now.
- **Overall migration quality:** Both reviewers agree the core migration is complete and correct. Generalist scored 9/10; agent-skill scored 7/10 due to the critical path bug and the stdin question. Fixing C1, I1–I3 should bring the score to 9+.
