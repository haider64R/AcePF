# Supported C++ contract

This is a first-semester teaching subset inspired by C++17. It is not a full compiler, preprocessor, linker or memory sanitizer. The following describes the implemented behavior, not future intentions.

## SUPPORTED

### Values and expressions

* int, short, long, float, double, char, bool; signed/unsigned integer forms, including `unsigned` and `signed` alone as int.
* Scalar declarations with `=` initialization, multiple declarators, assignment and const storage. Uninitialized locals are tracked explicitly; global primitive storage is zero-initialized.
* Decimal, hexadecimal and binary numeric literals; single U, L or F suffixes; booleans, nullptr, ASCII character/string literals and escapes `\n`, `\t`, `\r`, `\0`, `\\`, `\'`, `\"`.
* Arithmetic `+ - * / %`; requested compound assignments plus bitwise compound assignments; prefix/postfix ++/--; comparisons; logical operators and short-circuiting; integer bitwise operators and shifts; ternary expressions with numeric common-type conversion.
* Standard input/output, optional `std::` qualification and `using namespace std;`; endl. Numeric and char extraction and bounded whitespace-delimited char-array extraction. Text output from null-terminated char arrays.

### Control flow and functions

* if / else-if / else, nesting, switch with integer/char literal case labels, default, break and fall-through. Put declarations inside braced case bodies.
* while, do-while, for, nested loops, break, continue, empty for clauses, iteration/phase events.
* Named non-overloaded function definitions and prototypes, scalar parameters/returns, void functions, global/local/block scopes, pass by value, reference parameters bound to existing compatible variables, pointers and array parameters.
* Recursion uses independent frames, bounded at 64 active calls. A declaration must precede a call. The entry point is `int main()` with no arguments.

### Arrays and memory

* One- and two-dimensional arrays, constant integer extents, inferred first dimension, braced initialization with zero-filled remaining elements. For 2D initialization, each row requires its own braces.
* Character arrays initialized from string literals include a null terminator. The teaching runtime requires enough space for it.
* Indexed reads/writes, row-major matrix layout, arrays passed to functions, matrix parameters with matching trailing dimensions.
* Single-level pointers to primitive storage, address-of, dereference, nullptr, pointer assignment, pointer parameters, valid element arithmetic, same-allocation subtraction/order and pointer equality.
* `const int*`, `int const*`, `int* const`, `const int* const`, with independent restrictions on redirection and mutation.
* Arrays of single-level pointers, with indexing and visible target connections.
* `new T`, `new T(value)`, `new T()`, `new T[n]`, `new T[n]()`, delete and delete[]. Null deletion is harmless.
* Bounds, one-past dereference, uninitialized reads, expired-local pointers, use-after-free, double free, wrong deallocator and leak diagnostics.

### Project files and virtual files

* Simple names such as main.cpp, math.cpp, math.h; one main.cpp plus custom .cpp files and quoted .h includes.
* `<iostream>` and `<fstream>` are recognized built-in headers. Conventional uppercase include guards and `#pragma once` are supported for headers.
* ifstream, ofstream, fstream declarations and constructor/open/close operations; `<<` and `>>`; is_open(), good(), fail(), eof().
* `ios::in`, `ios::out`, `ios::app`, `ios::trunc`, combined with `|`; append preserves existing text. Missing input files produce a failed stream.
* Virtual files use simple names, no directory paths, and contain text only. They never access your machine's filesystem.

## PARTIALLY SUPPORTED

* **C++ typing:** the validator checks every syntactic branch for names, common type errors and const writes; the runtime checks values and lifetimes. This is not complete C++ compile-time analysis. Some rejected valid programs are intentionally outside the subset. Some diagnostics (bounds, allocation sizes, duplicate switch labels and initializer extents) require runtime evaluation.
* **Sequencing:** execution uses left-to-right operand recording except assignment, whose right side is evaluated first. Clearly conflicting accesses through aliases and order-sensitive I/O are rejected. Conservative checks also reject some valid complex expressions; split side effects into separate statements. This is not an exhaustive C++ sequencing proof.
* **References:** bind to existing scalar lvalues of the same type, with const protection. No temporary lifetime extension, reference return types, array references, or references to pointer variables.
* **Pointer/array interoperability:** 1D arrays decay to element pointers, and matrix rows can decay to int*. A whole matrix cannot become int*. Array-of-pointer decay to pointer-to-pointer and explicit pointer-to-row types are rejected. Passing a matrix using `int m[][N]` is supported.
* **Preprocessing/linking:** project headers are included once in a combined educational translation, and extra .cpp files are appended in sorted filename order. Original file/line locations are preserved. This supports the normal declaration-in-header, definition-in-cpp pattern. It does not model separate translation-unit linkage, static/extern, macros, conditional builds, include search paths or multiple-definition rules of a real linker. Built-in stream names are available even without the corresponding include/using line.
* **Input/formatting:** ASCII whitespace and decimal token extraction, default six-significant-digit floating output, no locale or manipulators other than endl. Exhausted standard input pauses the *recording with a diagnostic*: edit the transcript and rerun. Failed virtual-file extraction returns a failed stream and leaves the destination unchanged (a teaching simplification for malformed numeric input). No seek/tell, getline, binary reads, flush semantics or mixed-direction buffering guarantees. Use close/reopen to switch between reading and writing.
* **Initialization:** scalar direct/braced initialization and aggregate brace elision are outside the current grammar. Use `int x = 1;`, nested row braces, and the supported new expressions above. The parser may recognize some outside forms but validation rejects them.
* **Static character representation:** signed 8-bit char and ASCII text; Unicode/multibyte literals are not modeled.

## NOT SUPPORTED

Classes/structs and OOP; STL containers and std::string; templates; exceptions; lambdas; threads; function overloading; function pointers; pointer-to-pointer declarations; casts; unions/enums; typedef/auto; arbitrary namespaces; custom operators; rvalue references; initializer_list; range-for; comma expressions; variable-length arrays; more than two array dimensions; long long/long double; combined literal suffixes; octal literals; arbitrary library calls; real disk access; full C++ preprocessing or linking. No flowcharts or block diagrams.

## Explicit teaching-machine model

* bool occupies one conceptual byte; char 8 bits, short 16 bits, int and long 32 bits. Plain char is signed. long deliberately differs from 64-bit long on many hosts.
* float uses binary32 rounding; double uses JavaScript's IEEE binary64. Non-finite values are rejected. Float-to-integer truncation is modeled; out-of-range signed conversions are rejected rather than selecting implementation-dependent results.
* Integer products use exact internal arithmetic before width conversion. Unsigned arithmetic wraps at its width. Signed overflow, division by zero, min-int divided by -1 and invalid shifts stop execution. Negative signed shifts are deliberately rejected.
* Pointer values are allocation IDs plus offsets. Displayed hexadecimal addresses are stable **conceptual** addresses, never physical or host addresses. Pointers occupy eight conceptual bytes.
* Every event includes a detached state. Previous step changes only the viewed snapshot. A run is recorded in a worker, not executed on demand during playback.
* Default limits: 100,000 source characters, 100,000 input characters, 3,000 events, 25,000 expression operations, 64 frames, 1,024 cells per allocation, 4,096 allocated cells total, 300,000 aggregate snapshot cells, 8,000,000 aggregate snapshot text characters, 64 virtual files and 64 KiB combined output/file text. The UI terminates an unresponsive worker after ten seconds. Limits produce diagnostics and may stop otherwise valid large programs.

This model makes beginner examples inspectable and repeatable. Always use a real C++ compiler to validate code outside the documented subset.
