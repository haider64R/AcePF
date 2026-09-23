import { getTopic, isWithinTopic } from "./taxonomy.js";
import { resolveScope } from "./scopes.js";
import { questions as questionBank } from "./questions.js";
import { notes as noteBank } from "./notes.js";
import { examples as exampleBank } from "./examples.js";
import { difficulties, questionTypes, sourceTypes } from "./validate.js";

function checkFilters(filters) {
  if (filters.topicId && filters.topicIds)
    throw new Error("Use topicId or topicIds, not both.");
  if (filters.type && filters.types)
    throw new Error("Use type or types, not both.");
  const requested =
    filters.topicIds ?? (filters.topicId ? [filters.topicId] : []);
  if (!Array.isArray(requested)) throw new Error("topicIds must be an array.");
  for (const id of requested)
    if (!getTopic(id)) throw new Error(`Unknown topic filter: ${id}`);
  if (filters.topicMatch && !["any", "all"].includes(filters.topicMatch))
    throw new Error(`Unknown topic match mode: ${filters.topicMatch}`);
  if (filters.scopeId) resolveScope(filters.scopeId);
  if (filters.difficulty && !difficulties.includes(filters.difficulty))
    throw new Error(`Unknown difficulty filter: ${filters.difficulty}`);
  if (filters.type && !questionTypes.includes(filters.type))
    throw new Error(`Unknown question type filter: ${filters.type}`);
  if (
    filters.types &&
    (!Array.isArray(filters.types) ||
      filters.types.some((type) => !questionTypes.includes(type)))
  )
    throw new Error("Unknown question types filter.");
  if (filters.sourceType && !sourceTypes.includes(filters.sourceType))
    throw new Error(`Unknown source type filter: ${filters.sourceType}`);
  if (filters.year !== undefined && !Number.isInteger(filters.year))
    throw new Error("Year filter must be an integer.");
  if (
    filters.visualizerCompatible !== undefined &&
    typeof filters.visualizerCompatible !== "boolean"
  )
    throw new Error("Visualizer filter must be a boolean.");
  if (
    filters.autoGradable !== undefined &&
    typeof filters.autoGradable !== "boolean"
  )
    throw new Error("Auto-gradability filter must be a boolean.");
  if (
    filters.verification &&
    ![
      "execution-verified",
      "answer-reviewed",
      "source-only",
      "manual-review",
    ].includes(filters.verification)
  )
    throw new Error("Unknown verification filter.");
}

function topicMatch(
  item,
  { topicId, topicIds, topicMatch: matchMode = "any" },
) {
  const requested = topicIds ?? (topicId ? [topicId] : []);
  if (!requested.length) return true;
  const matches = (id) => item.topics.some((tag) => isWithinTopic(tag, id));
  return matchMode === "all"
    ? requested.every(matches)
    : requested.some(matches);
}

function withinScope(item, scopeId) {
  if (!scopeId) return true;
  const allowed = resolveScope(scopeId);
  // Every tagged concept must be covered; one easy tag cannot admit an
  // otherwise advanced question into an early syllabus ceiling.
  return item.topics.every((id) => allowed.has(id));
}

export function queryQuestions(filters = {}, bank = questionBank) {
  checkFilters(filters);
  return bank.filter(
    (q) =>
      topicMatch(q, filters) &&
      withinScope(q, filters.scopeId) &&
      (!filters.difficulty || q.difficulty === filters.difficulty) &&
      (!filters.type || q.type === filters.type) &&
      (!filters.types || filters.types.includes(q.type)) &&
      (!filters.sourceType || q.source.type === filters.sourceType) &&
      (!filters.assessment || q.source.assessment === filters.assessment) &&
      (filters.year === undefined || q.source.year === filters.year) &&
      (filters.visualizerCompatible === undefined ||
        q.visualizer.compatible === filters.visualizerCompatible) &&
      (filters.autoGradable === undefined ||
        q.autoGradable === filters.autoGradable) &&
      (!filters.verification || q.verification === filters.verification) &&
      (!filters.status || q.status === filters.status) &&
      (!filters.tag || q.tags?.includes(filters.tag)),
  );
}

export function queryExamples(filters = {}, bank = exampleBank) {
  checkFilters(filters);
  return bank.filter(
    (example) =>
      topicMatch(example, filters) &&
      withinScope(example, filters.scopeId) &&
      (!filters.difficulty || example.difficulty === filters.difficulty) &&
      (filters.visualizerCompatible === undefined ||
        example.visualizerCompatible === filters.visualizerCompatible),
  );
}

export function queryNotes(filters = {}, bank = noteBank) {
  if (filters.topicId && !getTopic(filters.topicId))
    throw new Error(`Unknown topic filter: ${filters.topicId}`);
  return bank.filter(
    (note) => !filters.topicId || isWithinTopic(note.topicId, filters.topicId),
  );
}

export function relatedContent(
  topicId,
  { questions = questionBank, examples = exampleBank, notes = noteBank } = {},
) {
  return {
    questions: queryQuestions({ topicId }, questions),
    examples: queryExamples({ topicId }, examples),
    notes: queryNotes({ topicId }, notes),
  };
}
