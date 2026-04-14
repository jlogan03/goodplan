# Side Quest Proposals: 02-invariant-engine

## 1. Update architecture doc to reflect `ruleType` naming

- **Rationale:** Architecture doc says `type: InvariantRuleType` but implementation uses `ruleType`. The doc should match the implementation since the deviation is intentional and well-reasoned.
- **Scope:** Small (doc update only)
- **Priority:** Medium -- prevents confusion for future contributors reading the architecture.

## 2. Replace hand-rolled YAML parser with proper YAML library

- **Rationale:** The `yaml-loader.ts` uses a custom `splitYamlArrayItems` / `parseYamlFields` parser that handles only flat key-value YAML. If the extensible invariants DSL grows (nested checks, conditional logic), this parser will break. A proper YAML library (e.g., `yaml` npm package) would handle edge cases.
- **Scope:** Small (swap parser internals, keep public API)
- **Priority:** Low -- current DSL is intentionally simple; only matters if DSL grows.

## 3. Add performance benchmarks for invariant checking

- **Rationale:** With 24 rules running on every event append, performance matters. No benchmarks exist yet. The architecture's "no cache" approach for derived state assumes <50ms replay. Invariant checks add to that budget.
- **Scope:** Small (write benchmark script using existing test fixtures)
- **Priority:** Low -- unlikely to be a bottleneck at current scale, but good to establish a baseline.

## 4. Finalize `spine.write-only-via-milestone` when milestone system lands

- **Rationale:** Currently a placeholder checking for preceding `milestone-committed` event. The actual milestone batch semantics may differ (e.g., batch window, multiple spine mutations per milestone).
- **Scope:** Small (update one rule + tests)
- **Priority:** High -- tracked as a TODO, blocks correctness of spine integrity.
