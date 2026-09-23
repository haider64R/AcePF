import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notes } from "../src/content/index.js";
import { runProject } from "../src/engine/index.js";

let compiler = true;
try {
  execFileSync("clang++", ["--version"], { stdio: "ignore" });
} catch {
  compiler = false;
}

test(
  "all eleven Notes samples agree with native C++17",
  { skip: !compiler },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "cpp-notes-native-"));
    let count = 0;
    try {
      for (const note of notes)
        for (const section of note.sections)
          for (const block of section.blocks)
            if (block.sampleId) {
              const label = `${note.id}/${block.sampleId}`;
              writeFileSync(
                join(dir, "sample.cpp"),
                `#include <iostream>\nusing namespace std;\n${block.text}\n`,
              );
              execFileSync(
                "clang++",
                [
                  "-std=c++17",
                  "-O0",
                  join(dir, "sample.cpp"),
                  "-o",
                  join(dir, "sample"),
                ],
                { timeout: 30000, stdio: "pipe" },
              );
              const native = execFileSync(join(dir, "sample"), [], {
                cwd: dir,
                timeout: 5000,
                encoding: "utf8",
              });
              const interpreted = runProject({ "main.cpp": block.text });
              assert.equal(interpreted.ok, true, label);
              assert.equal(interpreted.state.output, native, label);
              count++;
            }
      assert.equal(count, 11);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
