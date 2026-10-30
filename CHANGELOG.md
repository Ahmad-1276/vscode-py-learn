# Changelog

## 0.2.0

### Fixed
- Starter code for every problem contained literal `\n` characters and failed with a syntax error.
- Hidden test cases no longer reveal their inputs or expected values.
- Student code can no longer fake a passing result by printing to stdout.
- **Check Solution** and **Show Next Hint** commands now act on the open problem.
- **Run Code** reuses one output channel instead of creating a new one on every run.

### Added
- Theme-aware problem and lesson panels (light, dark and high contrast) with a strict Content Security Policy.
- Code editor with line numbers, Tab / Shift+Tab indentation, auto-indent after `:`, and Ctrl+Enter / Ctrl+Shift+Enter to run / check.
- Code drafts are saved automatically per problem; panels are restored after reloading VS Code.
- Examples section with Python-style values, a pass count for test results and clearer error messages.
- Lessons link to related practice problems, with previous/next navigation and "Mark lesson complete".
- Problems grouped by difficulty; lesson completion shown in the sidebar.
- Progress view with progress bars and a **Continue Learning** command; progress in the status bar.
- Getting Started walkthrough.
- Automatic Python 3 detection (`python3`, `python`, `py -3`, or the Python extension's interpreter) with a helpful message when none is found.
- Settings: `pyLearn.maxOutputKb`, `pyLearn.showStatusBar`.
- Progress syncs across machines with Settings Sync.

### Changed
- Runs can be cancelled and are stopped when you switch problems; output size is capped.
- `if __name__ == "__main__":` blocks are not executed while grading.
- `pyLearn.pythonPath` now defaults to auto-detect and is ignored in untrusted workspaces.
- Bundled with esbuild; added ESLint and an automated test suite.

## 0.1.0
- Initial release: 8 lessons, 12 practice problems, auto-grading and progress tracking.
