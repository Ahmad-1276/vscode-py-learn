import * as vscode from "vscode";
import { PROBLEMS, Problem } from "../data/problems";
import { ProgressStore } from "../state/progress";

const DIFFICULTIES: Problem["difficulty"][] = ["easy", "medium", "hard"];

export class DifficultyGroupItem extends vscode.TreeItem {
  constructor(public readonly difficulty: Problem["difficulty"], solved: number, total: number) {
    super(difficulty[0].toUpperCase() + difficulty.slice(1), vscode.TreeItemCollapsibleState.Expanded);
    this.id = `group:${difficulty}`;
    this.description = `${solved} / ${total}`;
    this.contextValue = "difficultyGroup";
  }
}

export class ProblemTreeItem extends vscode.TreeItem {
  constructor(public readonly problem: Problem, solved: boolean) {
    super(problem.title, vscode.TreeItemCollapsibleState.None);
    this.id = problem.id;
    this.description = problem.category;
    this.tooltip = new vscode.MarkdownString(`**${problem.title}** · ${problem.difficulty}\n\n${problem.description}`);
    this.command = { command: "pyLearn.openProblem", title: "Open Problem", arguments: [problem.id] };
    this.iconPath = solved
      ? new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("testing.iconPassed"))
      : new vscode.ThemeIcon("circle-large-outline");
    this.contextValue = solved ? "problem.solved" : "problem";
  }
}

type Node = DifficultyGroupItem | ProblemTreeItem;

export class ProblemTreeProvider implements vscode.TreeDataProvider<Node>, vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private readonly sub: vscode.Disposable;

  constructor(private readonly progress: ProgressStore) {
    this.sub = progress.onDidChange(() => this._onDidChange.fire());
  }

  getTreeItem(element: Node): vscode.TreeItem { return element; }

  getChildren(element?: Node): Node[] {
    if (!element) {
      return DIFFICULTIES
        .map((d) => {
          const items = PROBLEMS.filter((p) => p.difficulty === d);
          return new DifficultyGroupItem(d, items.filter((p) => this.progress.isSolved(p.id)).length, items.length);
        })
        .filter((g) => g.description !== "0 / 0");
    }
    if (element instanceof DifficultyGroupItem) {
      return PROBLEMS.filter((p) => p.difficulty === element.difficulty).map((p) => new ProblemTreeItem(p, this.progress.isSolved(p.id)));
    }
    return [];
  }

  dispose(): void {
    this.sub.dispose();
    this._onDidChange.dispose();
  }
}
