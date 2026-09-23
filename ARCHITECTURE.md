# Architecture

This is a restricted C++ teaching interpreter, not a C++ compiler.

## Decisions

The application uses native JavaScript ES modules. The interpreter has no DOM or framework dependency. A worker runs student code away from the interface. Node's built-in test runner exercises the same modules as the browser. No student source is passed to JavaScript eval, a shell, a server compiler, or an AI service.

Clang's AST tooling was evaluated (https://clang.llvm.org/docs/Tooling.html). It is a good future validation adapter, but a native service introduces deployment and sandboxing concerns and still does not supply teaching events. Tree-sitter (https://tree-sitter.github.io/tree-sitter/) supplies syntax, not C++ type checking or execution. A small explicit grammar gives us reject-by-default behavior and source locations. Native Clang is used for differential tests, not executing arbitrary user submissions.

## Components

* Project loader: validates file names and expands the supported header directives with source mapping.
* Lexer: turns characters into tokens with original file, line and column.
* Parser: recursive descent for declarations/statements, precedence climbing for expressions. Produces plain AST objects.
* Types: central conversion, promotion, width and arithmetic rules.
* Runtime: owns scopes, frames, expression evaluation, control flow and virtual streams.
* Memory: typed allocations with identity, lifetime and bounds. Pointers identify an allocation plus element offset, never a host address.
* Events: append-only records with source location, operation, explanation and detached state. Playback never re-executes a past operation.
* UI: consumes events and snapshots. It cannot decide what a C++ operation means.

## Runtime contract

A value is `{type, value}`. Pointer payloads are `{object, offset}` or null. Memory objects retain released state so use-after-free and expired-local references are diagnosable. Scope bindings point to memory locations; references alias those locations. Frames have unique IDs, a function name and a caller. Array shapes are metadata on contiguous element storage. Virtual files are in-memory strings, separate from source files.

An event has `id`, `kind`, `loc`, `message`, optional structured `detail`, and `state`. State contains visible bindings, all memory objects, frames, output and virtual files. Execution and memory limits bound tracing costs. Diagnostics stop execution instead of fabricating a value. Static checking is intentionally incomplete and its limits must stay visible in SUPPORTED_CPP.md.

## Milestone review policy

Each milestone adds regression and interaction tests, runs the complete suite, checks the browser and records its audit in docs/MILESTONES.md. Language changes belong in engine modules, never visualization components.

## Implemented module map

| File | Responsibility |
| --- | --- |
| src/engine/project.js | Limited include expansion and original source locations |
| src/engine/lexer.js | Tokens and literal escapes |
| src/engine/parser.js | Declarations, statements, precedence and AST |
| src/engine/validate.js | Whole-AST subset name/type/const validation; inferred expression types |
| src/engine/types.js | Typed values, conversions, promotions, exact integer arithmetic |
| src/engine/memory.js | Allocations, typed cells, bounds and lifetime checks |
| src/engine/arrays.js | Shape validation, aggregate initialization and row-major indexing |
| src/engine/pointers.js | Pointer arithmetic, heap allocation and deletion |
| src/engine/effects.js | Compare recorded read/write identities for sequencing conflicts |
| src/engine/io.js | Console extraction/formatting and virtual stream state |
| src/engine/runtime.js | Coordinates evaluation, scopes, calls, control signals and events |
| src/engine/index.js | Pure public runProject(files, options) entry point |
| src/engine/worker.js | Browser worker boundary and unexpected-error reporting |
| src/ui/app.js | Editor interactions, event playback and snapshot rendering |
| src/ui/examples.js / challenges.js | Educational source fixtures |

## Error handling and resource ownership

Diagnostics have a code, source location and human-readable explanation. Parsing/validation errors create a single diagnostic event with no executed state. Runtime diagnostics preserve the state at failure. The worker catches unexpected internal failures separately; it never turns them into a successful C++ value. No backend executes source code.

The runtime owns all memory, scope and I/O state. A scope records only the object IDs it owns; reference aliases do not own the target. Leaving the scope marks owned objects dead and closes owned file streams. A heap object is independent of block lifetime. Full snapshots retain released objects to teach lifetime errors; explicit budgets bound their cost. A future larger-program edition should use structural sharing or deltas, preserving the same event contract.

## Extending a feature

1. Define the accepted syntax and intentional exclusions in SUPPORTED_CPP.md.
2. Add lexer/parser nodes only when new syntax is needed.
3. Teach the validator its types and constraints, including untaken branches.
4. Implement evaluation using the existing value, memory and scope APIs.
5. Emit structured events; never add language rules to UI click handlers.
6. Add valid, invalid and interaction tests, then a compiler comparison for behavior shared by the teaching model.
7. Recheck browser playback and update LEARNING.md.

## Security and release boundaries

There is no eval, Function constructor, shell execution, network call or host-file access in the interpreter. Rendering escapes user-generated text. The development server uses a path boundary and serves recognized static extensions only. The static build excludes tests and development scripts. Source and input are device-local browser storage; no analytics or service credentials exist. This is a small independently implemented interpreter, so passing tests is not a claim of standards conformance or a replacement for external review.
