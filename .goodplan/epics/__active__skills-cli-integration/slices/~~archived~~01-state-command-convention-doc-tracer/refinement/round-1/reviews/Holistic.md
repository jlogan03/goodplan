# Holistic Review — State Command, Convention Doc & Tracer Bullet

## Issues

**[IMPORTANT]** Pagination between query and output needs explicit implementation strategy chosen

The plan acknowledges the tension between `output()` coupling query+serialization and needing pagination in between, and describes two options. However, the task list has *two separate tasks* that both describe the same work: "Create `src/commands/global/state.ts`" includes a note about pagination, and then "Handle `--offset`/`--limit` pagination" is a separate task repeating the same logic. The implementer will be confused about whether these are the same task or two separate tasks. The second task should be merged into the first, or the first should explicitly say "pagination is handled in a separate task below" with a forward reference.

Additionally, neither task specifies which of the two options (manual `applyQuery()` + `process.stdout.write`, vs extending `output()`) to use. The research file recommends Option 1 (manual approach), but the plan tasks don't commit to it. The implementer needs a clear directive.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 replaces state.md writes and activity-log appends but doesn't say what replaces them

The current `project-status` skill (Step 9) writes back `state.md` and appends to `activity-log.jsonl`. The plan says to eliminate `state.md` (correct per convention doc) and replace direct file access with CLI commands. But it never specifies what *replaces* Step 9. The convention doc says `state.md` is "eliminated" and activity-log appending is "CLI handles on mutations." Since `project-status` is a read-only skill, it performs no mutations -- so the activity-log append in Step 9 has no CLI equivalent. The plan should explicitly state: "Step 9 (state writeback) is eliminated entirely -- read-only skills no longer write state or log activity." Otherwise the implementer may try to find a CLI command to replicate the activity-log append.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `show --json` artifacts field referenced in convention doc and Phase 3 but noted as "planned for slice 02"

Phase 2, Task item 7 says: "Deriving Workflow Phase -- use `show --json` artifacts field (planned for slice 02, note as upcoming)." Phase 3 Task item for Step 6 says: "replace with `status --json` phase derivation + `show --json` for entity details." But since `show --json` doesn't yet have the `artifacts` field, the Phase 3 rewrite cannot use it. The plan needs to clarify that Phase 3 should only use `status --json` and `state --json --query` (both available after Phase 1), and that `show --json` with artifacts will be adopted in a later skill migration pass. Currently the Phase 3 tasks mix available and unavailable commands.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention doc section 6 references `status --json` for state orientation but skill currently uses far more state than `status --json` provides

The `project-status` skill currently reads: epic directories, per-slice state machine results, implementation review files, interrupted.md files, side quest directories, `sequencing.md`, expertise from CLAUDE.md, and decisions. The plan's Phase 3 tasks only mention replacing steps 1-6 with `status --json` and `state --json --query`. But the full Format B output (which enumerates all slices with states, all epics, all quests) requires data that `status --json` doesn't provide in its current form -- for instance, `status --json` doesn't list all slices with their individual statuses, it only reports the active one. The plan should specify that `slice:list --json` and `quest:list --json` and `epic:list --json` are needed for Format B, and potentially `state --json --query` for interrupted.md detection and sequencing.md reads.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention doc Phase 2 should note `state-and-activity-formats.md` partial obsolescence

The research file notes that `state-and-activity-formats.md` "will become partially obsolete (state.md is eliminated by the convention doc)." Phase 2 should include a task to add a deprecation note to `state-and-activity-formats.md` (or update it to remove the state.md section), so skills don't follow stale guidance. Currently 12 skills reference this file.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** No fitness function update for new `state` command

The Commands subsystem has fitness functions `stateless-commands.test.ts` and `schema-output-accuracy.test.ts`. The plan registers `state` in the schema registry (which `schema-output-accuracy.test.ts` verifies), but `stateless-commands.test.ts` may also need updating depending on what it checks. The plan should include a task to verify the new command passes existing fitness functions, or update them if needed. The "Run full test suite" task covers this implicitly, but making it explicit prevents surprises.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Verification step 2 uses `.slices | keys` but state tree structure may not have a top-level `.slices` key

The verification step `goodplan state --json --query '.slices | keys'` assumes the state tree has a top-level `slices` key. Looking at `assembleState()`, it walks `.project/` recursively, so the keys would be whatever directories exist in `.project/`. There is indeed a `slices/` directory under `.project/` in projects with slices, but in epic-based projects, slices live under `epics/__active__<name>/slices/`. The verification step should use a path that exists in the goodplan repo's own `.project/` structure. Since this repo uses epics, the correct path would be something like `.epics["__active__skills-cli-integration"].slices | keys`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 Expected Behavior `grep` checks are brittle

The before/after checks use `grep -c 'state\.md'` and `grep -c 'activity-log\.jsonl'` against `SKILL.md`. These are fragile because:
1. The convention doc may legitimately mention `state.md` in a "what's eliminated" context
2. Comments explaining *why* CLI replaces direct access might reference the old filenames
The plan itself acknowledges "references in comments/rationale OK" for activity-log.jsonl but not for state.md. The grep pattern should be more targeted (e.g., grep for `Read .project/state.md` or `Write .project/state.md` rather than bare `state.md`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Missing documentation update task for commands-api.md

The plan adds a new global command `state`. The architecture doc `commands-api.md` documents the CLI command surface. The plan should include a task (likely in Phase 1) to update `commands-api.md` with the `state` command's specification.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is well-structured with clear phasing, good verification steps, and thorough task decomposition. The codebase research is excellent and the plan correctly identifies key integration points. However, four IMPORTANT issues need resolution: the duplicated pagination task creates implementer confusion, the Phase 3 step 9 replacement is unspecified, the reliance on `show --json` artifacts (not yet available) in Phase 3 creates a dependency gap, and the Format B data requirements exceed what `status --json` provides. Fixing these four issues and the five MINOR items would bring the score to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
