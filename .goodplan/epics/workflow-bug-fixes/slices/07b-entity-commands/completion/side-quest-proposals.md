# Side Quest Proposals — 07b-entity-commands

## 1. Namespace-based lazy loading for main.ts

**Rationale**: `main.ts` now imports 19 additional commands eagerly. As the CLI grows toward ~95 commands, startup time and bundle size will degrade. Namespace-based lazy loading (e.g., `subsystem:*` loads only when a subsystem command is invoked) would keep startup fast.

**Scope**: medium  
**Priority**: medium

## 2. events:query pagination (--offset support)

**Rationale**: The `--offset` flag was acknowledged as deferred in the plan. Large event logs will need pagination for practical use by skills/agents querying history.

**Scope**: small  
**Priority**: low

## 3. Project-scope invariant rules for entity uniqueness

**Rationale**: Currently, subsystem and custom-invariant registration rely only on generic engine invariants. Adding domain-specific rules (e.g., "subsystem name must be unique", "cannot retire a non-existent subsystem") would catch errors earlier with better messages.

**Scope**: small  
**Priority**: medium
