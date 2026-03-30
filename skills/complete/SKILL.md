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
requires: gp >= 1.0.0
---

# Complete Slice

Reflection point after implementation. Reads all slice artifacts, synthesizes learnings, compares what was built against architecture, reviews remaining slices, and updates project state. Re-entrant — detects partial completion and offers to resume.

## Step 0 — Scope Resolution Preamble

Resolve scope variables used throughout all subsequent steps:

1. **Determine `$SCOPE_TYPE`**: one of `epic-slice`, `top-level-slice`, `side-quest`, or `epic`.
   - Use `gp status --json`. Check `.activeSlice` and `.activeEpic` fields:
     - If `.activeSlice` exists and `.activeEpic` exists → `epic-slice`
     - If `.activeSlice` exists and no `.activeEpic` → `top-level-slice`
     - If no `.activeSlice` and `.activeEpic` exists → `epic` (or check argument)
     - If argument is a quest name → `side-quest`
2. **Set `$SLICES_DIR`**:
   - `epic-slice` → `.goodplan/epics/<epic-name>/slices/` (slices live under their parent epic)
   - `epic` → `.goodplan/epics/<epic-name>/slices/` (to scan for epic's slices)
   - `top-level-slice` → `.goodplan/slices/`
   - `side-quest` → N/A (no slices directory)
3. **Set `$EPIC_DIR`** (epic-slice and epic):
   - `.goodplan/epics/<epic-name>/` — derive epic name from `status --json` `.activeEpic` field.
   - Load `../_shared/references/epic-conventions.md` for epic directory structure, two-layer architecture model, and (for epic scope) archive numbering and completion conventions.

These variables are referenced in Steps 2–10b. Resolve them as soon as the scope is identified (Step 1, sub-step 1–3).

## Step 1 — Load References and Version Check

### Version Check

```bash
gp --version --json
```

Verify the reported version satisfies `requires: gp >= 1.0.0`. If the CLI is not found or the version is too old:

> The `gp` CLI is required (>= 1.0.0) but was not found or is incompatible. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH.

**Stop the skill.** Do not fall back to direct file access.

For all CLI commands in this skill, follow error handling patterns in `../_shared/references/cli-interaction.md` (section: Error Handling). Key points: exit code 1 = internal/unexpected error (present to user and stop), exit code 2 = validation/usage error (fix invocation — likely a skill bug), exit code 3 = state machine error (parse error code from JSON, apply recovery pattern).

### Load References

Use the Read tool to load `references/guidance.md` (relative to this skill's directory). It contains scope resolution, artifact loading strategy, learnings synthesis, architecture update protocol, remaining slice review, CLAUDE.md update rules, graceful stop cases, and re-entry handling.

Also load `../_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load decisions via CLI:

```bash
gp state --json --query '.["decisions.jsonl"]'
```

Follow the Loading Protocol: skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for architecture comparison and learnings synthesis.

## Step 2 — Determine Scope

1. **Argument passed**: resolve name (match against known entity types via `slice:show`, `quest:show`, or `epic:show`).
2. **No argument**: use `gp status --json` — check `.activeSlice` field for the active slice.
3. **Auto-detect**: use `gp status --json` to check active entities. If no active slice, query for implementation-complete scopes:

```bash
gp state --json --query '[.slices | to_entries[] | select(.value.status == "implementation-complete")] | map(.key)'
```

For each candidate, check that `completion/learnings.md` does NOT exist (re-entry detection). Note: `stat` on LLM-owned `completion/` artifacts is permitted — the CLI has no `completion` field in `artifacts`, so this is the only way to detect partial completion.

```bash
stat $SLICES_DIR/<name>/completion/learnings.md
```

If `stat` fails (file not found), the scope is eligible for fresh completion. If `stat` succeeds, the scope has partial completion — offer to resume (see re-entry check below).

After scanning slices, scan for epic completion readiness: check if all slices under the epic are completed or abandoned using `gp slice:list --json` and checking status values.

4. **Ambiguous**: use AskUserQuestion to choose.
5. **Resolve Step 0 variables**: Once scope is identified, resolve `$SCOPE_TYPE`, `$SLICES_DIR`, and `$EPIC_DIR` per Step 0.
6. **Verify implementation**: For slices/quests: use `gp slice:show --slice <name> --json` or `gp quest:show --quest <name> --json`. Check that `status` is `implementation-complete`. The `artifacts` object uses boolean flags: `{ goal, exploreComplete, plan, planRefined, implementation, abandoned }`. Confirm `planRefined === true` and `implementation === true`. If status is not `implementation-complete`, tell the user the slice doesn't appear to be implemented yet and stop.
7. **Re-entry check**: For slices/quests: `stat <slice-dir>/completion/learnings.md`. If it exists, use AskUserQuestion: "Revise existing learnings / Skip to architecture review / Cancel". If partial state (learnings written but architecture review pending), offer to resume from where it stopped. For epics: check for `$EPIC_DIR/completion/learnings.md` (learnings done) and `$EPIC_DIR/completion/architecture-updates.md` (reconciliation done). If learnings exist but no architecture-updates → resume at reconciliation. If both exist → resume at artifact promotion. If re-entry applies, skip the guardrail (sub-step 8) and proceed.
8. **Epic guardrail** (first-time completion only — skipped if re-entry detected above): An epic is completion-ready ONLY if all slices are completed or abandoned. Use `gp slice:list --json` and verify every slice has `status === "completed"` or `status === "abandoned"`. If any non-terminal slices remain, list them and stop.

## Step 3 — Load Artifacts

Also load `.goodplan/conventions.md` if it exists — project conventions inform learnings synthesis and architecture comparison.

Read all implementation artifacts for the scope (skip missing). These are LLM-owned markdown — direct reads are allowed:

1. `plan-refined.md` (or `plan-refined/` — read `_overview.md` + phase files)
2. `implementation/` — for each phase, read only the last iteration's `merged.md`. Read `result.md` only if the review references specific issues. Skip earlier iterations unless investigating recurring problems.
3. `plan-learnings-and-feedback.md` (written by `/refine-plan`)
4. `refinement/` — last round's `merged.md`
5. `research/` — scan for research files
6. `after-implementation-fixes-and-polish.md`
7. `.goodplan/architecture/` — current architecture for comparison
8. Existing decisions (already loaded in Step 1 via CLI)
9. For epic slices: the epic's `architecture/` directory (target architecture for alignment verification)

For activity-log context (e.g., recent activity, signal tracking):

```bash
gp state --json --query '.["activity-log.jsonl"] | .[-10:]'
```

For entity details:

```bash
gp slice:show --slice <name> --json
# or
gp epic:show --epic <name> --json
```

Note: `slice:show` artifacts are boolean flags (`{ goal, exploreComplete, plan, planRefined, implementation, abandoned }`). `epic:show` artifacts extend this with additional fields (`{ goal, exploreComplete, architectureDefined, slicesDefined, abandoned, implementation: false, plan: false, planRefined: false }` — implementation/plan/planRefined are always `false` for epics since slices own those). Neither includes a `completion` field.

**For epic scope** (`$SCOPE_TYPE = epic`), load instead:
- All `$EPIC_DIR/slices/*/completion/learnings.md` (per-slice learnings — LLM-owned, direct read)
- All `$EPIC_DIR/slices/*/completion/architecture-updates.md` (per-slice arch updates)
- `$EPIC_DIR/goal.md` (epic goal)
- `$EPIC_DIR/architecture/` (target architecture)
- `.goodplan/architecture/` (current reality — top-level)
- `$EPIC_DIR/research/`, `brainstorm/`, `prototypes/` (for promotion step)

Display using the Context Load Summary Template from `../_shared/references/output-templates.md`. For the `**Context**` line, use scope-dependent format: epic scope: "Epic [name]: {N} slices completed, {M} research files, {K} brainstorm files, {J} prototypes." Slice/quest scope: "Plan ({N} phases), {M} implementation reviews, {K} research files, architecture ({N} files)."

Follow calibration depth guidance in `../_shared/references/expertise-tracking.md`.

## Step 4 — Synthesize Learnings

First, review architecture files against what was built (quick scan for divergences — the formal propose-and-approve process is in Step 6). Note divergences found here for Step 6; reference them in the learnings draft where they affected implementation. This informs learnings. Then run `mkdir -p <scope-dir>/completion/` and draft `completion/learnings.md`. (Note: `completion/` is a skill-owned LLM artifact directory, not a CLI-managed entity directory; direct `mkdir` and `stat` operations are permitted here — the CLI has no `completion` field in `artifacts`.)

The scope directory is derived from the entity name using deterministic conventions:
- Epic slices: `.goodplan/epics/<epic>/slices/<name>/` (nested under parent epic)
- Top-level slices: `.goodplan/slices/<name>/` (no-active-epic fallback)
- Quests: `.goodplan/quests/<name>/` (if applicable)
- Epics: `.goodplan/epics/<name>/`

Completion artifacts go to `<scope-dir>/completion/`.

**Focus: project-specific learnings only.** Learnings should help future planning, architecture, and implementation within THIS project. Do NOT include commentary on the workflow itself (e.g., "the review process was thorough", "the phased approach worked well"). Workflow observations are only worth recording if a specific workflow failure caused a concrete project problem and future prompts need guidance to work around it.

Analyze the gap between plan and implementation through these lenses:

1. **Problem domain**: What did we learn about the domain, dependencies, APIs, or tooling that wasn't known before planning? (e.g., "Library X doesn't support Y", "The API rate-limits at Z")
2. **Architecture**: Did the architecture hold up? Did we discover subsystem boundaries that should shift, APIs that need redesigning, or patterns that don't fit? (Cross-reference divergences noted above)
3. **Code patterns**: What patterns worked well or poorly in the codebase? What conventions emerged that future slices should follow or avoid?
4. **Dependencies and tooling**: Any surprises with build tools, test frameworks, CI, or third-party dependencies?
5. **Repo structure**: Did file organization need to change? Are there structural patterns future work should follow?
6. **Plan accuracy**: Where did the plan's assumptions diverge from reality? (Cross-reference `plan-learnings-and-feedback.md` if loaded) What should future plans account for?

Each learning should be actionable — it should change how a future slice is planned, architected, or implemented. Skip observations that don't affect future work.

Present the learnings for visibility, then write `completion/learnings.md`.

**For epic scope** (`$SCOPE_TYPE = epic`): instead of the above per-slice questions, synthesize epic-level learnings:
1. Cross-reference per-slice learnings for patterns — themes recurring across 2+ slices
2. Assess the epic goal: did we achieve what we set out to? What did we learn about the problem domain at the epic level?
3. What architectural insights emerged that affect future epics or the project's direction?
4. Write `$EPIC_DIR/completion/learnings.md` — epic-level insights, not a rehash of per-slice learnings.

## Step 5 — Roll Up Learnings via CLI Payload

Re-load `references/guidance.md` (relative to this skill's directory) for the learnings entry format.

**JSONL learnings rollup**: Do NOT call `learning:rollup` separately. The accumulated learnings from `completion/learnings.md` will be read back and included in the `slice:complete` payload (Step 10) as the `learnings` array. Each learning entry's `detail` field contains the full text that the CLI will write to a per-learning `.md` file in the `learnings/` directory — the CLI handles file creation, slug derivation, and JSONL persistence. Learnings with `rollupTo` tags are processed atomically by the CLI reducer — no separate rollup invocation needed.

**Cross-project tool learnings**: If any learnings are about general-purpose tools, libraries, or frameworks (not project-specific), save them to the user's auto memory system as well. These learnings are likely useful across projects — for example, "pnpm 10 replaces corepack" or "oxfmt beta has stability issues with certain config patterns." Use the memory Write tool to save these as project-type memories with the tool name in the filename.

## Step 6 — Propose Architecture Updates

Re-read `.goodplan/architecture/` files (they may have left context in a long session). Re-load `references/guidance.md` (session may be long). Check for concurrent work using:

```bash
gp status --json
```

If other slices/quests are active (`.activeSlice` or `.activeQuest` is non-null and different from the current scope), warn that architecture changes may conflict (informational only).

**Epic slice handling**: When completing an epic slice, follow the two-layer architecture model (see `../_shared/references/epic-conventions.md`):
- **(a) Verify alignment**: Compare the implementation against the epic's `architecture/` (the target) to verify the slice built what was intended. Surface any divergences from the target as potential issues.
- **(b) Propose updates to top-level**: Propose updates to `.goodplan/architecture/` (current reality) to reflect what was actually built. These are incremental per-slice updates.
- **(c) Leave epic architecture unchanged**: The epic's `architecture/` represents the target state and is not modified during slice completion. `/complete` at epic completion handles the final reconciliation.

**For epic scope** (`$SCOPE_TYPE = epic`): reconcile the two architecture layers instead of the per-slice comparison:
- Compare `$EPIC_DIR/architecture/` (target) against `.goodplan/architecture/` (current reality)
- For each divergence: classify as (a) incomplete work, (b) intentional scope reduction, or (c) evolved understanding
- Use AskUserQuestion for each: "Mark as incomplete work (propose side quest) / Document as intentional scope reduction / Update top-level architecture to match target / Skip"
- Write `$EPIC_DIR/completion/architecture-updates.md` with reconciliation results
- If "incomplete work" items exist, draft side quest `goal.md` proposals (do NOT auto-create)

**For slices/quests**: Compare what was actually built (from implementation artifacts) against canonical architecture files (top-level `.goodplan/architecture/`, and for epic slices also the epic's `architecture/`). For each divergence:

1. Explain what changed and why
2. Assess impact on other subsystems
3. Present agent recommendation: update architecture to match reality, or flag as tech debt
4. Use AskUserQuestion: "Update architecture? / Flag as tech debt / Skip"
5. For approved updates: edit the relevant architecture file, then create a decision via CLI:

```bash
echo '{"id":"<decision-id>","domain":"<domain>","title":"<title>","summary":"<summary>"}' | gp decision:create --json
```

Use `Context: complete for <scope>` in the summary field.

If no divergences: "Architecture files still accurately describe the system."

Run `mkdir -p <scope-dir>/completion/` (covers re-entry path where Step 4 was skipped). Write `completion/architecture-updates.md` summarizing changes made, declined, and flagged as tech debt. If none needed, write "No architecture updates needed."

If architecture updates revealed additional learnings, append to `completion/learnings.md`.

## Step 6b — Update project-health.md

**Skip for epic scope** (`$SCOPE_TYPE = epic`) — epic completion is a meta-operation, not an implementation. Project-health updates happen per-slice.

After architecture review, read `.goodplan/project-health.md`. If it doesn't exist, create it using the template from `../_shared/references/project-health-format.md`. If it exists, update sections with new info (don't overwrite unrelated sections).

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

1. **Discover completed scopes**: Scan for `.goodplan/slices/*/completion/learnings.md`, `.goodplan/epics/*/slices/*/completion/learnings.md`, `.goodplan/side-quests/*/completion/learnings.md`, and `.goodplan/quests/*/completion/learnings.md`
2. **Derive scope values**: Strip `.goodplan/` prefix and `/completion/learnings.md` suffix to get the scope path (e.g., `slices/my-slice`)
3. **Correlate with activity-log**: Use CLI to query activity-log entries:

```bash
gp state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete-slice" or .phase == "complete")]'
```

Match entries by `scope` field against derived scope values. Activity-log entry shape: `{ ts, phase, scope, status, summary, detail? }`.

4. **Select window**: Take 3 most recent by timestamp
5. **Count refinement effort**: Count `round-N/` directories under `<scope>/refinement/` for each scope (measures per-slice plan refinement quality). Note: rounds under `$SLICES_DIR/slices-refining/` (either `.goodplan/slices/slices-refining/` or `.goodplan/epics/<epic>/slices/slices-refining/`) measure slice *definition* quality (from refine-slices) — separate metric, do not mix.

Look for trends in:
- **Refinement effort**: Count `round-N/` directories in `<scope>/refinement/`
- **Architectural changes during completion**: Count entries in `<scope>/completion/architecture-updates.md`

If any metric is **strictly increasing** across all 3 data points (a < b < c), surface it: "The last 3 slices have required increasing [metric]. Consider running `/audit-architecture`." Only surface when strictly increasing — not just one high value, not flat-then-up (e.g., [3, 2, 3] does not trigger).

## Step 6e — Artifact Promotion (epic scope only)

**Skip for non-epic scopes.** For `$SCOPE_TYPE = epic`:

1. Scan `$EPIC_DIR/research/`, `$EPIC_DIR/brainstorm/`, `$EPIC_DIR/prototypes/` for files and directories.
2. If no artifacts exist, skip this step entirely.
3. For each artifact, use AskUserQuestion: "Copy [artifact] to `.goodplan/research/` (or `brainstorm/`, `prototypes/`)? / Skip"
4. Copy approved artifacts (not move — originals stay in the archived epic for context).
5. Destination directories: `.goodplan/research/`, `.goodplan/brainstorm/`, `.goodplan/prototypes/` — create with `mkdir -p` if they don't exist.
6. If a same-name file exists at the destination, prefix with `<epic-name>_`. If the prefixed name also exists, append a numeric suffix (`_2`, `_3`, etc.).

## Step 6f — Maturity Evaluation

If no subsystems touched by this slice/quest are at Developing, Maturing, or Foundational maturity, skip Step 6f entirely. (Experimental subsystems are too early for promotion consideration.)

Otherwise:

1. **Re-read maturity data**: Extract the `## Subsystem Maturity` table from `.goodplan/architecture/_overview.md`. Load `../_shared/references/maturity-conventions.md` for promotion/demotion criteria.

2. **For slice/side-quest scope** (`$SCOPE_TYPE != epic`): For each subsystem touched by this slice/quest:
   - **(a) Check promotion signals**: stability across recent slices, fitness functions in place, multiple dependents, generic design.
   - **(b) Check demotion signals**: new gaps discovered, fitness functions broken, confidence dropped.
   - **(c) Verify fitness functions**: extract fitness function test file paths from `plan-refined.md` tasks. For each path: verify the file exists AND contains at least one test assertion (search for common assertion keywords: `assert`, `expect`, `it`, `test`, or framework-specific equivalents like `.toBe(`, `assert_eq!`). If the file exists but appears to be a stub (no assertions), flag as partially implemented. If planned but missing entirely, the missing fitness function blocks promotion for that subsystem and is surfaced in the completion output. If no file path is extractable from the task text, search for test files matching the subsystem name in the expected test directories before concluding the file is absent.
   - **(d) Present each promotion/demotion suggestion**: show evidence, use AskUserQuestion with options `Promote to [level] / Defer / Skip` (or `Demote to [level] / Defer / Skip`).
   - **(e) For approved changes**: update the maturity table in `.goodplan/architecture/_overview.md`, write a decision via CLI:

```bash
echo '{"id":"<id>","domain":"architecture","title":"Promote/Demote <subsystem> from <old> to <new>","summary":"Evidence: ... Context: complete for <scope>"}' | gp decision:create --json
```

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

Load `../create-architecture/references/guidance.md` for the Project Context section format (dependency: if create-architecture's guidance.md moves, update this path). Follow the three-case CLAUDE.md update logic from create-slices: no CLAUDE.md → create with Write; no `## Project Context` section → append with Edit; existing section → extract old_string from `## Project Context` through next `## ` heading (or EOF), replace with Edit (fall back to full Write if Edit fails).

After updating: "Updated CLAUDE.md to reference new architecture files."

## Step 8 — Review Remaining Work

**For slices/quests**: Discover unimplemented slices via CLI:

```bash
gp slice:list --json
```

Filter for slices with `status` not in `["completed", "abandoned"]`. For each, read the slice's `goal.md` directly (LLM-owned markdown) and the relevant `sequencing.md` (`.goodplan/slices/sequencing.md` for top-level slices, or `.goodplan/epics/<epic>/slices/sequencing.md` for epic slices). Assess:

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

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 10 — Write Back State

Read back filesystem-accumulated results from `<scope-dir>/completion/` (learnings.md, architecture-updates.md) and construct the appropriate CLI command payload.

**For slices** (`$SCOPE_TYPE = epic-slice` or `top-level-slice`):

```bash
echo '{"verificationPassed": true, "deferred": [<items>], "learnings": [<items>], "architectureDelta": [<items>]}' | gp slice:complete --slice <name> --json
```

Payload fields:
- `verificationPassed` (boolean): whether implementation verification passed
- `deferred` (array, optional): deferred work items
- `learnings` (array, optional): learnings from `completion/learnings.md`, with `rollupTo` tags for atomic rollup
- `architectureDelta` (array, optional): architecture changes from `completion/architecture-updates.md`

**For quests** (`$SCOPE_TYPE = side-quest`):

```bash
echo '{"verificationPassed": true, "learnings": [<items>], "architectureDelta": [<items>]}' | gp quest:complete --quest <name> --json
```

Same as slice but no `deferred` field.

**For epics** (`$SCOPE_TYPE = epic`):

```bash
echo '{"verificationResults": [{"index": 0, "passed": true, "notes": "..."}]}' | gp epic:complete --epic <name> --json
```

Different shape — `epic:complete` does NOT accept `learnings` or `architectureDelta`. These must be handled before the epic completion call (Steps 4-6). The payload contains verification results only.

The CLI handles the state transition and activity-log entry. No manual state.md writes or activity-log appends needed.

## Step 10b — Archive Convention (REMOVED)

**Do NOT rename directories with `~~archived~~` prefix.** The CLI uses entity names to resolve directory paths (e.g., `epics/<name>/epic.json`). Renaming directories breaks CLI path resolution and triggers permanent `DATA_CONCURRENT_MODIFICATION` errors that block all subsequent operations.

Completed entities are identified by their `status === "completed"` field in the CLI (via `epic:show`, `slice:show`, `quest:show`), not by directory naming. The `/project-status` skill and other consumers should use CLI status queries to distinguish active from completed work.

## Step 11 — Done Summary

Display using the Done Summary Template (Variant A — Strict Fenced) from `../_shared/references/output-templates.md` with these skill-specific values:

- `{done_heading}`: `Completion Summary`
- `{done_fields}`: `**Scope**: {slice/quest/epic name}`, `**Artifacts written**: {list of files written during completion}`, `**Architecture updates**: {count} proposed`, `**Learnings**: {count} recorded`
- `{next_step}`: context-dependent (next slice, next epic phase, etc.)

## Graceful Stop (Steps 4-9)

Trigger phrases: "that's enough", "stop here", "let's stop".

Graceful stops before the final `slice:complete` / `quest:complete` / `epic:complete` call just leave filesystem artifacts in place (learnings.md, architecture-updates.md in the completion/ directory). No state writes needed — the CLI's `status --json` shows the last committed state, which is always consistent.

On re-entry, Step 2 detects these filesystem artifacts and offers to resume:
- **(a) No files written** → stop cleanly. No state record.
- **(b) Learnings written, architecture review not done** → stop. On re-entry, `stat <scope-dir>/completion/learnings.md` succeeds but no `architecture-updates.md` → resume at Step 6.
- **(c) Everything done** → normal completion (Step 10).
- **(d) Project-health updated, debt evaluation not done** → stop. If stopped during Step 6d (signal tracking) or Step 6f (maturity evaluation), treat as case (d) — both are informational and can be re-run.
- **(d2) Step 9 in progress — refactor table presented, fixes pending** → treat as case (d). Recovery: re-run Step 9; re-running detection on the updated codebase will not re-surface already-applied fixes.
- **(e) Epic learnings written, reconciliation pending** (epic scope only) → stop. Re-entry detects learnings.md but no architecture-updates.md → resume at reconciliation.
- **(f) Reconciliation done, artifact promotion pending** (epic scope only) → stop. Re-entry detects both files → resume at artifact promotion.

## Error Handling

If a Write or Edit tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with remaining steps.

For CLI command failures, follow the error handling patterns in `../_shared/references/cli-interaction.md`:
- Exit 1 (internal): present error to user and stop
- Exit 2 (validation): fix the invocation and retry — likely a skill bug
- Exit 3 (state machine): parse error code, apply recovery pattern (see cli-interaction.md for idempotent re-entry)
