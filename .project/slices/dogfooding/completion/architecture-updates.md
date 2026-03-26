# Architecture Updates — 06-dogfooding

## Changes Made

### 1. Added --force flag to CLI (Commands + Data Layer)
- `src/commands/global-args.ts`: new `force` boolean flag
- `src/core/data/commit.ts`: `CommitOptions.force` + `globalThis.__goodplan_force` skip concurrent mod check
- `src/core/rpc/begin.ts`, `complete.ts`, `submit.ts`: thread force through to commitState
- `src/index.ts`: `parseGlobalFlags` sets globalThis
- New test in `tests/fitness/concurrent-modification.test.ts`

No architecture doc update needed — this is an internal CLI capability, not a subsystem boundary change.

### 2. Removed ~~archived~~ directory rename convention
- `skills/complete/SKILL.md` Step 10b: removed mv commands
- `skills/complete/references/guidance.md`: removed archive convention section
- `skills/_shared/references/epic-conventions.md`: removed archive numbering section
- `skills/project-status/`: removed ~~archived~~ prefix detection
- `skills/start-epic/`: removed ~~archived~~ skip patterns

No architecture doc update needed — this was a skill-layer convention, not a CLI/architecture concern.

### 3. Skills use relative paths to _shared/references/
121 path replacements across 24 files. No architecture change — deployment convention only.

### 4. /create-slices Step 7b added (slice:create calls)
Skill-level change to call CLI's `slice:create` for each individual slice. No architecture change.

## No Architecture Doc Updates Needed

All changes were either skill-level conventions or internal CLI capabilities. The 4-layer architecture (Commands → RPC → State Machine → Data Layer) was not modified. No subsystem boundaries shifted.
