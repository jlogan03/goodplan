# Slice Sequencing

## Rationale

Tracer bullet first: slice 01 proves the full stack works as a compiled binary (Bun compile + citty + Zod + `--json` output) before investing in deeper layers. This validates the riskiest unknowns (Bun compilation with deps, citty colon-namespace support, jqjs in binary) immediately. Subsequent slices deepen each layer in dependency order. Slices 02 and 03 can run in parallel — they have no dependency on each other (03 depends on schemas from 01, not the data layer from 02). Slices 04 and 05 have partial parallelism — 12 of 13 slice 05 success criteria depend only on slice 02 (list/show commands); only `status` requires slice 04. Skills migration is independent and can run in parallel, though completing after slice 06 avoids rework.

## Slices

| NN | Name | Description | Dependencies | Rationale |
|----|------|-------------|--------------|-----------|
| 01 | tracer-bullet | Bun project setup, minimal Zod schemas, minimal data layer, `goodplan init` + `goodplan status --json` + jqjs smoke test as compiled binary, shared stdin infrastructure | None | Proves full stack end-to-end. Validates Bun compile, citty, Zod, jqjs integration. |
| 02 | data-layer | Full data layer: state assembly, cache, CRUD, JSONL, concurrent modification detection, debug logging (`--debug`/`GOODPLAN_DEBUG`). Owns all Zod schemas in `src/schemas/`. | 01 | All higher layers depend on complete data layer. Debug logging available from here on. |
| 03 | state-machine | Transition tables for all entity types, reducer function, guards, derived fields, entity status enums. Consumes schemas from 02, adds StateEvent/StateError types. | 01 (minimal schemas), 02 (full entity schemas) | RPC depends on state machine. Pure functions = independently testable. **Can run in parallel with 02** if schema interface is agreed upfront. |
| 04 | rpc-core | RPC layer: begin/complete/submit/startContext/status, load→reduce→commit cycle, context bundling (all 9 phase configurations), activity logging, state diff logging, dry-run mode | 02, 03 | Composes data layer + state machine. Must work before mutation commands. |
| 05 | commands-read | Read commands (list/show per entity → Data Layer direct), status (→ RPC), schema, --query via jqjs (full), --quiet mode. | 02 (list/show), 04 (status only) | List/show commands bypass RPC; unblocked after 02. Only `status` needs 04. |
| 06 | commands-mutate | Mutation commands (create/plan/complete/abandon per entity) and sub-agent commands (start-*/submit-*). Full workflow lifecycle. Consumes shared stdin infrastructure from 01. | 04, 05 | Completes the CLI surface. Full workflow exercisable. |
| 07 | skills-migrate | Copy existing skills to `skills/`, build `scripts/install-skills.sh`, set up `bun run install:skills`. | None (parallel, soft dep on 06) | Independent of CLI code. Can run anytime; completing after 06 avoids rework from command surface changes. |
| 08 | integration-test | End-to-end integration tests, fitness functions for state machine purity and data layer determinism. Full workflow tests via compiled binary. | 06 | Validates complete system. Fitness functions establish quality baseline. |
