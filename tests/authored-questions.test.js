import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authoredQuestions,
  questions,
  queryQuestions,
} from "../src/content/index.js";
import { categoryOf } from "../src/content/taxonomy.js";
import { validateQuestions } from "../src/content/validate.js";
import { runProject } from "../src/engine/index.js";

test("original AcePF practice spans the ten categories without source confusion", () => {
  assert.equal(authoredQuestions.length, 40);
  assert.equal(questions.length, 72);
  assert.equal(validateQuestions(questions), true);
  assert.equal(
    new Set(authoredQuestions.map((q) => categoryOf(q.primaryTopic).id)).size,
    10,
  );
  assert.equal(
    new Set(authoredQuestions.map((q) => q.id)).size,
    authoredQuestions.length,
  );
  assert.ok(
    authoredQuestions.every(
      (q) =>
        q.source.type === "authored" &&
        q.source.name === "AcePF original practice",
    ),
  );
  assert.ok(
    authoredQuestions.every(
      (q) => typeof q.autoGradable === "boolean" && q.verification,
    ),
  );
  assert.ok(authoredQuestions.some((q) => q.tags.includes("assessment-style")));
  assert.ok(
    authoredQuestions.some((q) => q.tags.includes("learning-practice")),
  );
  assert.equal(queryQuestions({ sourceType: "past-paper" }).length, 24);
  assert.equal(queryQuestions({ sourceType: "practice" }).length, 5);
});

test("authored scoring and Visualizer metadata match question form", () => {
  assert.equal(authoredQuestions.filter((q) => q.autoGradable).length, 36);
  assert.equal(
    authoredQuestions.filter((q) => q.visualizer.compatible).length,
    29,
  );
  for (const q of authoredQuestions) {
    if (q.type === "code-writing") assert.equal(q.autoGradable, false, q.id);
    if (q.visualizer.compatible) {
      assert.equal(q.verification, "execution-verified", q.id);
      assert.ok(q.code, q.id);
    }
  }
  assert.ok(
    queryQuestions({ scopeId: "fundamentals", autoGradable: true }).length >= 5,
  );
  assert.ok(
    queryQuestions({ scopeId: "full-pf", autoGradable: true }).length >= 20,
  );
});

test("29 executable authored answers agree with native C++17 and the frozen interpreter", () => {
  execFileSync("clang++", ["--version"], { stdio: "ignore" });
  const selected = authoredQuestions.filter(
    (q) => q.verification === "execution-verified",
  );
  assert.equal(selected.length, 29);
  const dir = mkdtempSync(join(tmpdir(), "acepf-authored-native-"));
  try {
    for (const q of selected) {
      writeFileSync(
        join(dir, "question.cpp"),
        `#include <iostream>\nusing namespace std;\n${q.code}`,
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
        { timeout: 15000, stdio: "pipe" },
      );
      const native = execFileSync(join(dir, "question"), [], {
        encoding: "utf8",
        cwd: dir,
        timeout: 5000,
      }).replace(/\n$/, "");
      assert.equal(native, q.answer, q.id);
      const run = runProject({ "main.cpp": q.code });
      assert.equal(run.ok, true, q.id);
      assert.equal(run.state.output.replace(/\n$/, ""), native, q.id);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
