# Slice 04 Learnings: Exploration & Architecture Skills Migration

## Key Learnings

### start-epic retirement was the right call — old lifecycle concepts don't survive state machine redesigns
The old start-epic skill's "activation" (proposal review + rename to `__active__`) mapped to a completely different lifecycle point than `epic:activate` (which requires `slices-refined`). Rather than forcing a mapping, retiring and redistributing responsibilities (review gate → refine-architecture, activation → implement-plan auto-activation) was cleaner. When an old skill's core concept doesn't survive the new model, retirement is better than forced migration.

### Graceful stop redesign is the hidden complexity in skill migration
create-architecture had 6 graceful stop scenarios each writing different state.md content (~15 references). The plan initially said "stops just leave artifacts in place" — a massive understatement. Each scenario needed concrete re-entry detection logic (CLI status + file existence mapping). Future plans migrating skills with graceful stops should inventory every scenario upfront and map re-entry detection for each.

### Non-epic scopes losing state tracking is acceptable when audit trails exist elsewhere
The explore skill tracked state for project, slice, and quest scopes via state.md. The CLI only supports epic scope. Accepting the loss was correct because: (a) the exploration work itself (research/brainstorm files) still happens, (b) the `explore-complete.md` artifact serves as the record, (c) no downstream skill depended on the state transition for non-epic scopes.

### Skill migration is a content authoring task, not a code change — review overhead doesn't match
All 4 skills passed on the first implementation-review iteration. Skill SKILL.md files are LLM prompts, not code — the changes are structural (replace X pattern with Y pattern) with no runtime behavior to break. The plan's per-phase review cycle was overkill. Future skill-only slices should use a lighter validation approach (grep checks + smoke test, skip formal review cycles).

### jq key references are false positives in grep-based verification
The plan's grep check (`state.md|activity-log.jsonl`) catches legitimate CLI-based jq queries like `'.["activity-log.jsonl"]'`. This is an inherent limitation of text-based verification for skills that query the state tree. The slice 03 migrated skills (project-status) have the same pattern. Future verification should note jq key references as expected false positives.
