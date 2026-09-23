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
* Educational trace: derives reasoning groups, explanations and deltas from raw events and source syntax. It does not execute expressions or synthesize machine state.
* Content domain: canonical PF topics, scope ceilings, questions, example metadata, Notes structure, selectors and validation. It is independent of execution.
* Playback: keeps an authoritative raw-event boundary while exposing grouped or raw indices.
* UI: consumes the selected snapshot and educational description. It cannot decide what a C++ operation means.

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
| src/trace/source.js | Syntax catalog and normalized source labels with original locations |
| src/trace/educational.js | Pure raw-event grouping, raw-to-step mapping and dynamic loop iterations |
| src/trace/state.js | Storage identity, state deltas, operands and alias descriptions |
| src/trace/explain.js | Deterministic PF explanations based on recorded typed results |
| src/trace/playback.js | Detail modes and exact snapshot boundary navigation |
| src/ui/dry-run.js | Reasoning cards, expression details, raw list and reached loop history |
| src/ui/app.js | Editor interactions, playback controls and eight snapshot views |
| src/ui/examples.js / challenges.js | Compatibility re-export and shared-bank Challenge selector |
| src/content/taxonomy.js / scopes.js | Ordered topic tree and reusable syllabus rules |
| src/content/questions.js / examples.js / notes.js | Canonical content records; examples retain existing programs |
| src/content/assessment-corpus.js / assessment-sources.js | Sourced question records, all-PDF inventory and evidence-bound assessment profiles |
| src/content/selectors.js / validate.js / index.js | Shared queries, early validation and public content entry point |
| src/content/notes-routing.js | Stable note/sample and example/question URL resolution for Visualizer handoff |
| src/ui/notes-render.js / notes-ui.js / notes.css | Pure structured-block renderer, Notes page navigation/search and responsive styles |
| notes.html | Native Notes page shell; built alongside index.html |

Challenge Mode selects compatible, verified prediction records tagged `challenge` from the shared question bank. Its existing dialog still compares the authored answer and loads the record's source into the Visualizer. Future Notes, Exam Mode and past-paper browsing should consume the same topic IDs and question records through selectors. [CONTENT_MODEL.md](CONTENT_MODEL.md) defines the schema and authoring rules.

The assessment corpus is data in this content domain, not an execution layer. Each sourced record maps to a PDF page and question part. `autoGradable`, `verification`, and `visualizer.compatible` distinguish deterministic scoring, answer confidence, and current interpreter support. `validateAssessmentCorpus` checks source inventory consistency and assessment profiles before the app starts; [ASSESSMENT_CORPUS.md](ASSESSMENT_CORPUS.md) records observed patterns and omissions.

Notes V1 is a separate consumer of that content layer. `notes.html?topic=<canonical-id>` resolves one authored guide; the landing page shows the ten-category map and searches the three authored guides client-side. `notes-render.js` escapes all text and renders reusable paragraph, list, procedure, code, table, comparison, callout and conceptual-memory blocks. Tables and code scroll inside their own container at narrow widths. Examples and verified Challenges are queried by the guide's canonical topic, with primary matches ranked first and a short related list. Empty states are explicit.

Runnable code blocks have stable `sampleId`s. An Open in Visualizer URL contains only note/sample IDs; `notes-routing.js` resolves them to exact checked-in source. The existing app loads that source into its normal worker and playback without altering engine or trace semantics. The initial linked preview does not overwrite the user's saved project until they edit or explicitly run it. Challenge links select and open the existing prediction dialog. [NOTES_AUTHORING.md](NOTES_AUTHORING.md) defines the authoring and specialized-block extension contract.

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

## Visualizer V2: educational trace contract

The pipeline is source → loader/lexer/parser → AST validation → typed interpreter → immutable raw events → educational trace → playback → views. Only the worker adapter changed inside the engine directory; language evaluation remains in the existing interpreter. The worker records once, derives once, and sends both records to the UI.

`deriveTrace(events, files)` is pure. It reads the original source AST for statement ownership, operator structure and source labels, and takes every value from recorded events. Invalid source retains its original diagnostic; no value is guessed. Source labels are normalized AST text rather than byte-for-byte source excerpts.

Each educational step has `id`, `kind`, `loc`, contiguous `rawStart`/`rawEnd`, `snapshotRaw`, `state`, `before`, `delta`, `operands`, `details`, and optional loop/control/parameter information. `rawToStep` maps every raw index to exactly one group. Raw categories distinguish reasoning events, expression details (reads, intermediate expressions, short circuit, indexing and pointer operations), and runtime bookkeeping (statement markers and scope entry/exit). These categories describe the record; grouping is driven by AST ownership and dynamic frame/scope identities, not a blacklist of hidden UI events.

Statement groups collect their reads, arithmetic, writes and associated bookkeeping. For-loop initialization + first condition, or update + next condition, form ordered reasoning steps. A decision whose selected body is solely break/continue can include that control action. Calls split execution at function boundaries: read-only argument preparation joins parameter binding and the call; observable argument mutations remain in their own segment. Returns retain their expression results and lifetime effects, including recursive calls. Scope exits with owned local storage or reference bindings remain visible; empty scope bookkeeping attaches to its surrounding operation. Diagnostics, leaks and completion remain visible.

### Deliberate snapshot boundaries

A group closes before the next semantic operation, call boundary, relevant lifetime exit or diagnostic. Its snapshot is the raw state at that chosen end boundary. It is not the final state of the source line: a line may contain several statements, calls and loop iterations. No synthetic merged state exists. Deltas compare the state before the group with the state at its end, keyed by allocation ID and cell offset, never variable name. This preserves shadowed objects, reference aliases, 2D coordinates, heap lifetime, console and file contents. Expression details preserve intermediate changes even when the net delta is zero.

`TracePlayback.rawIndex` is authoritative. Dry Run and Expression Details navigate identical group boundaries; Detailed Trace navigates individual raw events. Changing mode preserves the current raw index. If it lies inside a group, the card explicitly says it is partial and shows only details already reached; Next completes that group. The UI uses the selected raw snapshot for **all eight views**. Group source locations drive file selection and highlighting; raw/partial playback uses the exact raw event location. Previous and timeline navigation never rerun the interpreter.

A raw return snapshot may still contain the returning frame after its locals have expired; the frame is popped before the next caller event. Stack labels that boundary RETURNING. This retains the existing semantic record rather than inventing a new post-return frame snapshot.

### Loops and following

Iteration records use the real loop scope ID, iteration number and active enclosing loops. An iteration starts at the recorded body event and ends before the next update/condition or at loop exit. They retain the step IDs they span. The loop table includes both outer and inner iterations, their counter values at entry, condition/body ordering, reached break/continue and surviving body mutations. Expand an iteration to revisit its reached steps. History never reveals future values or actions; zero-iteration loops have a failed-condition step but no body row. For `continue` in a for-loop, the next reasoning step explicitly shows update → condition.

Follow Execution uses one suggested subject per group. Calls/returns suggest Stack, indexed access suggests Arrays, pointer/heap operations suggest Memory and file operations suggest Files. Routine expressions do not switch tabs repeatedly: the reasoning card already explains them, and Expressions is available manually. A manual tab selection unchecks Follow. Other state views retain an expandable current-reasoning card.

### Educational limitations

Grouping is deterministic and bounded by the existing trace budgets; it is not a general C++ debugger or a minimal-step optimizer. Calls and meaningful local lifetimes can split one source statement into several steps. Large initializers and complex expressions can still have long detail lists. The iteration table records reached iterations rather than collapsing repeated iterations into a single invented result. It includes nested rows, so an outer row may summarize changes also shown by its children. Precedence/associativity explain expression structure; recorded evaluation order must not be taught as a universal left-to-right C++ guarantee. The documented C++ subset and machine-width abstractions remain unchanged.
