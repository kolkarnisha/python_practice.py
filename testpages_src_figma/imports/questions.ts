// ── TYPES ─────────────────────────────────────────────────────────────────────

export type Diff = 'Beginner' | 'Intermediate' | 'Advanced';

interface BaseQ {
  id: string;
  title: string;
  diff: Diff;
  topic: string;
  concept: string;
  goal: string;
  prompt: string;
}

export interface CodingQ extends BaseQ {
  type: 'coding';
  funcName: string;
  starter: string;
  tests: [any[], any][];
  reference: string;
  explanation: string;
  examples: string[];
}

export interface McqQ extends BaseQ {
  type: 'mcq';
  options: string[];
  correct: number;
  explanation: string;
}

export interface OutputQ extends BaseQ {
  type: 'output';
  code: string;
  expected: string;
  explanation: string;
}

export interface DebugQ extends BaseQ {
  type: 'debug';
  broken: string;
  funcName: string;
  tests: [any[], any][];
  fixed: string;
  explanation: string;
  bugHint: string;
}

export type Q = CodingQ | McqQ | OutputQ | DebugQ;

// ── QUESTION BANK ─────────────────────────────────────────────────────────────

export const QUESTIONS: Q[] = [

  // ═══════════════════════════════════════════════════════ CODING QUESTIONS ══

  {
    id: 'c01', type: 'coding', diff: 'Beginner',
    title: 'Sum Up to N',
    topic: 'Loops & accumulators', concept: 'for loop + range',
    goal: 'Build a running total and understand range boundaries.',
    prompt: 'Write <code>sum_upto(n)</code> that returns the sum of all integers from 1 to n (inclusive) using a loop — not a formula.',
    funcName: 'sum_upto',
    examples: ['sum_upto(5)  →  15', 'sum_upto(1)  →  1', 'sum_upto(0)  →  0'],
    starter: 'def sum_upto(n):\n    total = 0\n    # your loop here\n    return total',
    tests: [[[5], 15], [[1], 1], [[10], 55], [[0], 0]],
    reference: 'def sum_upto(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total',
    explanation: 'Loop i from 1 to n inclusive — use range(1, n+1) since the stop value is excluded. Accumulate into total. This is the standard accumulator pattern: initialise before the loop, update every iteration.',
  },

  {
    id: 'c02', type: 'coding', diff: 'Beginner',
    title: 'Count Even Numbers',
    topic: 'Conditions', concept: 'for + if',
    goal: 'Combine iteration with a boolean condition.',
    prompt: 'Write <code>count_evens(nums)</code> that returns how many numbers in the list are even, using a loop and an if check.',
    funcName: 'count_evens',
    examples: ['count_evens([1,2,3,4,5,6])  →  3', 'count_evens([1,3,5])  →  0'],
    starter: 'def count_evens(nums):\n    count = 0\n    # loop over nums, check divisibility by 2\n    return count',
    tests: [[[[1,2,3,4,5,6]], 3], [[[1,3,5]], 0], [[[]], 0], [[[2,4,6,8]], 4]],
    reference: 'def count_evens(nums):\n    count = 0\n    for n in nums:\n        if n % 2 == 0:\n            count += 1\n    return count',
    explanation: 'n % 2 == 0 checks if dividing by 2 leaves no remainder — the definition of even. Increment a counter whenever it\'s true.',
  },

  {
    id: 'c03', type: 'coding', diff: 'Beginner',
    title: 'FizzBuzz',
    topic: 'Conditions', concept: 'if / elif / else',
    goal: 'Learn condition order and combined divisibility checks.',
    prompt: 'Write <code>fizzbuzz(n)</code> that returns a list of strings for 1..n: "Fizz" if divisible by 3, "Buzz" if by 5, "FizzBuzz" if both, otherwise the number as a string.',
    funcName: 'fizzbuzz',
    examples: ['fizzbuzz(5)  →  ["1","2","Fizz","4","Buzz"]'],
    starter: 'def fizzbuzz(n):\n    result = []\n    for i in range(1, n + 1):\n        # add the right value to result\n        pass\n    return result',
    tests: [
      [[5], ['1','2','Fizz','4','Buzz']],
      [[3], ['1','2','Fizz']],
      [[15], ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz']],
    ],
    reference: 'def fizzbuzz(n):\n    result = []\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            result.append("FizzBuzz")\n        elif i % 3 == 0:\n            result.append("Fizz")\n        elif i % 5 == 0:\n            result.append("Buzz")\n        else:\n            result.append(str(i))\n    return result',
    explanation: 'Check the most specific condition first: divisible by both (i.e. by 15) before checking 3 or 5 alone — otherwise FizzBuzz cases would incorrectly match just "Fizz".',
  },

  {
    id: 'c04', type: 'coding', diff: 'Intermediate',
    title: 'Find the Maximum',
    topic: 'Lists + loops', concept: 'running best',
    goal: 'Compare each item against the current best value.',
    prompt: 'Write <code>find_max(nums)</code> that returns the largest number in a non-empty list, using a loop — do not use the built-in max().',
    funcName: 'find_max',
    examples: ['find_max([3,7,2,9,4])  →  9', 'find_max([-5,-1,-10])  →  -1'],
    starter: 'def find_max(nums):\n    biggest = nums[0]\n    # loop through the rest and compare\n    return biggest',
    tests: [[[[3,7,2,9,4]], 9], [[[-5,-1,-10]], -1], [[[42]], 42], [[[1,2,3,4,5]], 5]],
    reference: 'def find_max(nums):\n    biggest = nums[0]\n    for n in nums[1:]:\n        if n > biggest:\n            biggest = n\n    return biggest',
    explanation: 'Start by assuming the first element is the biggest, then compare every other element against it, updating whenever you find something larger. This "running best" pattern is the basis for min/max/argmax problems.',
  },

  {
    id: 'c05', type: 'coding', diff: 'Intermediate',
    title: 'Is It Prime?',
    topic: 'Loops + conditions', concept: 'early return',
    goal: 'Use early return while checking possible divisors.',
    prompt: 'Write <code>is_prime(n)</code> that returns True if n is prime (greater than 1, divisible only by 1 and itself), False otherwise.',
    funcName: 'is_prime',
    examples: ['is_prime(7)  →  True', 'is_prime(8)  →  False', 'is_prime(1)  →  False'],
    starter: 'def is_prime(n):\n    if n <= 1:\n        return False\n    # loop and check divisibility\n    return True',
    tests: [[[7], true], [[8], false], [[1], false], [[2], true], [[17], true], [[9], false]],
    reference: 'def is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, n):\n        if n % i == 0:\n            return False\n    return True',
    explanation: 'Return False the moment any divisor between 2 and n-1 divides n evenly. If the loop ends without finding one, n is prime. (A faster version checks only up to √n, but this is clearest.)',
  },

  {
    id: 'c06', type: 'coding', diff: 'Intermediate',
    title: 'Reverse a String',
    topic: 'Strings + loops', concept: 'prepend accumulator',
    goal: 'Build a new string one character at a time without slicing.',
    prompt: 'Write <code>reverse_string(s)</code> that returns the string reversed using a loop — no s[::-1] or reversed().',
    funcName: 'reverse_string',
    examples: ['reverse_string("hello")  →  "olleh"', 'reverse_string("ab")  →  "ba"'],
    starter: 'def reverse_string(s):\n    result = ""\n    # build result by prepending each character\n    return result',
    tests: [[['hello'], 'olleh'], [['ab'], 'ba'], [['a'], 'a'], [[''], '']],
    reference: 'def reverse_string(s):\n    result = ""\n    for ch in s:\n        result = ch + result\n    return result',
    explanation: 'Instead of appending each character to the end, prepend it to the front. Walking the string forward but inserting at position 0 naturally builds it backward.',
  },

  {
    id: 'c07', type: 'coding', diff: 'Beginner',
    title: 'Count Vowels',
    topic: 'Strings + conditions', concept: 'membership test',
    goal: 'Loop through characters and test set membership.',
    prompt: 'Write <code>count_vowels(s)</code> that returns the number of vowels (a, e, i, o, u — case-insensitive) in the string.',
    funcName: 'count_vowels',
    examples: ['count_vowels("Hello World")  →  3', 'count_vowels("xyz")  →  0'],
    starter: 'def count_vowels(s):\n    vowels = "aeiou"\n    count = 0\n    # loop over s.lower() and check membership\n    return count',
    tests: [[['Hello World'], 3], [['xyz'], 0], [['AEIOU'], 5], [[''], 0]],
    reference: 'def count_vowels(s):\n    vowels = "aeiou"\n    count = 0\n    for ch in s.lower():\n        if ch in vowels:\n            count += 1\n    return count',
    explanation: 'Lowercase the string first so A and a are treated the same. The `in` operator checks membership in the vowels string — a clean substitute for a chain of OR conditions.',
  },

  {
    id: 'c08', type: 'coding', diff: 'Intermediate',
    title: 'Sum of Digits',
    topic: 'While loops', concept: 'modulo + integer division',
    goal: 'Extract digits using % and // without string conversion.',
    prompt: 'Write <code>sum_digits(n)</code> that returns the sum of the digits of a non-negative integer using a while loop (no string conversion).',
    funcName: 'sum_digits',
    examples: ['sum_digits(1234)  →  10', 'sum_digits(9)  →  9', 'sum_digits(0)  →  0'],
    starter: 'def sum_digits(n):\n    total = 0\n    while n > 0:\n        # peel off the last digit with % and //\n        pass\n    return total',
    tests: [[[1234], 10], [[9], 9], [[0], 0], [[100], 1]],
    reference: 'def sum_digits(n):\n    total = 0\n    while n > 0:\n        total += n % 10\n        n = n // 10\n    return total',
    explanation: 'n % 10 gives the last digit; n // 10 chops it off. Repeating this in a while loop until n reaches 0 visits every digit exactly once.',
  },

  {
    id: 'c09', type: 'coding', diff: 'Beginner',
    title: 'Factorial with a Loop',
    topic: 'Loops + accumulators', concept: 'multiplication accumulator',
    goal: 'Understand why factorial starts at 1 and uses range(1, n+1).',
    prompt: 'Write <code>factorial(n)</code> that returns n! using a loop, not recursion.',
    funcName: 'factorial',
    examples: ['factorial(4)  →  24', 'factorial(0)  →  1'],
    starter: 'def factorial(n):\n    result = 1\n    # multiply result by each number from 1 to n\n    return result',
    tests: [[[4], 24], [[0], 1], [[1], 1], [[5], 120]],
    reference: 'def factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result',
    explanation: 'Same accumulator pattern as summing, but multiplying instead of adding, and starting from 1 (the multiplicative identity). range(1, n+1) correctly handles n=0 since the loop body never runs.',
  },

  {
    id: 'c10', type: 'coding', diff: 'Intermediate',
    title: 'First N Fibonacci Numbers',
    topic: 'Lists + while loops', concept: 'state update',
    goal: 'Maintain the previous two values while building a sequence.',
    prompt: 'Write <code>fibonacci(n)</code> that returns a list of the first n Fibonacci numbers, starting 0, 1, 1, 2, 3, 5 …',
    funcName: 'fibonacci',
    examples: ['fibonacci(5)  →  [0, 1, 1, 2, 3]', 'fibonacci(1)  →  [0]'],
    starter: 'def fibonacci(n):\n    seq = [0, 1]\n    # extend seq until it has n items\n    return seq[:n]',
    tests: [[[5], [0,1,1,2,3]], [[1], [0]], [[2], [0,1]], [[8], [0,1,1,2,3,5,8,13]]],
    reference: 'def fibonacci(n):\n    if n <= 0:\n        return []\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq[:n]',
    explanation: 'Keep appending the sum of the last two elements until the list is long enough, then trim to exactly n items with [:n]. This handles n=0 and n=1 cleanly.',
  },

  {
    id: 'c11', type: 'coding', diff: 'Intermediate',
    title: 'Palindrome Check',
    topic: 'While loops + strings', concept: 'two-pointer technique',
    goal: 'Compare characters from both ends moving inward.',
    prompt: 'Write <code>is_palindrome(s)</code> that returns True if the string reads the same forwards and backwards, using a loop (not slicing).',
    funcName: 'is_palindrome',
    examples: ['is_palindrome("level")  →  True', 'is_palindrome("hello")  →  False'],
    starter: 'def is_palindrome(s):\n    # compare characters from both ends moving inward\n    return True',
    tests: [[['level'], true], [['hello'], false], [['a'], true], [['noon'], true], [['abca'], false]],
    reference: 'def is_palindrome(s):\n    left, right = 0, len(s) - 1\n    while left < right:\n        if s[left] != s[right]:\n            return False\n        left += 1\n        right -= 1\n    return True',
    explanation: 'Two pointers: one starting at the front, one at the back, moving toward each other. Any mismatch means it is not a palindrome; if the pointers meet without finding one, it is.',
  },

  {
    id: 'c12', type: 'coding', diff: 'Beginner',
    title: 'Grade Classifier',
    topic: 'Conditions', concept: 'threshold logic',
    goal: 'Order if/elif thresholds from highest to lowest.',
    prompt: 'Write <code>grade(score)</code> returning: "A" for 90+, "B" for 80–89, "C" for 70–79, "D" for 60–69, else "F".',
    funcName: 'grade',
    examples: ['grade(95)  →  "A"', 'grade(62)  →  "D"', 'grade(40)  →  "F"'],
    starter: 'def grade(score):\n    # chain of if/elif/else on score\n    return "F"',
    tests: [[[95], 'A'], [[85], 'B'], [[72], 'C'], [[62], 'D'], [[40], 'F'], [[90], 'A'], [[89], 'B']],
    reference: 'def grade(score):\n    if score >= 90:\n        return "A"\n    elif score >= 80:\n        return "B"\n    elif score >= 70:\n        return "C"\n    elif score >= 60:\n        return "D"\n    else:\n        return "F"',
    explanation: 'Check thresholds from highest to lowest. Each elif only runs if earlier conditions were False, so a single >= boundary per branch is enough — no range like 80 <= score < 90 needed.',
  },

  // ═══════════════════════════════════════════════════════════ MCQ QUESTIONS ══

  {
    id: 'm01', type: 'mcq', diff: 'Beginner',
    title: 'Range with Step',
    topic: 'Built-in functions', concept: 'range(start, stop, step)',
    goal: 'Understand how range(start, stop, step) works.',
    prompt: 'What is the output of <code>list(range(2, 10, 3))</code>?',
    options: ['[2, 5, 8]', '[2, 4, 6, 8]', '[2, 5, 8, 11]', '[3, 6, 9]'],
    correct: 0,
    explanation: 'range(2, 10, 3) starts at 2 and steps by 3: 2, 5, 8. The next value would be 11 which exceeds the stop of 10, so the sequence ends at 8.',
  },

  {
    id: 'm02', type: 'mcq', diff: 'Beginner',
    title: 'List Method: Remove & Return',
    topic: 'List methods', concept: 'pop()',
    goal: 'Know which list method removes and returns the last item.',
    prompt: 'Which method removes <em>and returns</em> the last item from a list?',
    options: ['.remove()', '.delete()', '.pop()', '.discard()'],
    correct: 2,
    explanation: 'list.pop() removes and returns the last element by default. list.remove(x) removes the first occurrence of a value but returns None. .delete() and .discard() do not exist on lists.',
  },

  {
    id: 'm03', type: 'mcq', diff: 'Beginner',
    title: 'String Slicing',
    topic: 'Strings', concept: 'start:stop slicing',
    goal: 'Understand that the stop index in a slice is exclusive.',
    prompt: 'What does <code>"python"[1:4]</code> return?',
    options: ['"pyt"', '"yth"', '"ytho"', '"ython"'],
    correct: 1,
    explanation: 'Slicing [1:4] takes characters at indices 1, 2, 3 (the stop value 4 is excluded): "y", "t", "h" → "yth".',
  },

  {
    id: 'm04', type: 'mcq', diff: 'Intermediate',
    title: 'Right-Associative Exponentiation',
    topic: 'Operators', concept: '** precedence',
    goal: 'Know that ** is right-associative.',
    prompt: 'What is the result of <code>2 ** 3 ** 2</code>?',
    options: ['64', '512', '36', '8'],
    correct: 1,
    explanation: '** is right-associative: 2 ** (3 ** 2) = 2 ** 9 = 512. Exponentiation chains from the right, unlike most binary operators. 64 would be the wrong answer (2**3)**2 = 8**2 = 64.',
  },

  {
    id: 'm05', type: 'mcq', diff: 'Beginner',
    title: 'Skip Current Iteration',
    topic: 'Control flow', concept: 'continue keyword',
    goal: 'Distinguish continue from break and pass.',
    prompt: 'Which keyword skips the rest of the <em>current</em> loop iteration and moves to the next?',
    options: ['break', 'pass', 'skip', 'continue'],
    correct: 3,
    explanation: 'continue jumps to the next iteration immediately. break exits the loop entirely. pass is a no-op placeholder that does nothing. There is no "skip" keyword in Python.',
  },

  {
    id: 'm06', type: 'mcq', diff: 'Intermediate',
    title: 'Dictionary .get() Default',
    topic: 'Dictionaries', concept: 'get() with default',
    goal: 'Understand that .get() avoids KeyError on missing keys.',
    prompt: 'Given <code>d = {"x": 10}</code>, what does <code>d.get("y", 99)</code> return?',
    options: ['None', 'KeyError', '99', '10'],
    correct: 2,
    explanation: '.get(key, default) returns the default value when the key is not present — it never raises KeyError. Direct access d["y"] would raise a KeyError.',
  },

  {
    id: 'm07', type: 'mcq', diff: 'Beginner',
    title: 'Type Check',
    topic: 'Built-in functions', concept: 'type()',
    goal: 'Know what type() returns for common literals.',
    prompt: 'What does <code>type(3.14)</code> return?',
    options: ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'number'>"],
    correct: 1,
    explanation: '3.14 is a floating-point literal, so type(3.14) returns <class \'float\'>. Python uses float (double-precision IEEE 754) for all decimal numbers; there is no separate "double" type.',
  },

  // ═════════════════════════════════════════════════ OUTPUT PREDICTION ══════

  {
    id: 'o01', type: 'output', diff: 'Beginner',
    title: 'List Comprehension Filter',
    topic: 'List comprehensions', concept: 'filter + transform',
    goal: 'Trace a list comprehension with a conditional.',
    prompt: 'What does this code print? (Enter exact output including brackets)',
    code: 'nums = [1, 2, 3, 4, 5, 6]\nresult = [x * 2 for x in nums if x % 2 == 0]\nprint(result)',
    expected: '[4, 8, 12]',
    explanation: 'The comprehension keeps only even numbers (2, 4, 6) then doubles each: 4, 8, 12. The if clause filters first, then the expression x*2 transforms each selected element.',
  },

  {
    id: 'o02', type: 'output', diff: 'Intermediate',
    title: 'Chained String Methods',
    topic: 'Strings', concept: 'method chaining',
    goal: 'Trace multiple string operations applied left-to-right.',
    prompt: 'What does this code print?',
    code: 'text = "  Hello, World!  "\nprint(text.strip().lower().replace(",", ""))',
    expected: 'hello world!',
    explanation: 'strip() removes leading/trailing spaces → "Hello, World!", lower() lowercases → "hello, world!", replace(",", "") removes commas → "hello world!". Methods chain left-to-right.',
  },

  {
    id: 'o03', type: 'output', diff: 'Beginner',
    title: 'String Concatenation in Loop',
    topic: 'Loops', concept: 'string accumulation',
    goal: 'Trace a for loop that builds a string character by character.',
    prompt: 'What does this code print?',
    code: 'result = ""\nfor i in range(1, 5):\n    result += str(i)\nprint(result)',
    expected: '1234',
    explanation: 'The loop concatenates "1", "2", "3", "4" one by one into result. Printing after the loop gives "1234" — no spaces because only str(i) is appended without separators.',
  },

  {
    id: 'o04', type: 'output', diff: 'Intermediate',
    title: 'Nested List Indexing',
    topic: 'Lists', concept: 'multi-dimensional indexing',
    goal: 'Understand how to access elements in a nested list.',
    prompt: 'What does this code print?',
    code: 'matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nprint(matrix[1][2])\nprint(matrix[0][-1])',
    expected: '6\n3',
    explanation: 'matrix[1][2] is the element at row 1, column 2 → 6. matrix[0][-1] is row 0, last element (index -1) → 3. Negative indices count from the end.',
  },

  // ══════════════════════════════════════════════════════ DEBUG QUESTIONS ════

  {
    id: 'd01', type: 'debug', diff: 'Beginner',
    title: 'Off-by-One in Range',
    topic: 'Loops & range', concept: 'range stop is exclusive',
    goal: 'Recognize that range(1, n) goes 1 to n-1, not 1 to n.',
    prompt: 'This function should return the sum of 1 to n, but it gives the wrong answer for n > 1. Fix the bug.',
    broken: 'def sum_upto(n):\n    total = 0\n    for i in range(1, n):  # bug is here\n        total += i\n    return total',
    funcName: 'sum_upto',
    tests: [[[5], 15], [[10], 55], [[1], 1]],
    fixed: 'def sum_upto(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total',
    bugHint: 'range(1, n) stops before n — it never includes n itself. You need range(1, n + 1).',
    explanation: 'range(start, stop) excludes the stop value. To include n, use range(1, n + 1). This off-by-one is one of the most common Python bugs for beginners.',
  },

  {
    id: 'd02', type: 'debug', diff: 'Beginner',
    title: 'Assignment vs. Equality',
    topic: 'Conditions', concept: '= vs ==',
    goal: 'Distinguish assignment (=) from equality comparison (==).',
    prompt: 'This function should check if two numbers are equal, but it raises a SyntaxError. Fix it.',
    broken: 'def are_equal(a, b):\n    if a = b:  # bug is here\n        return True\n    return False',
    funcName: 'are_equal',
    tests: [[[3, 3], true], [[3, 4], false], [[0, 0], true]],
    fixed: 'def are_equal(a, b):\n    if a == b:\n        return True\n    return False',
    bugHint: 'Inside an if condition, = is the assignment operator and raises SyntaxError. Use == to compare two values.',
    explanation: '= assigns a value to a variable; == compares two values and returns True or False. Inside if, elif, and while, always use == (or other comparison operators like >, <, !=, >=, <=).',
  },

  {
    id: 'd03', type: 'debug', diff: 'Intermediate',
    title: 'Appending to a List',
    topic: 'Lists + loops', concept: 'append vs index assignment',
    goal: 'Understand why you must append to grow a list, not assign by index.',
    prompt: 'This function should return [1, 4, 9, ...] (squares up to n²), but it crashes with an IndexError. Fix it.',
    broken: 'def squares(n):\n    result = []\n    for i in range(1, n + 1):\n        result[i - 1] = i * i  # bug is here\n    return result',
    funcName: 'squares',
    tests: [[[3], [1,4,9]], [[5], [1,4,9,16,25]], [[1], [1]]],
    fixed: 'def squares(n):\n    result = []\n    for i in range(1, n + 1):\n        result.append(i * i)\n    return result',
    bugHint: 'result starts empty. You cannot assign to result[i-1] when that index does not exist yet — use result.append(...) instead.',
    explanation: 'result[i-1] = ... requires the list to already have an element at that index. Since result starts empty, the index 0 does not exist. Use result.append(i * i) to grow the list.',
  },
];
