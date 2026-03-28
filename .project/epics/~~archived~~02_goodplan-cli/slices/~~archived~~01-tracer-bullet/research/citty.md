# citty CLI Framework Research

**Package:** `citty` (npm)
**Version:** 0.2.1 (latest as of 2026-03-21)
**License:** MIT
**Repo:** https://github.com/unjs/citty
**Dependencies:** Zero runtime dependencies

---

## Core API

```ts
import {
  defineCommand,   // Type-safe command definition
  runMain,         // CLI entry point (handles --help, --version, errors)
  createMain,      // Returns wrapped runMain() — convenience alias
  runCommand,      // Programmatic execution, returns result
  parseArgs,       // Parse raw args against ArgsDef
  renderUsage,     // Returns usage string
  showUsage,       // Prints usage to console
} from "citty";
```

## Command Definition

```ts
const cmd = defineCommand({
  meta: { name: "foo", version: "1.0.0", description: "...", alias: ["f"], hidden: false },
  args: {
    target:  { type: "positional", description: "...", required: true },
    env:     { type: "enum", options: ["dev", "prod"], default: "dev" },
    verbose: { type: "boolean", description: "...", alias: ["v"] },
    output:  { type: "string", description: "...", default: "dist" },
  },
  setup({ args }) { /* before run, e.g. connect DB */ },
  run({ args })   { /* main logic */ },
  cleanup({ args }) { /* guaranteed via finally, even on throw */ },
});
```

**Arg types:** `positional`, `string`, `boolean`, `enum`.

## Subcommands

Subcommands are defined as an object on the parent command:

```ts
const main = defineCommand({
  meta: { name: "gp", version: "0.1.0" },
  subCommands: {
    build: buildCommand,
    deploy: deployCommand,
    test: () => import("./commands/test.mjs").then(m => m.default), // lazy
  },
});
runMain(main);
```

**Resolution algorithm:**
1. First non-flag token in argv is matched against `subCommands` keys (exact match via `name in subCommands`).
2. If no direct match, iterates all subcommands and checks `meta.alias`.
3. If still no match, throws `CLIError` with code `E_UNKNOWN_COMMAND`.

**Nesting:** Subcommands nest recursively (subcommands can have their own subcommands).

### Colon-Namespaced Commands (e.g. `epic:create`)

Citty does **not** natively support colon-delimited command routing. The subcommand key is matched literally against the first non-flag argv token.

**Two approaches to achieve `gp epic:create`:**

1. **Flat registration with colon keys** -- register `"epic:create"` as a literal subcommand key. The user types `gp epic:create` and it matches directly since the key lookup is `name in subCommands`.

   ```ts
   subCommands: {
     "epic:create": epicCreateCommand,
     "epic:list":   epicListCommand,
     "slice:list":  sliceListCommand,
   }
   ```

2. **Nested subcommands** -- register `epic` as a subcommand with its own `subCommands: { create, list }`. The user types `gp epic create` (space-delimited). This is native citty behavior.

**Recommendation:** Approach 1 (flat colon keys) works because citty's resolution does a plain object key lookup. No framework patches needed.

## Built-in Flags

`runMain` automatically handles:
- `--help` / `-h` -- shows auto-generated usage
- `--version` / `-v` -- shows `meta.version` (throws `E_NO_VERSION` if missing)

There is **no built-in mechanism for global flags** (e.g. `--json`) that propagate to all subcommands. Each command defines its own `args`. To share flags across commands, define a shared args object and spread it:

```ts
const globalArgs = {
  json: { type: "boolean" as const, description: "Output as JSON" },
} as const;

const epicList = defineCommand({
  args: { ...globalArgs, /* command-specific args */ },
  run({ args }) { /* args.json is available */ },
});
```

## Error Handling

**CLIError** -- custom error class with a `code` property:

| Code | Meaning |
|---|---|
| `EARG` | Argument validation failure |
| `E_UNKNOWN_COMMAND` | No subcommand matched the input |
| `E_NO_COMMAND` | No command provided (subcommand expected) |
| `E_NO_VERSION` | `--version` used but no version in meta |

**`runMain` behavior on error:**
1. If `CLIError`: shows usage, logs `error.message`, calls `process.exit(1)`.
2. If other error: logs full error, calls `process.exit(1)`.

All errors exit with code **1**. There is no differentiation of exit codes by error type.

## Lazy Loading / Resolvable Pattern

`meta`, `args`, and `subCommands` all accept a `Resolvable<T>` -- either the value directly or a function returning `T | Promise<T>`. This enables lazy loading so only the executed command's module is imported.

## Plugins

`defineCittyPlugin(def)` is available for extending citty behavior (added in recent versions). Plugin API exists but documentation is sparse as of v0.2.1.

## Bun Compilation

No known citty-specific issues with `bun build --compile`. Citty has zero runtime dependencies and is pure JS/TS, which makes it a good candidate for Bun single-binary compilation. The general Bun compilation caveats apply:
- Avoid importing Bun-specific APIs that break bytecode compilation
- Node.js built-in resolution works in Bun's bundler
- citty itself does not use `child_process`, `fs`, or other Node built-ins

## Gotchas and Limitations

1. **No global flags** -- must be spread into each command's `args` manually.
2. **No colon routing** -- colon-namespaced keys work as flat keys, but there is no automatic namespace grouping for help output. `gp --help` will list `epic:create`, `epic:list` as flat entries, not grouped under `epic`.
3. **All errors exit 1** -- no fine-grained exit codes out of the box. Custom error handling requires wrapping `runCommand` instead of using `runMain`.
4. **v0.x** -- still pre-1.0. API is stable in practice (used by Nuxi/Nitro) but technically subject to breaking changes.
5. **`--version` / `-v` conflict** -- if you want `-v` as a `--verbose` alias, it will conflict with the built-in version flag in `runMain`. Use `runCommand` instead of `runMain` to avoid this, or use a different alias.
6. **Unknown options** -- as of v0.2.1, unknown flags are silently ignored (not errors). There is an open issue (#201) requesting a warning for unknown options.

## Prior Art / Usage

Citty is used by the unjs ecosystem (Nuxi CLI for Nuxt, Nitro, etc.), which validates it for production TypeScript CLI usage. It is actively maintained by the unjs team.
