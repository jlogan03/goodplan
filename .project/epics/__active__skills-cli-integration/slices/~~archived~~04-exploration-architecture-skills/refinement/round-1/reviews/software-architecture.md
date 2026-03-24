## Issues

**[CRITICAL]** `start-epic` maps to `epic:activate` but the lifecycle stages are fundamentally incompatible

The old `start-epic` skill reviews an architecture proposal and renames the epic directory to `__active__` -- this happens early in the lifecycle (after exploration/architecture-proposal, before slices). The CLI's `epic:activate` command requires `slices-refined` status (confirmed in `src/core/state/transitions/epic-lifecycle.ts` line 28: `guardEpicStatus(... "slices-refined", "ACTIVATE_EPIC")`). This is the LAST pre-terminal transition, not an early-lifecycle one.

The plan says: "start-epic uses a single mutation (epic:activate)" and tasks include "Replace state.md/activity-log.jsonl writes -- CLI handles via epic:activate". But the old skill's workflow (proposal review + approval + directory creation + rename) maps to none of the CLI's atomic transitions. Specifically:

1. The old "activate" concept (apply `__active__` prefix) is a pre-CLI convention that no longer exists -- the CLI uses `project.json.activeEpic` set by `ACTIVATE_EPIC` at `slices-refined` stage.
2. The proposal review + `approved.md` + architecture directory creation work the old skill does has no CLI equivalent -- the CLI lifecycle expects this to happen through `epic:define-architecture` / `submit-architecture` / `epic:refine-architecture` / `submit-refine-architecture`.
3. The old skill's "active epic check" (only one `__active__` dir) is now enforced by the `ACTIVATE_EPIC` guard (`project.activeEpic == null`), but at the wrong lifecycle point.

The plan needs to fundamentally rethink what `start-epic` becomes post-migration. Options:
- **Retire start-epic entirely** -- its responsibilities are now split across multiple CLI lifecycle commands (`epic:define-architecture`, `submit-architecture`, etc.) that other skills already handle.
- **Redefine start-epic** as the skill that calls `epic:activate` at the correct lifecycle point (after `slices-refined`), which is a very different workflow from what it does today (no proposal review, no directory creation -- just verification check and activation).
- **Rename and redefine** to make the skill's new purpose clear.

Resolution: USER_INPUT

---

**[IMPORTANT]** `explore` skill currently supports multiple scopes (project, epic, slice, quest) but CLI commands are epic-only

The old `explore/SKILL.md` has detailed scope resolution logic: project-level, epic, slice, and quest scopes with different directory paths and behaviors. The plan's Phase 2 tasks say to "Replace state.md scope resolution with `goodplan status --json`" and use `epic:explore --epic <name>`. But `epic:explore`, `start-explore`, and `submit-explore` all require `--epic` -- they are epic-scoped only.

The plan doesn't address what happens to project-level, slice-level, and quest-level exploration. The transition table only has `BEGIN_EXPLORE` and `COMPLETE_EXPLORE` for epics. Either:
- The skill must preserve direct filesystem handling for non-epic scopes (research/brainstorm writing without state transitions), or
- Non-epic exploration should be handled differently (e.g., exploration at slice/quest level was always informal and didn't need state transitions).

The plan should explicitly document which scopes use CLI commands and which retain direct filesystem writes, and provide tasks for handling the non-epic paths.

Resolution: CODEBASE_EXPLORATION
Research: Check whether the old explore skill's non-epic scopes (project, slice, quest) trigger any state transitions that the CLI needs to handle, or if they're purely filesystem operations. Grep `skills/explore/SKILL.md` and `skills/explore/references/explore-logic.md` for scope-specific state.md writes and activity-log appends.

---

**[IMPORTANT]** `explore-logic.md` reference file uses `__active__` prefix paths that need updating

The reference file `skills/explore/references/explore-logic.md` has a Scope Path Mapping table with paths like `.project/epics/__active__<name>/research/`. Per the slice 03 learning ("__active__ prefix is a pre-CLI skill convention -- CLI paths don't use it"), these paths must change. The plan's Phase 2 tasks say "Update reference files for both skills if they contain eliminated patterns" but doesn't call out the `__active__` prefix specifically, which is easy to miss since it's not caught by the `state.md|activity-log.jsonl` grep patterns.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `create-architecture` reference files have extensive graceful-stop state.md logic that needs rethinking

`skills/create-architecture/references/guidance.md` contains 6 graceful-stop scenarios (a-f), each with different `state.md` and `activity-log.jsonl` behavior. The plan says "Replace graceful stop state.md writes -- CLI handles state, stops just leave artifacts in place." But this oversimplifies:

- The old graceful stops wrote different `state.md` "Current Phase" strings depending on how far the skill got (no files written, conventions only, architecture files written, maturity table, invariants, fitness functions). This gave useful resume context.
- In the CLI model, `epic:define-architecture` transitions to `defining-architecture` at the start. If the skill is interrupted, re-running it would get `STATE_INVALID_TRANSITION` because the epic is already in `defining-architecture`. The plan mentions idempotent re-entry but doesn't provide explicit tasks for handling the 6 graceful-stop scenarios in the new model.

The plan should add a task to design the re-entry detection logic: check `epic:show --json` for status `defining-architecture` to detect resume, and determine what intermediate state to surface to the user.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `audit-architecture` plan uses `goodplan state --json --query` for activity-log but misses scope-filtered queries

Phase 1 says: "Replace activity-log.jsonl reads with `goodplan state --json --query '.["activity-log.jsonl"] | .[-20:]'`". The old skill reads the last 20 entries for context on recent work. However, the old skill was scoped to a specific epic/project. The replacement query gets the last 20 entries globally, not filtered by the epic being audited.

A scope-filtered query would be: `'[.["activity-log.jsonl"][] | select(.scope | startswith("epics/<name>"))] | .[-20:]'`. The plan should specify scope-filtered activity queries or explicitly note that global recent activity is the intended behavior.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 smoke test sequence doesn't match `start-epic` activation prerequisites

The Phase 4 smoke test (steps 1-9) exercises: init -> create -> explore -> submit-explore -> define-architecture -> submit-architecture -> refine-architecture -> submit-refine-architecture -> activate. But `epic:activate` requires `slices-refined` status (not `architecture-refined`). The smoke test is missing: `epic:define-slices`, `submit-slices`, and optionally `epic:refine-slices` / `submit-refine-slices` between steps 8 and 9.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan says `start-*` commands "always output JSON -- no `--json` flag needed" but this should be verified

Phase 2 tasks note that `start-*` commands always output JSON. The convention doc confirms `start-*` are read-only context bundles. However, for consistency and defensive coding, the plan should note whether `--json` is harmless (silently accepted) or actively rejected on `start-*` commands. Slice 03 may have established a pattern here.

Resolution: CODEBASE_EXPLORATION
Research: Check `src/commands/` for `start-explore.ts` or similar `start-*` command files to verify whether `--json` is accepted. Check if the convention doc or slice 03 learnings document this.

---

**[MINOR]** Missing task to update `explore-logic.md` templates for CLI model

The `explore-complete.md` and `explore-skipped.md` templates in `explore-logic.md` include a `## Scope` section using the old scope format. The plan has a task "Update reference files for both skills if they contain eliminated patterns" but should explicitly call out template updates since templates are easy to overlook and drive downstream content format.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `decision:create` usage in explore skill not fully specified

Phase 2 says "Replace `mkdir -p .project/decisions/` with `decision:create --json`". But `decision:create` takes a structured stdin payload (`{id, domain, title, summary}`). The plan doesn't specify how the explore skill constructs this payload from the interactive decision-recording flow. The old skill used a `decisions-format.md` reference. The plan should note that the payload construction follows the same format but is piped to the CLI instead of written directly.

Resolution: DIRECTLY_ACTIONABLE

## Score: 4/10

The fundamental `start-epic` / `epic:activate` mapping mismatch is a plan-breaking issue that would cause the implementation to fail or produce a skill that doesn't match its stated purpose. The `explore` multi-scope gap is also significant. The remaining issues are important but addressable with targeted task additions. To reach 9+: resolve the `start-epic` identity crisis (user decision needed), clarify explore's multi-scope story, add re-entry detection tasks for create-architecture, fix the smoke test sequence, and address the reference file update gaps.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
