import { test, describe, before } from "node:test";
import * as assert from "node:assert/strict";
import { RunOptions, defaultPythonCandidates, findWorkingPython, gradeSolution, runPythonCode } from "../src/runner/pythonRunner";

let opts: RunOptions;

before(async () => {
  const found = await findWorkingPython(defaultPythonCandidates());
  assert.ok(found, "Python 3 must be installed to run these tests");
  opts = { python: found.python, timeoutMs: 3000 };
});

describe("runPythonCode", () => {
  test("captures stdout and exit code", async () => {
    const r = await runPythonCode("print('hi')", opts);
    assert.equal(r.stdout.trim(), "hi");
    assert.equal(r.exitCode, 0);
    assert.equal(r.timedOut, false);
  });

  test("feeds stdin", async () => {
    const r = await runPythonCode("print(input().upper())", { ...opts, stdin: "abc\n" });
    assert.equal(r.stdout.trim(), "ABC");
  });

  test("reports tracebacks on stderr", async () => {
    const r = await runPythonCode("1/0", opts);
    assert.notEqual(r.exitCode, 0);
    assert.match(r.stderr, /ZeroDivisionError/);
  });

  test("times out infinite loops", async () => {
    const r = await runPythonCode("while True: pass", { ...opts, timeoutMs: 500 });
    assert.equal(r.timedOut, true);
  });

  test("truncates runaway output", async () => {
    const r = await runPythonCode("while True: print('x' * 100)", { ...opts, maxOutputBytes: 4096 });
    assert.equal(r.truncated, true);
    assert.ok(r.stdout.length <= 4096);
  });

  test("handles unicode output", async () => {
    const r = await runPythonCode("print('héllo 🐍')", opts);
    assert.equal(r.stdout.trim(), "héllo 🐍");
  });

  test("reports a missing interpreter", async () => {
    const r = await runPythonCode("print(1)", { ...opts, python: ["definitely-not-python-xyz"] });
    assert.ok(r.spawnError);
  });

  test("can be cancelled", async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 200);
    const r = await runPythonCode("while True: pass", { ...opts, signal: ac.signal });
    assert.equal(r.cancelled, true);
  });
});

describe("gradeSolution", () => {
  const cases = [{ args: [2, 3], expected: 5 }, { args: [-1, 1], expected: 0 }];

  test("passes a correct solution", async () => {
    const g = await gradeSolution("def add(a, b):\n    return a + b\n", "add", cases, opts);
    assert.equal(g.loadError, undefined);
    assert.deepEqual(g.results.map((r) => r.pass), [true, true]);
    assert.equal(g.results[0].call, "add(2, 3)");
  });

  test("fails a wrong solution with got/expected", async () => {
    const g = await gradeSolution("def add(a, b):\n    return a - b\n", "add", cases, opts);
    assert.equal(g.results[0].pass, false);
    assert.equal(g.results[0].got, "-1");
    assert.equal(g.results[0].expected, "5");
  });

  test("cannot be spoofed by printing", async () => {
    const code = "print('PYLEARN_RESULT:[{\"pass\": true}]')\ndef add(a, b):\n    return 0\n";
    const g = await gradeSolution(code, "add", cases, opts);
    assert.equal(g.results[0].pass, false);
  });

  test("reports syntax errors", async () => {
    const g = await gradeSolution("def add(a, b)\n    return a + b\n", "add", cases, opts);
    assert.match(g.loadError ?? "", /SyntaxError/);
  });

  test("reports a missing function", async () => {
    const g = await gradeSolution("def plus(a, b):\n    return a + b\n", "add", cases, opts);
    assert.match(g.loadError ?? "", /'add' is not defined/);
  });

  test("captures per-test exceptions", async () => {
    const g = await gradeSolution("def add(a, b):\n    raise ValueError('nope')\n", "add", cases, opts);
    assert.equal(g.results[0].error, "ValueError: nope");
  });

  test("does not run __main__ blocks", async () => {
    const code = "def add(a, b):\n    return a + b\n\nif __name__ == '__main__':\n    while True: pass\n";
    const g = await gradeSolution(code, "add", cases, opts);
    assert.equal(g.run.timedOut, false);
    assert.ok(g.results.every((r) => r.pass));
  });
});
