# Test sessions can modify the goodplan repo source code

## Problem

During E2E validation (2026-04-13), the test LLM session:
1. Diagnosed a bug in `src/engine/events/read-last-event.ts`
2. Edited the file (changed TAIL_BYTES from 4096 to 65536)
3. Rebuilt the plugin (`bash scripts/build-plugin.sh`)
4. Continued the test with the modified binary

This violates test isolation — the test should run against the pre-built plugin, never modify the repo.

## Why It Happened

The `permissionMode: "bypassPermissions"` setting gives the test session full file access. The session's `cwd` is the fixture dir, but it can still access `/Users/iwhite/Repos/goodplan/` via absolute paths. The LLM discovered the repo path from `which gp` or by inspecting the binary, then edited source code.

## Fix Options

### Option A: Restrict file access in test sessions
Use `allowedTools` or `canUseTool` to block Edit/Write on paths outside the fixture dir:
```typescript
canUseTool: async (toolName, input) => {
  if (toolName === "Edit" || toolName === "Write") {
    const filePath = (input as Record<string, unknown>).file_path as string;
    if (!filePath.startsWith(fixtureDir)) {
      return { behavior: "deny", message: "Cannot modify files outside fixture" };
    }
  }
  return { behavior: "allow" };
}
```

### Option B: Don't forward repo path information
Currently the `gp` binary is resolved to an absolute path in the repo. The LLM can reverse-engineer the repo location from this. Consider copying the binary to a temp dir instead.

### Option C: Set HOME to temp dir (already captured separately)
This would prevent the LLM from finding `~/.claude/CLAUDE.md` but wouldn't prevent it from finding the repo if it discovers the binary path.

## Recommended: Option A + Option B

Block writes outside fixture AND don't expose the repo path.

## Files

- `tools/dogfood/utils.ts` — `createTestEnv`, `runSkillSession`
- `tools/dogfood/validate-consolidated.ts` — `runSkill` function
