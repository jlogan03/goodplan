# Plan: audit-arch-quest-create

## Phase 1: Update SKILL.md

Replace the `mkdir -p ".project/side-quests/<name>"` pattern in `skills/audit-architecture/SKILL.md` with the CLI-native `quest:create --json` pattern matching audit-docs and audit-tests.

### Verification
- Before: SKILL.md contains `mkdir -p` for quest creation
- After: SKILL.md uses `echo '{"name":"...","goal":"..."}' | goodplan quest:create --json`
