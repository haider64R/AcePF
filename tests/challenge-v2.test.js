import test from "node:test";
import assert from "node:assert/strict";
import {
  challengeCandidates,
  createSession,
  gradeQuestion,
  gradeSession,
  saveAnswer,
  selectQuestions,
  submitSession,
} from "../src/learning/assessment.js";
import { questions } from "../src/content/index.js";

test("Challenge V2 filters canonical scopes, topics and difficulty without a duplicate bank", () => {
  const foundation = challengeCandidates({ scopeId: "fundamentals" });
  assert.equal(foundation.length, 5);
  assert.ok(
    foundation.every((q) =>
      q.topics.every((id) => id.startsWith("fundamentals")),
    ),
  );
  const operators = challengeCandidates({
    scopeId: "through-operators",
    topicId: "operators",
    difficulty: "hard",
  });
  assert.ok(operators.length > 0);
  assert.ok(
    operators.every(
      (q) =>
        q.difficulty === "hard" &&
        q.topics.some((id) => id.startsWith("operators")),
    ),
  );
  assert.ok(challengeCandidates({ scopeId: "full-pf" }).length >= 20);
  assert.ok(
    challengeCandidates().every((q) => questions.includes(q) && q.autoGradable),
  );
});

test("question selection is repeatable, balanced and rejects impossible counts", () => {
  const pool = challengeCandidates({ scopeId: "through-loops" });
  const first = selectQuestions(pool, 15, 42);
  assert.deepEqual(
    first.map((q) => q.id),
    selectQuestions(pool, 15, 42).map((q) => q.id),
  );
  assert.equal(new Set(first.map((q) => q.id)).size, 15);
  assert.throws(() => selectQuestions(pool, pool.length + 1), /Only/);
  assert.throws(() => selectQuestions(pool, 0), /Only/);
});

test("answering, submission, scoring and review remain consistent", () => {
  const candidates = challengeCandidates({ scopeId: "fundamentals" });
  let session = createSession({
    kind: "challenge",
    title: "Test",
    questionIds: candidates.map((q) => q.id),
    startedAt: 1000,
  });
  session = saveAnswer(session, candidates[0].id, candidates[0].answer);
  session = saveAnswer(session, candidates[1].id, "definitely wrong");
  assert.equal(
    gradeQuestion(candidates[0], session.answers[candidates[0].id]),
    true,
  );
  assert.throws(() => gradeSession(session), /Submit/);
  session = submitSession(session, 2000);
  const result = gradeSession(session);
  assert.equal(result.graded, candidates.length);
  assert.equal(result.correct, 1);
  assert.equal(result.items[0].response, candidates[0].answer);
  assert.equal(result.items[1].correct, false);
  assert.throws(
    () => saveAnswer(session, candidates[0].id, "other"),
    /cannot be edited/,
  );
});

test("source and Visualizer metadata survive Challenge selection", () => {
  const sourced = challengeCandidates({ sourceType: "past-paper" });
  assert.ok(sourced.length > 0);
  assert.ok(sourced.every((q) => q.source.document && q.source.page > 0));
  const selected = selectQuestions(challengeCandidates(), 20, 7);
  assert.ok(selected.some((q) => q.source.type === "authored"));
  assert.ok(
    selected.every((q) => typeof q.visualizer.compatible === "boolean"),
  );
});
