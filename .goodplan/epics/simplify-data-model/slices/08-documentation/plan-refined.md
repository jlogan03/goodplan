# Plan: Documentation and Skill Bug Fixes

## Overview

Fix skill bugs found during quality validation, update documentation to reflect the 12-skill model, and pass a clean E2E validation run. Five phases: start-epic rewrite, complete-epic fixes, stale reference sweep, documentation updates, E2E validation gate.

**Slug**: `docs-and-fixes`

## Phase 1: Rewrite start-epic Skill

The start-epic skill uses v1.0.3 file-existence checks, directory renaming (`mv`), and direct `activity-log.jsonl` writes. Rewrite to use the CLI.

### Expected Behavior

**Before implementation**:
- [ ] `grep -c 'ls -d\|test -f\|mv .goodplan' skills/start-epic/SKILL.md` returns multiple matches (file-existence checks and directory rename)
- [ ] `grep -c 'activity-log.jsonl\|state.md' skills/start-epic/SKILL.md` returns matches (direct state writes)
- [ ] `grep -c 'epic:activate' skills/start-epic/SKILL.md` returns 0

**After implementation**:
- [ ] `grep -c 'ls -d\|test -f\|mv .goodplan' skills/start-epic/SKILL.md` returns 0
- [ ] `grep -c 'activity-log.jsonl\|state.md' skills/start-epic/SKILL.md` returns 0
- [ ] `grep -c 'epic:activate' skills/start-epic/SKILL.md` returns at least 1
- [ ] `grep -c 'create-architecture\|create-slices' skills/start-epic/SKILL.md` returns 0 and `grep -c '/explore[^:]' skills/start-epic/SKILL.md` returns 0 (no old skill names; avoids non-portable `\b`)
- [ ] `bun run build:plugin` passes

### Tasks

- [x] Rewrite `skills/start-epic/SKILL.md` with this structure:
  1. **Step 0 — Version Check**: `gp --version --json` (standard pattern)
  2. **Step 1 — Scope Resolution**: Accept epic name as argument or auto-detect via `gp epic:list --json` — find epic in `slices-refined` status. If no epic in `slices-refined`, check for `activated` (already done). If ambiguous, use AskUserQuestion.
  3. **Step 2 — Pre-activation Check**: `gp epic:show --epic <name> --json` — verify status is `slices-refined`. Prefer consulting `nextCommands` from the CLI response to determine recommended skills (resilient to future status additions). Handle wrong-status cases explicitly:
     - `activated` → report "already activated" and stop
     - `created` → tell user the epic needs exploration and architecture: "Run `/gp:explore` to research, then `/gp:create-epic` to define architecture and slices."
     - `explored` → tell user the epic needs architecture and slices: "Run `/gp:create-epic` to define architecture and slices."
     - `slices-defined` → tell user slices need refinement: "Run `/gp:create-epic` to refine slices before activation."
     - In-progress statuses (`exploring`, `defining-architecture`, `architecture-defined`, `refining-architecture`, `architecture-refined`, `defining-slices`, `refining-slices`) → report "{Phase} is in progress. Run `/gp:{appropriate-skill}` to continue." Use `nextCommands` from `gp epic:show --json` to determine the correct skill.
     - Terminal statuses (`completed`, `abandoned`) → report "This epic is already {status}." and stop. Do not suggest running another skill.
     - Any other status → use `gp epic:show --json` to surface `nextCommands` if available, otherwise report current status and what's needed
  4. **Step 3 — Pre-activation Guard**: Verify `architecture/_overview.md` exists under the epic directory (via `gp epic:show --epic <name> --json` to get the epic path). If missing, fail fast with: "Architecture not found — run `/gp:create-epic` to set up architecture before activation." (Belt-and-suspenders UX guard — `epic:activate` already requires `slices-refined` status which implies architecture exists, but this check gives a better error message if state is inconsistent.)
  5. **Step 4 — Present Architecture**: Load architecture file paths from `gp epic:show --epic <name> --json` (epic-scoped, not `gp status` which returns all architecture files). Read and present the epic's architecture files to the user for review. Summarize key subsystems and design decisions. (Context Discipline: reading architecture files here is a legitimate orchestrator exception — the skill's purpose is to present architecture for user approval.)
  6. **Step 5 — User Approval**: Use AskUserQuestion: "Approve this architecture and activate the epic? / Request changes / Cancel". If changes requested, guide user to re-run `/gp:create-epic` to revise.
  7. **Step 6 — Activate**: `gp epic:activate --epic <name> --json`. Verify response shows `activated` status.
  8. **Step 7 — Done Summary**: Display epic name, slice count, next step: "Run `/gp:plan-slice` to create a plan for the first slice, or `/gp:status` to see the full slice list."
- [x] Remove all references to: `architecture-proposal/`, `approved.md`, `explore-complete.md`, `explore-skipped.md`, `__active__` prefix, `state.md`, `activity-log.jsonl`, `/create-architecture`, `/create-slices`, `/explore`, `/complete`
- [x] Update the skill description in frontmatter to reflect the simplified flow

### Verification

- `bun run build:plugin` passes
- `grep 'ls -d\|test -f\|mv .goodplan\|state\.md\|activity-log' skills/start-epic/SKILL.md` returns 0
- Note: Full functional smoke test of start-epic is covered by Phase 5's E2E validation run

## Phase 2: Fix complete-epic Bugs

Three related bugs in the complete-epic orchestrator.

### Expected Behavior

**Before implementation**:
- [ ] `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns a match (wrong syntax)

**After implementation**:
- [ ] `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns 0
- [ ] `grep 'quest:create --json' skills/complete-epic/SKILL.md` returns a match (correct stdin pattern)
- [ ] The skill's Step 7 includes logic to read `consolidated-learnings.md` and extract all learnings
- [ ] The skill's Step 7 includes validation that all verificationResults have `passed: true` before submitting
- [ ] `bun run build:plugin` passes

### Tasks

- [ ] **Bug A — Learnings rollup**: Update Step 7 (CLI Submit) to read `${EPIC_DIR}/completion/consolidated-learnings.md` and parse each learning entry into properly-typed objects matching `learningInputSchema`: `{ category: "domain" | "worked" | "didnt-work" | "do-differently", summary: string, detail: string, tags: string[], rollupTo: ("epic" | "project")[], validUntil?: string[] }`. Include all learnings in the `epic:complete` payload's `learnings` array, not just the first one. The full payload schema is: `{ epic: string, verificationResults: Array<{index, passed, notes}>, learnings: Array<learningInputSchema> }`, submitted via stdin JSON to `$GP epic:complete --json`. Note: `notes` is **required** (non-empty string) in `verificationResultSchema`, not optional — every verification result must include a `notes` value. This is a justified exception to context discipline — the orchestrator needs to read this file to construct the CLI payload, similar to how the implement skill reads plan overview for structural metadata.
- [ ] **Bug B — Quest creation syntax**: Find all `quest:create --title` references and replace with stdin JSON pattern: `echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json`. The `goal` value should be synthesized from the recommendation's `description` field, with effort context from `scope` (which is a size estimate: `"small"|"medium"|"large"`) — e.g., "Follow up: {description}. Estimated effort: {scope}". If `scope` is not available, use the `description` alone as the goal.
- [ ] **Bug C — Verification validation**: Before the `$GP epic:complete` call, add a step where the existing completion-epic agent reads the epic's verification criteria (from `gp epic:show --json`) and independently assesses whether each criterion is met, returning its assessments as part of its structured output. The orchestrator then constructs `verificationResults` from the agent's assessment — not from self-constructed data. Each verification result must match `verificationResultSchema`: `{ index: number, passed: boolean, notes: string }` — note that `notes` is **required** (non-empty string via `z.string().min(1)`), not optional. The agent must always provide a non-empty `notes` string for every verification result. The agent spawned in Step 4 (completion-epic) performs the assessment and returns structured results; no separate agent spawn is needed. (This is consistent with existing architecture: the agent already reads artifacts and returns structured results.) If any criterion is assessed as not met (`passed: false`), present the failures to the user via AskUserQuestion with options: "Fix and retry / Mark as accepted / Cancel completion"

### Verification

- `bun run build:plugin` passes
- `grep 'quest:create --title' skills/complete-epic/SKILL.md` returns 0

## Phase 3: Fix Stale Skill Name References

Systematic sweep across all skill files and shared references.

### Expected Behavior

**Before implementation**:
- [ ] `grep -rEn '/create-architecture|/refine-architecture|/create-plan[^-]|/refine-plan[^-]|/create-slices|/refine-slices|/implement-plan|/complete[^d-]|/capture[^d-]|/onboard-repo|/migrate[^d-]|/project-status|/audit-architecture|/audit-docs|/audit-tests' skills/ agents/ --include='*.md' | grep -v 'SKILL.md:.*description' | grep -v '\$GP \|gp '` returns matches (~32 actual stale references across 5 files; this pattern matches `/`-prefixed skill invocations only, excluding CLI command references; `[^d-]` avoids matching `completed`, `captured`, etc. without non-portable `\b`)

**After implementation**:
- [ ] Same grep returns 0 matches
- [ ] All `/explore` references have `/gp:` prefix
- [ ] `bun run build:plugin` passes

### Tasks

- [ ] Update `skills/status/references/status-logic.md` — comprehensive line-by-line update of all stale references using this mapping:
  - `/explore` → `/gp:explore`
  - `/create-architecture` → `/gp:create-epic`
  - `/create-slices` → `/gp:create-epic`
  - `/create-plan` → `/gp:plan-slice`
  - `/refine-plan` → `/gp:plan-slice`
  - `/implement-plan` → `/gp:implement`
  - `/complete` → `/gp:complete-epic` (for epics) or "built into /gp:implement" (for slices)
  - `/start-epic` → `/gp:start-epic`
  - `/create-epic` → `/gp:create-epic`
  - `/project-status` → `/gp:status`
  - Cover Epic States table (lines ~90-100, including `/explore` entries on lines 90-91), Slice/Quest States table (lines ~107-114, `/create-plan`, `/refine-plan`, `/implement-plan`, `/complete`), and Project States table (lines ~122-123, `/explore` or `/create-architecture`)
- [ ] Update `skills/_shared/references/output-templates.md` — replace bare-name references to `refine-plan`, `refine-architecture`, `refine-slices`, `implement-plan` with current skill names (e.g., `refine-plan` -> `plan-slice (refinement phase)`, `implement-plan` -> `implement`). Update line 9 "Used by" annotation to reference: `plan-slice`, `create-epic`, `implement`. Note: these are bare names (not `/`-prefixed), so the Phase 3 verification grep won't catch them — add a separate bare-name check to verification.
- [ ] Update `skills/_shared/references/iteration-loop.md` — update bare-name references from "refine-plan, refine-architecture" to current skill names. Same bare-name caveat as above.
- [ ] Update `skills/_shared/references/README.md` — update bare-name references (e.g., line 19 "refine-plan, refine-architecture" text) to current skill names. Same bare-name caveat as above.
- [ ] Update `skills/explore/SKILL.md` — fix next-step guidance from `/create-architecture`, `/create-plan` to `/gp:create-epic`, `/gp:plan-slice`. Also update line ~58 which contains TWO `/explore` references (prose + example invocation) — both need `/gp:explore` prefix ("Run /explore at the epic scope instead")
- [ ] Update `skills/init/SKILL.md` — fix line ~209 reference to `/gp:create-architecture` → `/gp:create-epic`. Verify with: `grep -c '/gp:create-architecture' skills/init/SKILL.md` — expect 0 after fix (this reference is invisible to the main Phase 3 grep patterns)
- [ ] Update `skills/upgrade/references/migration-heuristics.md` (~1 stale match) — note: these are descriptive "Used by" annotations, not skill invocations
- [ ] Update `skills/init/references/expertise-profiling.md` (~1 stale match) — same: descriptive text, not invocations
- [ ] Note: `start-epic/SKILL.md` (13 matches) is already handled by Phase 1 rewrite — no Phase 3 work needed for that file
- [ ] Note: Other files previously listed (create-epic, plan-slice, audit, create-side-quest, _shared/references/cli-interaction.md, decisions-format.md, README.md, audit-conventions.md, init/references/repo-scanning.md, init/references/migration-detection.md, all 3 agent files) have zero stale `/`-prefixed skill references — their references are `$GP` CLI commands (correctly excluded) or already use current names
- [ ] Run full grep to confirm no remaining stale references in skills/ and agents/ directories

### Verification

- `grep -rEn '/create-architecture|/refine-architecture|/create-plan[^-]|/refine-plan[^-]|/create-slices|/refine-slices|/implement-plan|/complete[^d-]|/capture[^d-]|/onboard-repo|/migrate[^d-]|/project-status|/audit-architecture|/audit-docs|/audit-tests' skills/ agents/ --include='*.md' | grep -v 'SKILL.md:.*description' | grep -v '\$GP \|gp '` — expect 0 matches (same pattern as Before check, using POSIX-compatible `[^d-]` instead of non-portable `\b`)
- `grep -rn 'refine-plan\|refine-architecture\|refine-slices\|implement-plan' skills/_shared/references/ --include='*.md' | grep -v cli-interaction.md` — expect 0 matches (bare-name check for _shared/references/; excludes cli-interaction.md which legitimately references CLI command names)
- ``grep -rn '/explore[` )"]' skills/ agents/ --include='*.md' | grep -v '\$GP \|gp \|/gp:explore'`` — expect 0 matches (`/explore` followed by space, backtick, quote, or paren, excluding CLI commands and already-correct `/gp:explore` references; uses literal backtick instead of non-portable `\x60` hex escape)
- `bun run build:plugin` passes

## Phase 4: Documentation Updates

Update project documentation to reflect the 12-skill model.

### Expected Behavior

**Before implementation**:
- [ ] `grep -c 'create-plan\|refine-plan\|implement-plan\|19.*skill' README.md` returns matches (stale references)

**After implementation**:
- [ ] README.md lists exactly 12 skills with correct `/gp:` names
- [ ] `.goodplan/architecture/_overview.md` references 12 skills, describes `agents/` directory, has updated subsystem maturity
- [ ] `.goodplan/conventions.md` includes `agents/` in repo structure
- [ ] CLAUDE.md has no stale skill references

### Tasks

- [ ] Update `README.md`:
  - List the 12 skills: init, status, upgrade, create-epic, start-epic, explore, plan-slice, implement, create-side-quest, complete-epic, audit, task
  - Update workflow overview to show consolidated pipeline flow
  - Update installation/usage instructions
- [ ] Update `.goodplan/architecture/_overview.md`:
  - Update skill count to 12
  - Add `agents/` as a described component (count agent files dynamically via `ls agents/*.md | wc -l`)
  - Update subsystem maturity levels
  - Update deployment model section to reflect `bin/gp` launcher
  - Clarify scope: this is the top-level CLI architecture overview (4-layer stack). Skills and agents are plugin-level concerns — add a "Plugin/Skills Layer" section rather than mixing skill details into existing CLI layers
- [ ] Update `.goodplan/conventions.md`:
  - Verify `agents/` is already present in repo structure (it should be); if so, count agent files dynamically and update. If missing, add it.
  - Update skill development conventions
- [ ] Verify CLAUDE.md — scan for any remaining stale references (most were fixed in the isolation quest)

### Verification

- `grep -c '/gp:' README.md` returns at least 12 (one per skill). For stronger coverage, verify each of the 12 skill names appears: `for s in init status upgrade create-epic start-epic explore plan-slice implement create-side-quest complete-epic audit task; do grep -q "/gp:$s" README.md || echo "MISSING: $s"; done` — expect no output
- `grep -r 'create-plan\|refine-plan\|implement-plan' README.md .goodplan/architecture/_overview.md .goodplan/conventions.md` returns 0
- `grep -rE '/create-architecture|/refine-architecture|/create-slices|/refine-slices|/project-status|/complete[^d-]|/capture[^d-]|/onboard-repo|/migrate[^d-]' README.md .goodplan/architecture/_overview.md .goodplan/conventions.md` returns 0

## Phase 5: E2E Validation Gate

Build the plugin fresh and run the full pipeline. This phase is the gate — the slice isn't done until it passes clean.

### Expected Behavior

**Before implementation**:
- [ ] Previous E2E run had 2 pipeline failures (start-epic, plan-slice) and 4 metric failures

**After implementation**:
- [ ] All 8 pipeline steps PASS
- [ ] All 6 quality metrics PASS
- [ ] No orchestrator discipline violations

### Tasks

- [ ] Build plugin: `bun run build:plugin`
- [ ] Run E2E: `bun tools/dogfood/validate-consolidated.ts` (use harness default model, or optionally `--model claude-opus-4-6` if needed)
- [ ] If any step fails, distinguish between:
  - **Skill/reference bugs** (in scope): diagnose and fix, then re-run
  - **Harness infrastructure bugs** (out of scope, Experimental maturity): capture as a task via `gp task:create` and mark as "harness limitation" — do not block the slice on these
- [ ] Record final results: cost, elapsed time, per-step pass/fail, per-metric pass/fail

### Verification

- All 8 pipeline steps: PASS
- All 6 quality metrics: PASS
- `bun run build:plugin` passes (final build after any fixes)
