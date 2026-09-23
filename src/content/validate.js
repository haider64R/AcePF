import { getTopic, topics } from "./taxonomy.js";
import { coreScopes, resolveScope } from "./scopes.js";

export const difficulties = Object.freeze(["easy", "medium", "hard"]);
export const questionTypes = Object.freeze([
  "predict-output",
  "predict-value",
  "predict-array-state",
  "identify-error",
  "multiple-choice",
  "code-reasoning",
]);
export const sourceTypes = Object.freeze(["authored", "past-paper", "example"]);
export const noteSectionKinds = Object.freeze([
  "overview",
  "syntax",
  "details",
  "dry-run-rules",
  "common-mistakes",
  "exam-traps",
  "worked-example",
]);
const slug = /^[a-z][a-z0-9-]*$/;
const fail = (message) => {
  throw new Error(`Content validation: ${message}`);
};
const string = (value) => typeof value === "string" && value.trim().length > 0;
const unique = (values, description) => {
  if (new Set(values).size !== values.length) fail(`Duplicate ${description}.`);
};
const topicList = (ids, description) => {
  if (!Array.isArray(ids) || !ids.length)
    fail(`${description} requires at least one topic.`);
  unique(ids, `${description} topic ID`);
  for (const id of ids)
    if (!getTopic(id)) fail(`${description} references unknown topic ${id}.`);
};

export function validateTaxonomy(records = topics) {
  const byId = new Map();
  records.forEach((record, i) => {
    if (
      !string(record.id) ||
      !string(record.title) ||
      !["category", "topic", "subtopic"].includes(record.kind)
    )
      fail(`Invalid taxonomy record at ${i}.`);
    if (byId.has(record.id)) fail(`Duplicate topic ID ${record.id}.`);
    if (record.order !== i)
      fail(
        `Topic ${record.id} has unstable order ${record.order}; expected ${i}.`,
      );
    if (record.kind === "category") {
      if (record.parentId !== null || !slug.test(record.id))
        fail(`Invalid category ${record.id}.`);
    } else {
      const parent = byId.get(record.parentId);
      const requiredKind = record.kind === "topic" ? "category" : "topic";
      if (
        !parent ||
        parent.kind !== requiredKind ||
        !record.id.startsWith(`${parent.id}.`) ||
        !slug.test(record.id.slice(parent.id.length + 1))
      )
        fail(`Invalid parent for ${record.id}.`);
    }
    byId.set(record.id, record);
  });
  return true;
}

export function validateScopes(presets = coreScopes) {
  unique(
    presets.map((scope) => scope.id),
    "scope ID",
  );
  for (const scope of presets) {
    if (!slug.test(scope.id) || !string(scope.title))
      fail(`Invalid scope ${scope.id}.`);
    for (const key of ["includeTopicIds", "excludeTopicIds"])
      if (
        scope[key] &&
        (!Array.isArray(scope[key]) ||
          new Set(scope[key]).size !== scope[key].length)
      )
        fail(`Invalid ${key} in ${scope.id}.`);
    try {
      resolveScope(scope, presets);
    } catch (error) {
      fail(error.message);
    }
  }
  return true;
}

export function validateQuestion(question) {
  const id = question?.id;
  if (!string(id) || !slug.test(id)) fail(`Invalid question ID ${id}.`);
  if (!string(question.title) || !string(question.question))
    fail(`Question ${id} needs a title and instructions.`);
  if (!questionTypes.includes(question.type))
    fail(`Question ${id} has invalid type ${question.type}.`);
  if (!difficulties.includes(question.difficulty))
    fail(`Question ${id} has invalid difficulty ${question.difficulty}.`);
  if (!["draft", "verified"].includes(question.status))
    fail(`Question ${id} has invalid status.`);
  topicList(question.topics, `Question ${id}`);
  if (!question.topics.includes(question.primaryTopic))
    fail(`Question ${id} primary topic must appear in topics.`);
  if (question.scopeId) {
    let allowed;
    try {
      allowed = resolveScope(question.scopeId);
    } catch (error) {
      fail(`Question ${id}: ${error.message}`);
    }
    if (!question.topics.every((topic) => allowed.has(topic)))
      fail(`Question ${id} exceeds its scope ${question.scopeId}.`);
  }
  if (!question.source || !sourceTypes.includes(question.source.type))
    fail(`Question ${id} needs a valid source type.`);
  const source = question.source;
  if (source.type === "past-paper") {
    if (
      !string(source.name) ||
      !Number.isInteger(source.year) ||
      source.year < 1900 ||
      source.year > 2100 ||
      !string(source.assessment) ||
      !string(source.paper) ||
      !string(source.questionNumber) ||
      !string(source.reference)
    )
      fail(
        `Past-paper question ${id} needs source name, year, assessment, paper, question number and verifiable reference.`,
      );
  } else if (
    ["year", "assessment", "paper", "questionNumber", "reference"].some(
      (key) => source[key] !== undefined,
    )
  )
    fail(
      `Question ${id} cannot carry past-paper metadata with source type ${source.type}.`,
    );
  if (
    source.marks !== undefined &&
    (typeof source.marks !== "number" ||
      !Number.isFinite(source.marks) ||
      source.marks <= 0)
  )
    fail(`Question ${id} has invalid marks.`);
  if (
    !question.visualizer ||
    typeof question.visualizer.compatible !== "boolean"
  )
    fail(`Question ${id} needs Visualizer compatibility metadata.`);
  if (
    question.visualizer.compatible &&
    !string(question.code) &&
    !string(question.files?.["main.cpp"])
  )
    fail(`Visualizer-compatible question ${id} needs main.cpp code.`);
  if (question.code !== undefined && typeof question.code !== "string")
    fail(`Question ${id} has invalid code.`);
  if (
    question.files !== undefined &&
    (!question.files ||
      typeof question.files !== "object" ||
      Object.values(question.files).some((v) => typeof v !== "string"))
  )
    fail(`Question ${id} has invalid source files.`);
  if (
    question.standardInput !== undefined &&
    typeof question.standardInput !== "string"
  )
    fail(`Question ${id} has invalid standard input.`);
  if (
    question.tags !== undefined &&
    (!Array.isArray(question.tags) ||
      question.tags.some((tag) => !slug.test(tag)))
  )
    fail(`Question ${id} has invalid tags.`);
  if (question.tags) unique(question.tags, `tag in ${id}`);
  if (
    question.hints !== undefined &&
    (!Array.isArray(question.hints) ||
      question.hints.some((hint) => !string(hint)))
  )
    fail(`Question ${id} has invalid hints.`);
  if (
    question.commonMistakes !== undefined &&
    (!Array.isArray(question.commonMistakes) ||
      question.commonMistakes.some((mistake) => !string(mistake)))
  )
    fail(`Question ${id} has invalid common mistakes.`);
  if (
    [
      "predict-output",
      "predict-value",
      "predict-array-state",
      "identify-error",
    ].includes(question.type) &&
    ((!string(question.code) && !string(question.files?.["main.cpp"])) ||
      !string(question.answer))
  )
    fail(`Question ${id} needs code and a text answer for ${question.type}.`);
  if (
    question.type === "code-reasoning" &&
    !string(question.code) &&
    !string(question.files?.["main.cpp"])
  )
    fail(`Code-reasoning question ${id} needs code.`);
  if (question.type === "multiple-choice") {
    if (
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.some(
        (option) => !slug.test(option.id) || !string(option.text),
      )
    )
      fail(`Multiple-choice question ${id} needs at least two valid options.`);
    unique(
      question.options.map((option) => option.id),
      `option ID in ${id}`,
    );
    if (!question.options.some((option) => option.id === question.answer))
      fail(`Multiple-choice answer for ${id} must name an option.`);
  }
  if (
    question.status === "verified" &&
    (!string(question.answer) || !string(question.explanation))
  )
    fail(`Verified question ${id} needs an answer and explanation.`);
  return true;
}

export function validateQuestions(questions) {
  unique(
    questions.map((question) => question.id),
    "question ID",
  );
  questions.forEach(validateQuestion);
  return true;
}

export function validateExamples(examples) {
  unique(
    examples.map((example) => example.id),
    "example ID",
  );
  for (const example of examples) {
    if (
      !slug.test(example.id) ||
      !string(example.title) ||
      !difficulties.includes(example.difficulty)
    )
      fail(`Invalid example ${example.id}.`);
    topicList(example.topics, `Example ${example.id}`);
    if (!example.topics.includes(example.primaryTopic))
      fail(`Example ${example.id} primary topic must appear in topics.`);
    if (
      example.visualizerCompatible !== true ||
      (!string(example.code) && !string(example.files?.["main.cpp"]))
    )
      fail(`Example ${example.id} needs Visualizer source.`);
  }
  return true;
}

export function validateNotes(notes, { questions = [], examples = [] } = {}) {
  unique(
    notes.map((note) => note.id),
    "note ID",
  );
  const questionIds = new Set(questions.map((question) => question.id));
  const exampleIds = new Set(examples.map((example) => example.id));
  for (const note of notes) {
    if (!slug.test(note.id) || !getTopic(note.topicId) || !string(note.title))
      fail(`Invalid note ${note.id} or topic reference.`);
    if (!Array.isArray(note.sections))
      fail(`Note ${note.id} needs structured sections.`);
    unique(
      note.sections.map((section) => section.kind),
      `section kind in ${note.id}`,
    );
    for (const section of note.sections) {
      if (
        !noteSectionKinds.includes(section.kind) ||
        !Array.isArray(section.blocks)
      )
        fail(`Invalid section in note ${note.id}.`);
      for (const block of section.blocks) {
        if (
          !["paragraph", "code", "list"].includes(block.type) ||
          (block.type === "list" &&
            (!Array.isArray(block.items) ||
              block.items.some((item) => !string(item)))) ||
          (block.type !== "list" && !string(block.text))
        )
          fail(`Invalid content block in note ${note.id}.`);
      }
    }
    for (const [key, known] of [
      ["relatedTopics", new Set(topics.map((topic) => topic.id))],
      ["relatedQuestions", questionIds],
      ["relatedExamples", exampleIds],
    ]) {
      const references = note[key] ?? [];
      if (!Array.isArray(references))
        fail(`Note ${note.id} has invalid ${key}.`);
      unique(references, `${key} in ${note.id}`);
      for (const id of references)
        if (!known.has(id))
          fail(`Note ${note.id} references unknown ${key} ID ${id}.`);
    }
  }
  return true;
}
