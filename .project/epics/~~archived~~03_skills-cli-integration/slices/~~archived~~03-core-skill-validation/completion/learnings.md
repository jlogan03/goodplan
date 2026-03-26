# Learnings — Slice 03: Core Skill Validation

## CLI `create` phase returns empty `paths: {}`

Skills must use fixed filesystem conventions for `goal.md` and `idea.md` paths after entity creation. The `paths` field in mutation responses is only populated for phases with specific artifact directories (plan, implement, explore, etc.), not lifecycle phases like `create`. The `resolveForBeginPhase` function returns `{}` for `case "create"`.

## `__active__` prefix is a pre-CLI skill convention, not a CLI concept

The CLI creates directories at `epics/<name>/` without any prefix. The old `__active__` convention was managed by skills manually. Migrated skills must use unprefixed paths. This was flagged as CRITICAL during review but turned out to be a false positive — significant source of confusion when the reviewer checked the actual filesystem (which has old-style `__active__` directories) against what the CLI produces.

## Slices live at `.project/slices/<name>/`, not under epics

The data layer's `resolveEntityDir` places slices at a flat path (`path.join(projectDir, "slices", target.name)`), not nested under the epic directory. This is non-obvious and was caught during plan refinement. Would have been a runtime bug causing skills to write completion artifacts to non-existent directories.

## `slice:complete` handles learnings rollup atomically

No separate `learning:rollup` call needed. The `learnings` array in the `slice:complete` payload includes `rollupTo` tags that the reducer processes inline. Calling `learning:rollup` separately would double-process learnings. The LLM-owned `.project/learnings.md` synthesis (human-readable) is still a separate content authoring step.

## `epic:complete` has a fundamentally different payload shape

It takes `{ verificationResults: [{ index, passed, notes }] }`, NOT `learnings` or `architectureDelta`. These must be handled before the epic completion call. Skills must handle the three completion variants (slice, quest, epic) with distinct payload construction.

## Migrated skills can't run on pre-CLI projects

Projects without `project.json` (predating the CLI) can't use migrated skills — the CLI returns `DATA_NO_PROJECT`. A `migrate` command or init-from-existing feature is needed for adoption of these tools on existing projects.
