# TUI & CLI Review Criteria

<!-- Canonical reference for TUI and CLI reviewer agents -->

Domain-specific evaluation criteria for the TUI and CLI reviewer. Evaluates terminal user interface and command-line tool aspects: argument design, terminal layout, interaction patterns, input handling, output formatting, and cross-platform compatibility.

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:

- TUI framework in use (ratatui, textual, curses, blessed, ink) and its patterns
- CLI framework in use (clap, click, argparse, commander) and command structure conventions
- Existing command hierarchy, subcommand patterns, and argument naming conventions
- Rendering and layout patterns (widget structure, layout constraints, styling)
- Input handling and keybinding patterns (event loops, key maps, mode switching)
- Output formatting approach (color usage, structured output, progress display)
- Cross-platform testing and compatibility handling

## Evaluation Criteria

1. **CLI argument design**: Are commands and arguments well-designed and consistent?
   Consider: naming conventions matching existing commands and platform norms, short and long flag consistency (-v/--verbose, -o/--output), subcommand hierarchy depth and discoverability, required vs optional arguments with sensible defaults, help text quality and examples, shell completion generation, argument validation and early error reporting.

2. **Terminal layout**: Does the TUI layout handle real terminal conditions?
   Consider: responsive behavior across terminal sizes (80x24 minimum to ultrawide), minimum size detection and graceful degradation, content overflow and scrolling behavior, panel organization and logical grouping, focus management and navigation between sections, resize handling without state loss or rendering glitches, consistent spacing and alignment.

3. **Input handling**: Are keyboard and mouse interactions robust?
   Consider: standard keybinding conventions (Ctrl-C for quit/interrupt, Ctrl-D for EOF, Escape for cancel/back), mouse support where appropriate and keyboard-only fallback, text input editing (cursor movement, selection, clipboard), input validation with immediate feedback, raw vs cooked terminal mode management, signal handling (SIGINT, SIGTERM, SIGWINCH), modal input states and clear mode indicators.

4. **Output and formatting**: Is output well-structured and accessible?
   Consider: color support with NO_COLOR/FORCE_COLOR environment variable respect, structured output modes (--json, --plain) for scripting, progress indication for long operations (bars, spinners, ETA), log level control (--quiet, --verbose, --debug), stderr for diagnostics and stdout for data, table and list formatting that aligns correctly, Unicode handling in output formatting.

5. **Cross-platform compatibility**: Will the tool work across environments?
   Consider: terminal emulator differences (iTerm2, Terminal.app, GNOME Terminal, Windows Terminal), Windows compatibility (cmd.exe, PowerShell, WSL, ConPTY), Unicode detection and fallback to ASCII box-drawing, color capability detection (TERM, COLORTERM, true color), path handling differences (separators, home directory, temp directory), line ending handling, locale and encoding detection.

6. **Error reporting**: Are errors helpful to the user?
   Consider: user-friendly error messages (not raw stack traces or panic output), meaningful exit codes following conventions (0 success, 1 general error, 2 usage error), error context that helps the user fix the problem, suggestions for common mistakes (did-you-mean for typos, missing dependency hints), verbose/debug mode for detailed diagnostic output, error output that works in both interactive and piped contexts.

7. **Testing approach**: Can the TUI and CLI be tested effectively?
   Consider: snapshot testing for rendered output, integration tests for complete command workflows, mock stdin for testing interactive input, terminal size simulation for layout testing, output format testing (plain, JSON, colored), exit code verification, test coverage for error paths and edge cases.

8. **Verification approach appropriateness**: Do the Expected Behavior items / implementation verification evidence in this domain use the most direct verification method? (e.g., CLI phases should run the actual command with test args and verify output)
