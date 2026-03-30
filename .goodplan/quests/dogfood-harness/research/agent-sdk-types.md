# Agent SDK Type Definitions Research

**Package:** `@anthropic-ai/claude-agent-sdk`
**Version:** 0.2.81 (claudeCodeVersion: 2.1.81)
**Date:** 2026-03-24
**Source:** `/Users/iwhite/Repos/goodplan/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` and `sdk-tools.d.ts`

---

## 1. Model field name in `query()` options

The correct field name is **`model`** (not `modelId`).

From `sdk.d.ts` line 1022–1025 (inside the `Options` type):

```typescript
/**
 * Claude model to use. Defaults to the CLI default model.
 * Examples: 'claude-sonnet-4-6', 'claude-opus-4-6'
 */
model?: string;
```

`query()` takes `{ prompt, options?: Options }` where `Options` contains `model?: string`.

---

## 2. `canUseTool` input parameter type

The `CanUseTool` type is declared in `sdk.d.ts` line 126:

```typescript
export declare type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    suggestions?: PermissionUpdate[];
    blockedPath?: string;
    decisionReason?: string;
    title?: string;
    displayName?: string;
    // ... more fields
  }
) => Promise<PermissionResult> | PermissionResult;
```

The `input` parameter type is **`Record<string, unknown>`** — not a specific union type like `ToolInputSchemas`.

However, `sdk-tools.d.ts` exports `AskUserQuestionInput` (and the full `ToolInputSchemas` union) which can be used for casting/narrowing inside the callback:

```typescript
import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

const canUseTool: CanUseTool = (toolName, input, options) => {
  if (toolName === 'AskUserQuestion') {
    const typed = input as AskUserQuestionInput;
    // typed.questions is strongly typed
  }
  // ...
};
```

`AskUserQuestionInput` is defined in `sdk-tools.d.ts` line 629 with a `questions` field (array of 1–4 question objects, each with `question`, `header`, `options`).

---

## 3. Does `model` in `Options` propagate to sub-agents?

**No automatic propagation — sub-agents inherit the parent's model by default, not by explicit `model` option.**

From the `AgentDefinition` type (line 56):

```typescript
/**
 * Model alias (e.g. 'sonnet', 'opus', 'haiku') or full model ID (e.g. 'claude-opus-4-5').
 * If omitted or 'inherit', uses the main model
 */
model?: string;
```

And from `AgentInfo` (line 87):

```typescript
/**
 * Model alias this agent uses. If omitted, inherits the parent's model
 */
model?: string;
```

So the behavior is:
- The `model` in top-level `Options` sets the model for the **main conversation thread**.
- Sub-agents spawned via the Agent/Task tool use the model from their `AgentDefinition.model` field.
- If `AgentDefinition.model` is omitted or set to `'inherit'`, the sub-agent **inherits the main model** (i.e., whatever was set in `Options.model`).
- There is no guarantee that arbitrary dynamically-spawned sub-agents will pick up a model override — it depends on how the agent is defined.

**Practical implication for the harness:** Setting `options.model` will control the main thread model. Sub-agents defined in `options.agents` can have their own `model` field, or omit it to inherit. Dynamically spawned sub-agents (e.g., via built-in Agent tool) will inherit the main model.
