# Learnings — 05-next-commands

## Transition table derivation keying: use `fromStatus` not `toStatus`
_Source: 05-next-commands_

The plan specified keying `commandMappings` by `(entityType, toStatus)` — i.e., "after transitioning TO this status, what commands are available?" The correct semantics is `fromStatus` — "when the entity IS IN this status, what commands can be invoked?" These are equivalent for most transitions (the command available FROM `created` maps to a transition whose FROM is `created`), but the naming confused reviewers and the implementation agent. Future plans should be precise about which status dimension is the lookup key.

## Always run `tsc --noEmit` alongside `bun run test`
_Source: 05-next-commands_

Bun transpiles without type-checking, so `bun run test` passes even when TypeScript has compilation errors. Phase 2 introduced 5 `tsc` errors (missing `nextCommands` on helper return types) that went undetected until code review. Future implementation phases should run `tsc --noEmit` as a mandatory verification step — not just `bun run test`. This is especially important when adding required fields to existing types, since the transpiler won't catch the incomplete spread pattern.

## Transition tables with wildcard `from` values need documented expansion rules
_Source: 05-next-commands_

The state machine's transition tables use wildcard `from` values (`*(non-terminal)`, `*(pre-activated)`, `*(terminal)`) that require expansion before any derivation logic can use them. The expansion rules are implicit in the handler code (e.g., `PRE_ACTIVATED_STATUSES` in `epic-verify.ts`). Future work that derives from transition tables should document the expansion algorithm explicitly, including: which Zod status schema provides the full set, which sets to import, and how `(same)` and `(error)` sentinel `to` values are handled.

## Decision and task-lifecycle transition tables were implicit — now declarative
_Source: 05-next-commands_

Before this slice, `decision.ts` and `task-lifecycle.ts` validated transitions via imperative guards but did not export declarative `ReadonlyArray<{from, event, to}>` tables like other entity types. This gap blocked the derivation approach. Adding the exports was straightforward (6 entries for decisions, 2 for tasks) and brings all entity types to a consistent declarative format. Future features that need to reason about valid transitions across entity types can now import from a single pattern.
