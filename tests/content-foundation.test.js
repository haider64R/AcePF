import test from "node:test";
import assert from "node:assert/strict";
import { runProject } from "../src/engine/index.js";
import { challenges } from "../src/ui/challenges.js";
import {
  categories,
  topics,
  getTopic,
  coreScopes,
  resolveScope,
  earliestCoreScope,
  questions,
  examples,
  notes,
  queryQuestions,
  queryExamples,
  queryNotes,
  relatedContent,
} from "../src/content/index.js";
import {
  validateTaxonomy,
  validateScopes,
  validateQuestion,
  validateQuestions,
  validateExamples,
  validateNotes,
} from "../src/content/validate.js";

const clone = (value) => structuredClone(value);
const ids = (records) => records.map((record) => record.id);

test("taxonomy has ten ordered categories and unique, valid three-level IDs", () => {
  assert.equal(categories.length, 10);
  assert.equal(topics.length, 152);
  assert.equal(new Set(ids(topics)).size, topics.length);
  assert.equal(validateTaxonomy(), true);
  assert.deepEqual(ids(categories), [
    "fundamentals",
    "operators",
    "selection",
    "loops",
    "functions",
    "arrays",
    "pointers",
    "dynamic-memory",
    "project-structure",
    "file-handling",
  ]);
  for (const topic of topics)
    if (topic.parentId) assert.ok(getTopic(topic.parentId));
  assert.equal(
    getTopic("pointers.arithmetic.arrays").parentId,
    "pointers.arithmetic",
  );
});

test("taxonomy validator detects duplicate, orphaned and reordered content", () => {
  assert.throws(
    () => validateTaxonomy([...topics, topics[0]]),
    /Duplicate topic ID/,
  );
  const orphan = clone(topics);
  orphan[2].parentId = "missing";
  assert.throws(() => validateTaxonomy(orphan), /Invalid parent/);
  const reordered = clone(topics);
  [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
  assert.throws(() => validateTaxonomy(reordered), /unstable order/);
});

test("core scope ceilings grow in teaching order and include descendant subtopics", () => {
  assert.equal(validateScopes(), true);
  assert.equal(coreScopes.length, 10);
  assert.ok(
    resolveScope("through-operators").has("operators.increment.postfix"),
  );
  assert.ok(!resolveScope("through-operators").has("selection.if.if"));
  for (let i = 1; i < coreScopes.length; i++) {
    const previous = resolveScope(coreScopes[i - 1].id),
      current = resolveScope(coreScopes[i].id);
    assert.ok([...previous].every((id) => current.has(id)));
    assert.ok(current.size > previous.size);
  }
  assert.equal(resolveScope("full-pf").size, topics.length);
});

test("custom course rule can include and exclude topic branches without naming assessment dates", () => {
  const allowed = resolveScope({
    id: "course-preset",
    title: "Custom",
    throughCategoryId: "loops",
    includeTopicIds: ["functions.parameters.by-reference"],
    excludeTopicIds: ["loops.nested"],
  });
  assert.ok(allowed.has("functions.parameters.by-reference"));
  assert.ok(!allowed.has("functions.parameters.by-value"));
  assert.ok(!allowed.has("loops.nested.inner-outer"));
  assert.throws(() => resolveScope("unknown"), /Unknown scope/);
  assert.throws(
    () =>
      validateScopes([
        { id: "bad", title: "Bad", throughCategoryId: "unknown" },
      ]),
    /Unknown scope/,
  );
});

test("earliest stage is derived from all tags rather than duplicated on questions", () => {
  assert.deepEqual(
    questions.map((q) => earliestCoreScope(q.topics)),
    ["through-operators", "through-functions", "through-pointers"],
  );
  assert.throws(() => earliestCoreScope(["fake.topic"]), /Unknown topic/);
});

test("canonical questions validate and duplicate IDs fail", () => {
  assert.equal(validateQuestions(questions), true);
  assert.throws(
    () => validateQuestions([...questions, clone(questions[0])]),
    /Duplicate question ID/,
  );
  const wrong = clone(questions[0]);
  wrong.topics = ["unknown.topic"];
  assert.throws(() => validateQuestion(wrong), /unknown topic/);
});

test("question difficulty, type, scope and type-specific requirements fail clearly", () => {
  for (const [change, pattern] of [
    [
      (q) => {
        q.difficulty = "expert";
      },
      /invalid difficulty/,
    ],
    [
      (q) => {
        q.type = "surprise";
      },
      /invalid type/,
    ],
    [
      (q) => {
        q.scopeId = "fundamentals";
      },
      /exceeds its scope/,
    ],
    [
      (q) => {
        q.scopeId = "unknown";
      },
      /Unknown scope/,
    ],
    [
      (q) => {
        delete q.answer;
      },
      /text answer/,
    ],
    [
      (q) => {
        q.visualizer.compatible = true;
        delete q.code;
      },
      /main.cpp code/,
    ],
  ]) {
    const q = clone(questions[0]);
    change(q);
    assert.throws(() => validateQuestion(q), pattern);
  }
});

test("multiple-choice and code-reasoning records use the same schema", () => {
  const choice = {
    id: "choice-example",
    title: "Choose",
    type: "multiple-choice",
    question: "Which value?",
    options: [
      { id: "a", text: "One" },
      { id: "b", text: "Two" },
    ],
    answer: "b",
    explanation: "Two is correct.",
    topics: ["fundamentals.types.integers"],
    primaryTopic: "fundamentals.types.integers",
    difficulty: "easy",
    source: { type: "authored" },
    status: "verified",
    visualizer: { compatible: false },
  };
  assert.equal(validateQuestion(choice), true);
  const invalid = clone(choice);
  invalid.answer = "c";
  assert.throws(() => validateQuestion(invalid), /must name an option/);
  const reasoning = {
    ...choice,
    id: "reasoning-example",
    type: "code-reasoning",
    code: "int main(){int x=1;}",
    options: undefined,
  };
  assert.equal(validateQuestion(reasoning), true);
});

test("past-paper claims require traceable metadata; authored items cannot impersonate them", () => {
  const paper = clone(questions[0]);
  paper.id = "paper-example";
  paper.source = {
    type: "past-paper",
    name: "University archive",
    year: 2024,
    assessment: "Final",
    paper: "PF",
    questionNumber: "2(a)",
    reference: "Archive document page 3",
    marks: 4,
  };
  assert.equal(validateQuestion(paper), true);
  assert.deepEqual(
    ids(
      queryQuestions(
        { sourceType: "past-paper", assessment: "Final", year: 2024 },
        [paper],
      ),
    ),
    ["paper-example"],
  );
  delete paper.source.reference;
  assert.throws(() => validateQuestion(paper), /verifiable reference/);
  paper.source = { type: "authored", year: 2024 };
  assert.throws(
    () => validateQuestion(paper),
    /cannot carry past-paper metadata/,
  );
});

test("question selectors combine hierarchy, stages, difficulty, type and compatibility", () => {
  assert.deepEqual(ids(queryQuestions({ topicId: "pointers.arithmetic" })), [
    "follow-the-array",
  ]);
  assert.deepEqual(
    ids(
      queryQuestions({
        topicIds: ["functions", "operators"],
        topicMatch: "all",
      }),
    ),
    ["through-the-reference"],
  );
  assert.deepEqual(ids(queryQuestions({ scopeId: "through-operators" })), [
    "postfix-puzzle",
  ]);
  assert.deepEqual(
    ids(
      queryQuestions({
        scopeId: "through-functions",
        difficulty: "medium",
        type: "predict-value",
        sourceType: "authored",
        visualizerCompatible: true,
      }),
    ),
    ["through-the-reference"],
  );
  assert.deepEqual(ids(queryQuestions({ sourceType: "past-paper" })), []);
  assert.deepEqual(
    ids(queryQuestions({ topicIds: ["functions", "pointers"] })),
    ["through-the-reference", "follow-the-array"],
  );
  assert.throws(
    () => queryQuestions({ topicId: "bad.topic" }, []),
    /Unknown topic filter/,
  );
});

test("scope filtering checks every tag, including advanced secondary topics", () => {
  assert.deepEqual(ids(queryQuestions({ scopeId: "through-arrays" })), [
    "postfix-puzzle",
    "through-the-reference",
  ]);
  const custom = {
    id: "custom",
    title: "Custom",
    throughCategoryId: "loops",
    includeTopicIds: ["functions.parameters.by-reference"],
  };
  assert.deepEqual(ids(queryQuestions({ scopeId: custom })), [
    "postfix-puzzle",
    "through-the-reference",
  ]);
});

test("all existing challenges come from canonical question records and retain answers", () => {
  assert.deepEqual(ids(challenges), ids(questions));
  assert.deepEqual(
    challenges.map((c) => [c.title, c.question, c.answer]),
    [
      ["Postfix puzzle", "Predict the exact console output.", "34"],
      ["Through the reference", "What is the final value of marks?", "75"],
      [
        "Follow the array",
        "Predict the final array state, separated by spaces.",
        "1 7 3",
      ],
    ],
  );
  for (const question of challenges) {
    const run = runProject({ "main.cpp": question.code });
    assert.equal(run.ok, true);
    assert.equal(run.state.output.trim(), question.answer);
    assert.ok(questions.includes(question));
  }
});

test("existing examples retain source and gain valid canonical concepts", () => {
  assert.equal(examples.length, 15);
  assert.equal(validateExamples(examples), true);
  assert.deepEqual(ids(queryExamples({ topicId: "pointers.arithmetic" })), [
    "dynamic-array",
  ]);
  assert.deepEqual(
    ids(
      queryExamples({
        topicId: "arrays.two-dimensional",
        scopeId: "through-arrays",
      }),
    ),
    ["matrix-rows"],
  );
  const invalid = clone(examples);
  invalid[0].topics = ["unknown.topic"];
  assert.throws(() => validateExamples(invalid), /unknown topic/);
});

test("notes model validates structured blocks and cross-content references", () => {
  assert.deepEqual(notes, []);
  const note = {
    id: "pointer-note",
    topicId: "pointers.arithmetic",
    title: "Pointer arithmetic",
    sections: [
      {
        kind: "overview",
        blocks: [{ type: "paragraph", text: "Offsets count elements." }],
      },
      {
        kind: "syntax",
        blocks: [{ type: "code", text: "int* p = a + 1;", language: "cpp" }],
      },
      {
        kind: "common-mistakes",
        blocks: [{ type: "list", items: ["Treating offsets as bytes"] }],
      },
    ],
    relatedTopics: ["arrays.one-dimensional.indexing"],
    relatedQuestions: ["follow-the-array"],
    relatedExamples: ["dynamic-array"],
  };
  assert.equal(validateNotes([note], { questions, examples }), true);
  assert.deepEqual(ids(queryNotes({ topicId: "pointers" }, [note])), [
    "pointer-note",
  ]);
  assert.deepEqual(
    ids(relatedContent("pointers.arithmetic", { notes: [note] }).questions),
    ["follow-the-array"],
  );
  assert.deepEqual(
    ids(relatedContent("pointers.arithmetic", { notes: [note] }).examples),
    ["dynamic-array"],
  );
  const invalid = clone(note);
  invalid.relatedQuestions = ["missing"];
  assert.throws(
    () => validateNotes([invalid], { questions, examples }),
    /unknown relatedQuestions/,
  );
  invalid.relatedQuestions = ["follow-the-array"];
  invalid.sections[0].blocks = [{ type: "html", text: "<p>raw</p>" }];
  assert.throws(
    () => validateNotes([invalid], { questions, examples }),
    /Invalid content block/,
  );
});
