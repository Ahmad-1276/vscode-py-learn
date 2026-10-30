import * as vscode from "vscode";
import { LESSONS } from "../data/lessons";
import { ProgressStore } from "../state/progress";

export class LessonTreeItem extends vscode.TreeItem {
  constructor(public readonly lessonId: string, label: string, summary: string, category: string, completed: boolean) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.id = lessonId;
    this.description = category;
    this.tooltip = new vscode.MarkdownString(`**${label}**\n\n${summary}${completed ? "\n\n✔ Completed" : ""}`);
    this.command = { command: "pyLearn.openLesson", title: "Open Lesson", arguments: [lessonId] };
    this.iconPath = completed
      ? new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("testing.iconPassed"))
      : new vscode.ThemeIcon("book");
    this.contextValue = completed ? "lesson.completed" : "lesson";
  }
}

export class LessonTreeProvider implements vscode.TreeDataProvider<LessonTreeItem>, vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private readonly sub: vscode.Disposable;

  constructor(private readonly progress: ProgressStore) {
    this.sub = progress.onDidChange(() => this._onDidChange.fire());
  }

  getTreeItem(element: LessonTreeItem): vscode.TreeItem { return element; }

  getChildren(): LessonTreeItem[] {
    return LESSONS
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((l) => new LessonTreeItem(l.id, l.title, l.summary, l.category, this.progress.isLessonCompleted(l.id)));
  }

  dispose(): void {
    this.sub.dispose();
    this._onDidChange.dispose();
  }
}
