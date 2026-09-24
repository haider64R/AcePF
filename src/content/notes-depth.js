// V1.1 teaching expansions. These add explanations to the validated Notes model;
// runnable sample IDs and the interpreter's source programs stay unchanged.
const p = (text) => ({ type: "paragraph", text });
const code = (text, caption) => ({ type: "code", language: "cpp", text, caption });
const table = (headers, rows, caption) => ({ type: "table", headers, rows, caption });
const list = (...items) => ({ type: "list", items });
const steps = (...items) => ({ type: "steps", items });
const tip = (text) => ({ type: "callout", tone: "tip", text });
const trap = (text) => ({ type: "callout", tone: "trap", text });
const section = (kind, title, ...blocks) => ({ kind, title, blocks });

const expansions = {
  fundamentals: {
    sections: [
      section("details", "Types, literals and storage decisions",
        p("A type controls both the values a variable can store and how an operation is performed. A literal such as 7 is an integer; 7.0 is floating-point; '7' is a character. The assignment destination does not choose the arithmetic type. Decide the operand types first, calculate, then convert the result for storage."),
        table(["Declaration or expression", "What to write in a trace", "Reason"], [
          ["int n = 7;", "n: int = 7", "Initialization creates a known starting value."],
          ["double d = 7 / 2;", "d: double = 3.0", "Integer division produces 3 before storage."],
          ["double d = 7 / 2.0;", "d: double = 3.5", "The integer operand converts for floating division."],
          ["char ch = '7';", "ch: char = '7'", "The character is not the integer 7."],
          ["bool ok = 5;", "ok: bool = true", "A nonzero arithmetic value converts to true."],
        ]),
        p("short, int and long are integral types; float and double store approximations to real numbers. signed and unsigned affect the representable range and mixed comparisons. The Visualizer uses a documented teaching machine, while real C++ widths can vary. For an exam, follow the widths and overflow assumptions printed on the paper. Never assign a predictable answer to signed overflow in portable C++."),
        p("const gives a named object a value that cannot be reassigned through that name. Write its value in the trace, but do not create a later assignment row for it: assigning to a const object is a compile-time error. A declaration such as int count; creates a name without a reliable local starting value, while int count = 0; initializes it. These two forms must not be conflated."),
        trap("An uninitialized local is not a safe zero. If a trace reads it before a write, identify the error rather than inventing a value."),
      ),
      section("worked-example", "Trace input, conversion and output separately",
        code("int main() {\n    int tickets = 5;\n    double each = 2.5;\n    int whole = tickets / 2;\n    double cost = whole * each;\n    cout << whole << \" \" << cost;\n}", "Output: 2 5"),
        table(["Moment", "tickets", "whole", "cost", "Output so far"], [
          ["start", "5", "—", "—", "—"],
          ["tickets / 2", "5", "2", "—", "—"],
          ["whole * each", "5", "2", "5.0", "—"],
          ["cout", "5", "2", "5.0", "2 5"],
        ]),
        p("The decimal-looking destination cost does not turn tickets / 2 into 2.5. cout may print a whole-valued double without a decimal suffix using its default formatting. If cin supplies the initial tickets, replace 5 with the supplied input before tracing the first calculation. Input extraction writes the destination only when it succeeds."),
      ),
    ],
    revision: ["Separate the expression's type from the destination's type.", "Record each successful cin extraction as a write and each cout insertion as exact output."],
  },
  operators: {
    sections: [
      section("details", "Precedence is grouping, not a universal clock",
        p("First add parentheses according to precedence and associativity. Then evaluate values using the language's sequencing rules. For example, 20 - 6 - 2 groups as (20 - 6) - 2, whereas a = b = 3 groups as a = (b = 3). Grouping alone does not permit assuming a left-to-right order for every pair of operands. If multiple unsequenced modifications make a real C++ expression undefined, flag the question instead of manufacturing a trace."),
        table(["Expression", "Reasoning", "Result"], [
          ["7 / 2", "Both operands integral; truncate toward zero", "3"],
          ["-7 / 2", "Integral quotient truncates toward zero", "-3"],
          ["-7 % 2", "Remainder pairs with quotient: -7 = (-3)×2 + (-1)", "-1"],
          ["2 + 3 * 4", "Multiply before adding", "14"],
          ["5 & 3", "0101 AND 0011", "1"],
          ["5 | 3", "0101 OR 0011", "7"],
        ]),
        p("Bitwise &, |, ^, ~ and shifts operate on integer bit patterns; logical &&, || and ! produce truth values. Only && and || short-circuit. Keep logical and bitwise columns separate even when a one-bit example happens to give the same printed digit."),
      ),
      section("worked-example", "Three columns prevent prefix/postfix mistakes",
        code("int a = 5, b = 3, c = 2;\nint x = a++ + ++b * c;\na += x / 3;", "Final state: a = 10, b = 4, c = 2, x = 13"),
        table(["Subexpression", "Value contributed", "State change"], [
          ["a++", "5", "a: 5 → 6"],
          ["++b", "4", "b: 3 → 4"],
          ["++b * c", "8", "none"],
          ["a++ + ++b * c", "13", "x becomes 13"],
          ["x / 3", "4", "integer quotient"],
          ["a += 4", "10", "a: 6 → 10"],
        ]),
        p("For a compound assignment, read the destination's current value, compute the right side, apply the operation, then store. In a short-circuit condition, write ‘skipped’ over the entire unevaluated operand; its increments, calls, and array accesses do not occur. In a ternary expression only the chosen arm runs, even though both arms can affect the common result type."),
      ),
    ],
    revision: ["Use a value column and a state-change column for every ++ or --.", "Treat logical short-circuit as an execution decision, not merely a Boolean shortcut."],
  },
  selection: {
    sections: [
      section("details", "Nesting, the nearest else, and switch entry",
        p("Indentation helps humans but braces determine C++ blocks. Without braces, an else attaches to the nearest unmatched if. For nested decisions, mark each condition as it runs and draw the path through only the selected statements. A false outer if means its inner condition is never evaluated."),
        code("int a = 1, b = 0, result = 0;\nif (a > 0)\n    if (b > 0) result = 1;\n    else result = 2;", "The else belongs to if (b > 0); result becomes 2."),
        p("switch evaluates its controlling expression once, jumps to the matching case label or default, then continues in source order. A case label is an entry point, not an implicit branch boundary. A break leaves only the nearest enclosing switch or loop. An if/else-if chain works differently: after one true branch, later branches are not tested."),
        table(["Form", "What is tested", "How execution stops"], [
          ["if / else-if / else", "Conditions top to bottom", "First selected body ends the chain"],
          ["switch", "One integral controlling value", "break, return, or end of switch"],
          ["condition ? left : right", "Condition first", "Only selected arm evaluates"],
        ]),
      ),
      section("worked-example", "Follow a nested decision and a fall-through",
        code("int n = 2, answer = 0;\nif (n > 0) {\n    if (n % 2 == 0) answer = 10;\n    else answer = 20;\n}\nswitch (n) {\n    case 1: answer += 1; break;\n    case 2: answer += 2;\n    default: answer += 3;\n}", "Final answer: 15"),
        table(["Decision", "Actual values", "Effect"], [
          ["n > 0", "2 > 0: true", "Enter outer body"],
          ["n % 2 == 0", "0 == 0: true", "answer: 0 → 10"],
          ["switch (n)", "n = 2", "Enter case 2"],
          ["case 2 body", "no break", "answer: 10 → 12, continue"],
          ["default body", "fall-through", "answer: 12 → 15"],
        ]),
        trap("Do not re-test a switch expression at each later label. After entry, fall-through follows statement order until a break or the end."),
      ),
    ],
    revision: ["Braces, not visual indentation, define a block.", "At a switch, mark one entry label and then read forward until an exit."],
  },
  loops: {
    sections: [
      section("exam-traps", "Why an iteration stops—or does not",
        p("A while condition is checked before its first body; a do-while body runs once before its first check. A for loop runs initialization once, then condition, body, update, condition. On continue inside a for loop, the remainder of the body is skipped but the update still runs. On break, the loop exits immediately without another update or condition. In nested loops, these controls affect the nearest enclosing loop."),
        table(["Control event", "Rest of current body", "For update", "Next condition"], [
          ["Normal body end", "completed", "runs", "runs"],
          ["continue", "skipped", "runs", "runs"],
          ["break", "skipped", "skipped", "outside loop"],
        ]),
        p("For a sentinel loop, decide whether the sentinel is processed before or after the stopping test. For a counting loop, list actual index values rather than trusting an informal ‘runs n times’ claim. A condition using <= instead of < can add one iteration or access a cell beyond an array."),
        trap("A loop variable declared in for initialization has loop scope. An inner loop's initialization runs again for each outer iteration; its previous index does not carry into the next outer pass."),
      ),
    ],
    revision: ["For continue: jump to update, then test the condition; for break: leave the nearest loop.", "Reset inner-loop state for each outer iteration and mark the final false test."],
  },
  functions: {
    sections: [
      section("details", "Lifetime, shadowing and recursive frames",
        p("A function call pauses its caller and creates a fresh set of parameter and local cells. A value parameter starts as a copy. A reference parameter aliases an existing caller cell. Return supplies a value and destroys that call's local cells. The same function called twice—or recursively—has different frames, so write a frame number beside repeated parameter names."),
        code("int sumTo(int n) {\n    if (n == 0) return 0;\n    return n + sumTo(n - 1);\n}\nint main() { cout << sumTo(3); }", "Output: 6"),
        table(["Call frame", "n", "Waits for", "Return"], [
          ["sumTo(3)", "3", "sumTo(2)", "3 + 3 = 6"],
          ["sumTo(2)", "2", "sumTo(1)", "2 + 1 = 3"],
          ["sumTo(1)", "1", "sumTo(0)", "1 + 0 = 1"],
          ["sumTo(0)", "0", "base case", "0"],
        ]),
        p("A block may declare a new variable with an existing name. Inside that block, the nearer declaration hides the outer name; leaving the block restores access to the outer cell. A reference alias is different: it adds a name for the same cell. Array parameters and pointer parameters can also reach caller storage, even though the parameter itself is local."),
        p("A void function performs work but does not supply a value for an enclosing arithmetic expression. A global variable exists outside individual call frames and can be read or changed by functions that can name it; local variables live in their own block or call. Resolve a name from the innermost visible scope outward before deciding which cell changes. At a call, evaluate argument expressions according to the supported teaching model, then bind parameters; do not assume the callee can read the caller's unrelated locals."),
      ),
      section("worked-example", "Value copy, reference alias, shadowed local",
        code("void modify(int x, int& y) {\n    x += 10;\n    y += x;\n    { int y = 100; y++; }\n}\nint main() {\n    int a = 5, b = 2;\n    modify(a, b);\n    cout << a << \" \" << b;\n}", "Output: 5 17"),
        table(["Point", "caller a", "caller b / ref y", "local x", "inner y"], [
          ["call", "5", "2", "5", "—"],
          ["x += 10", "5", "2", "15", "—"],
          ["y += x", "5", "17", "15", "—"],
          ["inner block", "5", "17", "15", "100 → 101"],
          ["return", "5", "17", "gone", "gone"],
        ]),
        tip("Draw separate boxes for caller b and inner y. The reference y points to b until shadowed inside the braces; changing the inner y does not undo b's earlier update."),
      ),
    ],
    revision: ["Mark each recursive call with a distinct frame and unwind returns in reverse order.", "A shadowed local hides an outer name; a reference parameter shares the caller's cell."],
  },
  arrays: {
    sections: [
      section("details", "Shape, initialization and shared elements",
        p("An array's declared size fixes its valid indices from 0 through size−1. A partial initializer fills remaining elements with zero; an array without an initializer does not promise zero for automatic local storage. First evaluate the index expression, then identify one element, then perform the read or write. If the index itself changes, use its value at the moment of the access."),
        code("int a[4] = {3, 5};   // 3, 5, 0, 0\nint grid[2][3] = {{1, 2, 3}, {4, 5, 6}};\nint value = grid[1][2]; // 6", "The first index selects a row; the second selects a column."),
        p("A 2D array is an array of rows, with the last index moving across adjacent elements in row-major storage. Write a row-column grid for values, but keep the loop variables alongside it. When an array is passed to a supported function parameter, the function can mutate the caller's elements; it does not receive an independent full array copy."),
        table(["Expression", "Index calculation", "Cell"], [
          ["a[2 + 1]", "3", "a[3]"],
          ["grid[1][2]", "row 1, column 2", "6"],
          ["a[4]", "4", "invalid for four elements"],
        ]),
      ),
      section("worked-example", "Trace two-dimensional traversal",
        code("int grid[2][2] = {{1, 2}, {3, 4}};\nint total = 0;\nfor (int r = 0; r < 2; r++)\n    for (int c = 0; c < 2; c++)\n        total += grid[r][c];", "Final total: 10"),
        table(["r", "c", "Selected cell", "total before → after"], [
          ["0", "0", "grid[0][0] = 1", "0 → 1"],
          ["0", "1", "grid[0][1] = 2", "1 → 3"],
          ["1", "0", "grid[1][0] = 3", "3 → 6"],
          ["1", "1", "grid[1][1] = 4", "6 → 10"],
        ]),
        p("The inner c starts at zero again when r becomes 1. A char array representing text needs a '\\0' terminator; a four-cell array can hold at most three non-null characters as a C-style string. Do not confuse the array capacity with the number of visible characters."),
      ),
    ],
    revision: ["Write both dimensions and reset the inner index when the outer index changes.", "Partial initialization zero-fills; an uninitialized automatic local array does not."],
  },
  pointers: {
    sections: [
      section("worked-example", "Alias first, then distinguish movement from mutation",
        code("int a[3] = {4, 7, 9};\nint* p = a;\nint* q = p;\n(*p)++;\np++;\n*q += 2;", "Final array: {7, 7, 9}; p points to a[1], q to a[0]."),
        table(["Operation", "p target", "q target", "Array"], [
          ["start", "a[0]", "a[0]", "4, 7, 9"],
          ["(*p)++", "a[0]", "a[0]", "5, 7, 9"],
          ["p++", "a[1]", "a[0]", "5, 7, 9"],
          ["*q += 2", "a[1]", "a[0]", "7, 7, 9"],
        ]),
        p("Copying an address gives two independent pointer cells that initially refer to the same object. Incrementing p changes only p's address; q stays on the first element. Parentheses matter: (*p)++ changes the pointed-to value, while *p++ is parsed as *(p++) and moves p after yielding the old target's value."),
        p("An array of pointers contains several separate address cells. For example, int* choices[2] = {&a, &b}; makes choices[0] refer to a and choices[1] refer to b. Compute the array index before following its arrow. This is different from one pointer to an array's first integer: the pointer array can lead to unrelated objects."),
        trap("A pointer one past the array is useful only as a boundary; dereferencing it is invalid. Pointer arithmetic must stay within the same array allocation or one past it."),
      ),
    ],
    revision: ["For every pointer, draw its own arrow; two arrows may meet at one cell.", "Read *p++ as *(p++), and use (*p)++ when the element should change."],
  },
  "dynamic-memory": {
    sections: [
      section("details", "Ownership is a lifetime question",
        p("A pointer is a variable holding an address; an allocation is a separate object. new int creates one live object and returns its address. new int[n] creates an array of n elements. delete ends a scalar object's lifetime; delete[] ends an array allocation's lifetime. The spelling of the pointer variable does not tell you which form created its target—track the allocation record."),
        table(["Event", "Pointer cells", "Allocation state"], [
          ["p = new int", "p → H1", "H1 live"],
          ["q = p", "p → H1; q → H1", "H1 live, shared target"],
          ["delete p", "both retain old address", "H1 dead; both aliases dangling"],
          ["p = nullptr", "p null; q stale", "H1 still dead"],
        ]),
        p("A leak occurs when a live allocation becomes unreachable, for example by overwriting its only pointer with a new address. A dangling pointer is the opposite lifetime error: its address still exists but the target no longer does. Neither problem is fixed by assuming that delete clears every alias. For the Visualizer, follow its explicit diagnostics; in real C++, invalid use can be undefined behavior."),
      ),
      section("worked-example", "Separate two allocations and all aliases",
        code("int* p = new int;\n*p = 4;\nint* q = p;\n*p += 3;\ncout << *q;\ndelete p;\np = nullptr;", "Output before deletion: 7. q is dangling afterward."),
        steps("Draw heap box H1 with value 4 and p → H1.", "Copy the address: q → H1; there is still only one heap int.", "*p += 3 writes H1 = 7, so *q reads 7.", "delete p crosses out H1. Mark q dangling; p becomes null only on the next assignment."),
        tip("For new[] and delete[], draw the entire array under one allocation identity, with individual indexed elements inside it."),
      ),
    ],
    revision: ["Count live allocations, not pointer names.", "After deletion, mark every alias stale; after reassignment, check whether a live allocation became unreachable."],
  },
  "project-structure": {
    sections: [
      section("details", "Declarations, headers and one definition",
        p("A prototype gives the compiler a function's return and parameter types before a call. A definition includes the body. In a conventional multi-file C++ project, a header shares declarations; a source file defines the function; another source file includes the header and calls it. Matching types matter more than parameter-name spelling in a prototype."),
        table(["File", "Example content", "Trace role"], [
          ["math.h", "int twice(int);", "Makes the signature visible"],
          ["math.cpp", "int twice(int x) { return 2 * x; }", "Contains the executed body"],
          ["main.cpp", "#include \"math.h\" … twice(4)", "Contains the call and its continuation"],
        ]),
        p("A header may be included by more than one source file. Include guards or #pragma once prevent a header's contents being processed repeatedly within a translation unit; they do not call a function or duplicate a runtime frame. Keep implementation definitions where the project structure expects them. The Visualizer models a useful small subset of includes and source mapping; it is not a general preprocessor or linker."),
      ),
      section("worked-example", "Trace across file boundaries without following file order",
        code("// math.h: int twice(int);\n// math.cpp: int twice(int x) { return x * 2; }\n// main.cpp: int main() { int a = twice(4); cout << a; }", "Conceptual three-file layout; output: 8."),
        table(["Execution point", "Current file", "State"], [
          ["call twice(4)", "main.cpp", "main paused; argument 4"],
          ["return x * 2", "math.cpp", "local x = 4; return 8"],
          ["cout << a", "main.cpp", "a = 8; print 8"],
        ]),
        trap("Reading source files from top to bottom is not execution order. Start at main, follow each call to its definition, then return to the caller."),
      ),
    ],
    revision: ["A prototype describes a call; only the matching definition's body executes.", "Include guards control repeated declarations during translation, not runtime branching."],
  },
  "file-handling": {
    sections: [
      section("details", "File bytes and stream state are different ledgers",
        p("Keep one row for each virtual file's contents and another for each stream's open mode, position, and flags. Opening an ofstream normally replaces prior contents; append mode starts writing after existing contents. An ifstream reads without changing file contents. A successful formatted extraction consumes input and changes the destination variable; a failed extraction marks stream failure and must not be treated as a new value."),
        table(["Operation", "Before", "After"], [
          ["ofstream out(\"x.txt\")", "x.txt = old", "x.txt = empty; output open"],
          ["out << 12", "empty", "x.txt = 12; write position advances"],
          ["ifstream in(\"x.txt\")", "x.txt = 12", "same file; input at start"],
          ["in >> n", "n = 0", "n = 12; read position advances"],
          ["second extraction", "no token left", "failure/EOF; do not invent n"],
        ]),
        p("Closing a stream disconnects it but does not erase the file. When a program opens the same path later, use the contents as of that moment. The Visualizer's virtual filesystem is deliberately local to one run; it cannot access the machine's real files. Consult its supported-mode documentation for exact fstream behavior."),
      ),
      section("worked-example", "Why a read-controlled loop stops",
        code("ofstream out(\"nums.txt\");\nout << 2 << \" \" << 4;\nout.close();\nifstream in(\"nums.txt\");\nint n = 0, sum = 0;\nwhile (in >> n) sum += n;\ncout << sum;", "Output: 6; virtual file contents: 2 4."),
        table(["Read attempt", "n", "sum", "Stream result"], [
          ["first", "2", "2", "success"],
          ["second", "4", "6", "success"],
          ["third", "still 4", "6", "fails; loop body skipped"],
        ]),
        trap("EOF is discovered by trying to read past available input. Testing !in.eof() before extraction can enter a body once too often; use the extraction itself as the condition."),
      ),
    ],
    revision: ["Track virtual file contents and stream position/flags separately.", "A failed extraction is a control-flow event, not another data item."],
  },
};

export function deepenNote(note) {
  const extra = expansions[note.topicId];
  if (!extra) return note;
  const sections = note.sections.map((part) => ({ ...part, blocks: [...part.blocks] }));
  for (const addition of extra.sections) {
    const existing = sections.find((part) => part.kind === addition.kind);
    if (existing) existing.blocks.push(...addition.blocks);
    else sections.splice(sections.findIndex((part) => part.kind === "quick-revision"), 0, addition);
  }
  const revision = sections.find((part) => part.kind === "quick-revision");
  revision.blocks.push(list(...extra.revision));
  const sectionOrder = ["overview", "syntax", "execution-model", "dry-run-rules", "details", "common-mistakes", "exam-traps", "worked-example", "quick-revision"];
  sections.sort((a, b) => sectionOrder.indexOf(a.kind) - sectionOrder.indexOf(b.kind));
  return { ...note, sections };
}
