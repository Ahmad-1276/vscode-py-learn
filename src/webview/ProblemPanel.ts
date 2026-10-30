import * as vscode from "vscode";
import { LESSONS } from "../data/lessons";
import { PROBLEMS } from "../data/problems";
import { ProgressStore } from "../state/progress";
import { runPythonCode, gradeSolution } from "../runner/pythonRunner";
import { runOptions } from "../runner/pythonEnv";
import { lessonHtml, problemHtml, makeNonce, PageAssets, NavLink } from "./htmlBuilder";
import { log } from "../util/log";

export type ViewMode = { kind: "lesson"; id: string } | { kind: "problem"; id: string };
export type PanelAction = "run" | "check" | "hint";

export const VIEW_TYPE = "pyLearn";

const sortedLessons = () => LESSONS.slice().sort((a, b) => a.order - b.order);
const link = (x: { id: string; title: string } | undefined): NavLink | undefined => x && { id: x.id, title: x.title };

/** Single webview panel that shows either a lesson or a problem. */
export class ProblemPanel implements vscode.Disposable {
  public static current: ProblemPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private hintIndex = 0;
  private running: AbortController | undefined;
  /** Changes on every deliberate re-render so the webview knows not to restore stale state. */
  private renderVersion: number;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private mode: ViewMode,
    private readonly ctx: vscode.ExtensionContext,
    private readonly progress: ProgressStore,
    restoredVersion?: number
  ) {
    this.renderVersion = restoredVersion ?? Date.now();
    panel.iconPath = vscode.Uri.joinPath(ctx.extensionUri, "media", "icon.png");
    panel.webview.options = ProblemPanel.webviewOptions(ctx);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);
    panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg).catch((err) => this.reportError(err)), null, this.disposables);
    this.render();
  }

  /** Re-render from stored state (e.g. after progress was reset). */
  refresh(): void {
    this.hintIndex = 0;
    this.renderVersion = Date.now();
    this.render();
  }

  static webviewOptions(ctx: vscode.ExtensionContext): vscode.WebviewOptions {
    return { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, "media")] };
  }

  static show(ctx: vscode.ExtensionContext, progress: ProgressStore, mode: ViewMode): void {
    if (!ProblemPanel.exists(mode)) {
      vscode.window.showErrorMessage(`Python Learner: unknown ${mode.kind} "${mode.id}".`);
      return;
    }
    const cur = ProblemPanel.current;
    if (cur) {
      cur.setMode(mode);
      cur.panel.reveal(cur.panel.viewColumn);
      return;
    }
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, "Python Learner", vscode.ViewColumn.Active, ProblemPanel.webviewOptions(ctx));
    ProblemPanel.current = new ProblemPanel(panel, mode, ctx, progress);
  }

  /** Re-attach to a panel restored by VS Code after a window reload. */
  static revive(panel: vscode.WebviewPanel, state: unknown, ctx: vscode.ExtensionContext, progress: ProgressStore): void {
    const s = state as (Partial<ViewMode> & { version?: number }) | undefined;
    const mode: ViewMode = s && (s.kind === "lesson" || s.kind === "problem") && typeof s.id === "string" && ProblemPanel.exists(s as ViewMode)
      ? (s as ViewMode)
      : { kind: "lesson", id: sortedLessons()[0].id };
    ProblemPanel.current?.dispose();
    ProblemPanel.current = new ProblemPanel(panel, mode, ctx, progress, mode === s ? s.version : undefined);
  }

  private static exists(mode: ViewMode): boolean {
    return mode.kind === "lesson" ? LESSONS.some((l) => l.id === mode.id) : PROBLEMS.some((p) => p.id === mode.id);
  }

  get currentMode(): ViewMode {
    return this.mode;
  }

  /** Ask the webview to perform an action with its current code (used by commands and keybindings). */
  trigger(action: PanelAction): boolean {
    if (this.mode.kind !== "problem") return false;
    this.panel.reveal(this.panel.viewColumn, false);
    this.post({ command: "trigger", action });
    return true;
  }

  private setMode(mode: ViewMode): void {
    if (mode.kind === this.mode.kind && mode.id === this.mode.id) return;
    this.cancelRun();
    this.mode = mode;
    this.hintIndex = 0;
    this.renderVersion = Date.now();
    this.render();
  }

  private assets(): PageAssets {
    const w = this.panel.webview;
    const media = (f: string) => w.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "media", f)).toString();
    return { cspSource: w.cspSource, cssUri: media("webview.css"), scriptUri: media("main.js"), nonce: makeNonce() };
  }

  private render(): void {
    const assets = this.assets();
    const version = this.renderVersion;
    if (this.mode.kind === "lesson") {
      const lessons = sortedLessons();
      const idx = lessons.findIndex((l) => l.id === this.mode.id);
      const lesson = lessons[idx];
      this.panel.title = lesson.title;
      this.panel.webview.html = lessonHtml(assets, {
        lesson,
        completed: this.progress.isLessonCompleted(lesson.id),
        practice: lesson.practice
          .map((id) => PROBLEMS.find((p) => p.id === id))
          .filter((p): p is (typeof PROBLEMS)[number] => !!p)
          .map((p) => ({ id: p.id, title: p.title, solved: this.progress.isSolved(p.id) })),
        prev: link(lessons[idx - 1]),
        next: link(lessons[idx + 1])
      }, version);
    } else {
      const idx = PROBLEMS.findIndex((p) => p.id === this.mode.id);
      const problem = PROBLEMS[idx];
      this.panel.title = problem.title;
      this.panel.webview.html = problemHtml(assets, {
        problem,
        solved: this.progress.isSolved(problem.id),
        code: this.progress.getDraft(problem.id) ?? problem.starterCode,
        prev: link(PROBLEMS[idx - 1]),
        next: link(PROBLEMS[idx + 1]),
        lesson: link(sortedLessons().find((l) => l.practice.includes(problem.id)))
      }, version);
    }
  }

  private post(msg: unknown): void {
    // The panel may have been closed while a run was in flight.
    this.panel.webview.postMessage(msg).then(undefined, () => undefined);
  }

  private cancelRun(): void {
    this.running?.abort();
    this.running = undefined;
  }

  private async withRun<T>(label: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    this.cancelRun();
    const controller = new AbortController();
    this.running = controller;
    this.post({ command: "busy", busy: true, label });
    try {
      return await fn(controller.signal);
    } finally {
      if (this.running === controller) {
        this.running = undefined;
        this.post({ command: "busy", busy: false });
      }
    }
  }

  private async handleMessage(msg: { command?: string; [k: string]: unknown }): Promise<void> {
    const problem = this.mode.kind === "problem" ? PROBLEMS.find((p) => p.id === this.mode.id) : undefined;

    switch (msg.command) {
      case "open": {
        const kind = msg.kind === "lesson" ? "lesson" : "problem";
        if (typeof msg.id === "string") ProblemPanel.show(this.ctx, this.progress, { kind, id: msg.id });
        return;
      }
      case "toggleLesson":
        if (this.mode.kind === "lesson") await this.progress.setLessonCompleted(this.mode.id, msg.done === true);
        return;
      case "draft":
        if (problem && typeof msg.code === "string") await this.progress.saveDraft(problem.id, msg.code);
        return;
      case "resetCode": {
        if (!problem) return;
        const ok = await vscode.window.showWarningMessage(`Replace your code for "${problem.title}" with the starter code?`, { modal: true }, "Reset");
        if (ok !== "Reset") return;
        await this.progress.saveDraft(problem.id, undefined);
        this.post({ command: "setCode", code: problem.starterCode });
        return;
      }
      case "hint": {
        if (!problem) return;
        if (this.hintIndex < problem.hints.length) {
          this.post({ command: "hint", text: problem.hints[this.hintIndex], index: ++this.hintIndex });
        } else {
          vscode.window.showInformationMessage("No more hints for this problem. Try reviewing the related lesson.");
        }
        return;
      }
      case "run": {
        if (typeof msg.code !== "string") return;
        const code = msg.code;
        if (problem) await this.progress.saveDraft(problem.id, code);
        await this.withRun("Running…", async (signal) => {
          const opts = await runOptions(signal);
          if (!opts) return;
          const res = await runPythonCode(code, opts);
          this.post({ command: "runResult", ...res, timeoutMs: opts.timeoutMs, stderr: res.spawnError ?? res.stderr });
        });
        return;
      }
      case "check": {
        if (!problem || typeof msg.code !== "string") return;
        const code = msg.code;
        await this.progress.saveDraft(problem.id, code);
        await this.withRun("Checking…", async (signal) => {
          const opts = await runOptions(signal);
          if (!opts) return;
          const graded = await gradeSolution(code, problem.functionName, problem.testCases, opts);
          if (graded.run.cancelled) return;

          let loadError = graded.loadError;
          if (!loadError && graded.results.length === 0) {
            loadError = graded.run.timedOut
              ? `Your code ran longer than ${opts.timeoutMs} ms. Check for an infinite loop.`
              : graded.run.spawnError ?? (graded.run.stderr.trim() || "The tests could not be run.");
          }

          // Never reveal inputs or expected values of hidden tests.
          const results = graded.results.map((r, i) =>
            problem.testCases[i]?.hidden ? { pass: r.pass, hidden: true } : r
          );
          const allPassed = !loadError && results.length > 0 && results.every((r) => r.pass);

          this.post({
            command: "checkResult",
            loadError,
            results,
            allPassed,
            stdout: graded.run.stdout,
            stderr: loadError ? "" : graded.run.stderr,
            timedOut: graded.run.timedOut,
            truncated: graded.run.truncated,
            timeoutMs: opts.timeoutMs,
            durationMs: graded.run.durationMs
          });

          if (allPassed && (await this.progress.markSolved(problem.id))) {
            this.celebrate(problem.id, problem.title);
          }
        });
        return;
      }
    }
  }

  private async celebrate(solvedId: string, title: string): Promise<void> {
    const solved = this.progress.getSolved().length;
    const next = PROBLEMS.find((p) => p.id !== solvedId && !this.progress.isSolved(p.id));
    const msg = `Solved "${title}"! ${solved} / ${PROBLEMS.length} problems complete.`;
    const pick = next ? await vscode.window.showInformationMessage(msg, "Next Problem") : await vscode.window.showInformationMessage(`${msg} You've solved everything 🎉`);
    if (pick === "Next Problem" && next) ProblemPanel.show(this.ctx, this.progress, { kind: "problem", id: next.id });
  }

  private reportError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Panel error: ${message}`);
    vscode.window.showErrorMessage(`Python Learner: ${message}`);
    this.post({ command: "busy", busy: false });
  }

  dispose(): void {
    if (ProblemPanel.current === this) ProblemPanel.current = undefined;
    this.cancelRun();
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
