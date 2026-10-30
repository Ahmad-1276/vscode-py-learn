import * as vscode from "vscode";

const SOLVED_KEY = "pyLearn.progress";
const LESSONS_KEY = "pyLearn.completedLessons";
const DRAFTS_KEY = "pyLearn.drafts";

/** Persists learner progress and code drafts in global state, and notifies listeners on change. */
export class ProgressStore implements vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly ctx: vscode.ExtensionContext) {
    // Progress follows the user across machines when Settings Sync is on (drafts stay local).
    ctx.globalState.setKeysForSync([SOLVED_KEY, LESSONS_KEY]);
  }

  getSolved(): string[] {
    return this.ctx.globalState.get<string[]>(SOLVED_KEY, []);
  }

  isSolved(id: string): boolean {
    return this.getSolved().includes(id);
  }

  /** Returns true if this call newly solved the problem. */
  async markSolved(id: string): Promise<boolean> {
    const cur = this.getSolved();
    if (cur.includes(id)) return false;
    await this.ctx.globalState.update(SOLVED_KEY, [...cur, id]);
    this._onDidChange.fire();
    return true;
  }

  getCompletedLessons(): string[] {
    return this.ctx.globalState.get<string[]>(LESSONS_KEY, []);
  }

  isLessonCompleted(id: string): boolean {
    return this.getCompletedLessons().includes(id);
  }

  async setLessonCompleted(id: string, done: boolean): Promise<void> {
    const cur = this.getCompletedLessons().filter((x) => x !== id);
    await this.ctx.globalState.update(LESSONS_KEY, done ? [...cur, id] : cur);
    this._onDidChange.fire();
  }

  getDraft(problemId: string): string | undefined {
    return this.ctx.globalState.get<Record<string, string>>(DRAFTS_KEY, {})[problemId];
  }

  async saveDraft(problemId: string, code: string | undefined): Promise<void> {
    const drafts = { ...this.ctx.globalState.get<Record<string, string>>(DRAFTS_KEY, {}) };
    if (code === undefined) delete drafts[problemId]; else drafts[problemId] = code;
    await this.ctx.globalState.update(DRAFTS_KEY, drafts);
  }

  async reset(): Promise<void> {
    await this.ctx.globalState.update(SOLVED_KEY, []);
    await this.ctx.globalState.update(LESSONS_KEY, []);
    await this.ctx.globalState.update(DRAFTS_KEY, {});
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
