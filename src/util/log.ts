import * as vscode from "vscode";

/** Shared "Python Learner" log channel (Output panel → Python Learner). */
export const log = vscode.window.createOutputChannel("Python Learner", { log: true });
