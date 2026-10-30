export interface TestCase {
  args: unknown[];
  expected: unknown;
  hidden?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  description: string;
  functionName: string;
  starterCode: string;
  testCases: TestCase[];
  hints: string[];
}

export const PROBLEMS: Problem[] = [
  {
    id: "p1-add",
    title: "Add Two Numbers",
    difficulty: "easy",
    category: "Basics",
    description: "Write a function `add(a, b)` that returns the sum of `a` and `b`.",
    functionName: "add",
    starterCode: "def add(a, b):\n    # your code here\n    pass\n",
    testCases: [
      { args: [2, 3], expected: 5 },
      { args: [0, 0], expected: 0 },
      { args: [-1, 5], expected: 4 },
      { args: [10, -10], expected: 0, hidden: true }
    ],
    hints: ["Use the + operator.", "Return the result, don't just print it."]
  },
  {
    id: "p2-even",
    title: "Is Even",
    difficulty: "easy",
    category: "Basics",
    description: "Write `is_even(n)` that returns `True` if `n` is even, else `False`.",
    functionName: "is_even",
    starterCode: "def is_even(n):\n    # your code here\n    pass\n",
    testCases: [
      { args: [4], expected: true },
      { args: [7], expected: false },
      { args: [0], expected: true },
      { args: [-3], expected: false, hidden: true }
    ],
    hints: ["Use the modulo operator `%`.", "n % 2 == 0 means even."]
  },
  {
    id: "p3-max-of-three",
    title: "Max of Three",
    difficulty: "easy",
    category: "Conditionals",
    description: "Write `max_of_three(a, b, c)` returning the largest of the three numbers.",
    functionName: "max_of_three",
    starterCode: "def max_of_three(a, b, c):\n    # your code here\n    pass\n",
    testCases: [
      { args: [1, 2, 3], expected: 3 },
      { args: [5, 5, 1], expected: 5 },
      { args: [-1, -2, -3], expected: -1 },
      { args: [0, 0, 0], expected: 0, hidden: true }
    ],
    hints: ["You can use the built-in max().", "Or compare with if/elif."]
  },
  {
    id: "p4-factorial",
    title: "Factorial",
    difficulty: "medium",
    category: "Loops",
    description: "Write `factorial(n)` returning n! (product of 1..n). Assume n >= 0. factorial(0) = 1.",
    functionName: "factorial",
    starterCode: "def factorial(n):\n    # your code here\n    pass\n",
    testCases: [
      { args: [0], expected: 1 },
      { args: [1], expected: 1 },
      { args: [5], expected: 120 },
      { args: [7], expected: 5040, hidden: true }
    ],
    hints: ["Use a loop accumulating a result.", "Start result = 1."]
  },
  {
    id: "p5-reverse-string",
    title: "Reverse a String",
    difficulty: "easy",
    category: "Strings",
    description: "Write `reverse_string(s)` that returns the reversed string.",
    functionName: "reverse_string",
    starterCode: "def reverse_string(s):\n    # your code here\n    pass\n",
    testCases: [
      { args: ["abc"], expected: "cba" },
      { args: [""], expected: "" },
      { args: ["hello"], expected: "olleh" },
      { args: ["a"], expected: "a", hidden: true }
    ],
    hints: ["Python slicing: s[::-1].", "Or build with a loop."]
  },
  {
    id: "p6-count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    category: "Strings",
    description: "Write `count_vowels(s)` counting a,e,i,o,u (case-insensitive).",
    functionName: "count_vowels",
    starterCode: "def count_vowels(s):\n    # your code here\n    pass\n",
    testCases: [
      { args: ["hello"], expected: 2 },
      { args: ["AEIOU"], expected: 5 },
      { args: ["xyz"], expected: 0 },
      { args: ["Programming"], expected: 3, hidden: true }
    ],
    hints: ["Loop over characters.", "Check `ch.lower() in 'aeiou'`."]
  },
  {
    id: "p7-sum-list",
    title: "Sum of List",
    difficulty: "easy",
    category: "Lists",
    description: "Write `sum_list(nums)` returning the sum of all numbers in the list.",
    functionName: "sum_list",
    starterCode: "def sum_list(nums):\n    # your code here\n    pass\n",
    testCases: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[]], expected: 0 },
      { args: [[-1, 5, -2]], expected: 2 },
      { args: [[10]], expected: 10, hidden: true }
    ],
    hints: ["Use built-in sum().", "Or loop and accumulate."]
  },
  {
    id: "p8-fizzbuzz",
    title: "FizzBuzz",
    difficulty: "medium",
    category: "Conditionals",
    description: "Write `fizzbuzz(n)` returning a list of strings for 1..n: 'Fizz' if divisible by 3, 'Buzz' if by 5, 'FizzBuzz' if both, else the number as string.",
    functionName: "fizzbuzz",
    starterCode: "def fizzbuzz(n):\n    # your code here\n    pass\n",
    testCases: [
      { args: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
      { args: [1], expected: ["1"] },
      { args: [15], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] }
    ],
    hints: ["Check divisibility by 15 first.", "Build a list and append."]
  },
  {
    id: "p9-is-prime",
    title: "Is Prime",
    difficulty: "medium",
    category: "Loops",
    description: "Write `is_prime(n)` returning True if n is prime (n >= 2).",
    functionName: "is_prime",
    starterCode: "def is_prime(n):\n    # your code here\n    pass\n",
    testCases: [
      { args: [2], expected: true },
      { args: [1], expected: false },
      { args: [17], expected: true },
      { args: [18], expected: false },
      { args: [97], expected: true, hidden: true }
    ],
    hints: ["Numbers < 2 are not prime.", "Check divisors from 2 to sqrt(n)."]
  },
  {
    id: "p10-word-count",
    title: "Word Count",
    difficulty: "medium",
    category: "Dictionaries",
    description: "Write `word_count(s)` returning a dict mapping each word to its count (lowercased).",
    functionName: "word_count",
    starterCode: "def word_count(s):\n    # your code here\n    pass\n",
    testCases: [
      { args: ["a b a"], expected: { a: 2, b: 1 } },
      { args: [""], expected: {} },
      { args: ["Hello hello HELLO"], expected: { hello: 3 } }
    ],
    hints: ["s.lower().split() gives words.", "Use a dict and increment counts."]
  },
  {
    id: "p11-unique",
    title: "Unique Elements",
    difficulty: "easy",
    category: "Lists",
    description: "Write `unique(nums)` returning a list of unique elements preserving order.",
    functionName: "unique",
    starterCode: "def unique(nums):\n    # your code here\n    pass\n",
    testCases: [
      { args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { args: [[]], expected: [] },
      { args: [[5, 5, 5]], expected: [5] }
    ],
    hints: ["Track seen items in a set.", "Append if not seen."]
  },
  {
    id: "p12-fibonacci",
    title: "Nth Fibonacci",
    difficulty: "medium",
    category: "Loops",
    description: "Write `fib(n)` returning the nth Fibonacci number (fib(0)=0, fib(1)=1).",
    functionName: "fib",
    starterCode: "def fib(n):\n    # your code here\n    pass\n",
    testCases: [
      { args: [0], expected: 0 },
      { args: [1], expected: 1 },
      { args: [6], expected: 8 },
      { args: [10], expected: 55, hidden: true }
    ],
    hints: ["Iterate, keeping two variables.", "a, b = b, a+b."]
  }
];