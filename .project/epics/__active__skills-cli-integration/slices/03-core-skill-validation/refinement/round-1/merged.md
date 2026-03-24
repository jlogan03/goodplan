# Merged Feedback — Slice 03: Core Skill Validation (Round 1)

## CRITICAL Issues

**C1. `slice:complete` does not handle archiving — Step 10b elimination will break archive behavior**
The plan says "The CLI's `slice:complete` / `epic:complete` handles the `~~archived~~` rename" and eliminates Step 10b. Codebase exploration confirms no archiving logic exists in `src/core/` — no references to `archived`, `~~archived~~`, or `rename`. The skill must retain its own archive rename step, or the plan must document this as a CLI gap requiring follow-up.
- Flagged by: software-architecture, agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**C2. Redundant/conflicting interaction between `slice:complete` payload and separate `learning:rollup` / `decision:create` calls**
The plan proposes: filesystem accumulation (Step 4) -> separate `learning:rollup` (Step 5) -> separate `decision:create` (Step 6) -> final `slice:complete` (Step 10). But `slice:complete` already accepts `learnings` and `architectureDelta` in its stdin payload and processes rollup atomically within the reducer. Calling `learning:rollup` separately AND passing `learnings` in `slice:complete` will double-process learnings. Correct pattern: accumulate to filesystem, read back, pass all in `slice:complete` payload. Remove separate `learning:rollup` call. Clarify `decision:create` vs `architectureDelta` boundary (see I4).
- Flagged by: software-architecture, holistic (partial)
- Resolution: **DIRECTLY_ACTIONABLE**

**C3. `epic:complete` payload shape differs fundamentally from `slice:complete` — plan treats them as interchangeable**
`slice:complete` takes `{"verificationPassed": bool, "learnings": [...], "architectureDelta": [...]}`. `epic:complete` takes `{"verificationResults": [{"index": N, "passed": bool, "notes": "..."}]}` — per-verification results with index fields. The plan says "construct the `slice:complete` / `epic:complete` / `quest:complete` stdin payload" as if they share a shape. The plan must specify how `complete` constructs the `epic:complete` payload: reference epic-level verifications (from `epic:show --json`), evaluate each, build the `verificationResults` array.
- Flagged by: software-architecture, agent-skill
- Resolution: **DIRECTLY_ACTIONABLE** (for `epic:complete` shape specification); **CODEBASE_EXPLORATION** (to verify `quest:complete` shape)

---

## IMPORTANT Issues

**I1. `learning:rollup` invocation described incorrectly (flags, not stdin)**
Phase 2 Step 5 says "with stdin payload." Actual command uses `--from` and `--to` flags: `goodplan learning:rollup --from <source-scope> --to <target-scope> --json`. Per C2 above, the preferred fix is to remove `learning:rollup` entirely and let `slice:complete` handle rollup atomically.
- Flagged by: holistic, software-architecture, agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**I2. No `start-complete` command exists — convention doc's worked example is misleading**
The `cli-interaction-conventions.md` worked example shows `goodplan start-complete --slice my-slice --inline --json`, but this command does not exist. The plan does not reference `start-complete` directly (it correctly uses `slice:show --json` and `state --json --query`), but the plan should explicitly call out the non-existence as a constraint. The convention doc's worked example also needs correction in Phase 3 validation.
- Flagged by: software-architecture, agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**I3. Filesystem-backed accumulation lacks explicit file path conventions**
The plan says the skill writes to `completion/learnings.md` and `completion/architecture-updates.md` during Steps 4-6, then reads them back in Step 10. The plan never specifies where `completion/` lives relative to the project. Should be explicitly derived from `status --json` response fields (likely `<slice-dir>/completion/`).
- Flagged by: holistic
- Resolution: **DIRECTLY_ACTIONABLE**

**I4. Plan does not specify `decision:create` vs `architectureDelta` boundary**
`decision:create` writes to `decisions.jsonl` (structured record: id, domain, title, summary). `slice:complete` accepts `architectureDelta` (subsystem, type, description). These are different records for different purposes. The plan must specify: which Step 6 items become `architectureDelta` entries in the payload, which become `decision:create` calls, and whether markdown decision files are fully replaced.
- Flagged by: software-architecture
- Resolution: **DIRECTLY_ACTIONABLE**

**I5. `learning:rollup` and `decision:create` payload shapes not verified**
Plan does not specify what `decision:create` stdin payload looks like, nor instruct the implementer to verify via `goodplan schema --command <cmd> --json`. The mapping from current markdown decision fields to JSON payload fields needs specification.
- Flagged by: agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**I6. Phase 2 Expected Behavior grep check is fragile**
The "after" check `grep -n 'state --json --query' ...` requires exact verbatim match. Use a more robust pattern like `grep -n 'state.*--query'`.
- Flagged by: holistic
- Resolution: **DIRECTLY_ACTIONABLE**

**I7. Verification approach is grep-based, not end-to-end**
All three phases use `grep` and `wc -l` as primary verification. For a skill migration, the most direct verification is invoking the skill end-to-end or at minimum running actual CLI commands in a test project. Phase 3 manual validation tasks are read-through traces, not runnable checks.
- Flagged by: agent-skill, holistic (partial)
- Resolution: **DIRECTLY_ACTIONABLE**

**I8. Phase 2 Step 2 auto-detect logic needs filter specification**
`slice:list --json` replaces filesystem scanning, but the plan doesn't specify the exact filter: look for slices with status `implementation-complete` (or `artifacts.implementation === true && status !== 'completed' && status !== 'abandoned'`). Also, `completion/learnings.md` existence for re-entry detection is not exposed by `artifacts` — the skill may need `stat` as a legitimate directory-structure read.
- Flagged by: software-architecture, agent-skill
- Resolution: **CODEBASE_EXPLORATION** (verify if `artifacts` includes `completion` field)

---

## MINOR Issues

**M1. Phase 1 baseline line count is wrong (316 vs actual 280)**
Plan overview says "316->~160 lines." Research file and `wc -l` confirm create-epic is 280 lines. Target <=200 is still reasonable; fix the baseline number.
- Flagged by: holistic
- Resolution: **DIRECTLY_ACTIONABLE**

**M2. Convention doc location ambiguity**
Phase 3 says write "Migration Patterns" to `skills/_shared/references/cli-interaction.md`, but the epic architecture's `cli-interaction-conventions.md` is "authoritative (newer)." Clarify which file gets the section. The shared one already has a "Migration Example" section (section 12).
- Flagged by: holistic, software-architecture, agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**M3. `status --json` artifact shape change not mentioned**
`status --json` artifacts changed in 1.0.0 from plain numbers to `{ count, files }` objects. Plan does not mention this. Add a note in Phase 2 Step 2.
- Flagged by: agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**M4. `epic:show --epic initial` — clarify entity name vs filesystem prefix**
CLI uses entity name without `__active__` prefix (per INV-004). Already clear from the `epic:create` call, but worth noting for implementer.
- Flagged by: agent-skill
- Resolution: **DIRECTLY_ACTIONABLE**

**M5. `learning:rollup` may not be needed at all**
The `slice:complete` payload's built-in rollup handles learnings atomically — the newly synthesized learnings with `rollupTo` tags go into the `learnings` array and the CLI handles rollup. Separate `learning:rollup` call may be unnecessary. (Subsumed by C2, listed here for completeness.)
- Flagged by: holistic
- Resolution: **CODEBASE_EXPLORATION** (subsumed by C2)

---

## DIRECTLY_ACTIONABLE (for loop exit)

**DA1. Retain archive step (Step 10b) in the skill** (C1)
- File: the plan file (Phase 2 Step 10b)
- Change: Remove the instruction "Eliminate. The CLI's `slice:complete` / `epic:complete` handles the `~~archived~~` rename." Replace with: "Retain archive rename step in the skill. The CLI does not perform `~~archived~~` directory renaming — this remains skill-owned."

**DA2. Remove separate `learning:rollup` call, use `slice:complete` atomic payload** (C2, I1, M5)
- File: the plan file (Phase 2 Steps 5 and 10)
- Change: Remove Step 5's `learning:rollup` CLI call entirely. In Step 10, specify that accumulated learnings (from `completion/learnings.md`) are read back and passed as the `learnings` array in the `slice:complete` stdin payload. The reducer handles rollup atomically.

**DA3. Specify `epic:complete` payload shape separately** (C3)
- File: the plan file (Phase 2 Step 10)
- Change: Add a subsection distinguishing `slice:complete` vs `epic:complete` payload construction. For `epic:complete`: read verifications from `epic:show --json`, evaluate each with the user, construct `{"verificationResults": [{"index": 0, "passed": true, "notes": "..."}, ...]}`. Note that `epic:complete` does NOT take `learnings` or `architectureDelta` directly.

**DA4. Clarify `decision:create` vs `architectureDelta` boundary** (I4, I5)
- File: the plan file (Phase 2 Step 6)
- Change: Specify that subsystem-level changes (e.g., "added new module to data layer") go into `architectureDelta` entries in the `slice:complete` payload. Formal architectural direction decisions (e.g., "adopted event sourcing pattern") go via `decision:create --json` with stdin `{"id": "...", "domain": "...", "title": "...", "summary": "..."}`. Add a task: "Verify payload shapes via `goodplan schema --command decision:create --json` and `goodplan schema --command slice:complete --json` before implementing."

**DA5. Call out non-existence of `start-complete`** (I2)
- File: the plan file (Phase 2 Step 3, Phase 3 validation)
- Change: Add explicit note: "There is no `start-complete` command. The `complete` skill assembles its own context from `slice:show --json`, `epic:show --json`, `state --json --query`, and direct reads of LLM-owned markdown." In Phase 3, add a task to correct the convention doc's worked example.

**DA6. Specify `completion/` directory path** (I3)
- File: the plan file (Phase 2 Steps 4-6, Step 10)
- Change: Add: "The `completion/` directory lives at `<slice-dir>/completion/` (derived from `slice:show --json` field `dir`). For epics: `<epic-dir>/completion/`."

**DA7. Fix fragile grep check** (I6)
- File: the plan file (Phase 2 Expected Behavior)
- Change: Replace `grep -n 'state --json --query'` with `grep -n 'state.*--query'`.

**DA8. Add end-to-end smoke test to Phase 3** (I7)
- File: the plan file (Phase 3)
- Change: Add a concrete verification task: "End-to-end smoke test: In a temp directory, run `goodplan init`, `epic:create`, create a slice, run through implementation, then invoke the migrated `/complete` skill. Confirm all CLI commands succeed and state transitions are correct. If full automation is infeasible, run the actual CLI commands manually and verify outputs."

**DA9. Fix baseline line count** (M1)
- File: the plan file (Phase 1 overview)
- Change: Replace "316" with "280" as the create-epic baseline line count.

**DA10. Clarify convention doc target** (M2)
- File: the plan file (Phase 3)
- Change: Specify that "Migration Patterns" section goes into `skills/_shared/references/cli-interaction.md` (the surviving shared reference post-epic). Note that the epic's `cli-interaction-conventions.md` is authoritative during the epic but the shared file is the long-term home.

**DA11. Note `status --json` artifact shape** (M3)
- File: the plan file (Phase 2 Step 2)
- Change: Add note: "`status --json` artifacts are `{ count: number, files: string[] }` objects (not plain numbers). Use `.count` for existence checks."

**DA12. Note entity name vs filesystem prefix** (M4)
- File: the plan file (Phase 1, where `epic:show` is referenced)
- Change: Add note: "CLI entity names omit the `__active__` filesystem prefix (per INV-004). Use `--epic initial`, not `--epic __active__initial`."

---

## RESEARCH_NEEDED

**R1. Verify `epic:complete` and `quest:complete` stdin schemas** (C3)
- Action: Run `goodplan schema --command epic:complete --json` and `goodplan schema --command quest:complete --json` to confirm payload shapes. Verify whether `quest:complete` matches `slice:complete` or `epic:complete` pattern.

**R2. Verify `artifacts` object for `completion` field** (I8)
- Action: Run `goodplan schema --command slice:list --json` or `goodplan slice:list --json` on a test project to check if `artifacts` includes a `completion` field. If not, the skill needs `stat completion/learnings.md` for re-entry detection.

**R3. Verify `slice:list` status filter values** (I8)
- Action: Check state machine transition tables to confirm the exact status value for "implementation complete but not yet completed" (likely `implementation-complete`). Verify against `goodplan slice:list --json` output.

---

## Contradictions Resolved

1. **`learning:rollup` removal vs fix**: holistic flagged incorrect invocation (DIRECTLY_ACTIONABLE fix), software-architecture flagged the entire step as redundant (remove it). **Trusted software-architecture** — the step should be removed entirely since `slice:complete` handles rollup atomically. The invocation fix is moot if the step is removed.

2. **`start-complete` severity**: agent-skill rated it CRITICAL, software-architecture rated it IMPORTANT. The plan does not actually reference `start-complete` (it correctly uses `slice:show` and `state --query`), but the convention doc's worked example could mislead implementers. **Trusted agent-skill on severity** (upgraded to IMPORTANT rather than CRITICAL since the plan itself is correct — the risk is from the convention doc, which Phase 3 can fix). Resolved as IMPORTANT (I2).

3. **Archive elimination**: software-architecture flagged as CRITICAL with codebase evidence. Agent-skill flagged as IMPORTANT suggesting Phase 3 verification. **Trusted software-architecture** — the codebase evidence confirms archiving is not in the CLI, making this CRITICAL, not something to verify later.

---

## Unresolved (USER_INPUT required)

None. All contradictions were resolvable by domain expertise.

---

## Available Research

- `.project/epics/__active__skills-cli-integration/slices/03-core-skill-validation/research/cli-schemas.md` — verified payload shapes for epic:complete, quest:complete, slice:complete; confirmed no completion field in artifacts; confirmed implementation-complete status and no status filtering on slice:list
- `.project/epics/__active__skills-cli-integration/slices/03-core-skill-validation/research/_codebase-context.md` — codebase context summary
