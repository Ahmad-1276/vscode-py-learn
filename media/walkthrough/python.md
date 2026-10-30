# Python 3 is required

Python Learner runs your code with a **local Python 3 interpreter**.

It looks for one automatically, in this order:

1. The `pyLearn.pythonPath` setting
2. The interpreter selected for the Python extension (`python.defaultInterpreterPath`)
3. `python3`, then `python` (or `py -3` on Windows)

Check your installation from a terminal:

```
python3 --version
```
