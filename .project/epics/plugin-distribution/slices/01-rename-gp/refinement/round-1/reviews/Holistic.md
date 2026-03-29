# Holistic Review — Rename to gp

## Issues

**[CRITICAL]** Plan omits `project.json` to `goodplan.json` rename required by the slice goal and epic architecture

The slice goal (line 3) explicitly states: "the root state file from `project.json` to `goodplan.json`". The epic architecture (`cli-changes-api.md`) references `goodplan.json` throughout (e.g., "embed the signature in `goodplan.json`", "the `stateSignature` field is embedded directly in `goodplan.json`"). Yet the plan overview says "Keep `project.json`" and no task in either phase addresses this rename. This is a direct contradiction of the confirmed goal, which says: "state dir is `.goodplan/`" — and the goal.md further specifies "All CLI commands read/write `.goodplan/goodplan.json` instead of `.project/project.json`".

This rename touches ~29 source files that reference `project.json` (state machine transitions, RPC layer, data layer, commands, context), plus test assertions and fixture files. It is a significant body of work that cannot be omitted.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Plan omits `__GOODPLAN_VERSION__` to `__GP_VERSION__` rename required by the slice goal and epic architecture

The slice goal (line 13) says: "`__GOODPLAN_VERSION__` renamed to `__GP_VERSION__` in build define and source". The epic architecture (`cli-changes-api.md` line 11) explicitly lists this rename across `src/version.ts`, `vitest.config.ts`, `tests/global-setup.ts`, and `package.json`. The slice's own research audit (`rename-scope-audit.md`) documents the exact changes needed.

Yet the plan overview says "Keep `__GOODPLAN_VERSION__`" and Phase 1 tasks explicitly say "no change needed" for `vitest.config.ts` and `tests/global-setup.ts`. The plan contradicts the goal, the architecture, and its own research. Affected files:
- `src/version.ts` — `declare const __GOODPLAN_VERSION__` and all references
- `package.json` — `--define __GOODPLAN_VERSION__` in build script
- `vitest.config.ts` — `__GOODPLAN_VERSION__` in define block
- `tests/global-setup.ts` — `__GOODPLAN_VERSION__` in build command
- `scripts/install-skills.sh` — `__GOODPLAN_VERSION__` in build command

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan does not address `GOODPLAN_DIR` env var rename or explicitly justify keeping it

The plan overview says "Keep `GOODPLAN_DIR` as-is to minimize scope", but the slice goal does not mention keeping it. `GOODPLAN_DIR` is referenced in `src/core/data/project.ts` (the walk-up logic), `tests/integration/helpers.ts` (two places), and multiple test files. Since the state directory is changing from `.project/` to `.goodplan/`, the env var semantics are changing (it now points to a `.goodplan/` directory), but the name `GOODPLAN_DIR` still makes sense as a product-name reference.

The plan should explicitly state why `GOODPLAN_DIR` is kept (it's a product name reference, not a directory name reference) rather than just asserting it without justification, since the slice goal's scope boundary section says the env var name is in scope.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan does not address `__goodplan_force` and `__goodplan_verbose` globalThis property renames

`src/index.ts` sets `(globalThis).__goodplan_force = true`, read in `src/core/data/commit.ts`. `src/util/debug.ts` reads `(globalThis).__goodplan_verbose`. The plan says to update "all remaining src/ files with `.project/` in string literals" but does not mention these `goodplan`-prefixed globalThis properties. These are internal implementation details using the product name, so keeping them may be intentional — but the plan should explicitly state whether these are renamed or kept, rather than leaving ambiguity.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 Expected Behavior "before" checks are not falsifiable as written

The "before" check `bun run build && ./gp --version` says "fails: no `gp` binary exists" but doesn't specify the expected failure (e.g., "returns `zsh: no such file or directory: ./gp`"). More importantly, the second before check `./goodplan init --name test --json` assumes the binary is already built as `goodplan` — but there's no build step before it. If the implementer just ran `bun run build` from the first check, the binary is named `goodplan`, so this works. But the check should be explicit about prerequisites.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 Expected Behavior grep patterns are fragile and may produce false positives/negatives

The Phase 2 "before" grep `grep -rl 'goodplan ' skills/` with exclusion patterns is complex and brittle. The exclusion list (`goodplan workflow`, `goodplan project`, `goodplan-managed`, etc.) attempts to filter prose references but will miss new prose patterns and may incorrectly exclude real CLI invocations like `goodplan quest:create`. The "after" check uses the same fragile pattern. A more robust approach: grep for `goodplan ` followed by a colon-containing word (CLI command pattern like `goodplan epic:create`) or known subcommands.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 does not verify that `bun run test` still passes after documentation changes

Phase 1 includes test verification, but Phase 2 modifies `CLAUDE.md`, `.gitignore`, `biome.json`, and `scripts/install-skills.sh` — some of which affect the build pipeline. The phase should include `bun run test` and `bun run check` (biome) as verification steps.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not address `GoodplanError` class name or error code prefixes

Error codes like `VALIDATION_UNKNOWN_COMMAND`, `DATA_NO_PROJECT`, and the class name `GoodplanError` use the product name "goodplan". The plan says it's renaming CLI invocations but doesn't clarify whether internal identifiers like these are in scope. The goal says "no backward compatibility" so presumably these could change, but since they're internal, keeping them is reasonable. The plan should state the decision explicitly.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture directory rename task says "use `git mv`" but doesn't account for nested content

There are 8 fixture directories with `.project/` subdirectories. The plan says to rename them with `git mv`, which is correct, but doesn't mention that `tests/integration/helpers.ts` constructs `GOODPLAN_DIR: path.join(tmpDir, ".project")` — this is mentioned separately, which is good. However, the `withTempDir` function (line 154) also sets `GOODPLAN_DIR: path.join(tmpDir, ".project")` and is not explicitly called out as a separate change location.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan does not mention the version compatibility error message referencing "goodplan"

`src/index.ts` line 119: `"Project data requires goodplan >= ${project.version} but this is ${VERSION}. Upgrade the CLI."` — this is a user-facing error message using the product name. The plan's "all remaining src/ files" task would catch this, but it's a user-facing string that deserves explicit mention.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The plan has two critical omissions that directly contradict the confirmed goal: the `project.json` to `goodplan.json` rename (touching ~29 source files) and the `__GOODPLAN_VERSION__` to `__GP_VERSION__` rename (touching 5 files). These are not edge cases — they are explicitly stated in the slice goal, the epic architecture, and the plan's own research audit. Without these, the plan achieves roughly 60% of the stated goal. To reach 9+: add the two missing rename scopes as explicit task groups, clarify the keep/rename decision for `GOODPLAN_DIR` and internal identifiers, and tighten the verification grep patterns.

## Summary
- Critical: 2
- Important: 4
- Minor: 4
