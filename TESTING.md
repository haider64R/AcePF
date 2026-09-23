# Testing and verification

## Commands

```sh
node --test tests/*.test.js
node scripts/check.js
node scripts/build.js
```

No package installation is needed. Native compiler comparisons run when `clang++` is on PATH; absence is reported as a skipped test, not a passing comparison.

## Coverage

* m1: token locations/escapes, arithmetic, conversions, precedence, prefix/postfix, logical short-circuiting, bitwise operations, conditions/ternary, switch/fall-through, const, I/O and immutable snapshots.
* m2: while/do/for, actual for phases, continue/update, nested loops, switch interactions, early return, scope lifetimes and infinite-loop budget.
* m3: prototypes, calls, frame depth, independent recursion frames, globals, caller/callee visibility, value/reference parameters, return/argument errors.
* m4: 1D/2D initialization and traversal, padding, char termination, aliasing function arguments, row-major layout, bounds and constant extents.
* m5: pointer targets/arithmetic, all four const combinations, allocation/deallocation, dynamic arrays with functions, pointer arrays, dangling/null/one-past pointers, leaks and wrong deletion.
* m6: writes, append, EOF loops, stream states, open modes, safe names, immutable virtual-file snapshots, custom headers and source maps.
* adversarial: common ternary types, exact unsigned products, signed division overflow, invalid untaken branches, alias-sensitive sequencing, row bounds after decay, parser/type failures, JavaScript property-name isolation and resource budgets.
* examples: every library example executes successfully. Challenge answers are checked against real engine output.
* differential: 35 curated/generated defined C++17 programs compiled with Clang and compared against the interpreter. Includes arrays, pointers, loops, bitwise operations, short-circuiting, float output and file I/O. Compiler artifacts and virtual-file counterparts live in a disposable temporary directory.

Tests inspect output, typed cells, memory lifetime, scope snapshots, call stack depth, event kinds, pointer targets, stream states and file contents. Regression tests are grouped by milestone; adversarial tests capture audit discoveries.

## Browser verification

Performed through the actual browser interface and module worker, not by mocking execution:

* Milestone 1: editor renders; timeline ends at `Total: 15`.
* Milestone 2: loop example ends at `1 3 6 10`.
* Milestone 3: function call ends at `25`.
* Milestones 4/5: matrix plus heap program ends at `69`; Memory shows released heap storage. An interrupted temporary tab was recreated to finish this check.
* Milestone 6: virtual `marks.txt` visibly contains `72 85` and console shows the same extracted values.
* Pointer visualization: the live connection shows pointer → score, conceptual address 0x1000, access highlighting, and source line 8.
* Challenge: prediction `34` is accepted for postfix puzzle; reveal loads the actual program.
* Restart and statement stepping restore output/state; Why? expands its explanation. Desktop layout keeps controls below the two-pane workspace.

Browser verification is an interactive smoke test, not a committed cross-browser automation suite. Use the following regression checklist when changing the UI: run each example, step backward across a write and scope exit, test all tabs, play/pause at each speed, enter cin input, edit multiple files, reveal a challenge, reload a saved project, and verify a narrow viewport and keyboard-only controls.

## Limits of evidence

The suite does not prove full C++ conformance, exhaustive undefined-behavior detection, or every browser/assistive-technology combination. The runtime intentionally rejects some valid C++ and applies a documented fixed-width teaching model. Expanding the subset requires new positive, negative and interaction tests, with special attention to overload resolution, preprocessing and sequencing if those are ever added.

## Final verification result — 2026-09-23

107 automated tests passed, zero failed and zero skipped. The native comparison test verified all 35 curated/generated C++17 programs. Syntax checks and the static build passed. The final added regressions cover same-type char ternaries, scientific output thresholds, initialization order within local arrays, and invalid floating-to-integer list narrowing.

Additional actual-browser checks: play/pause with speed selection; edit math.cpp and observe output change from 12 to 18; cin transcript `7` produces `14`; runtime diagnostic banner jumps to an uninitialized read, and Previous step restores the preceding state. Saved projects survive reload. Effective content widths of 260px and 354px showed no page overflow after the narrow header/timeline correction; at 1309px the workspace used two columns. Measurements use actual CSS viewport width, since the browser's existing zoom differs from the requested viewport override.

The generated `dist/index.html` was also exercised under `/dist/`: its relative worker executed the Conditions example to `Well done`, and the built language-contract dialog loaded successfully. No browser warning/error logs were reported in this final built-application check.
