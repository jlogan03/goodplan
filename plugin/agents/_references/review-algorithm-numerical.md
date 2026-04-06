# Algorithm & Numerical Review Criteria

Domain-specific evaluation criteria for the algorithm and numerical reviewer. Evaluates algorithmic and numerical soundness: complexity, numerical stability, precision, edge cases, and correctness. Does NOT evaluate language-specific implementation details (language reviewers handle that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Algorithm implementations — sorting, searching, graph algorithms, optimization
- Numerical computations — floating-point arithmetic, matrix operations, statistical methods
- Data structures — choice of data structure relative to access patterns
- Test cases — edge cases, boundary values, known-answer tests
- Performance benchmarks — timing, memory profiling, scaling tests
- Mathematical references — papers, textbook algorithms cited in comments
- Precision requirements — documented tolerance levels, significant digits

## Evaluation Criteria

1. **Algorithmic complexity**: Are algorithms appropriate for the problem size?
   - Time complexity documented and appropriate (not O(n^3) where O(n log n) exists)
   - Space complexity considered (not materializing large intermediate results unnecessarily)
   - Amortized analysis used where applicable (hash maps, dynamic arrays)
   - Algorithm choice justified for the actual data distribution (not just worst case)
   - Asymptotic constants matter — a faster big-O with huge constants may be worse in practice

2. **Numerical stability**: Are computations numerically sound?
   - Catastrophic cancellation avoided (subtracting nearly-equal numbers)
   - Summation uses compensated methods (Kahan) for large sequences
   - Condition numbers considered for linear algebra operations
   - Overflow and underflow handled (log-space computation where appropriate)
   - Comparison of floating-point values uses appropriate epsilon

3. **Edge cases and boundary conditions**: Are edge cases handled?
   - Empty inputs, single-element inputs, maximum-size inputs
   - Degenerate cases (colinear points, singular matrices, zero-length vectors)
   - Integer overflow for large inputs
   - Division by zero, log of zero, sqrt of negative
   - NaN and infinity propagation handled correctly

4. **Correctness**: Is the algorithm provably correct?
   - Loop invariants identifiable and maintained
   - Termination guaranteed (no infinite loops for valid input)
   - Preconditions and postconditions documented
   - Known-answer tests validate against reference implementations
   - Randomized algorithms have correctness probability documented

5. **Precision and tolerance**: Is precision appropriate?
   - Tolerance levels chosen based on problem requirements (not arbitrary)
   - Accumulation of rounding errors analyzed for iterative methods
   - Mixed-precision computation justified where used
   - Output precision matches input precision expectations
   - Convergence criteria appropriate for iterative methods

6. **Reproducibility**: Are results reproducible?
   - Random seeds configurable for stochastic algorithms
   - Floating-point operation ordering deterministic (or documented as non-deterministic)
   - Platform-specific behavior documented (x87 vs SSE, different BLAS implementations)
   - Test suite includes regression tests for numerical results

## Scoring Guidelines

- Score 9-10: Optimal complexity, numerically stable, comprehensive edge cases, provably correct
- Score 7-8: Good complexity, mostly stable, minor edge case gaps, well-tested
- Score 5-6: Suboptimal complexity, some stability concerns, incomplete edge cases
- Score 3-4: Wrong complexity class, numerical issues, missing edge cases
- Score 1-2: Fundamentally incorrect algorithm, severe numerical instability
