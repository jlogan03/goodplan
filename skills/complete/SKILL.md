---
name: complete
description: >
  Complete a slice, side quest, or epic. For slices/quests: synthesizes learnings,
  rolls up to project learnings, updates architecture and project health, archives scope.
  For epics: validates all slices are done, synthesizes cross-slice epic learnings,
  reconciles epic architecture against project architecture, promotes artifacts,
  archives with numbering.
  Common triggers: 'complete this slice', 'finish this slice', 'wrap up',
  'complete slice', 'slice is done', 'we're done with this slice',
  'complete epic', 'finish epic', 'epic is done',
  'wrap up the epic', 'close out the epic', 'epic complete'.
---

# Complete Slice

Reflection point after implementation. Reads all slice artifacts, synthesizes learnings, compares what was built against architecture, reviews remaining slices, and updates project state. Re-entrant — detects partial completion and offers to resume.

## Step 0 — Scope Resolution Preamble

Resolve scope variables used throughout all subsequent steps:

1. **Determine `$SCOPE_TYPE`**: one of `epic-slice`, `top-level-slice`, `side-quest`, or `epic`.
   - If scope path matches `epics/__active__*/slices/*/` → `epic-slice`
   - If scope path matches `epics/__active__*/` (without trailing `slices/<slice>/`) → `epic`
   - If scope path matches `slices/*/` → `top-level-slice`
   - If scope path matches `side-quests/*/` → `side-quest`
2. **Set `$SLICES_DIR`**:
   - `epic-slice` → `.project/epics/__active__<name>/slices/`
   - `epic` → `.project/epics/__active__<name>/slices/`
   - `top-level-slice` → `.project/slices/`
   - `side-quest` → N/A (no slices directory)
3. **Set `$EPIC_DIR`** (epic-slice and epic):
   - `.project/epics/__active__<name>/`
   - Load `~/.claude/skills/_shared/references/epic-conventions.md` for epic directory structure, two-layer architecture model, and (for epic scope) archive numbering and completion conventions.

These variables are referenced in Steps 2–10b. Resolve them as soon as the scope is identified (Step 1, sub-step 1–3).

## Step 1 — Load References

Use the Read tool to load `references/guidance.md` (relative to this skill's directory). It contains scope resolution, artifact loading strategy, learnings synthesis, architecture update protocol, remaining slice review, CLAUDE.md update rules, graceful stop cases, and re-entry handling.

Also load `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for architecture comparison and learnings synthesis.

## Step 2 — Determine Scope

1. **Argument passed**: resolve path or name (match `slices/`, `side-quests/`, `epics/__active__*/slices/`, or `epics/__active__*/`).
2. **No argument**: read `.project/state.md` for the active slice.
3. **Auto-detect**: scan `.project/slices/`, `.project/side-quests/`, and `.project/epics/__active__*/slices/*/` for the first directory where implementation is complete but completion hasn't run. Skip `~~archived~~`-prefixed directories (already completed). A slice is implementation-complete if it has `plan-refined.md` (or `plan-refined/`) AND `implementation/` with content. `after-implementation-fixes-and-polish.md` may or may not exist (clean implementations won't have it). The slice is not yet completed if `completion/learnings.md` does not exist. After scanning all slices and side quests, scan `.project/epics/__active__*/` for epics that have `slices/sequencing.md`, where all slices are complete (archived or abandoned), and no `completion/learnings.md` exists yet.
4. **Ambiguous**: use AskUserQuestion to choose.
5. **Resolve Step 0 variables**: Once scope is identified, resolve `$SCOPE_TYPE`, `$SLICES_DIR`, and `$EPIC_DIR` per Step 0.
6. **Verify implementation**: For slices/quests: confirm the scope has `plan-refined.md` (or `plan-refined/`) and `implementation/` with content. If not, tell the user the slice doesn't appear to be implemented yet and stop. For epics: see guardrail below.
7. **Re-entry check**: For slices/quests: if `completion/learnings.md` already exists, use AskUserQuestion: "Revise existing learnings / Skip to architecture review / Cancel". If partial state (learnings written but architecture review pending), offer to resume from where it stopped. For epics: check for `$EPIC_DIR/completion/learnings.md` (learnings done) and `$EPIC_DIR/completion/architecture-updates.md` (reconciliation done). If learnings exist but no architecture-updates → resume at reconciliation. If both exist → resume at artifact promotion. If re-entry applies, skip the guardrail (sub-step 8) and proceed.
8. **Epic guardrail** (first-time completion only — skipped if re-entry detected above): An epic is completion-ready ONLY if: (1) it has `slices/sequencing.md`, AND (2) ALL slices under `$EPIC_DIR/slices/` are either `~~archived~~`-prefixed or contain `abandoned.md`. If any non-complete slices remain, list them and stop.

## Step 3 — Load Artifacts

Also load `.project/conventions.md` if it exists — project conventions inform learnings synthesis and architecture comparison.

Read all implementation artifacts for the scope (skip missing):

1. `plan-refined.md` (or `plan-refined/` — read `_overview.md` + phase files)
2. `implementation/` — for each phase, read only the last iteration's `merged.md`. Read `result.md` only if the review references specific issues. Skip earlier iterations unless investigating recurring problems.
3. `plan-learnings-and-feedback.md` (written by `/refine-plan`)
4. `refinement/` — last round's `merged.md`
5. `research/` — scan for research files
6. `after-implementation-fixes-and-polish.md`
7. `.project/architecture/` — current architecture for comparison
8. `.project/decisions/` — existing decisions for context
9. `.project/learnings.md` — existing learnings to avoid duplication
10. For epic slices: the epic's `architecture/` directory (target architecture for alignment verification)

**For epic scope** (`$SCOPE_TYPE = epic`), load instead:
- All `$EPIC_DIR/slices/*/completion/learnings.md` (per-slice learnings)
- All `$EPIC_DIR/slices/*/completion/architecture-updates.md` (per-slice arch updates)
- `$EPIC_DIR/goal.md` (epic goal)
- `$EPIC_DIR/architecture/` (target architecture)
- `.project/architecture/` (current reality — top-level)
- `$EPIC_DIR/research/`, `brainstorm/`, `prototypes/` (for promotion step)
- `.project/learnings.md` (to avoid duplication in rollup)

Present: "Epic [name]: N slices completed, M research files, K brainstorm files, J prototypes."

**For slices/quests**, present summary: "Found: plan (N phases), M implementation reviews, K research files, [plan-learnings-and-feedback], [fixes-and-polish]. Architecture: N files."

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

## Step 4 — Synthesize Learnings

First, review architecture files against what was built (quick scan for divergences — the formal propose-and-approve process is in Step 6). Note divergences found here for Step 6; reference them in the learnings draft where they affected implementation. This informs learnings. Then run `mkdir -p <scope>/completion/` and draft `completion/learnings.md`.

**Focus: project-specific learnings only.** Learnings should help future planning, architecture, and implementation within THIS project. Do NOT include commentary on the workflow itself (e.g., "the review process was thorough", "the phased approach worked well"). Workflow observations are only worth recording if a specific workflow failure caused a concrete project problem and future prompts need guidance to work around it.

Analyze the gap between plan and implementation through these lenses:

1. **Problem domain**: What did we learn about the domain, dependencies, APIs, or tooling that wasn't known before planning? (e.g., "Library X doesn't support Y", "The API rate-limits at Z")
2. **Architecture**: Did the architecture hold up? Did we discover subsystem boundaries that should shift, APIs that need redesigning, or patterns that don't fit? (Cross-reference divergences noted above)
3. **Code patterns**: What patterns worked well or poorly in the codebase? What conventions emerged that future slices should follow or avoid?
4. **Dependencies and tooling**: Any surprises with build tools, test frameworks, CI, or third-party dependencies?
5. **Repo structure**: Did file organization need to change? Are there structural patterns future work should follow?
6. **Plan accuracy**: Where did the plan's assumptions diverge from reality? (Cross-reference `plan-learnings-and-feedback.md` if loaded) What should future plans account for?

Each learning should be actionable — it should change how a future slice is planned, architected, or implemented. Skip observations that don't affect future work.

Present the draft. Iterate on corrections. Write `completion/learnings.md` when approved.

**For epic scope** (`$SCOPE_TYPE = epic`): instead of the above per-slice questions, synthesize epic-level learnings:
1. Cross-reference per-slice learnings for patterns — themes recurring across 2+ slices
2. Assess the epic goal: did we achieve what we set out to? What did we learn about the problem domain at the epic level?
3. What architectural insights emerged that affect future epics or the project's direction?
4. Write `$EPIC_DIR/completion/learnings.md` — epic-level insights, not a rehash of per-slice learnings.

## Step 5 — Roll Up to Top-Level Learnings

Re-load `references/guidance.md` (relative to this skill's directory) for the learnings entry format.

Read `.project/learnings.md`. **Idempotency check**: scan for existing `_Source: <slice-name>_` tag matching the current scope — if found, use AskUserQuestion: "Replace existing entry / Keep both / Skip". Add new entries at the top (newest first). Each entry: heading, `_Source: <slice-name>_` tag (for epics, use `_Source: <epic-name>_`), 2-3 sentence actionable summary.

**Cross-project tool learnings**: If any learnings are about general-purpose tools, libraries, or frameworks (not project-specific), save them to the user's auto memory system as well. These learnings are likely useful across projects — for example, "pnpm 10 replaces corepack" or "oxfmt beta has stability issues with certain config patterns." Use the memory Write tool to save these as project-type memories with the tool name in the filename.

## Step 6 — Propose Architecture Updates

Re-read `.project/architecture/` files (they may have left context in a long session). Re-load `references/guidance.md` (session may be long). Check `.project/state.md` Work Stack — if other slices are in-flight, warn that architecture changes may conflict (informational only).

**Epic slice handling**: When completing an epic slice, follow the two-layer architecture model (see `~/.claude/skills/_shared/references/epic-conventions.md`):
- **(a) Verify alignment**: Compare the implementation against the epic's `architecture/` (the target) to verify the slice built what was intended. Surface any divergences from the target as potential issues.
- **(b) Propose updates to top-level**: Propose updates to `.project/architecture/` (current reality) to reflect what was actually built. These are incremental per-slice updates.
- **(c) Leave epic architecture unchanged**: The epic's `architecture/` represents the target state and is not modified during slice completion. `/complete` at epic completion handles the final reconciliation.

**For epic scope** (`$SCOPE_TYPE = epic`): reconcile the two architecture layers instead of the per-slice comparison:
- Compare `$EPIC_DIR/architecture/` (target) against `.project/architecture/` (current reality)
- For each divergence: classify as (a) incomplete work, (b) intentional scope reduction, or (c) evolved understanding
- Use AskUserQuestion for each: "Mark as incomplete work (propose side quest) / Document as intentional scope reduction / Update top-level architecture to match target / Skip"
- Write `$EPIC_DIR/completion/architecture-updates.md` with reconciliation results
- If "incomplete work" items exist, draft side quest `goal.md` proposals (do NOT auto-create)

**For slices/quests**: Compare what was actually built (from implementation artifacts) against canonical architecture files (top-level `.project/architecture/`, and for epic slices also the epic's `architecture/`). For each divergence:

1. Explain what changed and why
2. Assess impact on other subsystems
3. Present agent recommendation: update architecture to match reality, or flag as tech debt
4. Use AskUserQuestion: "Update architecture? / Flag as tech debt / Skip"
5. For approved updates: run `mkdir -p .project/decisions/`, edit the relevant architecture file, write a decision file to `.project/decisions/` using the format from `decisions-format.md`. Use `Context: complete for <scope>` in the Context field.

If no divergences: "Architecture files still accurately describe the system."

Run `mkdir -p <scope>/completion/` (covers re-entry path where Step 4 was skipped). Write `completion/architecture-updates.md` summarizing changes made, declined, and flagged as tech debt. If none needed, write "No architecture updates needed."

If architecture updates revealed additional learnings, append to `completion/learnings.md` and update the top-level learnings rollup.

## Step 6b — Update project-health.md

**Skip for epic scope** (`$SCOPE_TYPE = epic`) — epic completion is a meta-operation, not an implementation. Project-health updates happen per-slice.

After architecture review, read `.project/project-health.md`. If it doesn't exist, create it using the template from `~/.claude/skills/_shared/references/project-health-format.md`. If it exists, update sections with new info (don't overwrite unrelated sections).

Update each section from the current slice's artifacts:

- **Health**: Which areas were tested during this slice, which have coverage gaps
- **Performance Characteristics**: Any characteristics observed during verification
- **Extensibility**: Did implementation reveal areas that were easy or hard to extend?
- **Technical Debt**: Any shortcuts taken, patterns that won't scale
- **Recent Changes**: Add this slice's changes to the rolling list (keep last 3 — count existing entries, remove the oldest if >= 3 before adding the new one)

Write the recency marker (`<!-- Last updated by: complete for <scope>, <date> -->`) on each section you update.

## Step 6c — Explicit Debt Evaluation

**Skip for epic scope** (`$SCOPE_TYPE = epic`) — debt is evaluated per-slice during individual slice completions.

Explicitly evaluate: "Did this slice reveal architectural debt?" Present findings with classification:

- **Localized debt**: Propose inline fix (specific files, what to change)
- **Systemic debt**: Describe the debt, recommend a side quest, but do NOT auto-create `goal.md` — propose only

Use AskUserQuestion for each finding: "Fix now (localized) / Propose side quest (systemic) / Acknowledge and defer / Skip"

## Step 6d — Signal Tracking

Examine artifact directories for the last 3 completed slices. Discovery logic:

1. **Discover completed scopes**: Scan for `.project/slices/*/completion/learnings.md`, `.project/side-quests/*/completion/learnings.md`, `.project/epics/__active__*/slices/*/completion/learnings.md`, and `.project/epics/~~archived~~*/slices/*/completion/learnings.md` (glob `*` matches `~~archived~~`-prefixed slice directories within each epic)
2. **Derive scope values**: Strip `.project/` prefix and `/completion/learnings.md` suffix. If a directory name starts with `~~archived~~`, strip that prefix before matching activity-log scope entries. For archived epics (`~~archived~~NN_<name>`), strip `~~archived~~NN_` (including numeric counter and underscore) to recover the original name
3. **Correlate with activity-log**: Filter `activity-log.jsonl` entries matching `phase` equal to `"complete-slice"` or `"complete"`, AND the derived `scope`. Use entry timestamp to sort
4. **Select window**: Take 3 most recent by timestamp
5. **Count refinement effort**: Count `round-N/` directories under `<scope>/refinement/` for each scope (measures per-slice plan refinement quality). Note: rounds under `.project/slices/slices-refining/` measure slice *definition* quality (from refine-slices) — separate metric, do not mix.

Look for trends in:
- **Refinement effort**: Count `round-N/` directories in `<scope>/refinement/`
- **Architectural changes during completion**: Count entries in `<scope>/completion/architecture-updates.md`

If any metric is **strictly increasing** across all 3 data points (a < b < c), surface it: "The last 3 slices have required increasing [metric]. Consider running `/audit-architecture`." Only surface when strictly increasing — not just one high value, not flat-then-up (e.g., [3, 2, 3] does not trigger).

## Step 6e — Artifact Promotion (epic scope only)

**Skip for non-epic scopes.** For `$SCOPE_TYPE = epic`:

1. Scan `$EPIC_DIR/research/`, `$EPIC_DIR/brainstorm/`, `$EPIC_DIR/prototypes/` for files and directories.
2. If no artifacts exist, skip this step entirely.
3. For each artifact, use AskUserQuestion: "Copy [artifact] to `.project/research/` (or `brainstorm/`, `prototypes/`)? / Skip"
4. Copy approved artifacts (not move — originals stay in the archived epic for context).
5. Destination directories: `.project/research/`, `.project/brainstorm/`, `.project/prototypes/` — create with `mkdir -p` if they don't exist.
6. If a same-name file exists at the destination, prefix with `<epic-name>_`. If the prefixed name also exists, append a numeric suffix (`_2`, `_3`, etc.).

## Step 6f — Maturity Evaluation

If no subsystems touched by this slice/quest are at Developing, Maturing, or Foundational maturity, skip Step 6f entirely. (Experimental subsystems are too early for promotion consideration.)

Otherwise:

1. **Re-read maturity data**: Extract the `## Subsystem Maturity` table from `.project/architecture/_overview.md`. Load `~/.claude/skills/_shared/references/maturity-conventions.md` for promotion/demotion criteria.

2. **For slice/side-quest scope** (`$SCOPE_TYPE != epic`): For each subsystem touched by this slice/quest:
   - **(a) Check promotion signals**: stability across recent slices, fitness functions in place, multiple dependents, generic design.
   - **(b) Check demotion signals**: new gaps discovered, fitness functions broken, confidence dropped.
   - **(c) Verify fitness functions**: extract fitness function test file paths from `plan-refined.md` tasks. For each path: verify the file exists AND contains at least one test assertion (search for common assertion keywords: `assert`, `expect`, `it`, `test`, or framework-specific equivalents like `.toBe(`, `assert_eq!`). If the file exists but appears to be a stub (no assertions), flag as partially implemented. If planned but missing entirely, the missing fitness function blocks promotion for that subsystem and is surfaced in the completion output. If no file path is extractable from the task text, search for test files matching the subsystem name in the expected test directories before concluding the file is absent.
   - **(d) Present each promotion/demotion suggestion**: show evidence, use AskUserQuestion with options `Promote to [level] / Defer / Skip` (or `Demote to [level] / Defer / Skip`).
   - **(e) For approved changes**: update the maturity table in `.project/architecture/_overview.md`, write a decision file to `.project/decisions/` using the `decisions-format.md` template already loaded in Step 1 — title: `Promote/Demote [subsystem] from [old] to [new]`, context: `complete for <scope>`, include: evidence, affected dependents, fitness function status.

3. **For epic scope** (`$SCOPE_TYPE = epic`): simplified evaluation — check only for promotions based on cross-slice stability. Do not check demotions (those were caught per-slice). For each subsystem touched by any epic slice, check if the subsystem has stabilized across all slices:
   - No entries in `completion/architecture-updates.md` that describe changes to the subsystem's public interface or data contracts.
   - No recurring issues in `completion/learnings.md` entries referencing the subsystem by name.
   - Fitness functions column in the maturity table shows a test file path (not `candidate` or `---`).
   - If all criteria met, suggest promotion using AskUserQuestion with evidence. Write decision files for approved promotions.

## Step 7 — CLAUDE.md Update

Check if architecture files were added or renamed during this completion. Three cases:

1. **No changes** → skip.
2. **Files added** → add references to CLAUDE.md Project Context "Read these" list.
3. **Files renamed/removed** → update existing references.

Load `~/.claude/skills/create-architecture/references/guidance.md` for the Project Context section format (dependency: if create-architecture's guidance.md moves, update this path). Follow the three-case CLAUDE.md update logic from create-slices: no CLAUDE.md → create with Write; no `## Project Context` section → append with Edit; existing section → extract old_string from `## Project Context` through next `## ` heading (or EOF), replace with Edit (fall back to full Write if Edit fails).

After updating: "Updated CLAUDE.md to reference new architecture files."

## Step 8 — Review Remaining Work

**For slices/quests**: Read each unimplemented slice's `goal.md` and the relevant `sequencing.md` (`.project/slices/sequencing.md` for top-level slices, or the epic's `slices/sequencing.md` for epic slices). Assess:

1. Does anything we learned warrant updating this goal?
2. Should ordering change based on what we now know?
3. Are new slices or side quests needed?

Present findings. For each proposed change, use AskUserQuestion. Apply approved changes.

**For epic scope** (`$SCOPE_TYPE = epic`): all slices within this epic are done, so review the broader project instead:
- Are there other epics in progress or planned?
- Did this epic reveal needs for new side quests or epics?
- Present observations only — do not auto-propose new epics or side quests.

## Step 9 — Refactor Intelligence

**For slices/quests** (`$SCOPE_TYPE != epic`):

1. Load the Refactor Intelligence Protocol from `references/guidance.md`.
2. Run the detection algorithm across the scope's implementation artifacts (review feedback, git diff, rule-of-three, plan deviations).
3. Cross-reference findings with Step 6c debt items — remove duplicates, keeping Step 6c framing.
4. If findings exist, present the batch table and use AskUserQuestion (multiSelect) for user selection.
5. Apply inline fixes for selected low-risk items (up to 5 per run; overflow becomes a side quest).
6. Draft side quest `goal.md` proposals for selected medium+/high-risk items (present for approval before writing).
7. If no findings, skip silently — no output, no AskUserQuestion.

**For epic scope** (`$SCOPE_TYPE = epic`): Do NOT run the refactor detection algorithm (refactors were caught during per-slice completions). Instead, use AskUserQuestion to present findings: leftover temp files, stale state entries, dangling references. Let user decide what to address.

## Step 9b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 10 — Write Back State

Load `~/.claude/skills/_shared/references/state-and-activity-formats.md` (explicit Read).

Generate a UTC timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`

Update `.project/state.md` using the 4-section format from the shared formats reference.

**For slices/quests**, set:
- Current Phase: `complete done — learnings and review done for <scope>`
- Active Slice: the scope path
- Work Stack: unchanged
- Next Step: `/create-plan` for the next unimplemented slice (or `/explore-project` if it needs exploration first)

**For epic scope** (`$SCOPE_TYPE = epic`), set:
- Current Phase: `complete done — learnings and review done for epics/<name>`
- Active Slice: `none`
- Work Stack: unchanged
- Next Step: `/project-status`

Append to `.project/activity-log.jsonl`. For epic scope, use `"scope":"epics/<name>"` (NOT the `__active__` form) and `"phase":"complete"`. Use `"status":"complete"` (the Current Phase string is `complete done`, not `complete complete`):

```bash
echo '{"ts":"<timestamp>","phase":"complete","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/activity-log.jsonl
```

## Step 10b — Archive Completed Scope

Rename the scope directory with a `~~archived~~` prefix to visually separate completed work from active work in the filesystem:

```bash
# For top-level slices ($SCOPE_TYPE = top-level-slice):
mv .project/slices/<name> '.project/slices/~~archived~~<name>'

# For side quests ($SCOPE_TYPE = side-quest):
mv .project/side-quests/<name> '.project/side-quests/~~archived~~<name>'

# For epic slices ($SCOPE_TYPE = epic-slice):
mv .project/epics/__active__<name>/slices/<slice> \
   '.project/epics/__active__<name>/slices/~~archived~~<slice>'

# For epics ($SCOPE_TYPE = epic):
# Count existing archived epics, add 1 (one-indexed, zero-padded)
NN=$(printf "%02d" $(($(ls -d .project/epics/~~archived~~* 2>/dev/null | wc -l) + 1)))
mv ".project/epics/__active__<name>" ".project/epics/~~archived~~${NN}_<name>"
ls .project/epics/  # verify
```

This is a cosmetic convention — skills that scan for completed scopes (signal tracking, project-status) check both prefixed and unprefixed directories. For epics, the `~~archived~~NN_<name>` format uses a zero-padded two-digit counter (one-indexed; first archive is `01`).

## Step 11 — Done Summary

List: learnings written, architecture updates made (if any), decisions written during this run (if any), slice goal changes (if any), recommended next step.

## Graceful Stop (Steps 4-9)

Trigger phrases: "that's enough", "stop here", "let's stop".

- **(a) No files written** → don't touch state.md or activity-log. Stop.
- **(b) Learnings written, architecture review not done** → load `~/.claude/skills/_shared/references/state-and-activity-formats.md`. Update state.md Current Phase to `complete in-progress — learnings written for <scope>`. Append to activity-log with `"status":"started"`. Next Step: `Resume /complete for <scope> (architecture review pending)`. Stop. Note: if stopped during Step 7 (CLAUDE.md update), treat as case (b) — the CLAUDE.md update is non-critical and can be completed on re-entry.
- **(c) Everything done** → normal completion (Step 10).
- **(d) Project-health updated, debt evaluation not done** → load `~/.claude/skills/_shared/references/state-and-activity-formats.md`. Update state.md Current Phase to `complete in-progress — project-health updated for <scope>, debt evaluation pending`. Append to activity-log with `"status":"started"`. Stop. If stopped during Step 6d (signal tracking) or Step 6f (maturity evaluation), treat as case (d) — both are informational and can be re-run.
- **(d2) Step 9 in progress — refactor table presented, fixes pending** → treat as case (d) for state purposes. Recovery: re-run Step 9; re-running detection on the updated codebase will not re-surface already-applied fixes (codebase has changed). Side quest goals not yet written are harmless to re-detect.
- **(e) Epic learnings written, reconciliation pending** (epic scope only) → load `~/.claude/skills/_shared/references/state-and-activity-formats.md`. Update state.md Current Phase to `complete in-progress — epic learnings written for epics/<name>, architecture reconciliation pending`. Append to activity-log with `"status":"started"`, `"scope":"epics/<name>"`. Next Step: `Resume /complete for epics/<name> (architecture reconciliation)`. Stop.
- **(f) Reconciliation done, artifact promotion pending** (epic scope only) → load `~/.claude/skills/_shared/references/state-and-activity-formats.md`. Update state.md Current Phase to `complete in-progress — reconciliation done for epics/<name>, artifact promotion pending`. Append to activity-log with `"status":"started"`, `"scope":"epics/<name>"`. Next Step: `Resume /complete for epics/<name> (artifact promotion)`. Stop.

## Error Handling

If a Write or Edit tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with remaining steps.
