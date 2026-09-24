// Seven remaining category guides, using the validated Notes block model.
const p = (text) => ({ type: "paragraph", text });
const code = (text, caption, sampleId) => ({
  type: "code",
  language: "cpp",
  text,
  caption,
  ...(sampleId ? { sampleId } : {}),
});
const list = (...items) => ({ type: "list", items });
const steps = (...items) => ({ type: "steps", items });
const table = (headers, rows, caption) => ({
  type: "table",
  headers,
  rows,
  caption,
});
const pair = (a, b) => ({
  type: "comparison",
  left: { label: a[0], text: a[1] },
  right: { label: b[0], text: b[1] },
});
const memory = (pointers, name, value, caption) => ({
  type: "memory",
  pointers,
  target: { name, value },
  caption,
});
const trap = (text) => ({ type: "callout", tone: "trap", text });
const tip = (text) => ({ type: "callout", tone: "tip", text });
const section = (kind, title, ...blocks) => ({ kind, title, blocks });

export const additionalNotes = [
  {
    id: "fundamentals",
    topicId: "fundamentals",
    title: "Fundamentals",
    lead: "Name the type, record the stored value, then trace each conversion and input or output operation.",
    sections: [
      section(
        "overview",
        "Variables are typed storage",
        p(
          "A declaration creates a named place to store a value. Initialization gives it a starting value; assignment replaces it. In a paper trace, give each variable a row and update that row only when a write executes.",
        ),
        table(
          ["Type", "Typical use", "Trace question"],
          [
            [
              "int / short / long long",
              "whole numbers",
              "Does division truncate?",
            ],
            [
              "float / double",
              "fractional values",
              "Where does rounding occur?",
            ],
            [
              "char",
              "one character",
              "Is arithmetic using its character code?",
            ],
            ["bool", "true or false", "Does cout show 0 or 1?"],
          ],
          "Exact widths vary by implementation; use the paper's stated assumptions when given.",
        ),
      ),
      section(
        "syntax",
        "Input, output and conversions",
        code(
          'int count = 7;\ndouble a = count / 2;   // 3.0\ndouble b = count / 2.0; // 3.5\ncout << a << " " << b;',
        ),
        pair(
          ["7 / 2", "Two integers divide first; result 3."],
          ["7 / 2.0", "An operand is floating-point; result 3.5."],
        ),
        p(
          "cin >> x reads into x before later statements use it. cout prints current values in stream order. A destination type does not retroactively change the arithmetic already performed.",
        ),
      ),
      section(
        "execution-model",
        "Watch the stored value change",
        code(
          'int main() {\n    int n = 7;\n    double half = n / 2.0;\n    n = half;\n    cout << n << " " << half;\n}',
          "Output: 3 3.5",
          "fundamental-conversion",
        ),
        table(
          ["Step", "n", "half"],
          [
            ["initialize", "7", "—"],
            ["n / 2.0", "7", "3.5"],
            ["n = half", "3", "3.5"],
          ],
        ),
        tip(
          "The conversion to int occurs on the final assignment, not in the earlier floating-point division.",
        ),
      ),
      section(
        "dry-run-rules",
        "A four-column trace",
        steps(
          "List each variable's declared type and initial value.",
          "Evaluate the right-hand expression using its operand types.",
          "Apply the conversion required by the destination.",
          "Write the new stored value and append exactly what cout prints.",
        ),
      ),
      section(
        "common-mistakes",
        "Mistakes that change answers",
        list(
          "Treating an uninitialized local as zero.",
          "Assuming double result = 7 / 2 stores 3.5.",
          "Confusing char '7' with integer 7.",
          "Forgetting that a true bool prints 1 by default.",
          "Assuming signed overflow has a portable wraparound answer.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Write types beside values before calculating.",
          "Integer / integer truncates toward zero; % gives the integer remainder.",
          "Assignment converts the computed value to the destination type.",
          "Signed and unsigned interactions need special care; do not invent a portable result for undefined overflow.",
          "Trace cin and cout in execution order, including spaces and newlines.",
        ),
      ),
    ],
    relatedTopics: [
      "operators.arithmetic.multiply-divide",
      "operators.assignment.simple",
    ],
  },
  {
    id: "selection",
    topicId: "selection",
    title: "Selection & Decisions",
    lead: "Evaluate the condition once, choose a path, and record only the writes on that path.",
    sections: [
      section(
        "overview",
        "A decision chooses executed statements",
        p(
          "An if condition converts to bool. In an if/else-if chain, test conditions from top to bottom and stop at the first true branch. An else belongs to the nearest unmatched if.",
        ),
        table(
          ["Condition", "Result", "Action"],
          [
            ["score >= 80", "false", "try next branch"],
            ["score >= 60", "true", "execute this body"],
            ["else", "not reached", "skip"],
          ],
        ),
      ),
      section(
        "syntax",
        "if, switch and ?: are different tools",
        code(
          'if (n > 0) sign = 1;\nelse if (n < 0) sign = -1;\nelse sign = 0;\n\nswitch (choice) { case 1: cout << "A"; break; default: cout << "?"; }\nint absValue = n < 0 ? -n : n;',
        ),
        pair(
          ["if / else-if", "Conditions may be ranges or compound expressions."],
          [
            "switch",
            "Compare one integral value with case labels; execution may fall through.",
          ],
        ),
      ),
      section(
        "execution-model",
        "Follow the selected path",
        code(
          "int main() {\n    int score = 72, grade = 0;\n    if (score >= 80) grade = 3;\n    else if (score >= 60) grade = 2;\n    else grade = 1;\n    cout << grade;\n}",
          "Output: 2",
          "decision-path",
        ),
        table(
          ["Test", "Value", "Next"],
          [
            ["72 >= 80", "false", "test else-if"],
            ["72 >= 60", "true", "grade = 2"],
            ["else", "skipped", "no write"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Circle the branch that runs",
        steps(
          "Compute operands of the condition, including any side effects.",
          "Write true or false beside the condition.",
          "Follow only the selected body; mark other bodies skipped.",
          "For switch, mark the entry case, then continue until break, return, or the switch ends.",
          "Record resulting variable values before the next statement.",
        ),
      ),
      section(
        "exam-traps",
        "Fall-through and nesting",
        code(
          'int main() {\n    int n = 2;\n    switch (n) {\n        case 1: cout << "A"; break;\n        case 2: cout << "B";\n        default: cout << "C";\n    }\n}',
          "Output: BC",
          "switch-entry",
        ),
        trap(
          "A matching switch case chooses the entry point; it does not automatically stop after that case. A missing break makes later statements run.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Write the actual compared values, then true/false.",
          "An else binds to the nearest unmatched if.",
          "Else-if stops at the first true branch.",
          "Switch can fall through; break exits the switch, not an enclosing loop.",
          "Only one ternary arm evaluates, though the arms can influence the result type.",
        ),
      ),
    ],
    relatedTopics: ["operators.logical.short-circuit", "loops.control.break"],
  },
  {
    id: "functions",
    topicId: "functions",
    title: "Functions & Scope",
    lead: "At a call, pause the caller, create a new frame, map parameters, then return a value.",
    sections: [
      section(
        "overview",
        "A call creates a new frame",
        p(
          "A function's parameters and local variables belong to its call. The caller waits while the callee runs, then receives the returned value. A declaration or prototype states a signature; a definition supplies the body.",
        ),
        table(
          ["Frame", "Names visible", "State"],
          [
            ["main", "a, b", "paused at call"],
            ["add", "x, y, sum", "executing"],
            ["main", "a, b, result", "resumes after return"],
          ],
        ),
      ),
      section(
        "syntax",
        "Value and reference parameters",
        code(
          "int twice(int x) { x *= 2; return x; }\nvoid raise(int& x) { x += 2; }",
        ),
        pair(
          [
            "int x",
            "A fresh local copy; changing it does not change the caller's variable.",
          ],
          [
            "int& x",
            "A second name for the caller's object; changing it changes the caller.",
          ],
        ),
      ),
      section(
        "execution-model",
        "Map arguments before running the body",
        code(
          'int bump(int x, int& y) {\n    x += 3;\n    y += x;\n    return x;\n}\nint main() {\n    int a = 2, b = 4;\n    int result = bump(a, b);\n    cout << a << " " << b << " " << result;\n}',
          "Output: 2 9 5",
          "call-frames",
        ),
        table(
          ["Moment", "caller a", "caller b / ref y", "local x"],
          [
            ["call", "2", "4", "2"],
            ["x += 3", "2", "4", "5"],
            ["y += x", "2", "9", "5"],
            ["return", "2", "9", "gone"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Stack a call on paper",
        steps(
          "Evaluate the arguments at the call site.",
          "Make a new frame; copy value parameters and draw aliases for references.",
          "Run the callee body, including local shadowing and nested calls.",
          "Record the returned value, destroy the frame, and resume the caller after the call.",
        ),
        trap(
          "A local with the same spelling as a caller variable is a different cell. Only a reference, pointer, or shared array storage reaches the caller's object.",
        ),
      ),
      section(
        "common-mistakes",
        "Call-order traps",
        list(
          "Treating a value parameter as a caller alias.",
          "Forgetting a reference parameter changes caller storage.",
          "Using a callee local after its frame returns.",
          "Skipping the return value when a call is nested inside a larger expression.",
          "Assuming all recursive calls share one set of locals.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Prototype: name, return type, and parameter types; definition adds the body.",
          "One call means one frame and one set of locals.",
          "Value parameter copies; reference parameter aliases.",
          "A return exits that call and supplies a value to its caller.",
          "Track scope and shadowing by cell identity, not spelling alone.",
        ),
      ),
    ],
    relatedTopics: [
      "arrays.parameters.shared-storage",
      "pointers.parameters.by-pointer",
    ],
  },
  {
    id: "arrays",
    topicId: "arrays",
    title: "Arrays & Matrices",
    lead: "Track each indexed cell separately and make the index value explicit before every access.",
    sections: [
      section(
        "overview",
        "One name, many cells",
        p(
          "An array has a fixed number of elements. Each index selects one cell, starting at zero. In a dry run, first compute the index, then read or write that cell; do not replace the whole array row when only one element changes.",
        ),
        table(
          ["Index", "0", "1", "2"],
          [
            ["a before", "4", "7", "9"],
            ["a after a[1] += 3", "4", "10", "9"],
          ],
        ),
      ),
      section(
        "syntax",
        "1D, characters, and 2D",
        code(
          "int a[3] = {4, 7, 9};\na[1] += 3;\nchar word[4] = {'C', '+', '+', '\\0'};\nint grid[2][2] = {{1, 2}, {3, 4}};\nint last = grid[1][1];",
        ),
        p(
          "A char array used as a C-style string ends at the first '\\0'. For grid[r][c], compute r and c independently. Rows occupy adjacent runs of elements in row-major order.",
        ),
      ),
      section(
        "execution-model",
        "A loop changes one element at a time",
        code(
          'int main() {\n    int a[3] = {4, 7, 9};\n    for (int i = 0; i < 3; i++) a[i] += i;\n    cout << a[0] << " " << a[1] << " " << a[2];\n}',
          "Output: 4 8 11",
          "array-cells",
        ),
        table(
          ["i", "selected cell", "before → after"],
          [
            ["0", "a[0]", "4 → 4"],
            ["1", "a[1]", "7 → 8"],
            ["2", "a[2]", "9 → 11"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Index-first procedure",
        steps(
          "Draw a cell for every array element, labelled from 0 to size−1.",
          "At each access, evaluate the index with current variable values.",
          "Read or update exactly that cell.",
          "For a 2D array, use a row/column grid and reset the inner column loop each row.",
          "When passed to a function, track shared element storage rather than copying the whole array.",
        ),
      ),
      section(
        "exam-traps",
        "Bounds and termination",
        pair(
          ["int a[3]", "Valid indexes are 0, 1, 2; a[3] is outside the array."],
          [
            "char text[4]",
            "At most three visible characters fit if one cell stores '\\0'.",
          ],
        ),
        trap(
          "An index equal to the array length is out of bounds. A pointer one past the array can exist, but dereferencing it is invalid.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Use zero-based indexes and write the valid range.",
          "Compute indexes before accessing cells.",
          "A loop may update only a subset of elements; show unchanged cells too in the final state.",
          "2D arrays are row-major in storage; grid[r][c] is one cell.",
          "C-style text requires a null terminator; array parameters can share the caller's elements.",
        ),
      ),
    ],
    relatedTopics: ["loops.nested.inner-outer", "pointers.arithmetic.arrays"],
  },
  {
    id: "dynamic-memory",
    topicId: "dynamic-memory",
    title: "Dynamic Memory",
    lead: "Track allocation lifetime separately from pointer names: a pointer can outlive its target.",
    sections: [
      section(
        "overview",
        "Stack name, heap object",
        p(
          "new creates storage with a lifetime that lasts until the matching delete. The pointer variable itself may be local while the allocation it targets lives on the heap. Draw an arrow to an allocation box and label whether that box is alive.",
        ),
        memory(
          ["p"],
          "heap int",
          "4 → 7",
          "delete ends the box's lifetime; setting p=nullptr then removes the stale arrow.",
        ),
      ),
      section(
        "syntax",
        "Match creation and release",
        code(
          "int* one = new int;\n*one = 4;\ndelete one;\none = nullptr;\n\nint* many = new int[3];\ndelete[] many;\nmany = nullptr;",
        ),
        pair(
          ["new / delete", "One object; use scalar delete."],
          ["new[] / delete[]", "Array allocation; use delete[]."],
        ),
        trap(
          "delete does not automatically set aliases to nullptr. Every pointer still holding the old address is dangling.",
        ),
      ),
      section(
        "execution-model",
        "An allocation's four states",
        code(
          "int main() {\n    int* p = new int;\n    *p = 4;\n    *p += 3;\n    cout << *p;\n    delete p;\n    p = nullptr;\n}",
          "Output: 7",
          "heap-lifetime",
        ),
        table(
          ["Moment", "p", "allocation"],
          [
            ["new", "points to object", "alive"],
            ["*p += 3", "same address", "alive, value 7"],
            ["delete p", "old address", "dead"],
            ["p = nullptr", "no target", "dead"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Draw, cross out, redirect",
        steps(
          "Draw each new allocation as a distinct heap box and point the returned pointer at it.",
          "Apply writes through pointers to the target box, not to the pointer name.",
          "On delete or delete[], cross out the allocation and mark all aliases dangling.",
          "On p = nullptr, erase only p's arrow; it does not revive or free another allocation.",
          "At function/scope exit, check whether any live allocation has lost all owning paths.",
        ),
      ),
      section(
        "common-mistakes",
        "Lifetime errors",
        list(
          "Dereferencing after delete (use-after-free).",
          "Deleting the same allocation twice.",
          "Using delete for new[] or delete[] for new.",
          "Overwriting the only pointer to a live allocation (leak).",
          "Thinking nullptr assignment itself releases a still-live allocation.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Distinguish the pointer cell from the heap allocation.",
          "new pairs with delete; new[] pairs with delete[].",
          "Deleting ends target lifetime, not all pointer values.",
          "A dangling pointer is unsafe to dereference; nullptr has no target.",
          "A leaked allocation remains live but unreachable by the program.",
        ),
      ),
    ],
    relatedTopics: [
      "pointers.aliasing.shared-storage",
      "functions.scope.local",
    ],
  },
  {
    id: "project-structure",
    topicId: "project-structure",
    title: "Headers & Multiple Files",
    lead: "Follow declarations to definitions, then trace one program across source files.",
    sections: [
      section(
        "overview",
        "One program can have several files",
        p(
          "A declaration tells a source file that a function exists; its definition supplies the body. A header can share a declaration, while a .cpp file supplies the definition. The Visualizer maps executed lines back to the appropriate source file.",
        ),
        table(
          ["File", "Role"],
          [
            ["math.h", "prototype: int twice(int);"],
            ["math.cpp", "definition: int twice(int x) { return x * 2; }"],
            ["main.cpp", "includes header and calls twice(4)"],
          ],
        ),
      ),
      section(
        "syntax",
        "Prototype before use",
        code(
          "int twice(int);            // declaration\nint main() { return twice(4); }\nint twice(int x) { return x * 2; } // definition",
        ),
        p(
          "The parameter names may differ between declaration and definition; the types and return type must agree. The supported project model handles simple headers and source mapping, not the whole C++ preprocessor or linker.",
        ),
      ),
      section(
        "execution-model",
        "One call, one destination",
        code(
          "int twice(int);\nint main() {\n    int answer = twice(4);\n    cout << answer;\n}\nint twice(int x) {\n    return x * 2;\n}",
          "Output: 8",
          "prototype-call",
        ),
        steps(
          "main sees the declaration of twice.",
          "The call passes 4 into twice's parameter x.",
          "The definition computes 8 and returns it.",
          "main resumes and prints 8.",
        ),
      ),
      section(
        "dry-run-rules",
        "Trace across files",
        steps(
          "Locate the declaration used at the call site.",
          "Find the matching definition and map argument values to its parameters.",
          "Step through that definition, even if it lives in another file.",
          "Return to the source line after the call and continue the caller's trace.",
        ),
        tip(
          "Use the built-in multi-file Example to inspect actual source-file switching in the Visualizer.",
        ),
      ),
      section(
        "common-mistakes",
        "Boundary mistakes",
        list(
          "Assuming a prototype itself executes.",
          "Using a declaration whose parameter types do not match the definition.",
          "Forgetting that each function call still gets a frame regardless of source file.",
          "Thinking a header creates a second run of the program.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "Declaration announces; definition implements; call executes.",
          "Match names, return type and parameter types across files.",
          "A header shares declarations in the supported model.",
          "Trace execution order by calls, not by the physical order of files.",
        ),
      ),
    ],
    relatedTopics: [
      "functions.structure.prototypes",
      "functions.calls.arguments",
    ],
  },
  {
    id: "file-handling",
    topicId: "file-handling",
    title: "File Handling",
    lead: "Track stream position and flags alongside the virtual file's contents.",
    sections: [
      section(
        "overview",
        "A stream is a stateful connection",
        p(
          "ofstream writes, ifstream reads, and fstream can do both. A stream has an open/closed state, a position, and flags such as fail and EOF. The Visualizer's files are virtual, so exam tracing should reason about contents and positions, not host disk paths.",
        ),
        table(
          ["Operation", "File effect", "Stream effect"],
          [
            [
              "open for output",
              "create/truncate unless append",
              "position at write start",
            ],
            ["write", "change contents", "advance position"],
            ["read", "contents unchanged", "advance position or set fail/EOF"],
            ["close", "contents remain", "stream disconnects"],
          ],
        ),
      ),
      section(
        "syntax",
        "Open, use, close",
        code(
          '#include <fstream>\nofstream out("data.txt");\nout << 7;\nout.close();\nifstream in("data.txt");\nint value;\nin >> value;\nin.close();',
        ),
        pair(
          [
            "ofstream",
            "Writes to a file; opening normally replaces old content.",
          ],
          ["ifstream", "Reads from a file; extraction can fail at EOF."],
        ),
      ),
      section(
        "execution-model",
        "A small file lifecycle",
        code(
          '#include <fstream>\nint main() {\n    ofstream out("note.txt");\n    out << 7;\n    out.close();\n    ifstream in("note.txt");\n    int n = 0;\n    in >> n;\n    cout << n;\n    in.close();\n}',
          "Output: 7",
          "file-lifecycle",
        ),
        table(
          ["Step", "note.txt", "n"],
          [
            ["out opens", "empty", "—"],
            ["out << 7", "7", "—"],
            ["in >> n", "7", "7"],
          ],
        ),
      ),
      section(
        "dry-run-rules",
        "Trace both stream and file",
        steps(
          "List each virtual filename and its initial contents.",
          "Mark each stream open mode and current read/write position.",
          "After a write, update the file contents; after a read, update the destination and position.",
          "If extraction fails, mark fail/EOF and do not invent a new value.",
          "On close, keep the file contents but end the connection.",
        ),
      ),
      section(
        "exam-traps",
        "EOF is observed by an attempted read",
        trap(
          "Do not use while (!in.eof()) as though EOF predicts the next read. Prefer while (in >> value), which checks whether extraction actually succeeded.",
        ),
        tip(
          "Appending preserves existing contents; ordinary output opening may truncate them. Note the mode before tracing any write.",
        ),
      ),
      section(
        "quick-revision",
        "Before the exam",
        list(
          "ofstream writes; ifstream reads; fstream can do both.",
          "Open mode controls whether old contents survive.",
          "A successful extraction advances the read position; a failed one changes stream state.",
          "EOF/fail are state flags, not extra data values.",
          "The Visualizer's virtual files stand in for disk files within this teaching model.",
        ),
      ),
    ],
    relatedTopics: ["loops.while.condition", "fundamentals.input-output.cin"],
  },
];
