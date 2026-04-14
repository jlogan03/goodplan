# Dogfood harness allows multiple concurrent instances against same fixture

## Problem

During E2E validation (2026-04-13), two instances of `validate-consolidated.ts` ran concurrently against the same fixture directory. This happened because:
1. First invocation was a `Bash` call with `head -5` — `head` exited but `bun` kept running in background
2. Second invocation was explicitly `run_in_background: true`

Both processes shared the same `.goodplan/events.jsonl` and fixture, causing:
- Conflicting event writes (lock file contention at one point)
- Different slice sets created by two create-epic runs interleaving
- Land-slice failure because the harness checked slice `01-sr-engine-and-data-model` but slice:land was called for `01-sr-engine-and-review-store`
- Event log integrity failure
- ~$15+ wasted on duplicate work

## Fix

The harness should detect and refuse to start if another instance is running against the same fixture:

```typescript
// At start of main()
const lockFile = join(fixtureDir, ".validate-consolidated.lock");
if (existsSync(lockFile)) {
  const pid = readFileSync(lockFile, "utf-8").trim();
  if (isProcessAlive(Number(pid))) {
    console.error(`FATAL: Another validate-consolidated instance (pid ${pid}) is running`);
    process.exit(1);
  }
}
writeFileSync(lockFile, String(process.pid));
process.on("exit", () => unlinkSync(lockFile));
```

Alternative: use a process-level lock (`proper-lockfile` or `mkdir`-based locking) instead of a PID file.

## Impact

- This corrupted an entire $70+ E2E run
- Land-slice step failed spuriously
- Some metrics failed spuriously (event log integrity)
- Made the results harder to interpret

## Files

- `tools/dogfood/validate-consolidated.ts` — add lock file check at start of `main()`
- `tools/dogfood/utils.ts` — consider a reusable lock helper
