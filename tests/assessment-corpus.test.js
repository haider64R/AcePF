import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProject } from "../src/engine/index.js";
import {
  assessmentQuestions,
  assessmentSources,
  assessmentProfiles,
  questions,
  queryQuestions,
} from "../src/content/index.js";
import {
  validateAssessmentCorpus,
  validateQuestion,
} from "../src/content/validate.js";

test("all supplied PDFs have a distinct, evidence-limited inventory record", () => {
  assert.equal(assessmentSources.length, 14);
  assert.equal(new Set(assessmentSources.map((s) => s.document)).size, 14);
  assert.deepEqual(
    Object.fromEntries(
      ["exam", "practice", "duplicate-file"].map((kind) => [
        kind,
        assessmentSources.filter((s) => s.kind === kind).length,
      ]),
    ),
    { exam: 10, practice: 3, "duplicate-file": 1 },
  );
  assert.equal(
    assessmentSources.find(
      (s) => s.document === "PF Final Exam (Solution) (Spring-2024) (1).pdf",
    ).duplicateOf,
    "PF Final Exam (Solution) (Spring-2024).pdf",
  );
  assert.equal(
    assessmentSources.find(
      (s) => s.document === "PF Final Exam (Fall-2023).pdf",
    ).pages,
    17,
  );
  assert.equal(
    validateAssessmentCorpus(
      assessmentSources,
      assessmentProfiles,
      assessmentQuestions,
    ),
    true,
  );
});

test("imported questions share the canonical bank, tags, and syllabus selectors", () => {
  assert.equal(assessmentQuestions.length, 29);
  assert.ok(assessmentQuestions.every((q) => questions.includes(q)));
  assert.equal(queryQuestions({ sourceType: "past-paper" }).length, 24);
  assert.equal(queryQuestions({ sourceType: "practice" }).length, 5);
  assert.ok(
    queryQuestions({ assessment: "Final", topicId: "pointers" }).some(
      (q) => q.id === "fast-2024-final-q2-pointer-char",
    ),
  );
  assert.ok(
    queryQuestions({
      scopeId: "through-operators",
      sourceType: "practice",
    }).some((q) => q.id === "practice-datatypes-divisions"),
  );
  assert.equal(
    queryQuestions({ autoGradable: true, sourceType: "past-paper" }).every(
      (q) => q.autoGradable,
    ),
    true,
  );
  assert.equal(
    queryQuestions({ verification: "execution-verified" }).every(
      (q) => q.visualizer.compatible,
    ),
    true,
  );
});

test("provenance, verification, and auto-grading claims reject inconsistent records", () => {
  const base = structuredClone(assessmentQuestions[0]);
  delete base.source.page;
  assert.throws(() => validateQuestion(base), /verifiable reference/);
  base.source.page = 2;
  base.source.type = "authored";
  assert.throws(
    () => validateQuestion(base),
    /cannot carry past-paper metadata/,
  );
  base.source.type = "past-paper";
  base.autoGradable = "yes";
  assert.throws(() => validateQuestion(base), /autoGradable/);
  base.autoGradable = true;
  base.visualizer.compatible = false;
  assert.throws(() => validateQuestion(base), /Execution-verified/);
  const outOfBounds = structuredClone(assessmentQuestions);
  outOfBounds[0].source.page = 99;
  assert.throws(
    () =>
      validateAssessmentCorpus(
        assessmentSources,
        assessmentProfiles,
        outOfBounds,
      ),
    /inconsistent source inventory/,
  );
  assert.throws(() => queryQuestions({ autoGradable: "yes" }), /boolean/);
});

test("duplicate question references are retained without duplicate records", () => {
  for (const id of [
    "fast-shared-mystery-conversion",
    "fast-shared-nested-function",
  ]) {
    const matches = assessmentQuestions.filter((q) => q.id === id);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].source.references.length, 1);
    assert.equal(
      matches[0].source.references[0].document,
      "PF Sessional-II (Fall-20) (Solution).pdf",
    );
  }
  assert.equal(
    assessmentQuestions.filter((q) => q.source.document.includes("(1).pdf"))
      .length,
    0,
  );
});

test("nonportable and open-ended questions never claim automatic execution", () => {
  const nonportable = assessmentQuestions.filter((q) =>
    /unsequenced|overflow/.test(q.id),
  );
  assert.equal(nonportable.length, 3);
  assert.ok(
    nonportable.every(
      (q) =>
        !q.autoGradable &&
        !q.visualizer.compatible &&
        q.verification === "answer-reviewed",
    ),
  );
  const open = assessmentQuestions.filter((q) => q.type === "code-writing");
  assert.ok(open.every((q) => !q.autoGradable && !q.visualizer.compatible));
  assert.equal(
    assessmentQuestions.find((q) => q.id === "fast-2022-s1-aids-q3-tickets")
      .verification,
    "manual-review",
  );
});

test("a logical-error question retains its runnable original and supplied example input", () => {
  const q = assessmentQuestions.find(
    (item) => item.id === "fast-2020-mid-q3-average-error",
  );
  assert.equal(q.visualizer.compatible, true);
  assert.equal(q.autoGradable, false);
  const run = runProject({ "main.cpp": q.code }, { input: q.standardInput });
  assert.equal(run.ok, true);
  assert.equal(run.state.output, "The average of three numbers is 4");
});

test("17 deterministic output/state answers match native C++17 and supported Visualizer runs", () => {
  execFileSync("clang++", ["--version"], { stdio: "ignore" });
  const selected = assessmentQuestions.filter((q) => q.autoGradable && q.code);
  assert.equal(selected.length, 17);
  const dir = mkdtempSync(join(tmpdir(), "pf-corpus-native-"));
  try {
    for (const q of selected) {
      let code = q.code;
      if (q.id === "fast-2022-s2-cs-q1-array-iterations")
        code = code.replace(/}\s*$/, 'cout<<B[0]<<" "<<B[1]<<" "<<B[2]; }');
      writeFileSync(
        join(dir, "question.cpp"),
        `#include <iostream>\nusing namespace std;\n${code}`,
      );
      execFileSync(
        "clang++",
        [
          "-std=c++17",
          "-O0",
          join(dir, "question.cpp"),
          "-o",
          join(dir, "question"),
        ],
        { timeout: 15000 },
      );
      const native = execFileSync(join(dir, "question"), [], {
        encoding: "utf8",
        timeout: 5000,
      }).replace(/\n$/, "");
      assert.equal(native, q.answer.replace(/\n$/, ""), q.id);
      if (q.visualizer.compatible) {
        const run = runProject({ "main.cpp": q.code });
        assert.equal(run.ok, true, q.id);
        const interpreted =
          q.id === "fast-2022-s2-cs-q1-array-iterations"
            ? run.state.memory
                .find((item) => item.name === "B")
                .cells.map((cell) => cell.value)
                .join(" ")
            : run.state.output.replace(/\n$/, "");
        assert.equal(interpreted, native, q.id);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
