# Learnings — Slice 08: Documentation and Skill Bug Fixes

## E2E quality metrics must test pipeline correctness, not LLM prose quality
_Source: 08-documentation_

Character count thresholds, heading count checks, and severity-level requirements all fail when the LLM produces correct but terse output — making them model-dependent, not pipeline tests. Metrics should verify: files exist at expected paths, CLI status shows correct post-transition state, CLI-injected fields are present, and cross-scope rollup happened. Added `tools/dogfood/CLAUDE.md` to codify this at the point of action.

## start-epic skill was 3x simpler after CLI rewrite
_Source: 08-documentation_

The start-epic SKILL.md went from 340 lines (file-existence checks, directory renames, direct state writes) to ~115 lines (three CLI calls: epic:list, epic:show, epic:activate). The CLI handles all state machine enforcement, so the skill only needs scope resolution, presentation, and user approval. Future skill rewrites should follow this pattern: let the CLI own state, let the skill own UX.

## complete-epic verification must flip `passed` for user overrides
_Source: 08-documentation_

The CLI state machine hard-rejects `epic:complete` payloads containing `passed: false` verification results (`STATE_VERIFICATION_FAILED`). When the user chooses "Mark as accepted" for a failing criterion, the skill must flip `passed` to `true` and prepend the original assessment to `notes`. This preserves audit trail while staying CLI-compatible.

## Stale reference sweeps need precise grep patterns excluding CLI commands
_Source: 08-documentation_

Broad substring greps (e.g., `refine-architecture`) match legitimate CLI sub-command references like `$GP epic:refine-architecture`. Verification patterns must match `/`-prefixed skill invocations only and exclude `$GP`/`gp` lines. POSIX `[^d-]` is more portable than `\b` word boundaries on macOS BSD grep.

## Skills that aren't orchestrators use bare `gp`, not `$GP`
_Source: 08-documentation_

The `$GP` environment variable is set by the plugin launcher for orchestrator skills. Non-orchestrator skills like start-epic should use bare `gp` (available on PATH from the plugin's `bin/` directory). Using `$GP` in a non-orchestrator skill silently produces empty commands.
