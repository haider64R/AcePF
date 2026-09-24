import {
  assessmentProfiles,
  assessmentSources,
  questions,
  queryQuestions,
} from "../content/index.js";
import { categoryOf } from "../content/taxonomy.js";

const gradableTypes = new Set([
  "predict-output",
  "predict-value",
  "predict-array-state",
  "multiple-choice",
]);
const byId = new Map(questions.map((question) => [question.id, question]));

export function challengeCandidates(filters = {}) {
  return queryQuestions({
    ...filters,
    status: "verified",
    autoGradable: true,
  }).filter(
    (question) =>
      gradableTypes.has(question.type) &&
      question.verification !== "manual-review",
  );
}

function hash(value) {
  let h = 2166136261;
  for (const char of String(value))
    h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Balanced, repeatable order: favour a category not used in the preceding
// slot, then a different primary topic. A seed changes ties without making
// tests or restored sessions unpredictable.
export function selectQuestions(pool, count, seed = 1) {
  if (!Number.isInteger(count) || count < 1 || pool.length < count)
    throw new Error(
      `Only ${pool.length} eligible questions are available for ${count} requested.`,
    );
  const remaining = [...pool].sort(
    (a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`),
  );
  const selected = [];
  const usedCategories = new Map();
  while (selected.length < count) {
    const previous = selected.at(-1);
    remaining.sort((a, b) => {
      const score = (q) => {
        const category = categoryOf(q.primaryTopic).id;
        return (
          (category === categoryOf(previous?.primaryTopic)?.id ? 4 : 0) +
          (q.primaryTopic === previous?.primaryTopic ? 2 : 0) +
          (usedCategories.get(category) ?? 0)
        );
      };
      return (
        score(a) - score(b) || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`)
      );
    });
    const next = remaining.shift();
    selected.push(next);
    const category = categoryOf(next.primaryTopic).id;
    usedCategories.set(category, (usedCategories.get(category) ?? 0) + 1);
  }
  return selected;
}

export function createSession({
  kind,
  questionIds,
  title,
  durationSeconds = null,
  startedAt = Date.now(),
}) {
  if (
    !Array.isArray(questionIds) ||
    !questionIds.length ||
    new Set(questionIds).size !== questionIds.length ||
    questionIds.some((id) => !byId.has(id))
  )
    throw new Error("A session needs unique, known questions.");
  if (!["challenge", "mock", "past-paper"].includes(kind))
    throw new Error("Unknown session kind.");
  return {
    kind,
    title,
    questionIds: [...questionIds],
    answers: {},
    index: 0,
    startedAt,
    durationSeconds,
    submittedAt: null,
  };
}

export function saveAnswer(session, questionId, value) {
  if (session.submittedAt !== null)
    throw new Error("Submitted sessions cannot be edited.");
  if (!session.questionIds.includes(questionId))
    throw new Error("Question is outside this session.");
  return {
    ...session,
    answers: { ...session.answers, [questionId]: String(value) },
  };
}

export function moveTo(session, index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= session.questionIds.length
  )
    throw new Error("Question index is outside this session.");
  return { ...session, index };
}

export function submitSession(session, submittedAt = Date.now()) {
  if (session.submittedAt !== null) return session;
  return { ...session, submittedAt };
}

export function secondsLeft(session, now = Date.now()) {
  if (session.durationSeconds === null) return null;
  return Math.max(
    0,
    session.durationSeconds -
      Math.floor(((session.submittedAt ?? now) - session.startedAt) / 1000),
  );
}

export function normalizeAnswer(question, value) {
  const normalized = String(value ?? "")
    .replaceAll("\r\n", "\n")
    .trim();
  if (question.type === "predict-array-state")
    return normalized.replace(/\s+/g, " ");
  return normalized;
}

export function gradeQuestion(question, response) {
  if (!question.autoGradable || !gradableTypes.has(question.type)) return null;
  if (!String(response ?? "").trim()) return false;
  return (
    normalizeAnswer(question, response) ===
    normalizeAnswer(question, question.answer)
  );
}

export function gradeSession(session) {
  if (session.submittedAt === null) throw new Error("Submit before grading.");
  const items = session.questionIds.map((id) => {
    const question = byId.get(id);
    const response = session.answers[id] ?? "";
    return {
      id,
      question,
      response,
      correct: gradeQuestion(question, response),
    };
  });
  const graded = items.filter((item) => item.correct !== null);
  const correct = graded.filter((item) => item.correct).length;
  const byCategory = new Map();
  for (const item of graded) {
    const category = categoryOf(item.question.primaryTopic).id;
    const current = byCategory.get(category) ?? { correct: 0, total: 0 };
    current.total++;
    if (item.correct) current.correct++;
    byCategory.set(category, current);
  }
  return {
    items,
    correct,
    graded: graded.length,
    manual: items.length - graded.length,
    percentage: graded.length
      ? Math.round((correct / graded.length) * 100)
      : null,
    byCategory: Object.fromEntries(byCategory),
  };
}

export function mockCandidates(profileId, scopeId) {
  const profile = assessmentProfiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Unknown assessment profile.");
  const defaultScope =
    profileId === "sessional-1"
      ? "through-selection"
      : profileId === "sessional-2"
        ? "through-arrays"
        : "full-pf";
  const allowed = new Set(profile.observedScope);
  const pool = challengeCandidates({
    scopeId: scopeId ?? defaultScope,
    sourceType: "authored",
  }).filter((question) => allowed.has(categoryOf(question.primaryTopic).id));
  return { profile, scopeId: scopeId ?? defaultScope, pool };
}

export function pastPaperSets() {
  return assessmentSources
    .filter((source) => source.kind === "exam")
    .map((source) => ({
      source,
      completeness: "partial",
      questions: questions.filter(
        (question) =>
          question.source.type === "past-paper" &&
          question.status === "verified" &&
          (question.source.document === source.document ||
            question.source.references?.some(
              (ref) => ref.document === source.document,
            )),
      ),
    }));
}

// Keep the historical inventory intact; the student catalogue lists only
// sets with verified questions a learner can actually attempt.
export function studentPastPaperSets() {
  return pastPaperSets().filter((set) => set.questions.length > 0);
}
