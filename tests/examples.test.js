import test from "node:test";
import assert from "node:assert/strict";
import { examples } from "../src/ui/examples.js";
import { runProject } from "../src/engine/index.js";
for (const e of examples)
  test("built-in example: " + e.topic, () => {
    const r = runProject(e.files ?? { "main.cpp": e.code }, {
      input: e.input,
      files: e.virtualFiles,
    });
    assert.equal(r.ok, true, r.events.at(-1).message);
  });
