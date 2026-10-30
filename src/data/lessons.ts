export interface Lesson {
  id: string;
  title: string;
  category: string;
  order: number;
  summary: string;
  /** Problem ids to practise after this lesson. */
  practice: string[];
  content: string; // markdown
}

export const LESSONS: Lesson[] = [
  {
    id: "l1-variables",
    title: "1. Variables & Assignment",
    category: "Basics",
    order: 1,
    practice: ["p1-add"],
    summary: "Store values in named boxes.",
    content: `# Variables & Assignment

A **variable** is a name that refers to a value.

\`\`\`python
x = 5
name = "Alice"
pi = 3.14
\`\`\`

- Use \`=\` to assign.
- Names should be descriptive: \`age\`, not \`a\`.
- Python is dynamically typed: the same name can hold different types.

## Try it
\`\`\`python
greeting = "Hello"
print(greeting + " world")
\`\`\`
`
  },
  {
    id: "l2-types",
    title: "2. Data Types",
    category: "Basics",
    order: 2,
    practice: ["p2-even"],
    summary: "int, float, str, bool, None.",
    content: `# Data Types

| Type | Example | Notes |
|------|---------|-------|
| int | \`42\` | whole numbers |
| float | \`3.14\` | decimals |
| str | \`"hi"\` | text, use quotes |
| bool | \`True\` / \`False\` | logical |
| None | \`None\` | "no value" |

\`\`\`python
print(type(42))       # <class 'int'>
print(int("7") + 1)   # 8
print(str(100))       # "100"
\`\`\`

## Type conversion
Use \`int()\`, \`float()\`, \`str()\`, \`bool()\`.
`
  },
  {
    id: "l3-conditionals",
    title: "3. Conditionals",
    category: "Control Flow",
    order: 3,
    practice: ["p3-max-of-three", "p8-fizzbuzz"],
    summary: "if / elif / else.",
    content: `# Conditionals

\`\`\`python
age = 18
if age >= 18:
    print("adult")
elif age >= 13:
    print("teen")
else:
    print("child")
\`\`\`

- Indentation matters (4 spaces).
- Comparisons: \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\`.
- Logical: \`and\`, \`or\`, \`not\`.
`
  },
  {
    id: "l4-loops",
    title: "4. Loops",
    category: "Control Flow",
    order: 4,
    practice: ["p4-factorial", "p9-is-prime", "p12-fibonacci"],
    summary: "for and while loops.",
    content: `# Loops

## for
\`\`\`python
for i in range(5):
    print(i)   # 0..4

for ch in "abc":
    print(ch)
\`\`\`

## while
\`\`\`python
n = 3
while n > 0:
    print(n)
    n -= 1
\`\`\`

## Useful helpers
- \`range(start, stop, step)\`
- \`break\` exits the loop, \`continue\` skips to next iteration.
`
  },
  {
    id: "l5-functions",
    title: "5. Functions",
    category: "Functions",
    order: 5,
    practice: ["p1-add", "p3-max-of-three"],
    summary: "Define reusable blocks with def.",
    content: `# Functions

\`\`\`python
def greet(name):
    return "Hello, " + name

print(greet("Bob"))   # Hello, Bob
\`\`\`

- \`def\` defines a function.
- \`return\` sends a value back.
- Parameters can have default values: \`def f(x=10)\`.
- Functions without \`return\` return \`None\`.
`
  },
  {
    id: "l6-lists",
    title: "6. Lists",
    category: "Collections",
    order: 6,
    practice: ["p7-sum-list", "p11-unique"],
    summary: "Ordered, mutable sequences.",
    content: `# Lists

\`\`\`python
nums = [1, 2, 3]
nums.append(4)
print(nums[0])      # 1
print(nums[-1])     # 4
print(len(nums))    # 4
\`\`\`

- Indexing starts at 0; negative indices count from the end.
- Slicing: \`nums[1:3]\` -> \`[2,3]\`.
- Common methods: \`append\`, \`pop\`, \`sort\`, \`reverse\`.
`
  },
  {
    id: "l7-dicts",
    title: "7. Dictionaries",
    category: "Collections",
    order: 7,
    practice: ["p10-word-count"],
    summary: "Key-value mappings.",
    content: `# Dictionaries

\`\`\`python
person = {"name": "Alice", "age": 30}
print(person["name"])      # Alice
person["age"] = 31
print("city" in person)   # False
\`\`\`

- Keys must be immutable (str, int, tuple).
- Iterate: \`for key, value in person.items():\`
- \`.get(key, default)\` avoids KeyError.
`
  },
  {
    id: "l8-strings",
    title: "8. Strings",
    category: "Text",
    order: 8,
    practice: ["p5-reverse-string", "p6-count-vowels"],
    summary: "Text manipulation and formatting.",
    content: `# Strings

\`\`\`python
s = "Hello, World!"
print(s.lower())            # hello, world!
print(s.split(","))         # ['Hello', ' World!']
print(s.replace("World","Py"))
\`\`\`

## f-strings
\`\`\`python
name = "Sam"
print(f"Hi {name}, 2+2={2+2}")
\`\`\`

## Common methods
\`strip\`, \`split\`, \`join\`, \`find\`, \`count\`, \`startswith\`.
`
  }
];