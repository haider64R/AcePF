import assert from "node:assert/strict";
import { runProject } from "../src/engine/index.js";
export const run = (body, options = {}) =>
  runProject(
    {
      "main.cpp": `#include <iostream>\nusing namespace std;\nint main(){${body}}`,
    },
    options,
  );
export function good(body, output, options) {
  const r = run(body, options);
  assert.equal(r.ok, true, r.events.at(-1).message);
  if (output !== undefined) assert.equal(r.state.output, output);
  return r;
}
export function bad(body, pattern) {
  const r = run(body);
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, pattern);
  return r;
}
