// Python harness executed next to the student's main.py.
// argv: <function name> <cases json path> <result json path>
export const GRADER_SOURCE = String.raw`
import json
import runpy
import sys
import traceback

fn_name, cases_path, result_path = sys.argv[1], sys.argv[2], sys.argv[3]


def write(obj):
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(obj, f)


def short_error(exc):
    return f"{type(exc).__name__}: {exc}"


with open(cases_path, encoding="utf-8") as f:
    cases = json.load(f)

try:
    # A non-"__main__" name keeps "if __name__ == '__main__':" blocks from running while grading.
    namespace = runpy.run_path("main.py", run_name="__pylearn__")
except SyntaxError as exc:
    write({"loadError": "".join(traceback.format_exception_only(type(exc), exc)).strip()})
    sys.exit(0)
except BaseException as exc:
    write({"loadError": "Your code raised an error while loading: " + short_error(exc)})
    sys.exit(0)

fn = namespace.get(fn_name)
if not callable(fn):
    write({"loadError": f"Function '{fn_name}' is not defined. Keep the name from the starter code."})
    sys.exit(0)

results = []
for case in cases:
    args = case["args"]
    call = f"{fn_name}({', '.join(repr(a) for a in args)})"
    expected = case["expected"]
    entry = {"call": call, "expected": repr(expected)}
    try:
        got = fn(*args)
        entry["got"] = repr(got)
        entry["pass"] = got == expected
    except KeyboardInterrupt:
        raise
    except BaseException as exc:
        entry["pass"] = False
        entry["error"] = short_error(exc)
    results.append(entry)

write({"results": results})
`;
