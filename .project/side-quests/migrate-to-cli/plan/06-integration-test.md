# Phase 6: Integration Test

Test migration end-to-end on a copy of this repo's actual `.project/`, fix bugs found with real data, then create a synthetic fixture for automated CI tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] No migration-related integration tests exist: `ls tests/integration/migrate*` → no matches
- [ ] Running migration on a copy of this repo has not been attempted

**After implementation** (should pass / show presence):
- [ ] Migration has been run successfully on a copy of this repo's `.project/`:
  - `goodplan status --json` returns valid state
  - `goodplan epic:list --json` lists 3 epics (initial, goodplan-cli, skills-cli-integration) all with `completed` status
  - `goodplan quest:list --json` lists all quests with appropriate statuses
  - All markdown artifacts in `.project/` match content from `.project-old/`
- [ ] `bun test tests/integration/migrate.test.ts` passes — automated test using synthetic fixture
- [ ] Synthetic fixture covers: archived epic, active epic (if applicable), quest with various statuses, nested slices

### Tasks

- [ ] **Manual dogfood on repo copy:**
  - Copy this repo to a temp directory
  - Build the CLI with migration support: `bun run build`
  - Run `goodplan migrate --json` and manually provide answers (or script them) to exercise the full Q&A flow
  - Fix any bugs discovered:
    - Path resolution issues with nested directories
    - Status inference edge cases (e.g., epic with `~~archived~~` prefix and `completion/`)
    - Markdown copy for deeply nested artifacts
    - Schema validation failures on real data
  - Verify post-migration: `goodplan status --json`, `epic:list`, `slice:list`, `quest:list`
  - Diff sample markdown files between `.project/` and `.project-old/` to confirm content preservation
- [ ] **Create synthetic fixture** at `tests/fixtures/pre-cli-project/`:
  - Minimal `.project/` structure that exercises all migration paths:
    - An archived epic (`~~archived~~01_test-epic/`) with `completion/learnings.md`, goal.md, architecture/, 2 slices
    - A side-quest with goal.md only (status: created)
    - A side-quest with `~~archived~~` prefix and `completion/learnings.md` (status: completed)
    - `idea.md`, `conventions.md`, `architecture/_overview.md`
    - `state.md` (old format — should be ignored by migration)
    - `activity-log.jsonl` (old format — should be preserved as-is or converted)
  - Based on patterns discovered during dogfood
- [ ] **Write automated integration test** at `tests/integration/migrate.test.ts`:
  - Copy fixture to temp dir (isolated from repo state)
  - Set `GOODPLAN_DIR` to temp dir's `.project/`
  - Run full migration flow programmatically:
    1. Call migrate command (Round 1) — get inventory questions
    2. Construct valid answers matching the fixture
    3. Submit answers — get follow-up questions
    4. Answer follow-ups
    5. Confirm
  - Assert post-migration state:
    - `project.json` exists with correct name
    - All entities listed in overview.json files
    - Entity JSON files have correct statuses
    - Markdown files preserved
    - `.project-old/` exists (renamed original)
    - `.migration-in-progress.json` cleaned up
  - Test error cases:
    - Invalid sourcePath → validation error
    - Already-migrated project → `STATE_ALREADY_MIGRATED`
    - No `.project/` → `DATA_NO_PROJECT_DIR`

### Verification

- All existing tests still pass: `bun test`
- New integration test passes in CI-like conditions (clean temp dir, no ambient state)
- `bun run check` passes
- Manual verification: the copy of this repo has a fully functional `.project/` after migration
