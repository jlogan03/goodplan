# Python Review Criteria

Domain-specific evaluation criteria for the Python reviewer. Evaluates Python-specific technical soundness: type safety, packaging, async patterns, and dependency management. Does NOT evaluate general plan structure (the holistic reviewer handles that) or non-Python concerns.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- `pyproject.toml`, `setup.py`, `setup.cfg` — packaging and dependency declarations
- `mypy.ini`, `pyrightconfig.json`, `pyproject.toml [tool.mypy]` — type checking configuration
- Existing type annotations — how strict is the codebase?
- Virtual environment setup — `requirements.txt`, `Pipfile`, `poetry.lock`, `uv.lock`
- Test framework — pytest configuration, fixtures, test organization
- Async patterns — `asyncio`, `trio`, event loops, async context managers
- Import structure — relative vs absolute imports, `__init__.py` organization

## Evaluation Criteria

1. **Type safety**: Are type hints comprehensive and correct?
   - Function signatures fully annotated (parameters and return types)
   - Generic types used appropriately (`list[str]` not `list`, `dict[str, int]` not `dict`)
   - `Optional`, `Union`, `TypeVar`, `Protocol` used correctly
   - Type narrowing with `isinstance`, `TypeGuard`, `assert`
   - No `Any` escape hatches without justification
   - Compatible with mypy strict mode or pyright basic+ settings

2. **Packaging and dependencies**: Is the project properly packaged?
   - `pyproject.toml` used (PEP 621) over legacy `setup.py`
   - Dependencies pinned appropriately (exact for apps, ranges for libraries)
   - Optional dependencies and extras declared correctly
   - Entry points and scripts configured properly
   - Build system specified (`hatchling`, `setuptools`, `flit`)

3. **Async patterns**: Are async constructs used correctly?
   - `async`/`await` used consistently (no mixing sync and async without bridges)
   - Proper cancellation handling and cleanup (`try`/`finally`, `async with`)
   - No blocking calls inside async functions
   - Task groups and structured concurrency preferred over raw `create_task`
   - Connection pools and resource limits respected

4. **Error handling**: Are errors handled idiomatically?
   - Specific exception types caught (not bare `except:` or `except Exception:`)
   - Custom exceptions inherit from appropriate base classes
   - Error context preserved (exception chaining with `from`)
   - Logging at appropriate levels with structured context

5. **Testing**: Is the test strategy sound?
   - pytest used with appropriate fixtures and parametrization
   - Test isolation — no shared mutable state between tests
   - Mocking used sparingly and at appropriate boundaries
   - Async tests properly configured (`pytest-asyncio`, `anyio`)

6. **Pythonic patterns**: Does the code follow Python idioms?
   - Context managers for resource management
   - Generators and iterators for lazy evaluation
   - Dataclasses or attrs for data containers
   - Pathlib over os.path for file operations
   - f-strings for formatting

## Scoring Guidelines

- Score 9-10: Comprehensive type hints, proper packaging, idiomatic patterns throughout
- Score 7-8: Good type coverage with minor gaps, solid packaging, mostly idiomatic
- Score 5-6: Incomplete type hints, packaging issues, some anti-patterns
- Score 3-4: Missing type hints, broken packaging, significant anti-patterns
- Score 1-2: No type safety, fundamentally broken packaging or structure
