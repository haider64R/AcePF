# Engineering log

Initial architecture selected: restricted handwritten parser and typed interpreter; no third-party runtime dependencies. Compiler-assisted differential checks complement unit tests. Milestones are verified sequentially.

## Milestone 1
15 test groups passed. Browser checked: initial editor, timeline to end, output `Total: 15`. Audit: detached snapshots, centralized types and storage, no language evaluation in UI. Found and corrected nested sequencing checks before proceeding. Static semantic analysis remains a separate hardening concern.

## Milestone 2
24 test groups passed. Browser loop example produced `1 3 6 10`. Verified continue/update, nested loops, switch inside loops, empty for clauses and execution limits. Audit: shared control signals and shared scoped execution preserved existing selection behavior.

## Milestone 3
32 test groups passed. Browser function program produced `25`. Audit: parameter binding reuses declaration/storage; frame visibility has a function boundary; reference aliases do not own caller storage. Prototypes checked for conflicting signatures. Recursion uses the same call path, capped at 64 frames.

## Milestone 4
41 test groups passed. Array browser run started successfully; its temporary tab disappeared before final playback inspection. Recovered the tab during milestone 5 and completed combined matrix/heap verification (`69`). Audit: dedicated array initialization and indexing module; every dimension is checked; matrix parameters share the original allocation.

## Milestone 5
52 test groups passed. Browser verified combined matrix access and heap dereference output `69`, and Memory view showed the released allocation with its former value. Audit: pointer arithmetic and allocation operations extracted into a separate module; memory lifetime checks reused for locals and heap. Leak events are warnings, not fabricated cleanup.

## Milestone 6
62 milestone test groups passed. Browser verified virtual-file `marks.txt` contents and extracted console output `72 85`. Audit: VirtualIO owns stream positions and flags; project loader preserves file/line locations and rejects unsupported directives. Files never reach the host filesystem.

## Final audit and resumed verification

The implementation was resumed in place, without repeating milestones. Baseline: 103 tests passed, including all 34 native C++17 comparisons; JavaScript syntax and static build passed. The final audit added whole-AST validation, common ternary typing, exact unsigned integer arithmetic, alias-sensitive sequencing checks, row provenance after pointer decay, input/text/snapshot budgets, and safe scope bindings. Shared side-effect analysis was extracted into effects.js. Source files were formatted for study.

Challenges cover output, final scalar value and array state; their answers are verified against the interpreter. Fifteen built-in examples cover all requested topics. Required documentation now distinguishes implemented support, partial abstractions and exclusions. A final responsive check found and corrected header/timeline overflow with enlarged browser text; static assets and workers use relative URLs so the built application also works under a subpath.

Final regression suite: 107 passed, 0 failed, 0 skipped. All 35 native C++17 comparison programs matched. The closing audit corrected same-type char ternary results, default floating scientific thresholds, local aggregate initialization order, and floating-to-integer list narrowing. Browser workflows verified multi-file edits (output 18), cin input (output 14), error navigation, backward stepping, autoplay and pause. Responsive measurements confirmed no overflow at effective 260px/354px content widths and a two-column layout at 1309px.
