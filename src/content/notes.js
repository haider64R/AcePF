// Authored teaching records. A sampleId lets the existing Visualizer load a
// code block; the renderer decides how every block appears.
import { additionalNotes } from "./notes-extra.js";
const paragraph = (text) => ({ type: "paragraph", text });
const code = (sampleId, text, caption) => ({
  type: "code",
  sampleId,
  language: "cpp",
  text,
  caption,
});
const snippet = (text) => ({ type: "code", language: "cpp", text });
const list = (...items) => ({ type: "list", items });
const steps = (...items) => ({ type: "steps", items });
const trap = (text) => ({ type: "callout", tone: "trap", text });
const tip = (text) => ({ type: "callout", tone: "tip", text });
const table = (headers, rows, caption) => ({
  type: "table",
  headers,
  rows,
  caption,
});
const comparison = (left, right) => ({ type: "comparison", left, right });
const memory = (pointers, name, value, caption) => ({
  type: "memory",
  pointers,
  target: { name, value },
  caption,
});
const section = (kind, title, ...blocks) => ({ kind, title, blocks });

export const notes = [
  {
    id: "operators-expressions",
    topicId: "operators",
    title: "Operators & Expressions",
    lead: "Read the grouping, then the values, then the changes. An operator symbol alone never tells the whole story.",
    sections: [
      section(
        "overview",
        "Expression value versus stored state",
        paragraph(
          "An expression produces a value. Some expressions also change storage. Keep a separate column for the value contributed to the larger expression and the variable's value afterward.",
        ),
        comparison(
          {
            label: "Postfix: a++",
            text: "Use the old value, then increment a.",
          },
          {
            label: "Prefix: ++a",
            text: "Increment a, then use the new value.",
          },
        ),
        code(
          "postfix-prefix",
          'int main() {\n    int a = 5;\n    int x = a++;\n    int b = 5;\n    int y = ++b;\n    cout << x << " " << a << " | " << y << " " << b;\n}',
          "Output: 5 6 | 6 6",
        ),
        table(
          ["Form at 5", "Value used", "Stored afterward"],
          [
            ["a++", "5", "6"],
            ["++a", "6", "6"],
            ["a--", "5", "4"],
            ["--a", "4", "4"],
          ],
        ),
      ),
      section(
        "syntax",
        "Grouping, arithmetic and type",
        paragraph(
          "Parentheses specify grouping. Multiplication, division and remainder group before addition and subtraction. Equal-precedence arithmetic groups left to right; assignment groups right to left. Grouping does not universally specify operand evaluation order.",
        ),
        table(
          ["Higher → lower", "Operators", "Trace cue"],
          [
            ["1", "(), postfix ++/--", "Postfix contributes the old value"],
            ["2", "prefix ++/--, !, ~, unary -, *, &", "Apply to the operand"],
            ["3", "*, /, %", "Before addition"],
            ["4", "+, -", "Left associative"],
            ["5", "<<, >>", "Shift after addition"],
            ["6", "<, <=, >, >=; ==, !=", "Relational before equality"],
            ["7", "bitwise &, then ^, then |", "Each has its own level"],
            ["8", "logical &&, then ||", "Only these short-circuit"],
            ["9", "?:; = and compound assignment", "Choose an arm or store"],
          ],
          "A subset-specific order guide; operators in the same cell are grouped only when their order is stated.",
        ),
        snippet(
          "int result = 2 + 3 * 4;  // 14\nint remainder = 17 % 5; // 2\nint half = 7 / 2;       // 3: integer division\ndouble fraction = 7.0 / 2; // 3.5",
        ),
        tip(
          "double x = 7 / 2; stores 3.0. The integer division happens before conversion to double.",
        ),
      ),
      section(
        "execution-model",
        "A reliable dry-run procedure",
        steps(
          "Circle parentheses and group by precedence.",
          "Write each operand's type and current value.",
          "Evaluate only operands that actually run; track prefix/postfix mutations separately.",
          "Apply conversions, compute the result, then update the destination.",
        ),
        code(
          "division-bitwise",
          'int main() {\n    int a = 7 / 2;\n    double b = 7 / 2;\n    double c = 7.0 / 2;\n    int mask = 5 & 3;\n    int shifted = 3 << 1;\n    cout << a << " " << b << " " << c << " " << mask << " " << shifted;\n}',
          "Output: 3 3 3.5 1 6",
        ),
        paragraph(
          "For mixed int/double arithmetic here, int converts to double before calculation. Binary 0101 & 0011 gives 0001. A valid left shift by one moves bits one position; invalid shifts are diagnosed.",
        ),
      ),
      section(
        "dry-run-rules",
        "Short-circuit and conditional expressions",
        paragraph(
          "For &&, a false left operand decides the result. For ||, a true left operand decides it. The right operand is not evaluated, so its side effects do not happen.",
        ),
        code(
          "short-circuit",
          'int main() {\n    int a = 1, b = 2, c = 3;\n    bool x = (a++ > 5) && (++b > 2);\n    bool y = (++a > 1) || (++c > 3);\n    cout << a << " " << b << " " << c << " " << x << " " << y;\n}',
          "Output: 3 2 3 0 1",
        ),
        table(
          ["Check", "Left result", "Skipped", "State"],
          [
            ["(a++ > 5) && ...", "1 > 5 is false", "++b", "a = 2, b = 2"],
            ["(++a > 1) || ...", "3 > 1 is true", "++c", "a = 3, c = 3"],
          ],
        ),
        paragraph(
          "A comparison yields bool. condition ? whenTrue : whenFalse evaluates only the chosen arm, although the numeric arms can determine a common result type.",
        ),
        snippet(
          "int n = 4;\nint result = n > 2 ? n * 2 : 0; // result is 8; 0 arm is skipped",
        ),
      ),
      section(
        "exam-traps",
        "One line, several effects",
        code(
          "compound-prefix",
          'int main() {\n    int a = 5, b = 3, c = 2;\n    int x = a++ + ++b * c;\n    a += x / 3;\n    cout << x << " " << a << " " << b;\n}',
          "Output: 13 10 4",
        ),
        table(
          ["Part", "Expression value", "State after"],
          [
            ["a++", "5", "a = 6"],
            ["++b", "4", "b = 4"],
            ["++b * c", "4 × 2 = 8", "a = 6, b = 4"],
            ["a++ + ++b * c", "5 + 8 = 13", "x = 13"],
            ["a += x / 3", "13 / 3 = 4", "a = 10"],
          ],
          "This separates grouping from the values contributed and stored; it is not a claim about universal operand evaluation order.",
        ),
        steps(
          "++b changes b to 4 and contributes 4; 4 * 2 is 8.",
          "a++ contributes 5, then a becomes 6; x receives 13.",
          "13 / 3 is integer division: 4. a += 4 changes a to 10.",
        ),
        trap(
          "Do not trace conflicting unsequenced reads and writes such as i++ + i as though they had a guaranteed answer. Split them into statements. The Visualizer rejects some such expressions conservatively.",
        ),
      ),
      section(
        "common-mistakes",
        "Common wrong turns",
        list(
          "Reading a++ as the new value inside the current expression.",
          "Using = where == was intended.",
          "Expecting a double destination to undo integer division.",
          "Treating bitwise & and | as short-circuiting && and ||.",
          "Confusing precedence with guaranteed order of operand evaluation.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Group before calculating; use parentheses to make intent explicit.",
          "For ++ and --, separate the contributed value from stored state.",
          "int / int truncates toward zero; a floating operand gives floating division.",
          "&& skips right when left is false; || skips right when left is true.",
          "Compound assignment updates the left storage after computing the right side.",
          "Bitwise operators act on integer bit patterns, not truth-value control flow.",
        ),
      ),
    ],
    relatedTopics: ["fundamentals.conversions.implicit", "selection.if.if"],
  },
  {
    id: "loops",
    topicId: "loops",
    title: "Loops",
    lead: "A loop is a repeating state transition. Track the condition and changed values on every pass, including the final false check.",
    sections: [
      section(
        "overview",
        "Three ways to repeat",
        table(
          ["Form", "First action", "Test", "Key fact"],
          [
            ["while", "Condition", "Before body", "May run zero times"],
            ["do-while", "Body", "After body", "Runs at least once"],
            ["for", "Initialize", "Before body", "Update follows each body"],
          ],
        ),
        snippet(
          "while (condition) { body; }\ndo { body; } while (condition);\nfor (initialization; condition; update) { body; }",
        ),
        code(
          "while-condition",
          "int main() {\n    int n = 3, total = 0;\n    while (n > 0) {\n        total += n;\n        n--;\n    }\n    cout << total;\n}",
          "Output: 6",
        ),
        table(
          ["Check", "n > 0", "total after body", "n after body"],
          [
            ["n = 3", "true", "3", "2"],
            ["n = 2", "true", "5", "1"],
            ["n = 1", "true", "6", "0"],
            ["n = 0", "false", "unchanged", "body skipped"],
          ],
          "The fourth condition check ends the loop; there is no fourth body execution.",
        ),
      ),
      section(
        "execution-model",
        "The for-loop cycle",
        steps(
          "Initialize once.",
          "Test the condition; if false, leave.",
          "Execute the body for this iteration.",
          "Execute the update, then test again.",
        ),
        code(
          "for-phases",
          "int main() {\n    int total = 0;\n    for (int i = 1; i <= 4; i++) {\n        total += i;\n    }\n    cout << total;\n}",
          "Output: 10",
        ),
        table(
          ["Check", "i", "i <= 4", "total after body", "Update"],
          [
            ["1", "1", "true", "1", "i = 2"],
            ["2", "2", "true", "3", "i = 3"],
            ["3", "3", "true", "6", "i = 4"],
            ["4", "4", "true", "10", "i = 5"],
            ["5", "5", "false", "unchanged", "none"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Build an iteration table",
        steps(
          "Write every variable that can change and its initial value.",
          "Give each condition check a row, including the final false check.",
          "Record body effects in source order, then the update.",
          "For nested loops, label outer and inner indices; reset the inner initializer each outer pass.",
        ),
        code(
          "nested-loop",
          "int main() {\n    int total = 0;\n    for (int i = 1; i <= 2; i++) {\n        for (int j = 1; j <= 3; j++) {\n            total += i * j;\n        }\n    }\n    cout << total;\n}",
          "Output: 18",
        ),
        table(
          ["Outer i", "Inner j", "Added", "total"],
          [
            ["1", "1", "1", "1"],
            ["1", "2", "2", "3"],
            ["1", "3", "3", "6"],
            ["2", "1", "2", "8"],
            ["2", "2", "4", "12"],
            ["2", "3", "6", "18"],
          ],
          "The inner initializer runs again when i becomes 2.",
        ),
      ),
      section(
        "details",
        "Continue and break",
        paragraph(
          "continue skips the remaining body in this iteration. In a for loop, the update still runs before the next condition. break exits the nearest enclosing loop immediately, not every nested loop.",
        ),
        code(
          "loop-control",
          "int main() {\n    int total = 0;\n    for (int i = 1; i <= 4; i++) {\n        if (i == 2) continue;\n        if (i == 4) break;\n        total += i;\n    }\n    cout << total;\n}",
          "Output: 4",
        ),
        table(
          ["i", "Decision", "total", "Next"],
          [
            ["1", "add 1", "1", "update to 2"],
            ["2", "continue", "1", "update to 3"],
            ["3", "add 3", "4", "update to 4"],
            ["4", "break", "4", "exit"],
          ],
        ),
      ),
      section(
        "worked-example",
        "Body-first: do-while",
        code(
          "do-while",
          'int main() {\n    int n = 3;\n    do {\n        cout << n << " ";\n        n--;\n    } while (n < 0);\n}',
          "Output: 3 (with a trailing space)",
        ),
        paragraph(
          "The body prints 3 and changes n to 2 before the first test; 2 < 0 is false.",
        ),
      ),
      section(
        "common-mistakes",
        "Watch the transition",
        list(
          "Forgetting the for update after a normal body or continue.",
          "Omitting the final false condition check.",
          "Thinking break exits both loops in a nested pair.",
          "Forgetting the inner-loop initializer runs anew for each outer pass.",
          "Changing an index in the body and forgetting the loop's update also changes it.",
        ),
        trap(
          "If a while condition can never become false, the loop may not terminate. The Visualizer enforces execution limits; use bounded practice examples.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "for: initialize once → condition → body → update → condition.",
          "while tests before the body; do-while tests after it.",
          "continue in for reaches update; break exits the nearest loop.",
          "Nested inner loops restart for each outer iteration.",
          "Record the final false condition and output only when cout runs.",
        ),
      ),
    ],
    relatedTopics: [
      "operators.comparison.ordering",
      "arrays.one-dimensional.traversal",
    ],
  },
  {
    id: "pointers",
    topicId: "pointers",
    title: "Pointers",
    lead: "Keep the pointer value (an address) separate from the value stored there. Draw arrows before calculating.",
    sections: [
      section(
        "overview",
        "An address is a connection to storage",
        paragraph(
          "int* p declares a pointer to int. &x produces x's address; *p accesses the int at p's current address. Visualizer addresses are conceptual labels, not physical machine addresses.",
        ),
        snippet("int x = 10;\nint* p = &x;\n*p += 5; // x becomes 15"),
        memory(
          ["p"],
          "x",
          "10 → 15",
          "The arrow is p's address value; *p names x's storage.",
        ),
        table(
          ["Expression", "Meaning"],
          [
            ["x", "Stored int"],
            ["&x", "Address of x"],
            ["p", "Address currently stored in p"],
            ["*p", "Value at that address"],
          ],
        ),
      ),
      section(
        "syntax",
        "Declaration, null and const",
        snippet(
          "int* p = &x;        // may redirect or write *p\nconst int* read = &x; // cannot write through read\nint* const fixed = &x; // cannot redirect fixed\nint* empty = nullptr; // no target",
        ),
        paragraph(
          "Check a pointer that might be nullptr before dereferencing it. const on the pointed-to int blocks writes through that pointer; const on the pointer blocks redirection.",
        ),
        trap(
          "int* p, q; declares pointer p and ordinary int q. The * belongs to a declarator, not every name on the line.",
        ),
      ),
      section(
        "execution-model",
        "Two arrows, one cell",
        code(
          "pointer-alias",
          'int main() {\n    int x = 10;\n    int* p = &x;\n    int* q = p;\n    *p += 5;\n    *q *= 2;\n    cout << x << " " << *p << " " << *q;\n}',
          "Output: 30 30 30",
        ),
        memory(
          ["p", "q"],
          "x",
          "10 → 15 → 30",
          "q copies p's address, not x's value.",
        ),
        steps(
          "p receives &x; q receives the same address.",
          "*p += 5 changes x from 10 to 15.",
          "*q *= 2 changes that same x to 30. All three reads see 30.",
        ),
      ),
      section(
        "dry-run-rules",
        "Trace with arrows",
        steps(
          "Write each variable's cell and value.",
          "Draw each pointer arrow or mark it nullptr.",
          "p = &x changes an arrow; *p = value changes the target cell.",
          "p + n moves by n elements within the same array allocation, not n bytes in your table.",
          "If a target dies, mark every alias dangling and do not dereference it.",
        ),
        comparison(
          {
            label: "p += 1",
            text: "Move to the next array element; values stay unchanged.",
          },
          {
            label: "*p += 1",
            text: "Stay at this element; increment its value.",
          },
        ),
        code(
          "pointer-array",
          'int main() {\n    int a[3] = {4, 7, 9};\n    int* p = a;\n    p += 1;\n    *p += 1;\n    cout << a[0] << " " << a[1] << " " << a[2];\n}',
          "Output: 4 8 9",
        ),
        table(
          ["Step", "p points to", "a[0]", "a[1]", "a[2]"],
          [
            ["start", "a[0]", "4", "7", "9"],
            ["p += 1", "a[1]", "4", "7", "9"],
            ["*p += 1", "a[1]", "4", "8", "9"],
          ],
        ),
      ),
      section(
        "details",
        "Arrays and pointer parameters",
        paragraph(
          "In the supported subset, a one-dimensional array can provide a pointer to its first element. a[i] and *(a + i) access the same valid element. A one-past-end pointer may be formed, but must not be dereferenced.",
        ),
        snippet(
          "void addOne(int* value) { *value += 1; }\nint x = 4;\naddOne(&x); // x becomes 5",
        ),
        paragraph(
          "The function receives a copy of the pointer value, but its address still leads to the caller's storage. Mutating *value changes x; redirecting the local parameter would not redirect a caller pointer.",
        ),
      ),
      section(
        "common-mistakes",
        "Danger signs",
        list(
          "Dereferencing nullptr or an uninitialized pointer.",
          "Thinking q = p copies the pointee instead of the address.",
          "Confusing p++ with (*p)++.",
          "Moving outside an array or dereferencing one-past-end.",
          "Using an alias after its local target expires or after delete.",
        ),
        trap(
          "Never memorize Visualizer address digits for an exam. Reason about which object and element an arrow targets.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "&x is an address; p stores an address; *p accesses the target.",
          "Two pointers can alias one cell; mutations through either are visible through both.",
          "p + 1 moves one element; *p + 1 computes a value; *p += 1 mutates a value.",
          "nullptr has no pointee. Never dereference it.",
          "Distinguish pointer-to-const from const-pointer restrictions.",
          "Track target lifetime as well as arrow direction.",
        ),
      ),
    ],
    relatedTopics: [
      "arrays.one-dimensional.indexing",
      "dynamic-memory.lifetime",
    ],
  },
  ...additionalNotes,
];
