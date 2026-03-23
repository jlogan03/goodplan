# Phase 4: Universal --query & Schema Command

Lift `--query` from status-only to all JSON-outputting commands via the shared `output()` function. Create schema command for stdin introspection (INV-006). Full E2E verification and binary regression.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts epic:list --json --query '.items[0].name' 2>&1` — error or `--query` flag not recognized on epic:list

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts epic:list --json --query '.items[0].name'` — returns just the name string
- [ ] `bun run src/index.ts status --query '.project.name'` (without `--json`) — `--query` auto-implies `--json`, returns project name
- [ ] `bun run src/index.ts schema --json` — returns command hierarchy
- [ ] Binary: `bun run build && ./goodplan decision:create --json` (with piped input) works

### Tasks

- [ ] Move `applyQuery` from `src/commands/global/status.ts` to `src/util/query.ts` (or `src/util/output.ts`). Export for use by shared output function.
- [ ] Add `--query` to `globalArgs` in `src/commands/global-args.ts` as an optional string flag.
- [ ] Integrate `--query` into the shared `output()` function in `src/util/output.ts`: if `args.query` is set, auto-set json mode, apply jq expression to the data, output the result. Handle errors: invalid expression → `VALIDATION_INVALID_QUERY` error, empty result → output `null`.
- [ ] Remove status-specific `--query` handling from `src/commands/global/status.ts` (now handled by shared output). Verify status `--query` still works via the shared path.
- [ ] Create `src/commands/global/schema.ts`: optional `--command` flag. Without `--command`: return `{ commands: [{ name, description, args }] }` by introspecting citty command definitions registered in main.ts. With `--command <name>`: return that command's detail including stdin schema (if any). Build a stdin schema registry mapping command names to their Zod schemas — derive JSON Schema from the actual Zod schema objects using `z.toJsonSchema()` (Zod v4 built-in) or manual projection. This satisfies INV-006: schema output reflects actual command signatures.
- [ ] Register schema command in `src/commands/main.ts`.
- [ ] Write tests: `--query` on `epic:list`, `decision:list`, `status`. Schema command: full hierarchy returns all registered commands, per-command detail includes stdin schema for commands that accept stdin (e.g., `slice:complete`), commands without stdin return no schema. `--query` auto-implies `--json` (verify `status --query '.project.name'` works without explicit `--json`).
- [ ] Run full test suite: `bun test` — all tests pass. `npx tsc --noEmit` — clean.
- [ ] E2E walkthrough in temp dir (use `bun run src/index.ts`):
  1. `init --name test-project`
  2. Create and activate epic
  3. Create slice, walk through plan → submit → refine → submit → implement → submit → complete (with learnings including `rollupTo:["project"]`)
  4. `decision:create` with 2 decisions, `decision:update` one to superseded
  5. `learning:rollup --from slices/01-auth --to project` — verify project `learnings.jsonl`
  6. `status --json` — verify all artifact counts, active pointers, recommendations
  7. `epic:list --json --query '.items[0].name'` — verify `--query` on non-status command
  8. `status --query '.project.name'` (without `--json`) — verify auto-implies
  9. `schema --json` — verify command hierarchy
  10. `schema --command slice:complete --json` — verify stdin schema includes verificationPassed, learnings, etc.
  11. Quest lifecycle: create → plan → complete with learnings
  12. Verify `activity-log.jsonl` has entries for all transitions
- [ ] Binary regression: `bun run build` → test `decision:create`, `status`, `schema`, `--query` against compiled binary
- [ ] Update `.project/conventions.md` repo structure: add `src/commands/decision/`, `src/commands/learning/`, `src/schemas/commands/decision.ts`, `src/util/query.ts`

### Verification
1. Full E2E walkthrough covering all success criteria from goal.md.
2. `bun test` — all tests pass. `npx tsc --noEmit` — clean.
3. Binary regression — compiled binary handles decision + status + schema + --query.
4. `--query` verified on 3+ different commands.
5. Schema command returns accurate stdin schemas derived from actual Zod definitions (INV-006).
