import * as vscode from "vscode";
import { RunOptions, defaultPythonCandidates, findWorkingPython } from "./pythonRunner";
import { log } from "../util/log";

let cached: { key: string; python: string[] } | undefined;

function configuredCandidates(): string[][] {
  const configured = vscode.workspace.getConfiguration("pyLearn").get<string>("pythonPath", "").trim();
  if (configured) return [[configured]];

  // Reuse the interpreter picked for the Python extension when there is one.
  // In untrusted workspaces only the user-level value is honoured, so a repo cannot pick the executable.
  const pyCfg = vscode.workspace.getConfiguration("python");
  const fromPythonExt = ((vscode.workspace.isTrusted
    ? pyCfg.get<string>("defaultInterpreterPath")
    : pyCfg.inspect<string>("defaultInterpreterPath")?.globalValue) ?? "").trim();
  const candidates = defaultPythonCandidates();
  if (fromPythonExt && fromPythonExt !== "python") candidates.unshift([fromPythonExt]);
  return candidates;
}

/** Resolve a working Python 3 interpreter, or show an actionable error and return undefined. */
export async function resolvePython(): Promise<string[] | undefined> {
  const candidates = configuredCandidates();
  const key = JSON.stringify(candidates);
  if (cached?.key === key) return cached.python;

  const found = await findWorkingPython(candidates);
  if (found) {
    log.info(`Using ${found.version} via "${found.python.join(" ")}"`);
    cached = { key, python: found.python };
    return found.python;
  }

  log.error(`No working Python 3 found. Tried: ${candidates.map((c) => c.join(" ")).join(", ")}`);
  const choice = await vscode.window.showErrorMessage(
    "Python Learner could not find Python 3. Install Python or set the interpreter path in settings.",
    "Open Settings",
    "Download Python"
  );
  if (choice === "Open Settings") {
    vscode.commands.executeCommand("workbench.action.openSettings", "pyLearn.pythonPath");
  } else if (choice === "Download Python") {
    vscode.env.openExternal(vscode.Uri.parse("https://www.python.org/downloads/"));
  }
  return undefined;
}

export function invalidatePythonCache(): void {
  cached = undefined;
}

export async function runOptions(signal?: AbortSignal): Promise<RunOptions | undefined> {
  const python = await resolvePython();
  if (!python) return undefined;
  const cfg = vscode.workspace.getConfiguration("pyLearn");
  return {
    python,
    timeoutMs: cfg.get<number>("runTimeoutMs", 5000),
    maxOutputBytes: cfg.get<number>("maxOutputKb", 64) * 1024,
    signal
  };
}
