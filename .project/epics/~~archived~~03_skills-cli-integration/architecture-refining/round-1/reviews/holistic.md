# Holistic Architecture Review

## Issues

### IMPORTANT: `CREATE_QUEST` event missing `goal` field in state-machine-api.md
- **Severity:** IMPORTANT
- **Resolution:** Fix in state-machine-api.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/state-machine-api.md`

`CREATE_EPIC` carries `{ type: 'CREATE_EPIC'; name: string; goal: string; ts: string }` but `CREATE_QUEST` carries only `{ type: 'CREATE_QUEST'; name: string; ts: string }` -- no `goal` field. Yet `quest.json` in data-model.md has a `goal` field, and commands-api.md shows `quest:create` accepting `{"name": "fix-logging", "goal": "..."}` via stdin. The goal must reach the state machine event to populate `quest.json`.

### IMPORTANT: `COMPLETE_QUEST` uses `Learning[]` and `ArchitectureDelta[]` but `COMPLETE_SLICE` uses `LearningInput[]` and `ArchitectureDeltaInput[]`
- **Severity:** IMPORTANT
- **Resolution:** Fix in state-machine-api.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/state-machine-api.md`

Line 60 has `COMPLETE_SLICE` using `LearningInput[]` and `ArchitectureDeltaInput[]`, while line 70 has `COMPLETE_QUEST` using `Learning[]` and `ArchitectureDelta[]`. The `LearningInput` type is never defined in state-machine-api.md (only `Learning` is defined in rpc-layer-api.md). The `ArchitectureDeltaInput` type is similarly undefined. These should be consistent -- either both use the same type names, or the `Input` variants need to be defined.

### IMPORTANT: `show` command flag inconsistency between cli-interaction-conventions.md and commands-api.md
- **Severity:** IMPORTANT
- **Resolution:** Fix in cli-interaction-conventions.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md`

cli-interaction-conventions.md uses `--name` flag: `goodplan slice:show --name my-slice --json` and `goodplan epic:show --name X --json`. commands-api.md uses entity-specific flags: `goodplan epic:show --epic <name>` and `goodplan slice:show --slice <name>`. The commands-api.md convention (entity-specific flags per INV-004) is the correct one per the entity-namespaced-commands decision.

### IMPORTANT: `rollup` target type not in Target union in rpc-layer-api.md
- **Severity:** IMPORTANT
- **Resolution:** Fix in rpc-layer-api.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/rpc-layer-api.md`

The `begin` mapping comment shows `begin('rollup', {type:'rollup'})` but the `Target` type union only has `epic`, `slice`, `quest`, and `decision` variants -- no `rollup` variant. The learning from slice 06 ("Non-entity RPC operations need dedicated return types") explicitly flagged this. Either add a rollup target type or document that `learning:rollup` uses a different RPC function signature.

### IMPORTANT: `goodplan migrate` command referenced in cli-changes.md but absent from commands-api.md
- **Severity:** IMPORTANT
- **Resolution:** Add to commands-api.md or mark as future
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/cli-changes.md`

cli-changes.md section 5 describes `goodplan migrate` for major version schema migrations, but commands-api.md does not list it under Global Commands. Either add the command to the commands surface or explicitly mark it as out of scope for this epic.

### MINOR: `goodplan state` command in cli-changes.md not in commands-api.md
- **Severity:** MINOR
- **Resolution:** Add to commands-api.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/cli-changes.md`

cli-changes.md defines `goodplan state --json --query` as "the single most important addition" and cli-interaction-conventions.md references it extensively. However, commands-api.md does not list `state` under Global Commands (only `status`, `init`, `schema`). The `state` command needs to appear in commands-api.md with its flags (`--query`, `--offset`, `--limit`).

### MINOR: `show` artifacts field in cli-changes.md references `goal.md` but data-model.md says goals are in entity JSON
- **Severity:** MINOR
- **Resolution:** Fix in cli-changes.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/cli-changes.md`

cli-changes.md section 2 shows `artifacts: { goal: boolean }` checking for `goal.md` existence, but data-model.md explicitly states "Goals are stored as string fields within entity JSON files, not as separate goal.md markdown files." The artifacts field should check for the goal string in entity JSON, not for a `goal.md` file.

### MINOR: `activity:list` shown as "not yet implemented" in commands-api.md but superseded by `goodplan state --query`
- **Severity:** MINOR
- **Resolution:** Clarify in commands-api.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/commands-api.md`

commands-api.md line 124 shows `activity:list` as "not yet implemented." cli-changes.md explicitly says `goodplan state --json --query '.["activity-log.jsonl"]'` replaces `activity:list`. The architecture should either remove `activity:list` or note it's superseded by `state --query`.

### MINOR: `cli-interaction-conventions.md` references `submit-plan` with content payload but rpc-layer-api.md says plan submit is content-free
- **Severity:** MINOR
- **Resolution:** Fix in cli-interaction-conventions.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md`

cli-interaction-conventions.md line 140 shows `echo '{"plan":"..."}' | goodplan submit-plan --slice my-slice --json`. But rpc-layer-api.md's SubmitInput union specifies `{ phase: 'plan' }` with no content -- the sub-agent writes plan content directly to the filesystem. The example should show an empty stdin or no piped content.

### MINOR: Quests lack `architecture-deltas.jsonl` in the quest directory but the transition table references architecture deltas on COMPLETE_QUEST
- **Severity:** MINOR
- **Resolution:** Verify in data-model.md
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/data-model.md`

data-model.md's directory structure shows `architecture-deltas.jsonl` under quests (line 437), which is good. But the state key dependencies table in state-machine-api.md for `COMPLETE_QUEST` writes to `quests/<name>/architecture-deltas.jsonl` -- this is consistent. No issue on closer inspection; this is correct.

### MINOR: RPC Layer fitness functions are thin relative to its responsibility
- **Severity:** MINOR
- **Resolution:** Consider adding
- **File:** `/Users/iwhite/Repos/goodplan/.project/epics/__active__skills-cli-integration/architecture/rpc-layer-api.md`

The RPC Layer has only 2 candidate fitness functions while owning significant orchestration logic (context bundling, implicit transition detection, completion flow ordering). The promote-to-developing decision notes "RPC Layer should get direct fitness functions before promotion to Maturing." Consider adding fitness functions for: implicit transition detection correctness, completion flow ordering enforcement, and error propagation fidelity.

## Score: 8/10

The architecture is well-structured, comprehensive, and clearly serves the confirmed goal. The 4-layer model is coherent across all 12 files, invariants are well-defined, and fitness functions are identified for key subsystems. All 16 decisions are respected. The issues preventing a 9+ are the cross-file inconsistencies: the `CREATE_QUEST` missing `goal`, the `LearningInput`/`ArchitectureDeltaInput` type confusion, the `rollup` target type gap, the `show` flag naming mismatch, and the `state` command omission from commands-api.md. These are all straightforward to fix. Once the IMPORTANT issues are resolved (especially the type and flag inconsistencies), this reaches 9.

## Summary
- Critical: 0
- Important: 5
- Minor: 5
