# 130 internal CLI errors (exit 1) in E2E run — investigate root causes

## Problem

During E2E validation (2026-04-13), the CLI Correctness metric showed:
- Total: 142 errors
- State machine (exit 3): 0
- Validation (exit 2): 10
- **Internal (exit 1): 130**
- Other: 2

Exit 1 is the catch-all error code — it could indicate actual CLI bugs, not user mistakes.

## Investigate

Look at the error logs captured by the harness to categorize the 130 internal errors:
- Are they from the same commands (refine:*, slice:plan-commit)?
- Are they related to the TAIL_BYTES bug (prevId chain issues)?
- Are they related to the dual-process corruption?
- Are there any genuinely new bugs hiding in here?

## Files

- `tools/dogfood/validate-consolidated.log` — full log
- `tools/dogfood/validate-consolidated-transcript.jsonl` — full transcript
- The harness captures `cliErrors` with command, stderr, exit code — analyze these

## Deliverable

Categorize the 130 internal errors. Each category becomes either:
- A task for a CLI bug fix, OR
- A task for better error messaging, OR
- Confirmed as expected fallout from the dual-process corruption (closed)
