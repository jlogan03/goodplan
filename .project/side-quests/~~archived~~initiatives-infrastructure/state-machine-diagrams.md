# State Machine Diagrams

## Current State Machine (Implemented)

Three levels: project → slice/quest. No initiative layer.

```mermaid
flowchart TD
    subgraph Project Level
        NO_PROJECT["No .project/"]
        IDEA["idea.md exists\n(no architecture)"]
        EXPLORE_DONE_P["Project explore done"]
        ARCH_DONE["architecture/ exists\n(no sequencing.md)"]
        SLICES_EXIST["sequencing.md exists"]
    end

    subgraph "Per Slice / Side Quest"
        GOAL_ONLY["Only goal.md"]
        EXPLORING["Exploring\n(research/ or brainstorm/\nno explore marker)"]
        NEEDS_PLAN["Explore complete\n(no plan.md)"]
        NEEDS_REFINE["plan.md exists\n(no plan-refined.md)"]
        NEEDS_IMPL["plan-refined.md exists\n(not all phases passing)"]
        NEEDS_QA["All impl phases passing\n(no fixes-and-polish)"]
        NEEDS_COMPLETE["fixes-and-polish exists\n(no completion/)"]
        COMPLETE["completion/learnings.md\nexists"]
        ABANDONED["abandoned.md exists"]
        INTERRUPTED["interrupted.md exists\n(paused by side quest)"]
    end

    NO_PROJECT -->|"/start-project"| IDEA
    IDEA -->|"/explore"| EXPLORE_DONE_P
    IDEA -->|"/define-architecture"| ARCH_DONE
    EXPLORE_DONE_P -->|"/define-architecture"| ARCH_DONE
    ARCH_DONE -->|"/define-slices"| SLICES_EXIST
    SLICES_EXIST -->|"check each slice"| GOAL_ONLY

    GOAL_ONLY -->|"/explore"| EXPLORING
    GOAL_ONLY -->|"/create-plan"| NEEDS_PLAN
    EXPLORING -->|"mark done"| NEEDS_PLAN
    NEEDS_PLAN -->|"/create-plan"| NEEDS_REFINE
    NEEDS_REFINE -->|"/refine-plan"| NEEDS_IMPL
    NEEDS_IMPL -->|"/implement-plan"| NEEDS_QA
    NEEDS_QA -->|"QA & polish"| NEEDS_COMPLETE
    NEEDS_QA -->|"/complete-slice"| COMPLETE
    NEEDS_COMPLETE -->|"/complete-slice"| COMPLETE

    GOAL_ONLY -.->|"abandon"| ABANDONED
    EXPLORING -.->|"abandon"| ABANDONED
    NEEDS_PLAN -.->|"abandon"| ABANDONED
    NEEDS_REFINE -.->|"abandon"| ABANDONED
    NEEDS_IMPL -.->|"abandon"| ABANDONED

    GOAL_ONLY -.->|"side quest\ninterrupts"| INTERRUPTED
    NEEDS_IMPL -.->|"side quest\ninterrupts"| INTERRUPTED

    style COMPLETE fill:#90EE90
    style ABANDONED fill:#FFB6C1
    style INTERRUPTED fill:#FFE4B5
```

---

## Future State Machine (After Initiatives Infrastructure)

Three levels: project → initiative → slice. Side quests remain at project level.

```mermaid
flowchart TD
    subgraph "Project Level"
        NO_PROJECT2["No .project/"]
        PROJECT_EXISTS["Project exists\n(initiatives/)"]
    end

    subgraph "Initiative Lifecycle"
        INIT_GOAL["goal.md only\n(ready for exploration)"]
        INIT_EXPLORING["Exploring\n(research/ or brainstorm/)"]
        INIT_EXPLORE_DONE["Explore complete\n(needs arch proposal)"]
        INIT_PROPOSAL["architecture-proposal/\nexists\n(pending review)"]
        INIT_ARCH_SKIP["architecture-proposal-\nskipped.md"]
        INIT_APPROVED["approved.md exists\n(__active__ prefix)\n(needs slice planning)"]
        INIT_SLICES["Executing slices"]
        INIT_NEEDS_COMPLETE["All slices complete\n(needs initiative completion)"]
        INIT_COMPLETE["Initiative complete"]
        INIT_ABANDONED["Initiative abandoned"]
    end

    subgraph "Per Slice (within initiative)"
        S_GOAL["goal.md only"]
        S_NEEDS_PLAN["Needs plan"]
        S_NEEDS_REFINE["Needs refinement"]
        S_NEEDS_IMPL["Needs implementation"]
        S_NEEDS_QA["Needs QA"]
        S_NEEDS_COMPLETE2["Needs completion"]
        S_COMPLETE["Slice complete"]
        S_ABANDONED2["Slice abandoned"]
    end

    subgraph "Side Quests (project level, unchanged)"
        SQ["Same state machine\nas current slices"]
    end

    NO_PROJECT2 -->|"/create-initiative\n(Mode A: project setup\n+ first initiative)"| PROJECT_EXISTS
    PROJECT_EXISTS -->|"/create-initiative\n(Mode B: new initiative)"| INIT_GOAL
    NO_PROJECT2 -->|"Mode A also\ncreates first\ninitiative as\n__active__"| INIT_APPROVED

    INIT_GOAL -->|"/explore"| INIT_EXPLORING
    INIT_GOAL -->|"skip explore"| INIT_EXPLORE_DONE
    INIT_EXPLORING -->|"mark done"| INIT_EXPLORE_DONE
    INIT_EXPLORE_DONE -->|"/define-architecture\n(writes proposal)"| INIT_PROPOSAL
    INIT_EXPLORE_DONE -->|"skip proposal"| INIT_ARCH_SKIP
    INIT_ARCH_SKIP -->|"/start-initiative"| INIT_APPROVED
    INIT_PROPOSAL -->|"/start-initiative\n(review + approve\n+ activate)"| INIT_APPROVED
    INIT_APPROVED -->|"/define-slices"| INIT_SLICES
    INIT_SLICES -->|"all slices done"| INIT_NEEDS_COMPLETE
    INIT_NEEDS_COMPLETE -->|"/complete"| INIT_COMPLETE

    INIT_GOAL -.->|"abandon"| INIT_ABANDONED
    INIT_EXPLORING -.->|"abandon"| INIT_ABANDONED
    INIT_EXPLORE_DONE -.->|"abandon"| INIT_ABANDONED
    INIT_PROPOSAL -.->|"abandon"| INIT_ABANDONED
    INIT_SLICES -.->|"abandon"| INIT_ABANDONED

    INIT_SLICES -->|"per slice"| S_GOAL

    S_GOAL -->|"/create-plan"| S_NEEDS_PLAN
    S_NEEDS_PLAN -->|"/create-plan"| S_NEEDS_REFINE
    S_NEEDS_REFINE -->|"/refine-plan"| S_NEEDS_IMPL
    S_NEEDS_IMPL -->|"/implement-plan"| S_NEEDS_QA
    S_NEEDS_QA -->|"QA + /complete"| S_COMPLETE
    S_GOAL -.->|"abandon"| S_ABANDONED2

    PROJECT_EXISTS -.->|"side quest"| SQ

    style INIT_COMPLETE fill:#90EE90
    style INIT_ABANDONED fill:#FFB6C1
    style S_COMPLETE fill:#90EE90
    style S_ABANDONED2 fill:#FFB6C1
    style INIT_APPROVED fill:#87CEEB

    linkStyle 2 stroke:#87CEEB,stroke-width:2px
```

### Key Differences

| Aspect | Current | Future |
|--------|---------|--------|
| **Entry point** | `/start-project` | `/create-initiative` (includes project setup) |
| **Activation gate** | None | `/start-initiative` (review proposal, approve, activate) |
| **Architecture location** | Top-level only | Two layers: initiative (target) + top-level (reality) |
| **Slice explore phase** | Per-slice explore | Initiative-level explore only |
| **Slice location** | `.project/vertical-slices/` | `initiatives/__active__<name>/vertical-slices/` |
| **Side quests** | Same state machine as slices | Unchanged — still at project level |
| **First initiative** | N/A | Auto-active, skips proposal/approval |
| **`__active__` prefix** | N/A | One active initiative at a time |
| **Stale detection** | None | `/create-plan` + `/refine-plan` check architecture freshness |

### First Initiative Shortcut

The first initiative skips several states because it IS the architecture (not a proposal):

```
/create-initiative (Mode A)
  → creates __active__initial/ (already active)
  → /explore (initiative-scoped)
  → /define-architecture (writes to initiative architecture/, top-level gets scaffold)
  → /define-slices (within initiative)
  → slice execution...
```

No `architecture-proposal/`, no `approved.md`, no `/start-initiative` needed.
