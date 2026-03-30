# Side Quest: List Pagination

## What We're Building

Add `--limit` and `--offset` pagination flags to all 6 list commands (`epic:list`, `quest:list`, `slice:list`, `task:list`, `decision:list`, `learning:list`). Currently only the `state` command has pagination support.

## Why

With 131+ learnings and growing, list output gets unwieldy. Other list commands will grow similarly on long-running projects.

## Approach

- Add `--limit` (number) and `--offset` (number, default 0) to shared `globalArgs` so all commands get them
- Apply slicing to the items array before `output()` in each list command
- For `--json` mode: wrap output with `{ items, total, offset, limit }` metadata so consumers can paginate programmatically
- For human mode: show pagination info footer when results are truncated (e.g., "Showing 10-20 of 131")
- Follow the existing `state` command pagination pattern as reference

## Success Criteria

- [ ] All 6 list commands accept `--limit` and `--offset` flags
- [ ] JSON output includes `total`, `offset`, `limit` fields alongside `items`
- [ ] Human-readable output shows pagination footer when truncated
- [ ] Existing behavior unchanged when flags are not provided (no default limit)
- [ ] Integration tests cover pagination for at least 2 commands
