# Frontend Review Criteria

Domain-specific evaluation criteria for the frontend reviewer. Evaluates frontend design: component patterns, state management, accessibility, rendering performance, and responsive design. Does NOT evaluate backend concerns (the backend reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Component structure — file organization, naming conventions, component hierarchy
- State management — local state, global state (Redux, Zustand, Context), server state (React Query, SWR)
- Styling approach — CSS modules, Tailwind, styled-components, design tokens
- Accessibility — ARIA attributes, semantic HTML, keyboard navigation, focus management
- Bundle configuration — code splitting, lazy loading, tree shaking
- Testing — component tests, integration tests, visual regression
- Framework patterns — SSR/SSG, routing, data fetching patterns

## Evaluation Criteria

1. **Component design**: Are components well-structured?
   - Single responsibility — each component does one thing well
   - Props interface is minimal and well-typed
   - Composition over inheritance — slots, render props, children patterns
   - Controlled vs uncontrolled patterns used appropriately
   - Component boundaries align with visual and behavioral boundaries

2. **State management**: Is state handled correctly?
   - State lives at the right level (closest common ancestor, not globally)
   - Derived state computed during render (not stored separately)
   - Server state separated from UI state
   - No unnecessary re-renders from state changes
   - Loading, error, and empty states handled for all async operations

3. **Accessibility**: Is the UI accessible?
   - Semantic HTML elements used (not `div` soup)
   - ARIA attributes correct and necessary (not redundant with semantics)
   - Keyboard navigation works for all interactive elements
   - Focus management on route changes and modal open/close
   - Color contrast meets WCAG AA minimums
   - Screen reader experience considered

4. **Performance**: Is rendering performance considered?
   - No layout shifts (CLS) — dimensions reserved for async content
   - No unnecessary re-renders — memoization where measured, not speculative
   - Code splitting at route boundaries minimum
   - Images optimized (lazy loading, proper sizing, modern formats)
   - Bundle size monitored — no oversized dependencies for simple tasks

5. **Responsive design**: Does the UI work across viewports?
   - Mobile-first approach or explicit breakpoint strategy
   - Touch targets appropriately sized (minimum 44x44px)
   - Content readable without horizontal scrolling
   - Navigation adapts to screen size
   - Media queries or container queries used consistently

6. **Visual stability**: Is the UI free from flicker and jank?
   - No flash of unstyled content (FOUC)
   - Loading states don't cause layout jumps
   - Transitions and animations intentional (not accidental)
   - Scroll position preserved on navigation
   - No z-index stacking issues

## Scoring Guidelines

- Score 9-10: Excellent accessibility, zero layout shifts, clean component architecture, performant
- Score 7-8: Good accessibility, minor performance issues, well-structured components
- Score 5-6: Some accessibility gaps, noticeable performance issues, component structure concerns
- Score 3-4: Poor accessibility, significant performance problems, messy component architecture
- Score 1-2: No accessibility consideration, severe performance issues, no component structure
