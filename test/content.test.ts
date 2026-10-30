import { test, describe, before } from "node:test";
import * as assert from "node:assert/strict";
import { PROBLEMS } from "../src/data/problems";
import { LESSONS } from "../src/data/lessons";
import { RunOptions, defaultPythonCandidates, findWorkingPython, gradeSolution } from "../src/runner/pythonRunner";

// Reference solutions prove every bundled problem is solvable and its tests are correct.
const SOLUTIONS: Record<string, string> = {
  "p1-add": "def add(a, b):\n    return a + b\n",
  "p2-even": "def is_even(n):\n    return n % 2 == 0\n",
  "p3-max-of-three": "def max_of_three(a, b, c):\n    return max(a, b, c)\n",
  "p4-factorial": "def factorial(n):\n    r = 1\n    for i in range(2, n + 1):\n        r *= i\n    return r\n",
  "p5-reverse-string": "def reverse_string(s):\n    return s[::-1]\n",
  "p6-count-vowels": "def count_vowels(s):\n    return sum(c in 'aeiou' for c in s.lower())\n",
  "p7-sum-list": "def sum_list(nums):\n    return sum(nums)\n",
  "p8-fizzbuzz": "def fizzbuzz(n):\n    return ['FizzBuzz' if i % 15 == 0 else 'Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else str(i) for i in range(1, n + 1)]\n",
  "p9-is-prime": "def is_prime(n):\n    return n >= 2 and all(n % d for d in range(2, int(n ** 0.5) + 1))\n",
  "p10-word-count": "def word_count(s):\n    d = {}\n    for w in s.lower().split():\n        d[w] = d.get(w, 0) + 1\n    return d\n",
  "p11-unique": "def unique(nums):\n    return list(dict.fromkeys(nums))\n",
  "p12-fibonacci": "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n"
};

describe("content integrity", () => {
  test("ids are unique", () => {
    assert.equal(new Set(PROBLEMS.map((p) => p.id)).size, PROBLEMS.length);
    assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  });

  test("lesson practice links point at real problems", () => {
    for (const l of LESSONS) for (const id of l.practice) assert.ok(PROBLEMS.some((p) => p.id === id), `${l.id} -> ${id}`);
  });

  test("every problem has a visible example, hints and a starter definition", () => {
    for (const p of PROBLEMS) {
      assert.ok(p.testCases.some((t) => !t.hidden), p.id);
      assert.ok(p.hints.length > 0, p.id);
      assert.ok(p.starterCode.includes(`def ${p.functionName}(`), p.id);
      assert.ok(!p.starterCode.includes("\\n"), `${p.id} starter code contains a literal \\n`);
    }
  });
});

describe("problems are solvable", () => {
  let opts: RunOptions;
  before(async () => {
    const found = await findWorkingPython(defaultPythonCandidates());
    assert.ok(found);
    opts = { python: found.python, timeoutMs: 5000 };
  });

  for (const p of PROBLEMS) {
    test(`${p.id}: reference solution passes, starter code does not`, async () => {
      const solution = SOLUTIONS[p.id];
      assert.ok(solution, `add a reference solution for ${p.id}`);
      const good = await gradeSolution(solution, p.functionName, p.testCases, opts);
      assert.equal(good.loadError, undefined);
      assert.ok(good.results.length === p.testCases.length && good.results.every((r) => r.pass), JSON.stringify(good.results));

      const starter = await gradeSolution(p.starterCode, p.functionName, p.testCases, opts);
      assert.equal(starter.loadError, undefined, "starter code must at least load");
      assert.ok(starter.results.some((r) => !r.pass));
    });
  }
});
