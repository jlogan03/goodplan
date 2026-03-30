# TUI and CLI Review (Round 3) — HMAC Signatures Plan

## Issues

**[IMPORTANT]** `gp verify` command missing `--fix` flag definition in citty args

Phase 4 task 1 describes the behavior of `gp verify` vs `gp verify --fix` but does not explicitly define the `--fix` flag in the citty command definition. Looking at the codebase pattern (e.g., `init.ts` line 22-27, `global-args.ts`), every flag must be declared in the `args` object of `defineCommand()`. The plan should include an explicit `args` block:

```typescript
args: {
  ...globalArgs,
  fix: {
    type: "boolean",
    description: "Recompute and re-embed the state signature",
    default: false,
  },
}
```

Without this, citty will not recognize `--fix` and will either ignore it or error. The `schema` command output (INV-006) also depends on the flag being declared to surface it to LLM consumers.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 `serializeForHmac()` API change not reflected in Phase 1 definition

Phase 1 defines `serializeForHmac(state: ProjectState): string` which operates on the in-memory `ProjectState`. Phase 2 then says to "compute the signature from the actual serialized content that will be written to disk (the `PendingWrite` content strings), not from the in-memory `newState`" and notes `serializeForHmac()` needs to be "adapted to accept this content." This is a significant API change that contradicts Phase 1's signature. The Phase 1 definition should either:

1. Define the correct signature from the start (accepting `PendingWrite[]` content), or
2. Explicitly note that Phase 2 will change the signature and explain what the final API looks like.

As written, Phase 1 tests will be written against a `ProjectState`-accepting API that Phase 2 immediately changes. This creates wasted rework. The plan should reconcile the two phases by defining the final `serializeForHmac` signature in Phase 1 and writing tests against it.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 verification step mentions `gp schema --json | jq` but the command does not exist yet in the verification section

The Phase 4 verification says "Verify `gp schema --json | jq '.commands[] | select(.name == "verify")'` shows the verify command." This is good (addresses the round-2 feedback about INV-006), but it should also be listed as an Expected Behavior item in the "After implementation" checklist, not just the free-form verification text. Expected Behavior items are the machine-checkable contract; verification prose is supplementary. Add:

```
- [ ] `gp schema --json | jq '.commands[] | select(.name == "verify")'` — returns command with `--fix` flag
```

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `gp verify --fix` cache staleness note could be clearer about user-observable behavior

Phase 4 says `verify --fix` "does NOT update the state cache. Cache staleness is intentional and resolved on next `loadState()` via mtime invalidation." This is architecturally sound, but from a CLI UX perspective, the user should understand that after `gp verify --fix`, the next command may be slightly slower (cache miss triggers `assembleState()`). This is not a bug but an expected consequence. The plan should note this in the human-readable output or at least document it in the `--fix` flag's help text description so users are not surprised by a one-time performance dip after repair.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 `atomicWrite()` export scope — the function accepts `relativePath` for error messages

Phase 4 task 3 says to export `atomicWrite()` from `commit.ts`. Looking at the current signature (`atomicWrite(absPath: string, content: string, relativePath: string)`), the third parameter is used for error messages (line 226: `Failed to write ${relativePath}`). When `verify --fix` calls it, it should pass `"goodplan.json"` as the `relativePath` to get meaningful error messages. The plan's Phase 4 task 2 mentions writing `goodplan.json` but doesn't specify what `relativePath` value to pass. This is minor but worth noting to prevent a confusing error message like `Failed to write undefined`.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Round 3 shows strong improvement. The round-2 feedback was well addressed: the verify failure path now uses standard `GoodplanError` / `outputError` (INV-007 compliant), HMAC verification is limited to the `assembleState()` fallback path (no cache hit penalty), and `verify --fix` write scope is precisely specified. The remaining issues are: (1) the `--fix` flag needs explicit citty declaration, and (2) the Phase 1/Phase 2 `serializeForHmac` API inconsistency will cause rework. To reach 9+: add the `--fix` flag definition and reconcile the `serializeForHmac` signature across phases.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
