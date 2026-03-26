# Generalist Review — Phase 2: CLI Commands

**Score: 9/10 | Critical: 0, Important: 1, Minor: 2**

---

## Summary

Phase 2 is well-executed. All 5 task commands are implemented, registered in `main.ts`, and covered by both the parallel registry (`schema.ts`) and fitness tests (`stateless-commands.test.ts`). Pattern consistency with existing commands (quest/slice) is high. Tests cover the full lifecycle including error cases. Status integration is complete with `openTasks`/`totalTasks` in both `countArtifacts()` and `artifactsSchema`.

---

## Issues

### Important

**1. `status.test.ts` has no assertions for `openTasks`/`totalTasks`**

The `status.ts` changes add `openTasks` and `totalTasks` to `countArtifacts()` and `artifactsSchema`, but `status.test.ts` has zero assertions exercising these new fields. The `task-commands.test.ts` tests verify counts via `reduce()` directly on the state tree (not via `buildStatusResult()`), so the `buildStatusResult()` path for task counting is untested. If `countArtifacts()` had a regression in the task-counting logic, no test would catch it.

The plan's task list says: "status includes task counts" — `task-commands.test.ts` covers this at the state layer but not at the command layer. The `createPopulatedProject()` helper in `status.test.ts` doesn't include a `tasks/overview.json`, so existing tests pass with zeros.

**Recommendation**: Add a test in `status.test.ts` that writes a `tasks/overview.json` with mixed statuses and asserts `result.artifacts.openTasks` and `result.artifacts.totalTasks` from `buildStatusResult()`. Also verify `formatStatusHuman()` shows the Tasks section when `openTasks > 0`.

---

### Minor

**2. `task:show` classified as read-only but does NOT require `--task` flag check in `stateless-commands.test.ts` — correct, but potentially confusing**

`task:show` is in `READ_ONLY_COMMANDS` set, which skips entity-identifying flag enforcement. It does have `required: true` on the `--task` arg in both the command definition and the registry — so it's correctly enforced by citty at runtime. There's no actual bug here, but it's worth noting the fitness test exempts it rather than treating it like `task:drop`/`task:convert` (which pass via `ENTITY_ARGS`). This is consistent with how `epic:show`, `quest:show`, etc. are handled — they're all in `READ_ONLY_COMMANDS`. No action needed, just noting the pattern is correct.

**3. `task:list` human output: when filter is "open" and `items.length > 0`, the summary line `"N open tasks (use --all...)"` appears even when showing all open tasks (i.e., all tasks are open)**

Line 60-63 in `list.ts`:
```ts
if (filter === "open" && allItems.length > items.length) {
```

This only shows the summary line when there are more total items than filtered items — which is correct. No actual bug. Minor note: the condition is right.

However, the empty-state message at line 47-49:
```ts
if (filter === "open" && allItems.length > 0) {
    output(`No open tasks (use --all to show all ${allItems.length})`, args);
```

This is good UX. No issue.

**4. `convert.ts` human output `Created ${args.to}: ${convertedName}` uses `args.name ?? args.task` for `convertedName`**

This is correct — the handler also uses `cvp.name ?? target.name` (task name as fallback). The human output accurately reflects what was created. However, the plan specified `"Created quest: <quest-name>"` (hardcoded "quest"), while the code correctly uses `args.to` which is more generic and handles both quest and epic. This is an improvement over the plan spec.

---

## Positive Observations

- All 5 commands follow the established `defineCommand` / `begin()` / `output()` pattern exactly.
- `task:list` with `--all` flag mirrors `slice:list`'s `epic` arg pattern as specified.
- JSON output shape matches the plan's Expected Behavior section: `{ items, filter }` for list, full task entity for show, standard `BeginResult` for mutations.
- `stateless-commands.test.ts` correctly adds `"task"` to `ENTITY_ARGS`, `"task:list"` and `"task:show"` to `READ_ONLY_COMMANDS`, and `"task:create"` to `STDIN_ENTITY_COMMANDS`.
- Command registry drift detection (`schema.test.ts`) will catch any future desync between `main.ts` and `schema.ts`.
- `task-commands.test.ts` uses `reduce()` directly as specified, covers all required cycles including error cases (duplicate name, invalid transitions on terminal states).
- Conditional spread pattern for optional fields in `create.ts` (`...(input.description ? {...} : {})`) correctly handles `exactOptionalPropertyTypes`.
- `migrate` is excluded from `stdinSchemaRegistry` drift-detection list (`schema.test.ts` line 224 includes it in `stdinCommands`) — `task:create` is correctly added.
