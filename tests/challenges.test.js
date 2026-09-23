import test from "node:test";
import assert from "node:assert/strict";
import { challenges } from "../src/ui/challenges.js";
import { runProject } from "../src/engine/index.js";
for (const c of challenges)
  test("challenge answer: " + c.title, () => {
    const r = runProject({ "main.cpp": c.code });
    assert.equal(r.ok, true, r.events.at(-1).message);
    assert.equal(r.state.output.trim(), c.answer);
  });
