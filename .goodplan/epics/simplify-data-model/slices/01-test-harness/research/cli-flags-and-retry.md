# CLI Flags and Retry Behavior Research

Source: `tools/dogfood/validate.ts`, `src/commands/`, `src/core/data/commit.ts`

---

## Topic 1: gpForce() Retry Behavior

### Implementation (validate.ts lines 112–119)

```ts
function gpForce(args: string[], opts: { stdin?: string } = {}): CliResult {
  const r = gp(args, opts);
  if (!r.ok && r.stdout.includes("CONCURRENT_MODIFICATION")) {
    console.log("  [--force recovery]");
    return gp([...args, "--force"], opts);
  }
  return r;
}
```

### Key facts

- **Retry count: 1.** Exactly one retry. If the first call fails with `CONCURRENT_MODIFICATION`, a second call is made with `--force` appended.
- **Delay between retries: none.** The retry is immediate — no sleep, no backoff.
- **If --force also fails:** The result of the second call is returned as-is (`CliResult` with `ok: false`). There is no further retry, no exception thrown, and no error logged beyond what `gp()` captures. The caller receives the failing `CliResult` and must decide what to do (in practice, callers in `validate.ts` ignore the return value of `gpForce`).
- **CONCURRENT_MODIFICATION detection:** Matches the substring `"CONCURRENT_MODIFICATION"` anywhere in stdout (the CLI error code is `DATA_CONCURRENT_MODIFICATION`).

### What --force does in the data layer (commit.ts lines 363–366)

When `--force` is set, the concurrent-modification check is bypassed:
```ts
const globalForce = (globalThis as Record<string, unknown>).__goodplan_force === true;
if (force || globalForce) {
  process.stderr.write(`[gp] --force: overwriting externally modified file ${relativePath}\n`);
  return;
}
```
The `--force` flag is a global arg available on all mutation commands (defined in `src/commands/global-args.ts`).

---

## Topic 2: createMinimalFixture CLI Flags

The plugin binary returned a state integrity error when run from the repo directory. Findings are sourced from the TypeScript command definitions in `src/commands/`.

### `gp init`

Source: `src/commands/global/init.ts`

```
gp init [--name <string>] [--json] [--quiet] [--force]
```

- `--name` (optional string): project name, defaults to `path.basename(cwd)`
- `--json`, `--quiet`, `--force`, `--query`, `--verbose`: global args
- Takes no stdin
- Creates `.goodplan/` in cwd; fails with `STATE_ALREADY_INITIALIZED` if it already exists

### `gp epic:create`

Source: `src/commands/epic/create.ts`

```
gp epic:create [--json] [--quiet] [--force]
```

- **No positional or named args for name/goal** — these come exclusively via **stdin JSON**: `{ "name": "<name>", "goal": "<goal text>" }`
- Global args only: `--json`, `--quiet`, `--force`, `--query`, `--verbose`

Usage pattern (from validate.ts):
```ts
gpForce(["epic:create", "--json"], { stdin: JSON.stringify({ name: epicName, goal }) });
```

### `gp slice:create`

Source: `src/commands/slice/create.ts`

```
gp slice:create --epic <name> [--json] [--quiet] [--force]
```

- `--epic <name>` (required): the parent epic name
- **name and goal come via stdin JSON**: `{ "name": "<name>", "goal": "<goal text>", "epic": "<epic>" }`
  - Note: `epic` in stdin is also accepted but the `--epic` flag is what's required per INV-004
- Global args: `--json`, `--quiet`, `--force`, `--query`, `--verbose`

Usage pattern (from validate.ts):
```ts
// slice:create is called by the create-slices skill, not directly in validate.ts
// but the pattern when called directly would be:
gp(["slice:create", "--epic", epicName, "--json"], { stdin: JSON.stringify({ name: sliceName, goal }) });
```

### `gp init` (fixture setup pattern from validate.ts)

```ts
gp(["init", "--name", "flashcards", "--json"]);
```

---

## Topic 3: verifyEntityStatus CLI Flag Format

Source: `src/commands/epic/show.ts`, `src/commands/quest/show.ts`, plus source inference for `slice:show`.

All three show commands use the same pattern: entity-specific required flag + `--json`.

### `gp epic:show`

```
gp epic:show --epic <name> [--json] [--query <jq>] [--quiet]
```

- `--epic <name>` (required)
- Returns full epic JSON including `status`, `goal`, `created`, `activated`, `verifications`, `refinement`, `artifacts`
- Error code if not found: `DATA_FILE_NOT_FOUND`

### `gp slice:show`

```
gp slice:show --slice <name> [--json] [--query <jq>] [--quiet]
```

- `--slice <name>` (required)

### `gp quest:show`

```
gp quest:show --quest <name> [--json] [--query <jq>] [--quiet]
```

- `--quest <name>` (required)
- Returns full quest JSON including `status`, `goal`, `created`, `updated`, `refinement`, `artifacts`

### entityStatus() helper pattern (validate.ts lines 121–128)

```ts
function entityStatus(type: "epic" | "slice" | "quest", name: string): string {
  try {
    const data = gpJson<{ status: string }>([`${type}:show`, `--${type}`, name, "--json"]);
    return data.status;
  } catch {
    return "not-found";
  }
}
```

The flag name matches the entity type: `--epic`, `--slice`, `--quest`. Returns `"not-found"` on any error (entity missing, project not initialized, etc.).

### Error behavior when run without a project

When no `.goodplan/` directory exists, show commands return JSON error:
```json
{
  "error": {
    "code": "DATA_NO_PROJECT",
    "message": "No .goodplan/ directory found. Run `gp init` to create one."
  }
}
```
This causes `gpJson()` to throw (non-2xx exit code), which `entityStatus()` catches and converts to `"not-found"`.
