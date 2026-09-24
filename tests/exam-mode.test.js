import test from "node:test";
import assert from "node:assert/strict";
import { assessmentProfiles, queryQuestions } from "../src/content/index.js";
import {
  createSession,
  gradeSession,
  mockCandidates,
  moveTo,
  pastPaperSets,
  saveAnswer,
  secondsLeft,
  selectQuestions,
  submitSession,
} from "../src/learning/assessment.js";

test("Question Bank selectors combine source, assessment, year, type and topics", () => {
  const paper = queryQuestions({
    sourceType: "past-paper",
    assessment: "Sessional 2",
    year: 2022,
    topicId: "loops",
    status: "verified",
  });
  assert.ok(paper.length > 0);
  assert.ok(
    paper.every(
      (q) =>
        q.source.type === "past-paper" &&
        q.source.assessment === "Sessional 2" &&
        q.source.year === 2022 &&
        q.topics.some((t) => t.startsWith("loops")),
    ),
  );
  const manual = queryQuestions({ autoGradable: false, status: "verified" });
  assert.ok(manual.some((q) => q.type === "code-writing"));
  assert.ok(
    queryQuestions({
      visualizerCompatible: true,
      difficulty: "hard",
      status: "verified",
    }).length > 0,
  );
});

test("genuine paper sets contain only sourced exam records and identify partial import", () => {
  const sets = pastPaperSets();
  assert.ok(sets.length >= 8);
  assert.ok(
    sets.every(
      (set) =>
        set.completeness === "partial" &&
        set.source.kind === "exam" &&
        set.questions.every(
          (q) => q.source.type === "past-paper" && q.status === "verified",
        ),
    ),
  );
  assert.ok(sets.some((set) => set.questions.length === 0));
  assert.ok(sets.some((set) => set.questions.some((q) => !q.autoGradable)));
});

test("practice mocks use authored questions within each observed profile", () => {
  for (const profile of assessmentProfiles) {
    const { pool } = mockCandidates(profile.id);
    assert.ok(pool.length >= 15);
    assert.ok(
      pool.every((q) => q.source.type === "authored" && q.autoGradable),
    );
    const picked = selectQuestions(pool, 10, 55);
    assert.equal(new Set(picked.map((q) => q.id)).size, 10);
  }
  assert.throws(() => mockCandidates("not-a-profile"), /Unknown/);
});

test("exam timer and navigation retain answers; manual items are excluded from score", () => {
  const paper = pastPaperSets().find(
    (set) =>
      set.questions.some((q) => !q.autoGradable) &&
      set.questions.some((q) => q.autoGradable),
  );
  const graded = paper.questions.find((q) => q.autoGradable),
    manual = paper.questions.find((q) => !q.autoGradable);
  let session = createSession({
    kind: "past-paper",
    title: "Partial",
    questionIds: [graded.id, manual.id],
    durationSeconds: 60,
    startedAt: 1000,
  });
  assert.equal(secondsLeft(session, 21000), 40);
  session = saveAnswer(session, graded.id, graded.answer);
  session = moveTo(session, 1);
  session = saveAnswer(session, manual.id, "My reasoning");
  assert.equal(session.answers[graded.id], graded.answer);
  assert.equal(secondsLeft(session, 61000), 0);
  session = submitSession(session, 61000);
  const result = gradeSession(session);
  assert.equal(result.correct, 1);
  assert.equal(result.graded, 1);
  assert.equal(result.manual, 1);
  assert.equal(result.percentage, 100);
  assert.equal(result.items[1].correct, null);
  assert.throws(
    () => saveAnswer(session, manual.id, "changed"),
    /cannot be edited/,
  );
});
