# Learning how your visualizer works

Start here even if you have never studied a compiler.

## 1. Why the editor cannot simply “run C++”

Browsers run JavaScript. We instead read a small, clearly defined part of C++ and implement its rules. This is an interpreter. It never asks AI to guess an answer.

## 2. Tokens are the words

`int score = 5;` becomes five tokens. Each remembers where it came from so an error can point at the right line. See src/engine/lexer.js.

## 3. An AST is a structured sentence

The parser recognizes a declaration whose name is score and whose initial value is 5. For `2 + 3 * 4`, it nests multiplication inside addition. That structure makes precedence explicit. See src/engine/parser.js.

## 4. Values need types

In C++, `5 / 2` is 2 but `5.0 / 2` is 2.5. A number alone cannot tell us which rule to use. We carry its type alongside its value. Conversions belong in one module, not in screen components.

## 5. Events are a recording

The engine explains an operation and saves the state after it. The screen plays this recording. Previous step moves back through saved states; it does not try to undo C++ code. This separation lets us improve the pictures without changing the language rules.

Later sections will explain loops, frames, arrays and pointer lifetimes as those milestones are implemented.

## 6. Loops do not jump randomly

A for-loop first initializes, then tests, executes its body, updates, and tests again. `continue` skips the remaining body but still reaches the update. `break` leaves the nearest loop or switch. The runtime returns a small control signal up through nested blocks until the correct construct handles it. This is shared with return statements rather than implemented as a separate trick for each loop.

## 7. Functions need their own place to work

A stack frame is a record of one active call. Calling the same function twice makes two different frames. A value parameter allocates new storage and copies a value. A reference stores a link to existing storage: changing it changes the original. The caller's local names are not visible inside the callee. Global variables remain visible unless shadowed. Returning destroys local storage, which is why returning a pointer to a local variable is unsafe. Recursion simply repeats the same frame mechanism, with a safety limit of 64 active calls.

## 8. Arrays are neighboring cells

`int marks[4]` reserves four cells of the same type. A 2D array is still one contiguous allocation: row 0 comes before row 1. `matrix[row][col]` has element offset `row * columns + col`. Bounds checking happens separately for each dimension so `matrix[0][3]` cannot silently spill into the next row. Arrays passed to functions share their element storage; they are not copied. Character arrays use the same cells but terminate text with a zero character.

## 9. Pointers hold a location, not the target value

A pointer has its own storage. Its value identifies another allocation and an element offset. `&x` obtains a location; `*p` follows it. Adding one to an int pointer moves one int, not one byte. A one-past pointer may be compared but not read. A const pointer cannot be redirected; a pointer to const cannot modify its target through that pointer. These are different restrictions.

`new` creates heap storage independent of the current block. `delete` ends that allocation's lifetime. It does not automatically clear all pointers to it. Retaining the released object's identity lets this interpreter explain dangling pointers. Undeleted heap objects produce leak events at termination.

## 10. Headers and files mean different things

A source header shares declarations between code files. The project loader expands the supported include patterns and preserves original line numbers. It is not the complete C++ preprocessor.

An ifstream or ofstream accesses a virtual text file in the runtime, never your disk. Each stream keeps a position, opening mode and success state. `while (file >> x)` runs the loop body only when extraction succeeds. Append mode moves writes to the end so old contents stay intact.

## 11. Why validation happens before the recording

`if (false) { const int x = 1; x = 2; }` still contains invalid C++ even though that branch never runs. A validator walks both branches and checks names, types and const rules before execution. Runtime checks handle things that depend on actual values, such as whether an index is outside an array. These two jobs are different.

## 12. Testing the interpreter against a compiler

A test contains a small source program and an expected observation. Some inspect output; others inspect storage, a pointer target, an ended scope, or a file. Tests for feature combinations matter: arrays might work alone but fail when passed into a function.

The differential test compiles 35 carefully chosen programs with native C++17, runs the same programs through our interpreter, and compares output. Matching those examples is evidence, not proof that all C++ is implemented. It deliberately avoids long-width and real-address comparisons where our teaching model differs.

## 13. A sensible reading order

1. Run the Variables example and watch `score + bonus` in Expressions.
2. Read the small lexer test in tests/m1.test.js, then lexer.js.
3. Find the precedence table near the top of parser.js. Compare `2 + 3 * 4` with `(2 + 3) * 4`.
4. Read types.js's integer division and conversion rules.
5. Find Runtime.declare, Runtime.execute and Runtime.emit. These connect PF statements to stored state and explanations.
6. Study Memory.read/write before pointers.js. A pointer is less mysterious when it is a checked location.
7. Follow one event into ui/app.js. Notice that the interface reads the state; it does not decide the result of addition or pointer arithmetic.

Useful exercises: add an example without changing the engine; add a regression test for an out-of-bounds index; trace pass-by-value versus pass-by-reference; deliberately omit delete[] and find the leak event. To add a new language feature, start with a failing test and the supported-language contract.
