# Slice Sequencing

## Rationale
Rename-first ordering eliminates cascading rework — all subsequent slices use the new names (`gp`, `.goodplan/`, `goodplan.json`) from the start. HMAC before hooks gives a complete state protection story to test against. Skill packaging and CI are deferred until all layers are in place, so the plugin is assembled once with everything ready.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | rename-gp | Rename binary to `gp`, `.project/` to `.goodplan/`, `project.json` to `goodplan.json`, update all skill/doc references | None | Most disruptive change first — eliminates rework in all subsequent slices |
| 02 | plugin-scaffold | Create plugin directory structure, manifest, `build:plugin` script, marketplace manifest | 01-rename-gp | Foundation for the plugin, uses new `gp` name |
| 03 | hmac-signatures | Implement embedded `stateSignature` in `goodplan.json` — signing, verification, bootstrap, `gp verify`, `gp verify --fix` | 01-rename-gp | Most novel piece — front-load risk. Independent of plugin structure. |
| 04 | state-protection-hooks | Implement `protect-state.sh` and `warn-bash-state.sh` with `hooks.json` | 02-plugin-scaffold | Hooks live in the plugin structure. Can reference HMAC in error messages. |
| 05 | next-commands | Implement `commandMetadata` registry, `computeNextCommands()`, Commands layer integration | 01-rename-gp | Independent CLI enhancement. Builds on stable `gp` binary. |
| 06 | skill-packaging | Copy skills into plugin, verify `/gp:` namespace loading, handle namespacing bug fallback | 02-plugin-scaffold, 01-rename-gp | Skills already use `gp` names. Package once with all layers ready. |
| 07 | ci-distribution | GitHub Actions workflow: build, smoke test, validate, publish to release branch | 02-plugin-scaffold, 03-hmac-signatures, 04-state-protection-hooks, 06-skill-packaging | Assembles and ships everything. Must come last. |
