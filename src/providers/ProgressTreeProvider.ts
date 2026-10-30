import * as vscode from "vscode";
import { LESSONS } from "../data/lessons";
import { PROBLEMS } from "../data/problems";
import { ProgressStore } from "../state/progress";

export class ProgressTreeItem extends vscode.TreeItem {
  constructor(label: string, description?: string, icon?: vscode.ThemeIcon, command?: vscode.Command) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = icon;
    this.command = command;
  }
}

/** Text progress bar, e.g. "■■■■□□□□□□". */
export function bar(fraction: number, width = 10): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return "■".repeat(filled) + "□".repeat(width - filled);
}

export class ProgressTreeProvider implements vscode.TreeDataProvider<ProgressTreeItem>, vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private readonly sub: vscode.Disposable;

  constructor(private readonly progress: ProgressStore) {
    this.sub = progress.onDidChange(() => this._onDidChange.fire());
  }

  getTreeItem(element: ProgressTreeItem): vscode.TreeItem { return element; }

  getChildren(): ProgressTreeItem[] {
    const solved = PROBLEMS.filter((p) => this.progress.isSolved(p.id)).length;
    const lessonsDone = LESSONS.filter((l) => this.progress.isLessonCompleted(l.id)).length;
    const items = [
      new ProgressTreeItem("Problems", `${bar(solved / PROBLEMS.length)} ${solved}/${PROBLEMS.length}`, new vscode.ThemeIcon("beaker")),
      new ProgressTreeItem("Lessons", `${bar(lessonsDone / LESSONS.length)} ${lessonsDone}/${LESSONS.length}`, new vscode.ThemeIcon("book"))
    ];

    const next = PROBLEMS.find((p) => !this.progress.isSolved(p.id));
    items.push(next
      ? new ProgressTreeItem("Continue", next.title, new vscode.ThemeIcon("debug-continue"), { command: "pyLearn.continue", title: "Continue" })
      : new ProgressTreeItem("All problems solved!", "🎉", new vscode.ThemeIcon("star-full", new vscode.ThemeColor("charts.yellow"))));
    return items;
  }

  dispose(): void {
    this.sub.dispose();
    this._onDidChange.dispose();
  }
}
