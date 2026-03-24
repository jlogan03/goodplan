# Merged Feedback — Round 2

## Contradictions Resolved

1. **refine-architecture resume detection replacement** — Software Architecture (SA) says retain the skill-local `activity-log.jsonl` as skill-owned; Agent Skill (AS) says eliminate it and use directory structure (round directories, last merged.md) for iteration progress. Both agree `epic:show --json` handles lifecycle status. The disagreement is about iteration tracking: SA wants to keep the local activity-log, AS wants directory structure inspection. **Resolution:** Trust AS (domain specialist) — directory structure provides the same information and is more robust than a convenience log. Merged issue specifies: eliminate skill-local activity-log.jsonl, use directory structure for iteration detection, use `epic:show --json` for lifecycle status.

2. **create-architecture `start-architecture` usage** — Holistic (H) says acknowledge the command exists and explain why it's not used. AS provides the same recommendation with more specificity (no sub-agents need epic context, only web research). **Resolution:** Merged into one issue using AS's more detailed wording.

## Issues

### IMPORTANT

**I1. refine-architecture resume detection conflates skill-owned iteration tracking with CLI-owned lifecycle state**
Phase 3 says "Replace `activity-log.jsonl` resume detection with `goodplan status --json` or `epic:show --json`." The current skill reads `$SCOPE_ROOT/architecture-refining/activity-log.jsonl` — a skill-local run log, NOT the project-level activity log. `epic:show --json` only tells you the epic is in `refining-architecture` status, not which iteration was last completed.
**Fix:** Update Phase 3 to specify dual detection: (a) `epic:show --json` for lifecycle status (`refining-architecture`), AND (b) directory structure inspection (count round directories, read last merged.md) for iteration progress. Eliminate the skill-local `activity-log.jsonl` — the round directory structure provides the same information. Explicitly note that `architecture-refining/` is a skill-owned working directory (like `completion/`), so `mkdir -p` is retained.
*Sources: SA-I1, AS-I2*
Resolution: DIRECTLY_ACTIONABLE

---

**I2. create-architecture graceful stop redesign underspecified — 6 scenarios need concrete CLI-based equivalents**
Phase 2 says "Design re-entry detection using `epic:show --json` status check" but doesn't map the 6 graceful-stop scenarios from `guidance.md` lines 56-63. Each currently writes different `state.md` content and conditionally appends to `activity-log.jsonl`. The plan should provide a concrete mapping table: for each scenario (a)-(f), specify (1) what CLI mutation occurs (if any — likely none for all; leave `defining-architecture` status as-is), (2) what file existence signals resume, (3) what re-entry detection looks like. The SKILL.md has ~15 distinct `state.md`/`activity-log.jsonl` references across these scenarios — acknowledge the rewrite scale.
*Sources: SA-I2, AS-I3*
Resolution: DIRECTLY_ACTIONABLE

---

**I3. explore skill's "no argument" scope resolution path not specified after state.md elimination**
The current SKILL.md Step 2 reads `.project/state.md` Work Stack for scope resolution when no argument is passed. With state.md eliminated, the plan says "Replace state.md scope resolution with `goodplan status --json`" but doesn't specify the JSON path mapping. **Fix:** Add explicit task: "Replace Step 2 'no argument' scope resolution. Use `goodplan status --json` to check for active entities. Priority: `.activeSlice` > `.activeQuest` > `.activeEpic`. If none active, prompt user for scope argument." Verify the actual `status --json` output shape to confirm these fields exist.
*Sources: SA-I3, AS-I4*
Resolution: CODEBASE_EXPLORATION
Research: Check `src/commands/global/status.ts` and status assembler for output schema — confirm work stack, active slice, and epic status fields.

---

**I4. create-architecture: `start-architecture` exists but plan doesn't explain why it's not used for sub-agents**
`src/commands/subagent/start-architecture.ts` exists. The plan says "Conventions research sub-agent stays as regular Agent tool call" but doesn't acknowledge this command or explain the decision. **Fix:** Add note: "No sub-agents in create-architecture need `start-architecture` context bundling — the conventions research sub-agent (Step 4.1) does web research only, and all other work is orchestrator-level."
*Sources: H-I2, AS-I1*
Resolution: DIRECTLY_ACTIONABLE

---

**I5. refine-architecture: `paths.architecture` return shape vs current skill's dual-path resolution**
The plan says `epic:refine-architecture` returns `{ architecture: "<path>" }` and the CLI command only accepts `--epic`. The current skill falls back to `.project/architecture/` for project-level work when no active epic exists. After migration, refine-architecture becomes epic-only — the project-level fallback is lost. Is this acceptable?
*Source: SA-I4*
Resolution: USER_INPUT — Decide whether project-level architecture refinement (no active epic) should be preserved.

### MINOR

**M1. Phase 3 refine-architecture reference file task is vague**
The plan says "check reference files for eliminated patterns" without specifying expected outcomes. Codebase grep confirms `references/sub-agent-prompts.md`, `guidance.md`, and `reviewer-registry.md` have zero hits for `state.md`/`activity-log`/`state-and-activity-formats`. Only `SKILL.md` itself has references (2 hits for `state-and-activity-formats`). **Fix:** Reword to: "Verify reference files are clean (currently zero hits expected) and update only `SKILL.md`." Apply the same specificity to Phase 1 audit-architecture references.
*Sources: H-I1, H-I3*
Resolution: DIRECTLY_ACTIONABLE

---

**M2. Phase 4 smoke test does not verify `decision:create`**
The explore skill migration replaces `mkdir -p .project/decisions/` with `decision:create --json`, but Phase 4 never tests this command. Add a separate test step.
*Source: H-I4*
Resolution: DIRECTLY_ACTIONABLE

---

**M3. Phase 4 smoke test doesn't exercise `start-*` context bundling**
Three of four skills use `start-*` for sub-agent context bundling, but the smoke test only exercises lifecycle commands. Add at least one `start-*` invocation (e.g., `goodplan start-explore --epic smoke --inline`).
*Source: AS-M4*
Resolution: DIRECTLY_ACTIONABLE

---

**M4. Phase 4 "Before" check pattern `.project/.*\.json` may produce false positives**
The grep pattern will match references in comments/documentation. Use more specific patterns targeting `state.md`, `activity-log.jsonl`, and specific entity JSON paths, or note expected false positives.
*Source: H-I5*
Resolution: DIRECTLY_ACTIONABLE

---

**M5. audit-architecture: plan says "Replace state.md reads" but audit never reads state.md**
The actual pattern is `ls -d .project/epics/__active__*/` for path resolution, not `state.md` reads. **Fix:** Reword to: "Replace `ls -d .project/epics/__active__*/` active epic detection with `goodplan status --json` -> `.activeEpic`."
*Source: AS-M1*
Resolution: DIRECTLY_ACTIONABLE

---

**M6. refine-architecture: `ls -d .project/epics/__active__*/` pattern not called out for replacement**
Phase 3 doesn't explicitly mention this pattern for refine-architecture (Step 0a), though create-architecture got an explicit task in round 1. Add the same explicit task.
*Source: AS-M2*
Resolution: DIRECTLY_ACTIONABLE

---

**M7. `decision:create` payload construction not specified in explore skill flow**
The plan says to use `decision:create --json` but doesn't specify when in the flow it's called or how the interactive decision-recording session constructs the payload (id, domain, title, summary). Add a brief note.
*Sources: SA-M2, AS-M5*
Resolution: DIRECTLY_ACTIONABLE

---

**M8. Phase 4 smoke test: `submit-architecture` expected stdin payload may not be required**
Step 6 says `submit-architecture` needs stdin with architecture content, but `submit-architecture` may be a no-content completion signal (architecture already on disk).
*Source: SA-M3*
Resolution: CODEBASE_EXPLORATION
Research: Check `src/commands/subagent/submit-architecture.ts` and `src/schemas/commands/submit.ts` for `submitArchitectureInputSchema`.

## Scores
- Holistic: 8/10
- Software Architecture: 7/10
- Agent Skill: 7/10

## USER_INPUT Resolved

1. **I5 — project-level architecture refinement**: **Accept loss.** refine-architecture becomes epic-only after migration. Project-level fallback can be a future side quest if needed.

## Available Research

### I3: status --json output shape
Fields: `{ project, activeEpic, activeSlice, activeQuest, artifacts, recommendations, warnings }`. Active entity fields are `{ name: string, status: string } | null`. No work stack — entities are siblings resolved from flat pointers on project.json. The explore skill's "no argument" scope resolution should check: `activeSlice` > `activeQuest` > `activeEpic` > prompt user.

### M8: submit-architecture stdin
**No stdin required.** Schema is just `{ epic: string }` (CLI flag). Content is already on disk. The smoke test should NOT specify stdin for this command.

## Summary
- Critical: 0
- Important: 5
- Minor: 8
