# Generalist Review — Phase 2: complete Migration

**Score: 9/10** | Critical: 0, Important: 1, Minor: 2

## Plan Adherence

All plan tasks are marked complete and verified. The implementation faithfully follows every step-by-step replacement specified in the plan:

- `requires: goodplan >= 1.0.0` added to frontmatter
- Step 0 scope resolution rewritten to use `goodplan status --json` instead of filesystem path matching
- `$SLICES_DIR` correctly updated to `.project/slices/` (not under epic directory) per `resolveEntityDir`
- Step 1 gains version check and CLI-based decisions loading
- Step 2 replaces `state.md` reads and filesystem scanning with `status --json` and `state --json --query`
- Step 3 adds CLI commands for activity-log and entity details, documents artifact shape differences
- Steps 4-5 add filesystem-backed accumulation with scope directory derivation, JSONL rollup note
- Step 6 replaces `state.md` work stack check with `status --json`, decision files with `decision:create` CLI
- Step 8 replaces manual goal.md enumeration with `slice:list --json`
- Step 10 completely rewritten: eliminates `state.md` writes and `activity-log.jsonl` appends, replaces with `slice:complete`/`quest:complete`/`epic:complete` CLI commands with correct payload shapes
- Graceful stop rewritten to leave filesystem artifacts in place (no state writes)
- Error handling section added for CLI exit codes
- Plan checklist items correctly marked `[x]`

## Eliminated Patterns

All targeted patterns successfully eliminated:
- `state.md` — zero hits except one explanatory comment in Step 10 ("No manual state.md writes...") which is acceptable per plan criteria
- `echo.*activity-log` — zero hits
- `state-and-activity-formats.md` — zero hits
- `.project/decisions/` direct writes — zero hits (all replaced with `decision:create` CLI)
- `.project/*.json` / `.project/*.jsonl` direct access — zero hits

## Cross-File Integration

SKILL.md and guidance.md are well-synchronized:
- Scope resolution in both uses `status --json` and `state --json --query`
- Decision creation uses identical `decision:create` CLI pattern in both files
- Graceful stop cases match between both files (filesystem artifacts, no state writes)
- Signal tracking and maturity evaluation use the same CLI query patterns
- Archive convention note added to both about CLI not performing the rename
- Re-entry protocol consistent between both files

## Completeness

CLI command coverage is thorough: `status`, `show`, `state --query`, `slice:complete`, `quest:complete`, `epic:complete`, `decision:create`, `slice:list`, `--version` all present.

## Issues

### Important

1. **`$EPIC_DIR` derivation is ambiguous** (SKILL.md line 36). The Step 0 preamble says `$EPIC_DIR` = `.project/epics/<epic-name>/` but in Step 4 (line 150) and Step 10b (lines 415-422), the archive commands reference `.project/epics/__active__<name>/`. The preamble text should explicitly note that `<epic-name>` in the path means `__active__<epic-name>` for active epics (the `__active__` prefix is a filesystem convention). The current wording says "derive epic name from `status --json` `.activeEpic` field" and notes INV-004, but then the path template `.project/epics/<epic-name>/` omits the prefix. Step 4 line 150 gets it right with `__active__<name>`. This inconsistency could confuse an LLM executor. The Step 10b archive commands are correct (they use `__active__<epic>`), but the preamble sets the variable without the prefix.

### Minor

2. **Epic guardrail redundancy** (SKILL.md line 93). The guardrail says "all slices are either completed or contain `abandoned.md`" — mixing CLI-based status check (`status === "completed"`) with filesystem check (`contain abandoned.md`). The second clause should say `status === "abandoned"` for consistency with the CLI migration, since the sentence already says "Use `goodplan slice:list --json`". The filesystem `abandoned.md` check is the old pattern.

3. **`[...]` placeholder in payload examples** (SKILL.md lines 376, 383, 388). The `slice:complete` and `quest:complete` payload examples use literal `[...]` as array placeholders (e.g., `"deferred": [...]`). While obviously intended as pseudocode, an LLM executor might attempt to use these literally. Consider using `[]` or a more explicit placeholder like `[<items>]`.
