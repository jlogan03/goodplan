## Issues

**[IMPORTANT]** Phase 1 Mode A: `goal.md` write path derived from `epic:create` response, but `epic:create` returns empty paths

Phase 1, Step 2 (Mode A flow) says: "Write `goal.md` to path from `epic:create` response." Codebase inspection confirms that `epic:create` routes through `begin('create', ...)` which calls `resolvePathReferences(projectDir, target, 'create')`. The `create` phase maps to empty paths `{}` in `resolveForBeginPhase()` (see `/Users/iwhite/Repos/goodplan/src/core/rpc/paths.ts` lines 120-129). The `epic:create` JSON response is `{ entity, phase, previousStatus, newStatus, paths: {} }` — there is no path for `goal.md`.

The skill must derive the `goal.md` path from the deterministic convention: `.project/epics/<name>/goal.md`, using the `entity` field from the `epic:create` response to construct the path. This is consistent with how the plan already handles `idea.md` ("path is a known fixed convention, not derived from the CLI response").

Mode B (Phase 1, Step 2) has the same issue: "Write `goal.md` to path from response" — same fix needed.

Fix: Replace "Write `goal.md` to path from `epic:create` response" with "Write `goal.md` to `.project/epics/<name>/goal.md` (LLM-owned markdown; path is a known fixed convention using the `entity` field from the `epic:create` response, not derived from `paths`)." Apply to both Mode A and Mode B flows.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2 Step 5 incorrectly eliminates `learning:rollup` — `slice:complete` learnings with `rollupTo` tags are handled by the state machine, but `complete` skill also rolls up learnings to `.project/learnings.md` which is an LLM-owned markdown file

The plan says Step 5 should be eliminated as a separate CLI call because "the `slice:complete` payload's `learnings` array handles rollup atomically — learnings with `rollupTo` tags are processed by the reducer." This is partially correct: the state machine does handle learnings JSONL rollup (moving entries between scope-level `learnings.jsonl` files). However, the current `complete` skill also performs a separate LLM-judgment step: synthesizing accumulated learnings into the human-readable `.project/learnings.md` file (LLM-owned markdown). This is a content authoring step, not a state machine operation.

The plan's Step 5 description is ambiguous — it says "Keep idempotency check (read `.project/learnings.md` — LLM-owned, allowed)" but also says "Eliminate as a separate CLI call." The LLM-owned markdown rollup (editing `.project/learnings.md`) is not a CLI call and should be retained as an LLM content step. The JSONL rollup via `learning:rollup` CLI command is what can be eliminated (since `slice:complete` handles it atomically).

Fix: Clarify Step 5 to explicitly distinguish: (a) JSONL learnings rollup — eliminated, handled atomically by `slice:complete` payload, and (b) LLM-owned `.project/learnings.md` synthesis — retained as a content authoring step where the skill reads accumulated learnings and edits the human-readable markdown.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Step 0 directory derivation uses `__active__` prefix but CLI creates directories without it

Step 0 says: "derive `$EPIC_DIR` from the deterministic convention `.project/epics/__active__<epic>/`". However, codebase inspection of the `CREATE_EPIC` transition handler (`/Users/iwhite/Repos/goodplan/src/core/state/transitions/epic-create.ts` line 32) shows the state machine creates `epics/<name>/epic.json` — no `__active__` prefix. The `commitState` function maps tree paths directly to filesystem paths without prefix manipulation. The `__active__` prefix is a legacy pre-CLI convention from the skills; the CLI creates `epics/<name>/` directly.

This means Step 4's derivation `.project/epics/__active__<epic>/slices/<name>/` is also incorrect — it should be `.project/epics/<epic>/slices/<name>/`.

Fix: Remove the `__active__` prefix from all derived paths. Use `.project/epics/<epic>/` (matching CLI behavior). The plan already correctly notes "CLI entity names omit the `__active__` filesystem prefix (per INV-004)" — extend this to the directory path derivation as well.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 convention doc update task references `skills/_shared/references/cli-interaction.md` but the file is 563 lines — should specify where to add the section

Phase 3 says "Add Migration Patterns section to convention doc — File: `skills/_shared/references/cli-interaction.md`" but doesn't specify where in the file the new section should go. The file is 563 lines and has an existing structure. The implementer needs guidance on whether to append at the end or insert after a specific section.

Fix: Add a note like "Append the Migration Patterns section at the end of the file, after the existing content."

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has matured well across three rounds. The core architecture is sound: clean separation between CLI-owned state (via commands) and LLM-owned markdown (direct access), filesystem-backed accumulation for multi-step flows, and correct understanding of the state machine boundary. The round 2 issues (missing `dir` field, artifacts shape confusion, `init` response shape) have all been addressed. The two IMPORTANT issues remain: the `goal.md` path derivation from empty `paths` would cause the implementer to stall, and the learnings rollup ambiguity could lead to dropping the LLM content synthesis step. Fixing all four issues would bring this to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
