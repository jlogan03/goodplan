# Architecture Refinement Goal

## Focus: Recursive Tree State Model Integration

The primary goal of this refinement round is ensuring the recently introduced data model change — from flat key map to recursive `DirectoryEntry` tree with typed `StateEntry` nodes (json, jsonl, markdown, directory) — is well integrated across ALL architecture files. Specifically:

1. The data model (`data-model.md`) is internally consistent and complete
2. The state machine API, RPC layer, commands, flows, and invariants are all updated to work with the tree model
3. The simplified data layer API (3 core functions: assembleState, loadState, commitState) is coherent with the state machine and RPC layer contracts
4. Any necessary changes to accommodate the new model are identified and applied
5. Opportunities to leverage the tree model (e.g., jq navigation, simpler guards, cleaner context bundling) are surfaced

## Quality Signals (unchanged from prior round)
- **Deep modules**: Small interfaces hiding significant complexity
- **Boundary quality**: Boundaries align with areas of likely change
- **Pure state machine**: All transition logic testable without I/O
- **Simplicity**: Every abstraction must earn its place
- **Decision alignment**: Architecture respects all active decisions
- **Data flow clarity**: load → reduce → commit is unambiguous
- **Unidirectional dependencies**: No layer reaches upward
