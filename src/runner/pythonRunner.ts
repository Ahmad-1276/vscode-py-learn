import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";
import { GRADER_SOURCE } from "./grader";

// This module is intentionally free of `vscode` imports so it can be unit tested with plain Node.

export interface RunOptions {
  /** Interpreter command, e.g. ["python3"] or ["py", "-3"]. */
  python: string[];
  timeoutMs: number;
  stdin?: string;
  /** Output beyond this many bytes is dropped and the process is killed. */
  maxOutputBytes?: number;
  signal?: AbortSignal;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  cancelled: boolean;
  /** Set when the interpreter could not be started at all (e.g. not installed). */
  spawnError?: string;
  durationMs: number;
}

export interface GradeCase {
  args: unknown[];
  expected: unknown;
}

export interface GradeCaseResult {
  pass: boolean;
  call?: string;
  got?: string;
  expected?: string;
  error?: string;
}

export interface GradeResult {
  run: RunResult;
  /** Present when the code could not be loaded or the function is missing. */
  loadError?: string;
  results: GradeCaseResult[];
}

const DEFAULT_MAX_OUTPUT = 64 * 1024;

function makeWorkDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "py-learn-"));
}

function removeDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}

function execPython(args: string[], cwd: string, opts: RunOptions): Promise<RunResult> {
  const maxOutput = opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
  const start = Date.now();

  return new Promise<RunResult>((resolve) => {
    const [cmd, ...baseArgs] = opts.python;
    const proc = spawn(cmd, [...baseArgs, ...args], {
      cwd,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1", PYTHONUNBUFFERED: "1" },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let timedOut = false;
    let truncated = false;
    let cancelled = false;
    let settled = false;

    const kill = () => { try { proc.kill("SIGKILL"); } catch { /* already gone */ } };
    const timer = setTimeout(() => { timedOut = true; kill(); }, opts.timeoutMs);
    const onAbort = () => { cancelled = true; kill(); };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const collect = (which: "out" | "err") => (chunk: Buffer) => {
      if (truncated) return;
      bytes += chunk.length;
      let text = chunk.toString("utf8");
      if (bytes > maxOutput) {
        truncated = true;
        text = text.slice(0, Math.max(0, text.length - (bytes - maxOutput)));
        kill();
      }
      if (which === "out") stdout += text; else stderr += text;
    };
    proc.stdout.on("data", collect("out"));
    proc.stderr.on("data", collect("err"));

    proc.stdin.on("error", () => { /* process exited before reading stdin */ });
    proc.stdin.end(opts.stdin ?? "");

    const finish = (exitCode: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      resolve({ stdout, stderr, exitCode, timedOut, truncated, cancelled, spawnError, durationMs: Date.now() - start });
    };
    proc.on("error", (err) => finish(null, err.message));
    proc.on("close", (code) => finish(code));
  });
}

/** Run a standalone Python program and capture its output. */
export async function runPythonCode(code: string, opts: RunOptions): Promise<RunResult> {
  const dir = makeWorkDir();
  try {
    fs.writeFileSync(path.join(dir, "main.py"), code, "utf8");
    return await execPython(["main.py"], dir, opts);
  } finally {
    removeDir(dir);
  }
}

/**
 * Grade a solution by calling `functionName` against each test case.
 * Results are written to a file rather than stdout, so student prints cannot spoof a pass.
 */
export async function gradeSolution(code: string, functionName: string, cases: GradeCase[], opts: RunOptions): Promise<GradeResult> {
  const dir = makeWorkDir();
  try {
    const resultFile = path.join(dir, `result-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(path.join(dir, "main.py"), code, "utf8");
    fs.writeFileSync(path.join(dir, "_pylearn_grader.py"), GRADER_SOURCE, "utf8");
    fs.writeFileSync(path.join(dir, "_pylearn_cases.json"), JSON.stringify(cases), "utf8");

    const run = await execPython(["_pylearn_grader.py", functionName, "_pylearn_cases.json", resultFile], dir, opts);

    let parsed: { loadError?: string; results?: GradeCaseResult[] } = {};
    try { parsed = JSON.parse(fs.readFileSync(resultFile, "utf8")); } catch { /* no result: crashed, timed out, etc. */ }
    return { run, loadError: parsed.loadError, results: parsed.results ?? [] };
  } finally {
    removeDir(dir);
  }
}

/** Interpreter candidates to try, in order, when the user has not configured one. */
export function defaultPythonCandidates(platform: NodeJS.Platform = process.platform): string[][] {
  return platform === "win32" ? [["py", "-3"], ["python"], ["python3"]] : [["python3"], ["python"]];
}

/** Return the first candidate that runs `--version` and reports Python 3. */
export async function findWorkingPython(candidates: string[][]): Promise<{ python: string[]; version: string } | undefined> {
  for (const python of candidates) {
    const dir = os.tmpdir();
    const res = await execPython(["--version"], dir, { python, timeoutMs: 5000 });
    const version = (res.stdout + res.stderr).trim();
    if (!res.spawnError && res.exitCode === 0 && /^Python 3\./.test(version)) {
      return { python, version };
    }
  }
  return undefined;
}
