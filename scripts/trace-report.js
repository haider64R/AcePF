import { runProject } from "../src/engine/index.js";
import { deriveTrace } from "../src/trace/educational.js";
import { acceptance } from "../tests/acceptance-programs.js";
for (const [name, source] of Object.entries(acceptance)) {
  const files = { "main.cpp": source },
    r = runProject(files),
    t = deriveTrace(r.events, files);
  console.log(
    JSON.stringify({
      case: name,
      ok: r.ok,
      output: r.state.output,
      raw: r.events.length,
      dry: t.steps.length,
      reduction:
        ((1 - t.steps.length / r.events.length) * 100).toFixed(1) + "%",
      categories: t.categories,
    }),
  );
}
