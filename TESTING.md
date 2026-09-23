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

## Visualizer V2 verification (2026-09-23)

**147 automated tests pass, zero failures, zero skips.** The 107 original tests and their expectations are unchanged. Added: 39 educational trace/rendering tests and one differential test covering four complete acceptance programs. The original 35-program C++17 comparison remains intact and passes; the four new programs also match native Clang C++17 (39/39 comparisons total). `docs/test-results.txt` contains the complete final test output.

New tests cover contiguous raw-event mapping, unchanged raw snapshots and final states, all detail modes, partial-group mode switching, reversible files/output, actual operands/deltas, precedence/associativity, integer/floating division, prefix/postfix, compound assignment, both short-circuit operators, mixed nested logic, if/else, nested conditions, switch matching/default/fall-through, all three loop forms, nested loops/break/continue, function calls/returns/recursion, value/reference parameters, shadowing, arrays/2D arrays, aliases, allocation/deletion and diagnostics. Every built-in example is derived and its educational views rendered at every group boundary. History rendering is checked against future-value disclosure. No interpreter expectations were weakened.

Final audit corrections: recursive return preparation joins the call rather than creating an empty return step; completed returns retain the definition’s source location; calls inside if/switch resume as decisions; mixed logical operators identify the correct skipped operand; callee locals do not claim to shadow inaccessible caller locals; displayed stream operands retain precedence parentheses. Array reads as well as writes retain access highlighting. All changes are in trace/presentation code and the worker adapter, not C++ semantics.

| Acceptance program | Output | Raw events | Dry Run steps | Reduction |
| --- | --- | ---: | ---: | ---: |
| Nested loops / continue / break | 68 | 430 | 68 | 84.2% |
| Short circuit | 3 2 3 0 1 | 34 | 7 | 79.4% |
| References and shadowing | 5 17 | 34 | 13 | 61.8% |
| Pointer aliases | 30 30 30 | 34 | 9 | 73.5% |

The nested-loop raw trace contains 156 expression-detail events, 138 bookkeeping events and 136 reasoning events. The adapter groups them by semantic boundaries rather than targeting a desired reduction. It records 4 outer and 16 inner iterations, 4 continues and 1 inner break. Reproduce these numbers with `node scripts/trace-report.js`; fixtures live in `tests/acceptance-programs.js`.

Actual browser verification used the local module-worker application: default Dry Run; expanding/selecting Expression Details; raw-event navigation; partial-group mode switching; Next/Previous/restart/timeline; auto play and speed; original source-line highlighting; all eight views; reached iteration history; manual tabs suspending Follow; specialized automatic view selection; challenge prediction/check/reveal; multi-file source selection forward and backward; virtual-file contents before/after a write; cin input; diagnostic jump and rewind; and all four acceptance outputs. A three-file function return highlighted math.cpp line 4 and Previous restored main.cpp. Supplied input 7 produced 14. Both p and q connected to x=30. The short-circuit details showed ++b and ++c skipped.

Desktop and narrow layouts were visually inspected at **actual CSS widths 1600, 433 and 320 pixels**, with document scroll width equal to viewport width. Browser zoom affects the mapping from requested viewport sizes; these are measured content widths. Expression details and loop history scroll within the existing visual panel. No browser errors were recorded. Static syntax checks and the production static build passed, followed by a browser smoke check of the built files.

These are interactive browser checks, not a committed cross-browser automation suite. The existing C++ subset, trace budgets and platform abstractions still apply. A clean test run is evidence for the covered behavior, not proof of full C++ conformance or all possible educational groupings. See ARCHITECTURE.md for snapshot-boundary, nested-history and expression-order limitations.

## Shared content foundation verification (2026-09-23)

The complete suite now has **161 passing tests, zero failures and zero skips**: all 147 preexisting Visualizer tests plus 14 focused content tests. The unchanged native comparison gates pass: 35/35 original curated/generated programs and 4/4 Visualizer acceptance programs match native C++17. `docs/test-results.txt` records the final full run.

The new tests check all ten taxonomy categories and three-level references, stable order and duplicate detection, progressively increasing syllabus ceilings, custom include/exclude rules, derived earliest stage, question type requirements, source provenance, multiple-choice answers, topic/scope/difficulty/type/source/year/assessment/compatibility filtering, and protection against advanced secondary tags slipping through an early scope. They also prove the three migrated Challenge records retain their prompts, exact answers and executable output; all 15 examples have valid concept IDs; and structured Notes accept valid blocks while rejecting broken links and raw HTML blocks.

In the browser, Challenge prediction `34` was accepted and its record revealed the same program in Dry Run. The Examples dialog still listed 15 items; selecting an example loaded its original source and completed a recording. The prior saved example was restored after this check. No browser console errors appeared. Static syntax validation and the production build passed.

## Notes V1 verification (2026-09-23)

The full suite has **169 passing tests, zero failures, zero skips**: the 161-test foundation baseline plus seven Notes model/routing/rendering tests and one native Notes comparison test. The original 35 curated/generated C++17 comparisons and four Visualizer acceptance comparisons still pass; all **11 runnable Notes samples** also match native C++17. `docs/test-results.txt` records the final suite output.

Notes tests check canonical references and block validation; exact note/sample routing; executable sample output against its authored caption; shared-selector related content with direct matches first, bounded lists and no duplicates; sparse-content messages; escaped HTML; and invalid tables, duplicate sample IDs and broken cross-references. The native test compiles each complete sample with Clang C++17 in a temporary directory and compares its output to the unchanged interpreter. Syntax checks and the static build pass.

Actual-browser QA covered the Notes landing, search and no-results state; navigation among all three guides; section jumps and Quick Revision; expression breakdowns, loop tables, pointer arrows, code blocks and related cards; and Open in Visualizer from each guide. The related Example link loaded its canonical source. The related Challenge link opened the existing matching prediction dialog. The built `/dist/notes.html` page linked to `/dist/index.html`; its pointer sample recorded **9 Dry Run steps / 34 raw events**, stepped forward/backward, and produced `30 30 30` at the final timeline position. No browser warning/error logs appeared in that built-flow check.

At measured CSS widths **305px, 354px, 853px and 1219px**, inspected Notes pages had document scroll width equal to viewport width. Tables and code used internal horizontal scrolling at narrow widths. The pointer arrow diagram and section navigation remained readable at 305px; all three full guides were checked at 1219px. This is an interactive smoke test in the available browser, not automated multi-browser coverage or proof of every assistive-technology behavior.

## Assessment corpus verification (2026-09-23)

The complete suite has **176 passing tests, zero failures and zero skips**: the 169-test Notes V1 baseline plus seven corpus tests. The original **35/35** curated/generated C++17 comparisons, **4/4** Dry Run acceptance comparisons, and **11/11** Notes sample comparisons still pass. Corpus verification additionally compiles **17 deterministic output/state questions** as native C++17; every stored answer matches, and all **15** of those marked Visualizer-compatible match the unchanged interpreter. One array-state question is compared at the final stored array, not by empty console output. The remaining two native-verified snippets are correctly marked Visualizer-incompatible because their syntax is outside the current parser subset. An additional logical-error question is Visualizer-compatible with its supplied example input, but not text auto-graded. Static syntax checking and the production build pass.

Corpus tests check the 14-document inventory, duplicate Spring 2024 file, source/page constraints, canonical topic/scope selectors, assessment profile source counts, exact repeated-question references, strict grading/compatibility/verification metadata, undefined-behavior exclusions, and open-ended grading exclusions. Source PDFs were inspected by text extraction and page rendering where extraction was absent or layout-sensitive. The image-only Fall 2023 final was inspected as a page contact sheet but not transcribed question by question; the two-page Fall 2024 scan was rendered and only its visible Question 3 was imported. This is content verification; no UI behavior changed in this task. See [ASSESSMENT_CORPUS.md](ASSESSMENT_CORPUS.md) for omissions and evidence limits.
