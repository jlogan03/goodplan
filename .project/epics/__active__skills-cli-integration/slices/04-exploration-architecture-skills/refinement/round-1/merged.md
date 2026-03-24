# Merged Feedback — Round 1

## CRITICAL Issues

**C1. `start-epic` / `epic:activate` fundamental lifecycle mismatch**
All three reviewers flagged this. The current `start-epic` skill operates early in the epic lifecycle (proposal review, approval gate, architecture directory creation, `__active__` rename). The CLI's `epic:activate` requires `slices-refined` status — it's the LAST pre-terminal transition. The plan says "start-epic uses a single mutation (epic:activate)" which is wrong.

The old start-epic handles: epic resolution, active epic check, re-entry detection, context loading, state validation, proposal review (interactive), architecture directory creation (merging proposals with top-level), directory rename, state updates. None of this maps to `epic:activate`.

Options identified by reviewers:
- Retire start-epic entirely (its responsibilities are now split across multiple CLI lifecycle commands)
- Redefine start-epic as the skill that calls `epic:activate` at the correct lifecycle point (after `slices-refined`) — very different workflow
- Descope start-epic from this slice entirely
- Identify which CLI commands map to each sub-step

Resolution: **USER_INPUT**

---

**C2. start-epic: plan conflates directory creation with content assembly**
(Agent Skill) The plan says "Replace `mkdir -p .project/epics/<name>/architecture/` with paths from `epic:activate` response" but this is a complex multi-step merge operation (copy `_overview.md`, merge `<subsystem>-changes.md` with top-level files, rename `new-<subsystem>.md`, copy unmodified top-level files). This is LLM-owned markdown content that should stay as direct skill work. The plan conflates directory creation (CLI-owned) with content assembly (skill-owned). Even if start-epic is descoped, this distinction matters for create-architecture.

Resolution: **DIRECTLY_ACTIONABLE** — Clarify in plan that `mkdir -p` elimination applies only to directory creation; content merging/copying logic stays skill-owned.

---

## IMPORTANT Issues

**I1. `explore` skill supports multiple scopes but CLI commands are epic-only**
(Software Architecture) The old explore skill handles project, epic, slice, and quest scopes. CLI commands (`epic:explore`, `start-explore`, `submit-explore`) all require `--epic`. The plan doesn't address what happens to non-epic scopes. Either non-epic scopes retain direct filesystem handling, or they were always informal.

Resolution: **CODEBASE_EXPLORATION** — Check whether non-epic scopes in `skills/explore/SKILL.md` and `explore-logic.md` trigger state transitions or are purely filesystem operations.

---

**I2. Reference files with eliminated patterns not inventoried**
(All three reviewers) The plan says "Update reference files if they contain eliminated patterns" but doesn't enumerate specific files/patterns:
1. `explore/references/explore-logic.md` line 1: references `state-and-activity-formats.md`
2. `explore/references/explore-logic.md` lines 9-14: `__active__` prefix paths in Scope Path Mapping table
3. `create-architecture/references/guidance.md` lines 56-63: 6 references to `state.md` and `activity-log.jsonl` in Early Stop section
4. `explore-logic.md` templates (`explore-complete.md`, `explore-skipped.md`): old scope format

Resolution: **DIRECTLY_ACTIONABLE** — Add explicit file inventory to Phase 2 and Phase 3 tasks listing every reference file and pattern to update.

---

**I3. `create-architecture` graceful stop handling needs redesign for CLI model**
(Software Architecture + Agent Skill) Current skill has 6 graceful-stop scenarios each writing different `state.md` and `activity-log.jsonl` content. Plan says "stops just leave artifacts in place" — this oversimplifies. The stops served two purposes: state tracking (now CLI-owned) and resumability guidance (skill needs to preserve). Plan should specify: check `epic:show --json` for status + check which files exist for resume detection. The `guidance.md` Early Stop section (lines 54-63) needs complete rewriting.

Resolution: **DIRECTLY_ACTIONABLE** — Add explicit task: design re-entry detection logic (check CLI status + file existence), rewrite guidance.md Early Stop section to use CLI status checks instead of state.md.

---

**I4. Phase 4 smoke test missing lifecycle steps before `epic:activate`**
(Holistic + Software Architecture) The smoke test jumps from `submit-refine-architecture` to `epic:activate`. But `epic:activate` requires `slices-refined` status. Missing steps: `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, and `epic:add-verification` (guard requires `epic.verifications.length > 0`).

Resolution: **DIRECTLY_ACTIONABLE** — Add missing lifecycle steps to the smoke test sequence between steps 8 and 9. Include expected payloads for submission commands.

---

**I5. `audit-architecture` state tracking decision needed**
(Agent Skill) Plan says "audit is read-only, no CLI mutation needed" but current skill writes to state.md and activity-log.jsonl on completion (Step 7) for audit provenance. If audit doesn't trigger a CLI mutation, there's no activity log entry. This loses the audit trail.

Resolution: **USER_INPUT** — Is losing audit provenance acceptable, or should audit completion trigger a CLI command?

---

**I6. `decision:create` command existence and mapping need verification**
(Holistic + Agent Skill) Plan says "Replace `mkdir -p .project/decisions/` with `decision:create --json` (established in slice 03)." Agent Skill reviewer notes this command isn't in cli-interaction.md. Also, `decision:create` takes structured JSON input — the plan doesn't specify how the explore skill's interactive decision-recording flow constructs this payload.

Resolution: **CODEBASE_EXPLORATION** — Check `goodplan schema --json` for `decision:create`. If it doesn't exist, keep decision writing as direct skill behavior (mkdir + Write tool).

---

**I7. `explore` skip flow (Step 3) needs CLI mapping**
(Agent Skill) The skip path writes `explore-skipped.md`, updates state.md, appends activity-log. Plan says to use `submit-explore` but skip is a different path. Is there a `skip-explore` or does `submit-explore` handle skips?

Resolution: **CODEBASE_EXPLORATION** — Check schema for skip-related commands. Check state machine transition tables for skip transition.

---

**I8. `audit-architecture` activity-log query needs scope filtering**
(Software Architecture) Plan says "Replace activity-log.jsonl reads with `goodplan state --json --query '.["activity-log.jsonl"] | .[-20:]'`". This gets the last 20 entries globally, not filtered by the epic being audited. Should be scope-filtered: `'[.["activity-log.jsonl"][] | select(.scope | startswith("epics/<name>"))] | .[-20:]'`.

Resolution: **DIRECTLY_ACTIONABLE** — Update the jq query to include scope filtering, or explicitly document that global recent activity is intended.

---

**I9. Verification approach too indirect — grep checks instead of invocation tests**
(Agent Skill) All phases use `grep` as primary verification. This verifies text was rewritten but not that skills actually work. Should include at least one dry-run walkthrough per skill.

Resolution: **DIRECTLY_ACTIONABLE** — Add a task to Phase 4: for at least one skill, do a dry-run invocation on a test project to verify CLI command assembly works.

---

**I10. start-epic complexity underestimated in phasing**
(Holistic) Phase 1 groups start-epic as "simple" alongside audit-architecture. Start-epic is 334 lines with 7 major steps — one of the most complex skills. Even if descoped, this misjudgment suggests the plan's complexity estimation needs recalibration.

Resolution: **DIRECTLY_ACTIONABLE** — If start-epic stays in scope, move to Phase 2 or later. If descoped, note complexity in descoping rationale.

---

## MINOR Issues

**M1. Phase 3 "Before" checks miss `state.md` patterns in refine-architecture**
(Holistic) Before checks only grep for `activity-log.jsonl`, not `state.md`. The SKILL.md references `state-and-activity-formats.md` which covers both. The real check should target `state-and-activity-formats` references.

Resolution: **DIRECTLY_ACTIONABLE** — Add `state\.md` and `state-and-activity-formats` to before/after grep patterns.

---

**M2. Phase 1 audit-architecture Expected Behavior "Before" includes `references/` misleadingly**
(Holistic) The grep includes `references/` but all hits come from `SKILL.md`. Not harmful but misleading.

Resolution: **DIRECTLY_ACTIONABLE** — Remove `references/` from the before-check grep or note that hits are from SKILL.md only.

---

**M3. `start-*` commands `--json` flag behavior should be documented**
(Software Architecture) Plan notes `start-*` always output JSON. Should verify whether `--json` is harmless or rejected on these commands.

Resolution: **CODEBASE_EXPLORATION** — Check `start-*` command files for `--json` flag handling.

---

**M4. `create-architecture` Step 0 `ls -d` for active epic detection not addressed**
(Agent Skill) Current skill uses `ls -d .project/epics/__active__*/` for path resolution. Plan should explicitly state to replace with `goodplan status --json` -> `.activeEpic`.

Resolution: **DIRECTLY_ACTIONABLE** — Add explicit task to replace `ls -d __active__` pattern with status query.

---

**M5. `refine-architecture` working directory (`architecture-refining/`) may be skill-owned**
(Agent Skill) Plan says to replace `mkdir -p .project/architecture-refining/` with CLI paths. But this may be a skill-owned working directory. Needs schema check.

Resolution: **CODEBASE_EXPLORATION** — Check `goodplan schema --command epic:refine-architecture --json` for working directory paths.

---

**M6. Phase 4 smoke test brittleness — no expected payloads specified**
(Agent Skill) If any step fails (e.g., `submit-explore` requires a payload), subsequent steps are blocked. Test should note expected payloads.

Resolution: **DIRECTLY_ACTIONABLE** — Add expected payloads/flags for each submission command in the smoke test.

---

**M7. No documentation update tasks for CLAUDE.md**
(Holistic) If skills change interaction patterns fundamentally, project CLAUDE.md may need updating. Plan has no explicit doc update tasks.

Resolution: **DIRECTLY_ACTIONABLE** — Add Phase 4 task: review and update CLAUDE.md if skill interaction patterns changed.

---

**M8. audit-architecture sub-agent context bundling question**
(Agent Skill) Audit spawns sub-agents with self-contained prompts. Should they use `start-*` commands for context, or remain pure codebase-exploration agents? Answer is likely "stay as-is" but should be explicit.

Resolution: **DIRECTLY_ACTIONABLE** — Add note to audit-architecture tasks: sub-agents remain codebase-exploration only, no CLI context needed.

---

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C2 — Clarify directory creation vs content assembly**: In plan Phase 1 start-epic tasks (or wherever start-epic lands post-USER_INPUT), add note: "CLI handles directory creation via command responses; content merging/copying of architecture files remains skill-owned LLM work."

2. **I2 — Inventory reference files**: Add to Phase 2 tasks: "Update `explore/references/explore-logic.md`: remove `state-and-activity-formats.md` reference (line 1), replace `__active__` paths in Scope Path Mapping (lines 9-14) with CLI-provided paths, update `explore-complete.md` and `explore-skipped.md` templates." Add to Phase 3 tasks: "Update `create-architecture/references/guidance.md` lines 56-63: replace all state.md/activity-log.jsonl instructions in Early Stop section with CLI-based equivalents."

3. **I3 — Graceful stop redesign**: Add to Phase 3 create-architecture tasks: "Design re-entry detection: check `epic:show --json` status for `defining-architecture` to detect resume. Rewrite guidance.md Early Stop section (lines 54-63) to use CLI status checks + file existence instead of state.md writes."

4. **I4 — Fix smoke test sequence**: Add between current steps 8 and 9: `goodplan epic:define-slices --epic smoke`, `goodplan submit-slices --epic smoke`, `goodplan epic:refine-slices --epic smoke`, `goodplan submit-refine-slices --epic smoke`, `goodplan epic:add-verification --epic smoke`. Add expected payloads for submission commands.

5. **I8 — Scope-filtered activity query**: Change audit-architecture jq query from `.["activity-log.jsonl"] | .[-20:]` to `[.["activity-log.jsonl"][] | select(.scope | startswith("epics/<name>"))] | .[-20:]` or explicitly document that global activity is intended.

6. **I9 — Add invocation test**: Add Phase 4 task: "Dry-run at least one migrated skill (e.g., audit-architecture) on a test project to verify CLI commands are correctly assembled and executed."

7. **I10 — Reclassify start-epic complexity**: If start-epic remains in scope, move from Phase 1 to Phase 2 or later with explicit complexity acknowledgment.

8. **M1 — Fix Phase 3 before-check grep patterns**: Add `state\.md` and `state-and-activity-formats` to the grep.

9. **M4 — Replace `ls -d __active__` pattern**: Add explicit task to create-architecture Phase 3: "Replace `ls -d .project/epics/__active__*/` with `goodplan status --json` -> `.activeEpic`."

10. **M6 — Smoke test payloads**: Add expected stdin/flags for each `submit-*` command in the Phase 4 smoke test.

11. **M7 — Doc update task**: Add Phase 4 task: "Review CLAUDE.md and update if skill interaction patterns changed."

12. **M8 — Audit sub-agent note**: Add to Phase 1 audit-architecture: "Sub-agents in audit-architecture remain pure codebase-exploration agents; no CLI context commands needed."

---

## Available Research

### R1: Explore multi-scope handling
Non-epic scopes (project, slice, quest) DO trigger state transitions via direct state.md/activity-log.jsonl writes in the skill layer. The CLI state machine only handles epic scope (`submit-explore` hardcodes `type: "epic"`). No CLI commands exist for non-epic explore state transitions. **Implication**: For epic scope, use CLI commands. For non-epic scopes, the state tracking (state.md/activity-log.jsonl writes) will be lost — the exploration work itself (research, brainstorm, prototype files) still happens, but no formal state transition is recorded. This is consistent with the audit provenance decision.

### R2: decision:create exists
Command at `src/commands/decision/create.ts`. Stdin payload: `{ id: string, domain: string, title: string, summary: string }`. Routes through `begin()` RPC with `CREATE_DECISION` event. The explore skill's interactive decision-recording can construct this payload.

### R3: Explore skip flow
No separate skip command. Same `COMPLETE_EXPLORE` event handles both paths:
- Normal: `exploring → explored` (after `epic:explore` began the phase)
- Skip: `created → explored` (fire `submit-explore` without ever calling `epic:explore`)
Guard accepts both `from` statuses: `["created", "exploring"]`. No skip-specific payload needed.

### R4: start-* --json flag behavior
All start-* commands accept `--json` (part of globalArgs) but override it to `json: true` unconditionally. JSON output is always produced regardless of flag. The `--query` flag still works. Plan's note that `--json` is not needed is correct.

### R5: refine-architecture working directory paths
`epic:refine-architecture` returns `paths: { architecture: "<projectDir>/epics/<name>/architecture" }`. The skill should use this path directly, not `mkdir -p .project/architecture-refining/`. However, the skill creates a `-refining` working copy of architecture files for the iterative review loop — this working copy management is skill-owned LLM work (similar to refine-plan creating `-refining` copies).

### R6: state --json --query output shape
`activity-log.jsonl` IS a top-level key in the state tree (direct mirror of `.project/` filesystem). The plan's jq query pattern `'["activity-log.jsonl"]'` is correct. Value is a parsed JSON array of activity entries.

---

## RESEARCH_NEEDED

**R1. Explore skill multi-scope handling** (CODEBASE_EXPLORATION — I1)
What to look up: Whether non-epic scopes (project, slice, quest) in `skills/explore/SKILL.md` and `explore-logic.md` trigger state transitions (state.md writes, activity-log appends) or are purely filesystem operations.
Why it matters: If non-epic scopes have state transitions, they need CLI command mapping. If purely filesystem, they can stay as-is.
Tool strategy: Grep `skills/explore/SKILL.md` and `skills/explore/references/explore-logic.md` for scope-conditional state.md writes and activity-log appends.

**R2. `decision:create` command existence** (CODEBASE_EXPLORATION — I6)
What to look up: Whether `decision:create` exists in the CLI schema.
Why it matters: If it doesn't exist, the explore skill's decision-recording flow stays as direct filesystem writes (mkdir + Write tool).
Tool strategy: Run `goodplan schema --json` and search output for `decision`. Also check `src/commands/` for decision-related command files.

**R3. Explore skip flow CLI mapping** (CODEBASE_EXPLORATION — I7)
What to look up: Whether `submit-explore` handles skip payloads or if there's a separate skip command. Check state machine transition tables for skip transitions.
Why it matters: Skip is a distinct user path that currently has its own state transitions.
Tool strategy: Run `goodplan schema --json` and search for skip. Check `src/core/state/transitions/` for skip-related transitions. Check `.project/architecture/transition-tables.md`.

**R4. `start-*` commands `--json` flag behavior** (CODEBASE_EXPLORATION — M3)
What to look up: Whether `--json` is accepted/rejected/ignored on `start-*` commands.
Why it matters: Defensive coding — skills should use the correct flag convention.
Tool strategy: Grep `src/commands/start-*.ts` for json flag handling.

**R5. `refine-architecture` working directory paths** (CODEBASE_EXPLORATION — M5)
What to look up: Whether `epic:refine-architecture` response includes working directory paths.
Why it matters: If not, `mkdir -p .project/architecture-refining/` stays skill-owned.
Tool strategy: Run `goodplan schema --command epic:refine-architecture --json`.

**R6. `state --json --query` output shape for activity-log** (CODEBASE_EXPLORATION — from Holistic M3)
What to look up: The actual key structure in `assembleState()` output for activity-log data.
Why it matters: The jq query assumes `activity-log.jsonl` is a top-level key. If nested differently, queries return null silently.
Tool strategy: Grep `src/` for `assembleState` to find the output shape. Or run `goodplan state --json` on a test project.

---

## Contradictions Resolved

1. **start-epic resolution tag**: Holistic and Software Architecture say USER_INPUT. Agent Skill says CODEBASE_EXPLORATION. Resolved: **USER_INPUT** — the codebase exploration would confirm the mismatch but the decision of what to do about it (retire, redefine, or descope) requires user input. The CODEBASE_EXPLORATION research from Agent Skill is folded into R-items for context gathering.

2. **audit-architecture state tracking**: Agent Skill flags this as USER_INPUT (should audit completion trigger a CLI command?). Holistic and Software Architecture don't raise this. Resolved: **USER_INPUT** — this is a workflow design decision the user should make.

3. **`decision:create` existence**: Holistic assumes it exists (from slice 03) and flags the payload mapping. Agent Skill questions whether it exists at all. Resolved: trust Agent Skill's skepticism — added as CODEBASE_EXPLORATION to verify before relying on it.

---

## Unresolved (USER_INPUT required)

(None — all resolved)

## USER_INPUT Resolved

1. **start-epic disposition**: **Retire entirely.** The old start-epic's responsibilities are now split across CLI lifecycle phases. Its core value (architecture review gate) moved to /refine-architecture. User decision: retire start-epic from this slice (scope drops to 4 skills). Follow-up: auto-activation should happen when starting first slice implementation — if no epic is activated, implement-plan should activate it automatically; if another epic is active, stop and ask whether to abandon/finish it first. This auto-activation belongs in the implement-plan skill (slice 05 scope), not this slice.

2. **audit-architecture provenance**: **Accept loss.** The audit report files (.project/audits/) are the real provenance record. The activity-log entry was cosmetic (only surfaced in project-status "Recent activity" display, nothing reads it for logic). No CLI command needed.
