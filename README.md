# Python Learner

Learn Python without leaving VS Code. Read short lessons, solve practice problems in a built-in editor, and get instant feedback from automatic tests.

## Features

- **8 beginner lessons**: variables, data types, conditionals, loops, functions, lists, dictionaries and strings. Each one links to practice problems.
- **12 practice problems** in three difficulty levels, with examples, hidden tests and step-by-step hints.
- **Built-in Python editor** with line numbers, smart indentation and keyboard shortcuts.
- **Instant grading** that shows each test call with the expected and actual result.
- **Progress tracking** in the sidebar and status bar. It syncs with Settings Sync.
- **Your code is saved automatically**, so you can switch problems and pick up where you left off.
- Matches your VS Code theme: light, dark and high contrast.

## Requirements

Python **3.8 or newer** installed locally. The interpreter is detected automatically, in this order:

1. The `pyLearn.pythonPath` setting
2. `python.defaultInterpreterPath` (the Python extension's interpreter)
3. `python3`, then `python` (or `py -3` on Windows)

## Getting started

1. Click the **Python Learner** icon in the Activity Bar.
2. Open a lesson from **Lessons**, or run **Python Learner: Continue Learning** from the Command Palette.
3. In a problem, write your solution and press **Run** to try it or **Check** to grade it.

| Action | Shortcut (in the problem editor) |
|--------|----------------------------------|
| Run | `Ctrl+Enter` / `Cmd+Enter` |
| Check | `Ctrl+Shift+Enter` / `Cmd+Shift+Enter` |
| Indent / dedent | `Tab` / `Shift+Tab` |

**Python Learner: Run Code** also runs the active `.py` file and shows its output in the *Python Learner: Run* output channel.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `pyLearn.pythonPath` | *(auto)* | Python 3 interpreter to use. Ignored in untrusted workspaces. |
| `pyLearn.runTimeoutMs` | `5000` | Maximum run time before the program is stopped. |
| `pyLearn.maxOutputKb` | `64` | Maximum output kept before the program is stopped. |
| `pyLearn.showStatusBar` | `true` | Show progress in the status bar. |

## Troubleshooting

- **"Could not find Python 3"**: install Python from [python.org](https://www.python.org/downloads/) or set `pyLearn.pythonPath`.
- Run **Python Learner: Show Log** to see which interpreter is used.

## Development

```bash
npm install
npm run compile     # type-check + bundle to dist/
npm run watch       # rebuild on change (also the default F5 build task)
npm run lint
npm test            # unit tests + checks that every bundled problem is solvable
npm run package     # produce a .vsix
```

Press **F5** to launch the Extension Development Host.

Project layout:

```
src/
  extension.ts            activation, commands, status bar
  data/                   lessons and problems
  providers/              sidebar tree views
  runner/                 Python execution and grading (VS Code–independent)
  state/progress.ts       persisted progress and drafts
  webview/                lesson/problem panel and HTML
media/                    webview script, styles, icons, walkthrough
test/                     node:test suites
```

## License

MIT
