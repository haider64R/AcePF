# C++ Execution Visualizer

A local-first educational C++ interpreter for Programming Fundamentals. Edit a program, record its deterministic execution, and explore expressions, scopes, arrays, frames, pointers, heap allocations, console I/O and virtual files.

**This implements a documented C++17 subset, not the complete C++ language.** It does not use an LLM to execute code. See [SUPPORTED_CPP.md](SUPPORTED_CPP.md) for exact boundaries and abstractions.

## Run

Requires Node.js 22 or newer. There are no runtime or installation dependencies.

```sh
npm start
# or, without npm:
node scripts/server.js
```

Open http://127.0.0.1:4173. To choose another local port, set `PORT` before starting. On the machine where this was built, `Start.command` also finds the bundled Node runtime when Node is not on PATH.

```sh
npm test          # engine, examples, adversarial cases, native comparison when Clang exists
npm run check    # JavaScript syntax checks
npm run build    # portable static application in dist/
```

The native differential test uses **only curated/generated test fixtures**, in a temporary directory. Student submissions always stay in the browser interpreter. `clang++` is optional; the native test is explicitly reported as skipped if unavailable.

## Use

1. Choose an example, or edit `main.cpp`. Add `.h` and `.cpp` files with the plus button.
2. Supply a whitespace-separated transcript in Standard input when using `cin`.
3. Run program. A worker produces a bounded recording; execution does not continue while you edit.
4. **Dry Run** is the default: Next step advances one reasoning step with relevant operands and before/after changes. Expand Expression Details, or select that detail level to keep explanations open. **Detailed Trace** exposes every original event and restores raw-event stepping. Previous step and the timeline restore immutable snapshots in either mode.
5. Follow execution can open Stack, Arrays, Memory or Files for a relevant operation; routine arithmetic stays in your current view. Selecting a view manually suspends following. Execution keeps the reasoning card and an expandable loop dry-run table. Expressions shows the current step’s intermediate results without extra clicks through reads.
6. In Files, add virtual input files before running. Files written by the program appear in the recording. Running again starts from the supplied initial files, not the last run's output.
7. Challenge mode asks for an output, variable value or array state, then reveals a normal execution recording.

Keyboard: Command/Ctrl+Enter runs; left/right arrows step when not editing; Space toggles playback. Tab inserts four spaces in the editor. Controls have visible keyboard focus. Dialogs can be dismissed with Escape.

Your source project and supplied input are saved in this browser's local storage. No account, telemetry, network execution, real-file access or AI service is used. Clearing browser storage removes this saved project. Recordings are regenerated on reload.

## What is here

* 15 examples across all requested learning topics, including a three-file header example.
* All eight visualization views, a syntax-highlighted editor, source mapping, reversible playback and console.
* A pure educational trace layer above unchanged raw events: statement deltas, expression explanations, loop phases and iteration history. Detail switching does not run the program or change its current state.
* Static subset validation plus runtime type, bounds, lifetime, const and resource checks.
* A typed memory model shared by scalar variables, arrays, references and pointers.
* Bounded recursion, dynamic allocation and virtual stream state.
* Automated regression, adversarial, example and native-comparison tests.

Start with [LEARNING.md](LEARNING.md) for a progressive explanation. [ARCHITECTURE.md](ARCHITECTURE.md) maps the code. [TESTING.md](TESTING.md) records validation and its limits. [docs/MILESTONES.md](docs/MILESTONES.md) records milestone checks and corrections.

The shared Programming Fundamentals content foundation is documented in [CONTENT_MODEL.md](CONTENT_MODEL.md). It supplies canonical topics, syllabus ceilings, question and Notes records, example metadata, queries and validation for future learning areas. The current Challenge dialog reads its three prediction questions from that bank.

## Static hosting

`npm run build` copies only browser application files and the language contract to `dist/`. Serve that folder with any ordinary static host over HTTP(S); opening `index.html` with `file://` does not support module workers consistently. There is no backend to deploy. The included server binds only to localhost and is intended for local development.

## Dry Run verification

The nested-loop acceptance program produces **68**, with **430 raw events → 68 reasoning steps (84.2% fewer)**. Grouping preserves each raw event and its snapshot. The Visualizer V2 baseline was 147 tests (107 original plus 40 trace tests). The shared content foundation adds 14 focused tests, bringing the suite to **161 passing tests**, with no failures or skips. The original 35 native C++17 comparisons and four additional acceptance comparisons still match. Run `node scripts/trace-report.js` to reproduce the four acceptance trace counts. See [TESTING.md](TESTING.md) for browser coverage and limits.
