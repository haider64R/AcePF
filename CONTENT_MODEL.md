# Shared Programming Fundamentals content model

This layer stores teaching content and its relationships. It does not execute C++ or change the Visualizer's recording. The public entry point is `src/content/index.js`; importing it validates the checked-in taxonomy, scopes, questions, examples and Notes records before the application starts.

## Canonical topic IDs

`src/content/taxonomy.js` is the single list of 152 ordered records. Each record has `{ id, title, kind, parentId, order }`. The three levels are **category → topic → subtopic**. IDs use lowercase dot paths; for example, `pointers.arithmetic.arrays` belongs to `pointers.arithmetic`, which belongs to `pointers`. Titles may change without changing references. Do not rename an ID after content starts using it without an explicit migration.

| Category ID | Topics (append a subtopic ID for precise tagging) |
| --- | --- |
| `fundamentals` | `variables`, `constants`, `types`, `input-output`, `conversions` |
| `operators` | `arithmetic`, `assignment`, `precedence`, `increment`, `comparison`, `logical`, `bitwise`, `ternary` |
| `selection` | `if`, `switch` |
| `loops` | `while`, `do-while`, `for`, `nested`, `control` |
| `functions` | `structure`, `calls`, `parameters`, `scope`, `recursion` |
| `arrays` | `one-dimensional`, `characters`, `two-dimensional`, `parameters` |
| `pointers` | `basics`, `aliasing`, `arithmetic`, `parameters`, `const`, `arrays-of-pointers` |
| `dynamic-memory` | `allocation`, `release`, `lifetime` |
| `project-structure` | `headers`, `sources`, `prototypes`, `multi-file` |
| `file-handling` | `streams`, `lifecycle`, `operations`, `state` |

These tags describe concepts in the documented [C++ teaching subset](SUPPORTED_CPP.md). They are not promises to support additional C++. Contextual concepts use distinct paths where the distinction matters: `selection.switch.break` and `loops.control.break` teach the same keyword in different control-flow contexts. A query for a parent topic includes its descendants.

Every question and example has `topics[]` for concepts actually needed, plus `primaryTopic` chosen from that array. Use the narrowest useful tags. This is the only topic metadata Notes, Questions and Examples should share; old example `topic` strings are existing display labels only.

## Syllabus ceilings

`src/content/scopes.js` defines ordered core scopes: `fundamentals`, `through-operators`, `through-selection`, `through-loops`, `through-functions`, `through-arrays`, `through-pointers`, `through-dynamic-memory`, `through-project-structure`, and `full-pf`. Each has a `throughCategoryId`. `resolveScope(id)` returns all category, topic and subtopic IDs through that ceiling. A question is eligible only when **every** topic tag belongs to the scope. Thus a question tagged with arrays and pointer arithmetic cannot appear in `through-arrays`.

`earliestCoreScope(topicIds)` derives the first core stage that contains all concepts; authors do not duplicate stage labels on each question. A question may optionally carry `scopeId` if an explicit constraint is needed, and validation checks that its topics fit. A future course can pass a custom rule to `resolveScope`:

```js
resolveScope({
  id: "course-sessional-example",
  title: "Course preset",
  throughCategoryId: "loops",
  includeTopicIds: ["functions.parameters.by-reference"],
  excludeTopicIds: ["loops.nested"],
});
```

The example is a mechanism, not a claim about a real institution's assessment boundaries. Custom inclusions and exclusions apply to the named topic and all descendants; exclusions win if rules overlap.

## Question records

`src/content/questions.js` is the single question bank. Challenge Mode currently selects three of its records. A record uses:

| Field | Meaning |
| --- | --- |
| `id`, `title`, `type`, `question` | Stable slug, display name, task type and learner instructions |
| `code` or `files`, `standardInput`, `virtualFiles` | Optional program and reproducible inputs; `files` supports multi-file projects |
| `answer`, `explanation` | Canonical text answer and authored reasoning; required for verified questions |
| `topics[]`, `primaryTopic`, optional `scopeId` | Canonical concept references and optional explicit ceiling |
| `difficulty` | `easy`, `medium` or `hard`; authored metadata, not a computed score |
| `source` | Explicit provenance object, described below |
| `visualizer` | `{ compatible: boolean }`; compatible items need `main.cpp` code |
| `status`, `tags`, `hints`, `commonMistakes` | `draft` or `verified`, retrieval tags and optional teaching support |
| `options` | Choices for `multiple-choice`, with an answer naming one option ID |

Supported schema type IDs are `predict-output`, `predict-value`, `predict-array-state`, `identify-error`, `multiple-choice`, and `code-reasoning`. Adding a type means extending its validation and consumer UI intentionally; it does not require a second bank. The existing Challenge dialog currently selects the three prediction types only.

`source.type` is `authored`, `past-paper`, or `example`. Authored content may name its source, but cannot carry past-paper fields. A real past-paper record must have source name, year, assessment, paper, question number and a verifiable `reference` such as an archive citation. Optional positive `marks` may be added when known. No current question claims past-paper provenance. Examples are kept as distinct example records because they are demonstrations, not assessment questions; a future example-shaped question can use `source.type: "example"`.

Add a question once in `questions.js`, with real topic IDs and explicit provenance. For a verified programming question, run its source through `runProject` and check its expected answer before marking it verified. Tag it `challenge` only when one of the current prediction types fits the existing dialog; the dialog will pick it up through `queryQuestions`. Future Exam Mode, past-paper browsing and Notes links should query the same bank by ID and metadata. A Visualizer action should load `code` or `files` plus `standardInput` and `virtualFiles` from that record.

## Examples and Notes

The 15 existing Visualizer programs now live in `src/content/examples.js`; `src/ui/examples.js` re-exports them for existing imports. Their source and order are unchanged. Each has a stable `id`, canonical `topics[]`, `primaryTopic`, `difficulty` and `visualizerCompatible: true`. The original `topic` label still displays in the current library. `queryExamples({ topicId: "pointers.arithmetic" })` can find the existing dynamic-array example through its pointer-indexing tag, without a second Notes-specific list.

`src/content/notes.js` is deliberately empty until authored Notes exist. A future note has `id`, `topicId`, `title`, ordered `sections[]`, and optional `relatedTopics`, `relatedQuestions` and `relatedExamples` IDs. Valid section kinds are `overview`, `syntax`, `details`, `dry-run-rules`, `common-mistakes`, `exam-traps` and `worked-example`. A section holds structured `blocks[]`: paragraph or code blocks use `text`, while list blocks use `items[]`. This keeps content separate from UI HTML. `validateNotes` rejects unknown topic, question and example links. `queryNotes` and `relatedContent` find links by canonical topic ID.

## Queries and validation

`queryQuestions` accepts `topicId` or `topicIds` (`topicMatch: "any" | "all"`), `scopeId`, `difficulty`, `type` or `types`, `sourceType`, `assessment`, `year`, `visualizerCompatible`, `status` and `tag`. Filters combine with AND except a `topicIds` group, whose match rule is explicit. Results retain bank order. `queryExamples` supports topic, scope, difficulty and compatibility filters; `relatedContent(topicId)` returns related questions, examples and notes together. Unknown topics, scopes and enum filters throw rather than silently returning no results.

`src/content/validate.js` checks stable IDs, hierarchy/order, duplicate records, cross-references, question requirements, source claims and type-specific fields. Content is validated when the app imports the domain entry point and in focused tests. To add a new topic, append its explicit slug and title under the correct parent in `taxonomy.js`, then tag content with its full ID; keep prior IDs and ordering stable. To add a new scope preset, give it a new ID and a ceiling or custom rule. Avoid embedding new topic or filtering logic in a page component.
