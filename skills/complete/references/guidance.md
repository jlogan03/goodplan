# Guidance

## Scope Resolution

1. **Argument**: resolve name (match against known entity types via `slice:show`, `quest:show`, or `epic:show` CLI commands).
2. **No argument**: use `goodplan status --json` — `.activeSlice` field gives the active slice.
3. **Auto-detect**: query for implementation-complete slices via `goodplan state --json --query '[.slices | to_entries[] | select(.value.status == "implementation-complete")] | map(.key)'`. For each candidate, check that `completion/learnings.md` does NOT exist (`stat <scope-dir>/completion/learnings.md`). Then scan for epic completion readiness using `goodplan slice:list --json` to verify all slices are completed or abandoned.
4. **Epic matching**: if scope resolves to an epic (via argument or `status --json` `.activeEpic` with no `.activeSlice`) → `$SCOPE_TYPE = epic`.
5. **Ambiguous**: AskUserQuestion.

## Artifact Loading

Scope dir (skip missing): `plan-refined.md` (or dir), `implementation/` (per phase, read last iteration's `merged.md` only; read `result.md` only if review references issues; skip earlier iterations unless investigating recurring problems), `refinement/` (last round's `merged.md`), `research/`, `after-implementation-fixes-and-polish.md`, `plan-learnings-and-feedback.md`, existing `completion/`. All of these are LLM-owned markdown — direct reads are allowed.

Project-level: `.project/architecture/`, `.project/learnings.md`, `slices/sequencing.md` (or the epic's `slices/sequencing.md` for epic slices). For epic slices: also load `$EPIC_DIR/architecture/` (target architecture for alignment verification).

For structured state: use CLI commands — `goodplan state --json --query '.["decisions.jsonl"]'` for decisions, `goodplan state --json --query '.["activity-log.jsonl"]'` for activity log, `goodplan slice:show --slice <name> --json` or `goodplan epic:show --epic <name> --json` for entity details.

## Learnings Synthesis

**Project-specific only** — no workflow meta-commentary (e.g., "the review process worked well"). Only record workflow observations if a specific failure caused a concrete project problem.

Six lenses: (1) problem domain — APIs, dependencies, tooling surprises, (2) architecture — did boundaries hold, what should shift, (3) code patterns — what worked/didn't in the codebase, (4) dependencies and tooling — build, test, CI surprises, (5) repo structure — file organization changes needed, (6) plan accuracy — where assumptions diverged from reality, cross-ref `plan-learnings-and-feedback.md`. Also note red-green cycle insights: "before" checks that unexpectedly passed, "after" checks needing multiple iterations, live verification catching issues formal tests missed. Every learning must be actionable — it should change how a future slice is planned, architected, or implemented.

## Learnings.md Entry Format

```markdown
## <Concise insight>
_Source: <slice-name>_

<2-3 sentence actionable summary.>
```

Newest first, below header. **Idempotency:** in top-level `.project/learnings.md`, check for existing `_Source: <slice-name>_` before adding — offer replace if found.

## JSONL Learnings Rollup

Do NOT call `learning:rollup` separately. Accumulated learnings from `completion/learnings.md` are included in the `slice:complete` (or `quest:complete`) payload as the `learnings` array. Learnings with `rollupTo` tags are processed atomically by the CLI reducer. The LLM-owned `.project/learnings.md` synthesis (human-readable markdown) remains a direct content authoring step.

## Architecture Update Protocol

1. Read `.project/architecture/`, compare against what was built.
2. **Epic slices**: Also read the epic's `architecture/` (target). Perform alignment verification — confirm the implementation matches the target. Propose updates only to top-level `.project/architecture/` (current reality). Leave epic `architecture/` unchanged — `/complete` at epic completion handles final reconciliation.
3. Per divergence: explain change + why, impact on subsystems. AskUserQuestion: "Update / Flag as tech debt / Skip".
4. Approved: edit arch file, then create a decision via CLI:

```bash
echo '{"id":"<id>","domain":"<domain>","title":"<title>","summary":"<summary>. Context: complete for <scope>"}' | goodplan decision:create --json
```

5. No divergences: "Architecture files still accurate."
6. Write `completion/architecture-updates.md` (changes made/declined/flagged).
7. If new learnings surfaced, append to `completion/learnings.md` + update rollup.

## Remaining Slice Review

Discover unimplemented slices via `goodplan slice:list --json`. Filter for non-completed/non-abandoned slices. Read `goal.md` files directly (LLM-owned) + the relevant `sequencing.md` (top-level for top-level slices, epic-scoped for epic slices). Assess: goals/ordering/new slices needed? AskUserQuestion per proposed change.

## CLAUDE.md Update

If architecture files were added or changed during completion, update CLAUDE.md Project Context references. Follow the three-case logic from create-slices (no file / no section / existing section).

## Graceful Stop

Triggers: "that's enough", "stop here", "let's stop".

Graceful stops leave filesystem artifacts in place (learnings.md, architecture-updates.md in the completion/ directory). No state writes needed — the CLI's `status --json` shows the last committed state, which is always consistent. On re-entry, Step 2 detects filesystem artifacts and offers to resume.

- **(a)** No files written — stop cleanly. No state record.
- **(b)** Learnings written, arch review pending — stop. Re-entry detects `completion/learnings.md` but no `architecture-updates.md` → resume at Step 6. If stopped during Step 7 (CLAUDE.md update), treat as case (b) — non-critical.
- **(c)** Done — normal completion (Step 10 via CLI: `slice:complete`, `quest:complete`, or `epic:complete`).
- **(d)** Project-health updated, debt evaluation pending — stop. If stopped during Step 6d (signal tracking) or Step 6f (maturity evaluation), treat as case (d) — both are informational and can be re-run.
- **(d2)** Step 9 in progress — refactor table presented, fixes pending application. Treat as case (d) for state purposes. Recovery: re-run Step 9; re-running detection on the updated codebase will not re-surface already-applied fixes, because the codebase has already changed. Side quest goals not yet written are harmless to re-detect.
- **(e)** Epic learnings written, reconciliation pending — stop. Re-entry detects learnings.md but no architecture-updates.md → resume at reconciliation.
- **(f)** Reconciliation done, artifact promotion pending — stop. Re-entry detects both files → resume at artifact promotion.

## Project Health Update

Reference: `../../_shared/references/project-health-format.md` for canonical structure and template.

Extract from slice artifacts for each section:
- **Health**: Check implementation reviews for test coverage mentions, verification results, and any areas that broke during implementation. `merged.md` files and `result.md` note what was tested.
- **Performance Characteristics**: Look at verification steps in implementation, any benchmarks or timing data mentioned in reviews or fixes-and-polish.
- **Extensibility**: Compare plan expectations vs implementation reality — were there areas where adding functionality was straightforward or required fighting the architecture?
- **Technical Debt**: Check `after-implementation-fixes-and-polish.md` for workarounds, reviews for deferred issues, and any "TODO" or shortcut patterns in implementation.
- **Recent Changes**: One-line summary of what this slice changed. Rolling window of 3 — count existing entries, remove oldest if >= 3 before adding new.

Always write the recency marker on updated sections: `<!-- Last updated by: complete for <scope>, <date> -->`

## Debt Evaluation Protocol

After updating project-health.md, explicitly evaluate architectural debt from this slice.

**Classification**:
- **Localized debt**: Contained to specific files/modules. Propose inline fix with concrete details (which files, what to change, estimated effort).
- **Systemic debt**: Cross-cutting concerns affecting multiple subsystems. Describe the debt, its scope of impact, and recommend a side quest — but do NOT auto-create `goal.md`. Propose only.

**AskUserQuestion flow** for each finding:
1. Present the debt with classification and evidence from slice artifacts
2. Options: "Fix now (localized) / Propose side quest (systemic) / Acknowledge and defer / Skip"
3. For "Fix now": scope the fix and apply it
4. For "Propose side quest": describe the quest scope and expected outcome, record in learnings
5. For "Acknowledge and defer": note in project-health.md Technical Debt section
6. For "Skip": move on silently

## Signal Tracking Algorithm

Examine the last 3 completed slices for trend signals.

**Discovery logic**:
1. Glob for `completion/learnings.md` under `.project/slices/*/`, `.project/side-quests/*/`, and `.project/quests/*/`
2. Derive scope from path: strip `.project/` prefix and `/completion/learnings.md` suffix. If the directory name starts with `~~archived~~`, strip that prefix before matching against activity-log `scope` entries. For archived epics (e.g., `~~archived~~01_initial`), strip `~~archived~~NN_` (prefix including numeric counter and underscore) to recover the original name
3. Correlate with activity-log via CLI:

```bash
goodplan state --json --query '[.["activity-log.jsonl"][] | select(.phase == "complete-slice" or .phase == "complete")]'
```

Match entries by `scope` field against derived scope values. Activity-log entry shape: `{ ts, phase, scope, status, summary, detail? }`.

4. Sort by timestamp, take 3 most recent

**Metrics to track**:
- **Refinement effort**: Count `round-N/` directories under `<scope>/refinement/`. Note: `slices/slices-refining/` rounds measure slice *definition* quality (from refine-slices), not plan refinement — do not mix.
- **Architectural changes**: Count entries in `<scope>/completion/architecture-updates.md`

**Strictly-increasing detection**: Given 3 data points [a, b, c], trigger ONLY when a < b < c (strictly increasing). Do NOT trigger for: one high value, flat-then-up (e.g., [3, 2, 3]), equal values, or any non-monotonic pattern.

**What to surface**: "The last 3 slices have required increasing [metric]. Consider running `/audit-architecture`."

## Refactor Intelligence Protocol

After signal tracking, analyze implementation artifacts for code-level refactoring opportunities. This targets code patterns (duplication, divergent approaches, warranted abstractions) — distinct from Step 6c's architectural debt at subsystem boundaries.

**Skip for epic scope** (`$SCOPE_TYPE = epic`) — epic completion is a meta-operation; refactors were caught during individual slice completions.

### Detection Algorithm

For the current scope's implementation artifacts, analyze:

1. **Review feedback**: Scan `merged.md` files for reviewer comments flagging code quality, duplication, deferred cleanup, or "TODO" patterns. Look for MINOR issues that were acknowledged but not addressed.
2. **Git diff analysis**: Run `git diff <pre-implementation-commit>...HEAD -- <changed-files>` to examine what was built. Derive the changed-files list from the diff itself: first run `git diff <commit>...HEAD --name-only` to get all changed files, then run the full diff scoped to those files. Look for: (a) duplicated code blocks (similar logic in 2+ locations), (b) pattern divergence from established conventions (different approaches to the same problem), (c) inline TODOs or FIXME comments introduced during implementation.
3. **Rule of three**: If similar code appears in 3+ locations (files or functions), it warrants extraction into a shared abstraction.
4. **Plan deviations**: First read `plan-learnings-and-feedback.md` for already-identified deviations. Only flag deviations not already captured there. Then compare `plan-refined.md` tasks against actual implementation. Shortcuts or workarounds that deviate from the plan are refactor candidates.

### Pre-implementation Commit Detection

To get a meaningful git diff, find the commit hash before implementation started. `/implement-plan` commits each phase with a `[<plan-slug>]` prefix in the commit message. Find the first such commit and take its parent:

```bash
first_impl_commit=$(git log --oneline --all --grep="\[<plan-slug>\]" --reverse --format=%H | head -1)
pre_impl_commit=$(git rev-parse "${first_impl_commit}^" 2>/dev/null)
```

If no matching commits are found (e.g., quest implemented without `/implement-plan`, or commit messages don't follow the convention), skip git diff analysis entirely — the other three detection sources (review feedback, rule-of-three, plan deviations) still provide sufficient coverage.

### Classification

- **Inline fix** (low risk): Contained to a single file or tightly-coupled module. Examples: extract function, rename for clarity, consolidate duplicates within one file, remove dead code.
- **Side quest** (medium risk): Affects 2-5 files across a module boundary. Examples: extract shared utility, consolidate divergent patterns, introduce a common abstraction.
- **Side quest** (high risk): Cross-cutting change affecting many files or public APIs. Examples: API redesign, data model refactoring, framework migration.

### Step 6c Deduplication

Before presenting findings, cross-reference with any debt items surfaced in Step 6c of this completion run. Remove duplicates, keeping the Step 6c framing for items that appeared there.

### Presentation Format

Present findings as a batch table with columns: #, What (specific files/patterns), Why (improvement rationale), Scope (inline fix / side quest), Risk (low/medium/high).

Use AskUserQuestion with multiSelect to let user pick which to act on:
- **Question text**: "Found N refactoring opportunities. Select which to act on (or select none to skip all):"
- **Option format**: `"[inline] #1: Extract shared utility from X and Y"` or `"[side-quest] #3: Consolidate auth patterns across modules"`
- **multiSelect**: `true`
- Selecting nothing = skip all.

### Action Handling

- **Selected inline fixes**: Apply the fix immediately (scope it, make the change, verify). Apply up to 5 inline fixes per Step 9 run. If the user selects more than 5, apply the first 5 and create a side quest for the remainder.
- **Selected side quests**: Draft a `goal.md` and present it for approval using AskUserQuestion with the draft content and options "Approve and create / Edit first / Skip". After user approves, create the quest via CLI: `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` (the CLI handles directory creation and `goal.md` writing). Include in the goal: what to refactor, which files, why, risk level, and success criteria.
- **Skip all** (nothing selected): No activity-log entry needed (Step 10 captures overall completion). Proceed to the next step.

### Skip Conditions

If no refactoring opportunities are found after analysis, skip silently — no output, no AskUserQuestion. This is the expected common case for clean implementations.


## Maturity Evaluation Protocol

After signal tracking (Step 6d) and artifact promotion (Step 6e, epic only), evaluate whether subsystems touched by this scope warrant maturity promotion or demotion.

**Skip condition**: If no subsystems touched by this slice/quest are at Developing, Maturing, or Foundational maturity, skip entirely. (Experimental subsystems are too early for promotion consideration.)

### Identifying Touched Subsystems

Extract from `plan-refined.md` scope/tasks and implementation artifacts. Map subsystem references against the maturity table in `_overview.md`. When uncertain whether a subsystem is touched, include it — false positives are cheaper than false negatives.

### Promotion Signal Checklist

For each touched subsystem, check:
- **Stability**: no significant bugs or design changes over recent slices
- **Fitness functions in place**: automated tests verifying architectural properties exist and have real assertions
- **Multiple dependents**: other subsystems rely on it
- **Generic design**: handles known variations without one-off hacks

### Demotion Signal Checklist

- **New gaps discovered**: edge cases, failure modes found during this slice
- **Fitness functions broken**: tests failing or removed without replacement
- **Confidence dropped**: significant rework or design uncertainty
- **Dependents report issues**: integration problems surfaced

### Fitness Function Verification

1. Extract test file paths from `plan-refined.md` task text
2. Verify each file **exists** AND contains test assertions (keywords: `assert`, `expect`, `it`, `test`, `.toBe(`, `assert_eq!`)
3. If file exists but has no assertions → flag as **stub** (partially implemented)
4. If file is planned but missing → **blocks promotion** for that subsystem; surface in output
5. If no file path extractable from task text → search test directories matching subsystem name before concluding absent

### AskUserQuestion Format

For each promotion/demotion suggestion:
- Present evidence (signals observed, fitness function status, dependents)
- Options: `Promote to [level] / Defer / Skip` (or `Demote to [level] / Defer / Skip`)

### Decision File Writing

For approved changes, create a decision via CLI:

```bash
echo '{"id":"<id>","domain":"architecture","title":"Promote/Demote <subsystem> from <old> to <new>","summary":"Evidence: ... Context: complete for <scope>"}' | goodplan decision:create --json
```

Also update the maturity table in `.project/architecture/_overview.md`.

### Epic-Scope Simplified Path

For `$SCOPE_TYPE = epic`: check promotions only (demotions were caught per-slice). For each subsystem touched by any epic slice, check cross-slice stability:
1. No entries in `completion/architecture-updates.md` describing changes to the subsystem's public interface or data contracts
2. No recurring issues in `completion/learnings.md` entries referencing the subsystem by name
3. Fitness functions column shows a test file path (not `candidate` or `---`)

If all criteria met, suggest promotion with evidence. Write decision files for approved promotions.

## Archive Convention

Completed scopes are renamed with a `~~archived~~` prefix (e.g., `~~archived~~03-explore/`) to visually separate archived work from active work in filesystem listings. This is the final step of completion. The CLI does not perform this renaming — it remains skill-owned.

Skills that scan for completed scopes (signal tracking, project-status) use glob patterns that match both prefixed and unprefixed directories. When correlating activity-log entries with archived scopes, strip `~~archived~~` from the directory name to match the scope field in activity-log (which records the path at the time of the event).

## Re-entry

**For slices/quests**: `stat <scope-dir>/completion/learnings.md`. If it exists: AskUserQuestion "Revise / Skip to arch review / Cancel". Partial state: offer resume based on which completion/ files exist.

**For epics**: Check `$EPIC_DIR/completion/learnings.md` and `$EPIC_DIR/completion/architecture-updates.md`. If learnings exist but no architecture-updates → resume at reconciliation. If both exist → resume at artifact promotion. If neither → start from beginning.

## Epic Completion Protocol

Epic completion is a META-OPERATION — it's about reconciliation and synthesis, not implementation.

### Slice Completeness Validation

Use `goodplan slice:list --json` to check all slices under the epic. Every slice must have `status === "completed"` or `status === "abandoned"`. If any non-complete slices remain, list them and stop. Do not proceed with epic completion until all slices are resolved.

### Epic-Level Learnings Synthesis

Cross-slice pattern synthesis — do not rehash individual slice learnings. Focus on:
- **Themes recurring across 2+ slices**: patterns that emerged repeatedly during the epic
- **Domain-level insights**: what we learned about the problem space at a higher level than any single slice revealed
- **Retrospective planning observations**: what we would do differently if planning a similar epic (sequencing, architecture, scope)

Write to `$EPIC_DIR/completion/learnings.md`.

### Architecture Reconciliation

Compare `$EPIC_DIR/architecture/` (target) against `.project/architecture/` (current reality). For each divergence, present AskUserQuestion with options:
- Mark as incomplete work (propose side quest)
- Document as intentional scope reduction
- Update top-level architecture to match target
- Skip

Record all decisions in `$EPIC_DIR/completion/architecture-updates.md`. If "incomplete work" items exist, draft side quest `goal.md` proposals but do NOT auto-create them.

### Step Skip Rationale

- **Step 6b (project-health update)**: Skipped for epic scope — epic completion is a meta-operation, not an implementation. Project-health updates happen per-slice.
- **Step 6c (debt evaluation)**: Skipped for epic scope — debt is evaluated per-slice during individual slice completions.

### Artifact Promotion

Copy (not move) artifacts from `$EPIC_DIR/research/`, `brainstorm/`, `prototypes/` to `.project/research/`, `.project/brainstorm/`, `.project/prototypes/`. Originals stay in the archived epic for context. Use AskUserQuestion for each artifact. If same-name conflict at destination, prefix with `<epic-name>_`. If prefixed also conflicts, append numeric suffix.

### Archive Numbering

Count existing `~~archived~~*` directories in `.project/epics/`. Set NN = count + 1 (one-indexed, zero-padded two digits; first archive is `01`). Rename from `<name>/` to `~~archived~~NN_<name>/`.

### Recency Marker Matching

When overwriting project-health recency markers, match on both `complete-slice` and `complete` patterns to handle entries written before the skill rename.
