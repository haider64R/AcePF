import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProject } from "../src/engine/index.js";
import { deriveTrace } from "../src/trace/educational.js";
import { acceptance } from "./acceptance-programs.js";
let compiler = true;
try {
  execFileSync("clang++", ["--version"], { stdio: "ignore" });
} catch {
  compiler = false;
}
test(
  "four Dry Run acceptance programs match native C++17 before and after grouping",
  { skip: !compiler },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "cpp-dry-run-native-"));
    try {
      for (const [name, source] of Object.entries(acceptance)) {
        writeFileSync(
          join(dir, "program.cpp"),
          "#include <iostream>\nusing namespace std;\n" + source,
        );
        execFileSync(
          "clang++",
          [
            "-std=c++17",
            "-O0",
            join(dir, "program.cpp"),
            "-o",
            join(dir, "program"),
          ],
          { timeout: 30000, stdio: "pipe" },
        );
        const native = execFileSync(join(dir, "program"), [], {
          cwd: dir,
          timeout: 5000,
          encoding: "utf8",
        });
        const files = { "main.cpp": source },
          r = runProject(files),
          t = deriveTrace(r.events, files);
        assert.equal(r.ok, true);
        assert.equal(r.state.output, native, name);
        assert.equal(t.steps.at(-1).state.output, native, name);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
