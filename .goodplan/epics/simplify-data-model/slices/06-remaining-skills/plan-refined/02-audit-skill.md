# Phase 2: audit Skill

Build the `/gp:audit` skill as a lightweight orchestrator that dispatches to mode-specific agents. Replaces audit-architecture, audit-docs, and audit-tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls skills/audit/` — directory does not exist
- [x] `ls agents/audit-architecture-phase.md agents/audit-docs-phase.md agents/audit-tests-phase.md` — none exist
- [x] `ls tools/dogfood/test-audit.ts` — file does not exist

**After implementation** (should pass / show presence):
- [x] `ls skills/audit/SKILL.md` — file exists
- [x] `ls agents/audit-architecture-phase.md agents/audit-docs-phase.md agents/audit-tests-phase.md` — all three exist
- [x] `bun tools/dogfood/test-audit.ts` — audit runs in each mode (architecture, docs, tests) and produces findings

### Tasks

- [x] Create `skills/audit/SKILL.md` as a lightweight orchestrator:
  1. Parse mode from first positional argument: `/gp:audit architecture`, `/gp:audit docs`, `/gp:audit tests` (matching the existing pattern where the first word after the skill name is the mode). If no argument, use AskUserQuestion to select mode.
  2. Load project context via `gp status --json` to determine active epic and architecture paths. Error handling follows the pattern from `create-epic/SKILL.md` Step 0, with distinct messages for each failure mode:
     - CLI binary not found → "gp CLI not found — ensure the goodplan plugin is installed"
     - Exit code 1 (state error) → "gp reported a state error: <stderr>. Check `.goodplan/` integrity."
     - Exit code 2 (usage error per INV-007) → "gp usage error: <stderr>. This may indicate a version mismatch."
     - Stop gracefully in all cases — do not leave partial state.
  3. Implement re-entry handling: if an audit was previously started (check for existing audit artifacts in `.goodplan/`), offer to continue or restart. **Note:** This uses filesystem artifact detection for re-entry, which deviates from the pipeline orchestrator pattern (where phase detection uses CLI exclusively). This is an acceptable deviation because audit is a standalone skill, not a pipeline — there is no CLI status progression to query.
  4. Spawn the appropriate mode agent (`audit-architecture-phase`, `audit-docs-phase`, or `audit-tests-phase`) with project paths in the task prompt.
  5. Receive structured JSON findings from agent (format: `{ findings: Array<{ severity, category, description, location, suggestion }>, scores: Record<string, number>, proposedSideQuests: Array<{ title, description }> }`), present to user as formatted report.
  6. Validate agent return shape against the documented schema before rendering the report. If the agent's `status` is `FAILED`, or the returned JSON does not match the expected shape (missing `findings`, `scores`, or `proposedSideQuests` keys, or wrong types), surface the raw agent response with a clear error message and stop gracefully rather than attempting to render a partial or corrupt report.
  7. Offer to create side quests for significant findings.
- [x] Frontmatter: `name: audit`, `description:` must trigger for "audit architecture", "audit docs", "audit tests", "review codebase", "check quality". Add `user-invocable: true`, `requires: gp >= 1.0.0`.
- [x] Create `agents/audit-architecture-phase.md`:
  - Adapt content from `skills/audit-architecture/SKILL.md` (Steps 1-8: gap analysis, drift detection, architecture reassessment)
  - Agent reads architecture files + scans codebase, produces gap report and reassessment
  - `allowedTools: ["Read", "Grep", "Glob"]`, `disallowedTools: ["Agent"]`
  - Returns structured JSON with findings, scores, and proposed side quests
  - Inject relevant shared references via `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/` (audit-conventions, maturity-conventions)
- [x] Create `agents/audit-docs-phase.md`:
  - Adapt content from `skills/audit-docs/SKILL.md` (doc scanning, cross-reference checking, staleness detection)
  - Agent scans docs, checks against codebase, produces findings
  - `allowedTools: ["Read", "Grep", "Glob"]`, `disallowedTools: ["Agent"]`
  - Returns structured JSON with findings and fix proposals
- [x] Create `agents/audit-tests-phase.md`:
  - Adapt content from `skills/audit-tests/SKILL.md` (coverage analysis, fragility detection, strategy alignment)
  - Agent analyzes test infrastructure, produces findings
  - `allowedTools: ["Read", "Grep", "Glob"]`, `disallowedTools: ["Agent"]`
  - Returns structured JSON with findings and improvement proposals
- [x] Write `tools/dogfood/test-audit.ts`:
  - Create fixture with source code, docs, and tests (realistic enough for meaningful audit findings)
  - Test each mode: architecture, docs, tests
  - Verify each mode produces findings (non-empty output)
  - Test error path: invoke with invalid mode argument, verify graceful error message
  - Accept `--model` flag

### Verification

- `bun tools/dogfood/test-audit.ts` passes for all three modes
- Each mode agent's `.md` body stays under ~500 lines (per agent size guidance)
- Skill SKILL.md stays lightweight — no content-level reading of architecture or code
