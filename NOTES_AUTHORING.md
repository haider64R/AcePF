# Notes authoring guide

Notes are native website content, not HTML documents. The only authored records currently live in `src/content/notes.js`: **Operators & Expressions**, **Loops**, and **Pointers**. Do not infer that a mapped category has a finished guide. `notes.html` marks every other category as planned.

## The learning standard

A guide should teach the learner to perform the trace on paper: what the syntax names, the value or control-flow decision at each stage, the resulting state, and the mistake likely to change an exam answer. Keep prose short. Prefer one accurate table, comparison or diagram over repeating a rule in several paragraphs. End with a compact quick-revision section. Only use C++ behavior within `SUPPORTED_CPP.md`; do not imply that the interpreter defines all of C++17. Avoid side-effect expressions with undefined or disputed sequencing. Use native C++ comparisons when a sample depends on a subtle rule.

The three guides model different treatments:

* Operators keeps **expression value** separate from **stored state** with prefix/postfix comparisons, a precedence aid, type examples and short-circuit state rows.
* Loops uses a **condition/body/update** procedure and iteration tables, including the final false check, nested reset, continue and break.
* Pointers uses **arrows to storage**, an aliasing diagram and a before/after array table. Addresses are conceptual; object identity matters more than numeric address labels.

## Record format

Each record has a stable slug `id`, one canonical category or topic `topicId`, `title`, `lead`, ordered `sections[]`, and optional `relatedTopics[]`. A section has a unique `kind`, a display `title` and nonempty `blocks[]`. Kinds are validated in `src/content/validate.js`: `overview`, `syntax`, `details`, `execution-model`, `dry-run-rules`, `common-mistakes`, `exam-traps`, `worked-example`, `quick-revision`. Use only the useful ones; they need not appear in the same order in every guide.

Reusable blocks:

| Type | Fields | Use |
| --- | --- | --- |
| `paragraph` | `text` | One concise explanation |
| `list`, `steps` | nonempty `items[]` | Rules or an ordered tracing procedure |
| `code` | `text`, `language: "cpp"`, optional `sampleId`, `caption` | Syntax or a runnable program |
| `table` | `headers[]`, rectangular `rows[][]`, optional `caption` | Precedence or state per iteration |
| `comparison` | `left` and `right`, each `{label,text}` | Distinguish similar operations |
| `memory` | `pointers[]`, `target: {name,value}`, optional `caption` | Show aliases to one storage cell |
| `callout` | `tone: "tip" | "trap"`, `text` | A subtle but important rule |

Content is escaped by `src/ui/notes-render.js`, so write plain text and C++ strings, not markup. To add a specialized block, extend its validator and renderer together, then add a focused rendering/invalid-data test and check it at narrow width. The diagram block is deliberately conceptual, not a runtime memory dump.

For a runnable block, choose a `sampleId` unique **within that note** and include a complete, deterministic `main.cpp` program in `text`. The renderer generates `index.html?note=<note-id>&sample=<sample-id>`. `src/content/notes-routing.js` resolves that pair from checked-in content; the Visualizer loads the exact code into its normal editor and worker. No code is placed in the URL, and Notes does not execute C++ itself. Run each sample through `runProject`, compare its output to the caption and, when meaningful, native C++17. A snippet without `sampleId` stays explanatory.

## Relationships and navigation

Use canonical topic IDs from `src/content/taxonomy.js`. `notes.html?topic=<topic-id>` resolves a guide by its `topicId`; the landing page shows the three available guides and the ten-category progression. A small client-side search filters authored guide titles, leads and descendant topic names. It does not search full prose or all 152 taxonomy records.

The related Examples and Challenges sections call `queryExamples` and `queryQuestions` with the note's canonical topic ID. Direct primary-topic matches come first; secondary-tag matches can fill the small list. They are never copied into a note. Verified Challenge records link to the existing dialog; Examples link to the existing editor. If the bank has no suitable item, the section states that plainly. `relatedTopics` names canonical adjacent concepts, including areas whose guide is not yet authored.

## Adding the next guide

1. Choose its existing canonical `topicId`; add the record to `notes.js` without changing that topic's stable ID.
2. Draft the paper-trace method and one worked state transition first. Then add syntax, traps and revision blocks that help that method.
3. Use a table, comparison or diagram only when it clarifies the mechanism. Add a new specialized block only with validation, rendering and responsive checks.
4. Add complete Visualizer samples where observing execution helps; verify output and diagnostics. Keep snippet-only blocks clearly distinct.
5. Run the focused Notes tests, entire suite, syntax check and static build. Open the guide at desktop and mobile sizes; inspect code/table scrolling and links to Examples, Challenges and Visualizer.

The current UI is a content foundation, not a full learning management system. It has no progress tracking, per-subtopic pages or full-text curriculum search. Future content can be added primarily as structured records; a future global UI pass may revisit navigation or typography without changing the content contracts.
