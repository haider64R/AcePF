import { Diagnostic } from "./diagnostic.js";
// Header expansion is intentionally small: declarations, conventional guards and quoted includes.
export function loadProject(files) {
  if (typeof files["main.cpp"] !== "string")
    throw new Diagnostic("Project needs main.cpp.");
  for (const [name, content] of Object.entries(files))
    if (!/^[A-Za-z_][\w]*\.(cpp|h)$/.test(name) || typeof content !== "string")
      throw new Diagnostic("Source filenames must be simple .cpp or .h names.");
  const output = [],
    mapping = [],
    included = new Set(),
    visiting = new Set();
  function expand(file) {
    if (included.has(file)) return;
    if (visiting.has(file))
      throw new Diagnostic(`Circular include involving ${file}.`);
    if (!Object.hasOwn(files, file))
      throw new Diagnostic(`Missing project header '${file}'.`);
    visiting.add(file);
    let guard = null,
      guardDefined = false,
      guardClosed = false;
    const lines = files[file].split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i],
        loc = { file, line: i + 1, column: 1 },
        directive = line.match(/^\s*#\s*(.*)$/);
      if (!directive) {
        output.push(line);
        mapping.push(loc);
        continue;
      }
      let m;
      const d = directive[1].trim();
      if (/^include\s*<(iostream|fstream)>\s*(?:\/\/.*)?$/.test(d)) continue;
      if ((m = d.match(/^include\s*"([A-Za-z_][\w]*\.h)"\s*(?:\/\/.*)?$/))) {
        expand(m[1]);
        continue;
      }
      if (d === "pragma once" && file.endsWith(".h")) continue;
      if (
        (m = d.match(/^ifndef\s+([A-Z_][A-Z_0-9]*)$/)) &&
        file.endsWith(".h") &&
        !guard
      ) {
        guard = m[1];
        continue;
      }
      if (d === `define ${guard}` && guard && !guardDefined) {
        guardDefined = true;
        continue;
      }
      if (d === "endif" && guardDefined && !guardClosed) {
        guardClosed = true;
        continue;
      }
      throw new Diagnostic(
        "Unsupported preprocessor directive. Only includes, #pragma once and conventional header guards are supported.",
        loc,
      );
    }
    if (guard && (!guardDefined || !guardClosed))
      throw new Diagnostic(`Incomplete include guard in ${file}.`);
    visiting.delete(file);
    included.add(file);
  }
  expand("main.cpp");
  for (const name of Object.keys(files)
    .filter((f) => f.endsWith(".cpp") && f !== "main.cpp")
    .sort())
    expand(name);
  return { source: output.join("\n"), mapping };
}
