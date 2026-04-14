# readLastEvent TAIL_BYTES too small — breaks prevId chain on large event logs

## Problem

`src/engine/events/read-last-event.ts` reads the last 4096 bytes of events.jsonl to find the previous event ID (for prevId chain). When the event log exceeds 4KB, the tail read may not contain a complete event, breaking the prevId chain.

Found during E2E validation (2026-04-13) when the LLM hit this bug, diagnosed it, changed TAIL_BYTES from 4096 to 65536, rebuilt the plugin, and continued.

## Impact

- Any event log larger than ~4KB (about 4-5 events) will fail to find the last event
- This breaks ALL subsequent event appends since prevId can't be computed
- The implement-start invariant failures we saw were downstream of this bug

## Fix

The LLM's fix (TAIL_BYTES = 65536) is a bandaid. Better approaches:
1. Read from the end of the file backward until a complete JSON line is found
2. Seek to file size minus a generous buffer, then scan forward for the last newline-delimited JSON
3. Use a separate index file that tracks the last event ID (avoids reading the log at all)

## Files

- `src/engine/events/read-last-event.ts` — the tail read function
