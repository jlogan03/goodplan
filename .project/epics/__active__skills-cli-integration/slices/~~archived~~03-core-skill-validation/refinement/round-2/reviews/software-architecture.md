## Issues

**[IMPORTANT]** Plan references `slice:show --json` field `dir` which does not exist

Phase 2, Step 4 states: "derive `<slice-dir>` from `slice:show --json` field `dir`". Codebase inspection confirms `slice:show --json` returns `{ ...slice, artifacts }` where `slice` is `{ name, epic, status, goal, deferred, refinement, created, updated }` (see `/Users/iwhite/Repos/goodplan/src/schemas/entities/slice.ts`). There is no `dir` field. The `paths` Record is only returned by mutation commands (via `resolvePathReferences` in the RPC layer), not read-only `show` commands.

The skill must derive the slice directory path from known conventions: `.project/epics/__active__<epic>/slices/<slice>/` using the `epic` and `name` fields from `slice:show --json`. Alternatively, use `goodplan state --json --query '.slices["<name>"]'` to access the tree, though this also doesn't return an absolute path.

Fix: Replace `slice:show --json` field `dir` references with path construction from `slice:show --json` fields `epic` and `name`, using the deterministic directory convention. Document this path derivation explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `status --json` artifacts shape differs from what the plan implies

Phase 2, Step 2 correctly notes "artifacts are `{ count: number, files: string[] }` objects — use `.count` for existence checks." However, this refers to `status --json` artifacts (architecture, research, brainstorm, prototypes as `{ count, files }`, decisions and learnings as plain numbers per `/Users/iwhite/Repos/goodplan/src/schemas/commands/status.ts`). The plan also references `slice:show --json` artifacts in Step 3 for "artifact loading" — but `slice:show` artifacts have a completely different shape: `{ goal: boolean, exploreComplete: boolean, plan: boolean, planRefined: boolean, implementation: boolean, abandoned: boolean }` (boolean flags, not count/files objects, per `/Users/iwhite/Repos/goodplan/src/core/artifacts.ts`).

The plan should be explicit about which artifacts object it means in each step. Step 2's note about `{ count, files }` applies only to `status --json`, not to `slice:show --json` which returns boolean artifact flags.

Fix: Clarify in Step 2 that the `{ count: number, files: string[] }` note applies to `status --json` artifacts, and that `slice:show --json` artifacts are boolean flags. Update Step 3 references to `slice:show --json` artifacts to use the correct boolean shape.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `init` command response shape not accurately described

Phase 1, Step 2 (Mode A flow) says `goodplan init --name <name> --json` "creates `.project/`, `project.json`, all directories" — the init does create the project tree, but the plan should note the response shape is `{ name, version, projectDir }` (per `/Users/iwhite/Repos/goodplan/src/core/rpc/init.ts`), not a mutation response with `paths`. The plan's instruction to "Write `idea.md` to `.project/idea.md` (LLM-owned markdown, path is deterministic after init)" is correct since the path is deterministic, but the plan implies a richer response by grouping it with mutation commands that do return `paths`.

Fix: Add a parenthetical note that `init` returns `{ name, version, projectDir }` (not `paths`), and that `idea.md` path is derived from the deterministic convention rather than from the response.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 end-to-end smoke test scope is underspecified for architecture verification

Phase 3's end-to-end smoke test task says "run `goodplan init`, `epic:create`, create a slice, advance through implementation, then invoke the migrated `/complete` skill." This tests the happy path but doesn't verify the architectural boundary that is the core goal of this slice: that no direct structured-state access remains. The grep checks cover static analysis, but the smoke test should also verify that the `decision:create` flow works (Step 6 in `complete`), since that's a new CLI interaction pattern being introduced.

Fix: Add explicit mention that the smoke test should include a `decision:create` call to validate the new interaction pattern, not just the completion flow.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Convention doc update target may cause confusion between two files

Phase 3 says "Add Migration Patterns section to convention doc (`skills/_shared/references/cli-interaction.md`)" but also has a separate task to "Fix convention doc worked example" in the epic-specific `cli-interaction-conventions.md`. The plan should clarify that the worked example fix targets the epic architecture doc at `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` (which still references the non-existent `start-complete` command at line 206), while the Migration Patterns section goes into the shared reference at `skills/_shared/references/cli-interaction.md`.

Fix: Add explicit file paths to both tasks to prevent the implementer from confusing the two convention documents.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan demonstrates strong architectural understanding: correctly identifying the layering boundary (skills as CLI consumers, not state owners), using filesystem-backed accumulation for multi-step flows, and correctly noting that `start-complete` doesn't exist. The three-phase structure is well-sequenced. The two IMPORTANT issues are the most significant — referencing a non-existent `dir` field on `slice:show` and conflating two different artifacts shapes could lead to implementation errors. Fixing those and the three MINOR items would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
