# UX & Information Architecture Review Criteria

Domain-specific evaluation criteria for the UX and information architecture reviewer. Evaluates user experience design: information architecture, task flows, navigation, content hierarchy, and interaction patterns. Does NOT evaluate visual design implementation (the frontend reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Navigation structure — menus, breadcrumbs, routing configuration
- Page/screen hierarchy — how content is organized and nested
- User flows — multi-step processes, wizards, form sequences
- Error states — how errors are presented to users
- Empty states — what users see before content exists
- Help and documentation — inline help, tooltips, onboarding flows
- Terminology — consistency of labels, actions, and descriptions across the interface

## Evaluation Criteria

1. **Information architecture**: Is content well-organized?
   - Logical grouping of related features and content
   - Navigation depth appropriate (not too deep, not too flat)
   - Labels and categories are intuitive and consistent
   - Search and filtering available for large content sets
   - URL structure reflects content hierarchy

2. **User flows**: Are task flows efficient?
   - Common tasks require minimal steps
   - Multi-step processes have clear progress indication
   - Users can navigate backward without losing data
   - Destructive actions require confirmation
   - Success and failure states are clearly communicated

3. **Content hierarchy**: Is visual hierarchy clear?
   - Primary actions visually prominent, secondary actions subordinate
   - Reading order follows natural scanning patterns (F-pattern, Z-pattern)
   - Headings and sections create scannable structure
   - Dense information broken into digestible chunks
   - Related information grouped spatially

4. **Consistency**: Is the experience consistent?
   - Same action performed the same way everywhere
   - Terminology consistent across all screens
   - Patterns established early are maintained throughout
   - Platform conventions respected (native OS patterns, web conventions)
   - Error handling follows a consistent pattern

5. **Feedback and affordance**: Do users understand what's happening?
   - Interactive elements look interactive (buttons, links, inputs)
   - System status visible during operations (loading, saving, processing)
   - Actions provide immediate feedback (visual, textual)
   - Undo available for reversible actions
   - Constraints visible before users encounter them (disabled states, validation)

6. **Edge cases**: Are edge cases handled gracefully?
   - Empty states guide users toward first actions
   - Error states offer recovery paths (not just error messages)
   - Long content handled (truncation, overflow, pagination)
   - Concurrent user scenarios considered
   - Offline or degraded states handled where applicable

## Scoring Guidelines

- Score 9-10: Intuitive IA, efficient flows, consistent patterns, excellent edge case handling
- Score 7-8: Good IA structure, minor flow inefficiencies, mostly consistent
- Score 5-6: Some IA confusion, multi-step flows have gaps, inconsistencies present
- Score 3-4: Poor IA, confusing flows, significant inconsistencies
- Score 1-2: No discernible IA, broken flows, no consistency
