import { validate } from "./validate.js";
import { loadProject } from "./project.js";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { Runtime } from "./runtime.js";
import { Diagnostic } from "./diagnostic.js";
export function runProject(files, options = {}) {
  try {
    if (
      (options.input ?? "").length > 100000 ||
      Object.keys(options.files ?? {}).length > 64 ||
      Object.values(options.files ?? {}).some((x) => typeof x !== "string") ||
      Object.values(options.files ?? {}).join("").length > 65536
    )
      throw new Diagnostic("Input or virtual file resource limit exceeded.");
    if (Object.values(files).join("").length > 100000)
      throw new Diagnostic("Project exceeds the 100,000 character limit.");
    const p = loadProject(files);
    return new Runtime(
      validate(parse(lex(p.source, "main.cpp", p.mapping))),
      options,
    ).run();
  } catch (e) {
    if (!(e instanceof Diagnostic) && !(e instanceof RangeError)) throw e;
    const state = {
      scopes: [],
      memory: [],
      frames: [],
      output: "",
      files: { ...options.files },
      inputIndex: 0,
    };
    return {
      ok: false,
      state,
      events: [
        {
          id: 0,
          kind: "diagnostic",
          loc: e.loc ?? null,
          message:
            e instanceof RangeError
              ? "Program nesting exceeds the parser limit."
              : e.message,
          detail: { code: e.code ?? "limit" },
          state,
        },
      ],
    };
  }
}
