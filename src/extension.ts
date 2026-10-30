import * as vscode from "vscode";
import { LessonTreeProvider } from "./providers/LessonTreeProvider";
import { ProblemTreeItem, ProblemTreeProvider } from "./providers/ProblemTreeProvider";
import { ProgressTreeProvider } from "./providers/ProgressTreeProvider";
import { ProgressStore } from "./state/progress";
import { PanelAction, ProblemPanel, VIEW_TYPE } from "./webview/ProblemPanel";
import { runPythonCode } from "./runner/pythonRunner";
import { invalidatePythonCache, runOptions } from "./runner/pythonEnv";
import { LESSONS } from "./data/lessons";
import { PROBLEMS } from "./data/problems";
import { log } from "./util/log";

const WELCOMED_KEY = "pyLearn.welcomed";

/** Commands receive either an id (from tree clicks / links) or a tree item (from context menus). */
function idFrom(arg: unknown): string | undefined {
  if (typeof arg === "string") return arg;
  if (arg instanceof ProblemTreeItem) return arg.problem.id;
  if (arg && typeof arg === "object" && "lessonId" in arg) return String((arg as { lessonId: unknown }).lessonId);
  return undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  const progress = new ProgressStore(context);
  const runOutput = vscode.window.createOutputChannel("Python Learner: Run", "python");
  context.subscriptions.push(log, progress, runOutput);

  const lessonProvider = new LessonTreeProvider(progress);
  const problemProvider = new ProblemTreeProvider(progress);
  const progressProvider = new ProgressTreeProvider(progress);
  context.subscriptions.push(
    lessonProvider,
    problemProvider,
    progressProvider,
    vscode.window.createTreeView("pyLearn.lessons", { treeDataProvider: lessonProvider }),
    vscode.window.createTreeView("pyLearn.problems", { treeDataProvider: problemProvider, showCollapseAll: true }),
    vscode.window.createTreeView("pyLearn.progress", { treeDataProvider: progressProvider })
  );

  // Status bar summary
  const status = vscode.window.createStatusBarItem("pyLearn.status", vscode.StatusBarAlignment.Left, 50);
  status.name = "Python Learner Progress";
  status.command = "pyLearn.continue";
  const updateStatus = () => {
    const solved = PROBLEMS.filter((p) => progress.isSolved(p.id)).length;
    status.text = `$(mortar-board) ${solved}/${PROBLEMS.length}`;
    status.tooltip = `Python Learner: ${solved} of ${PROBLEMS.length} problems solved. Click to continue.`;
  };
  updateStatus();
  const syncStatusVisibility = () => {
    if (vscode.workspace.getConfiguration("pyLearn").get<boolean>("showStatusBar", true)) status.show(); else status.hide();
  };
  syncStatusVisibility();
  context.subscriptions.push(status, progress.onDidChange(updateStatus));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("pyLearn.pythonPath") || e.affectsConfiguration("python.defaultInterpreterPath")) invalidatePythonCache();
      if (e.affectsConfiguration("pyLearn.showStatusBar")) syncStatusVisibility();
    }),
    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      async deserializeWebviewPanel(panel, state) {
        ProblemPanel.revive(panel, state, context, progress);
      }
    })
  );

  const openLesson = async (arg?: unknown) => {
    let id = idFrom(arg);
    if (!id) {
      const pick = await vscode.window.showQuickPick(
        LESSONS.slice().sort((a, b) => a.order - b.order).map((l) => ({
          label: `${progress.isLessonCompleted(l.id) ? "$(pass-filled)" : "$(book)"} ${l.title}`,
          description: l.category,
          detail: l.summary,
          id: l.id
        })),
        { placeHolder: "Select a lesson", matchOnDescription: true, matchOnDetail: true }
      );
      id = pick?.id;
    }
    if (id) ProblemPanel.show(context, progress, { kind: "lesson", id });
  };

  const openProblem = async (arg?: unknown) => {
    let id = idFrom(arg);
    if (!id) {
      const pick = await vscode.window.showQuickPick(
        PROBLEMS.map((p) => ({
          label: `${progress.isSolved(p.id) ? "$(pass-filled)" : "$(circle-large-outline)"} ${p.title}`,
          description: `${p.difficulty} · ${p.category}`,
          id: p.id
        })),
        { placeHolder: "Select a problem", matchOnDescription: true }
      );
      id = pick?.id;
    }
    if (id) ProblemPanel.show(context, progress, { kind: "problem", id });
  };

  /** Run/check/hint act on the open problem panel; otherwise offer to open a problem. */
  const panelAction = (action: PanelAction) => async () => {
    if (ProblemPanel.current?.trigger(action)) return;
    const choice = await vscode.window.showInformationMessage("Open a Python Learner problem first.", "Choose Problem");
    if (choice) await openProblem();
  };

  /** Runs the active Python file; falls back to the problem panel when no Python editor is focused. */
  const runActiveFile = async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "python") {
      await panelAction("run")();
      return;
    }
    const opts = await runOptions();
    if (!opts) return;
    const name = editor.document.isUntitled ? "untitled" : vscode.workspace.asRelativePath(editor.document.uri);
    const res = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Running ${name}` },
      () => runPythonCode(editor.document.getText(), opts)
    );
    runOutput.clear();
    runOutput.appendLine(`# ${name}  (${res.durationMs} ms, exit ${res.exitCode ?? "-"})`);
    if (res.stdout) runOutput.append(res.stdout);
    if (res.stderr || res.spawnError) runOutput.append(res.spawnError ?? res.stderr);
    if (res.timedOut) runOutput.appendLine(`\n# Stopped after ${opts.timeoutMs} ms — check for an infinite loop.`);
    if (res.truncated) runOutput.appendLine("\n# Output truncated.");
    runOutput.show(true);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("pyLearn.openLesson", openLesson),
    vscode.commands.registerCommand("pyLearn.openProblem", openProblem),
    vscode.commands.registerCommand("pyLearn.continue", async () => {
      const next = PROBLEMS.find((p) => !progress.isSolved(p.id));
      if (next) await openProblem(next.id);
      else vscode.window.showInformationMessage("You've solved every problem. Amazing work! 🎉");
    }),
    vscode.commands.registerCommand("pyLearn.runCode", runActiveFile),
    vscode.commands.registerCommand("pyLearn.checkSolution", panelAction("check")),
    vscode.commands.registerCommand("pyLearn.nextHint", panelAction("hint")),
    vscode.commands.registerCommand("pyLearn.markLessonComplete", async (arg?: unknown) => {
      const id = idFrom(arg);
      if (id) await progress.setLessonCompleted(id, true);
    }),
    vscode.commands.registerCommand("pyLearn.markLessonIncomplete", async (arg?: unknown) => {
      const id = idFrom(arg);
      if (id) await progress.setLessonCompleted(id, false);
    }),
    vscode.commands.registerCommand("pyLearn.resetProgress", async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Reset all Python Learner progress?",
        { modal: true, detail: "Solved problems, completed lessons and saved code will be cleared. This cannot be undone." },
        "Reset"
      );
      if (confirm !== "Reset") return;
      await progress.reset();
      ProblemPanel.current?.refresh();
      vscode.window.showInformationMessage("Python Learner progress has been reset.");
    }),
    vscode.commands.registerCommand("pyLearn.showProgress", () => vscode.commands.executeCommand("pyLearn.progress.focus")),
    vscode.commands.registerCommand("pyLearn.openSettings", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", `@ext:${context.extension.id}`)
    ),
    vscode.commands.registerCommand("pyLearn.showLog", () => log.show())
  );

  if (!context.globalState.get<boolean>(WELCOMED_KEY)) {
    void context.globalState.update(WELCOMED_KEY, true);
    void vscode.commands.executeCommand("workbench.action.openWalkthrough", `${context.extension.id}#pyLearn.gettingStarted`, false);
  }

  log.info(`Python Learner ${context.extension.packageJSON.version} activated`);
}

export function deactivate(): void {
  ProblemPanel.current?.dispose();
}
