import { Diagnostic } from "./diagnostic.js";
const operators = [
  "<<=",
  ">>=",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "<<",
  ">>",
  "::",
  "&=",
  "|=",
  "^=",
];
const escapes = {
  n: "\n",
  t: "\t",
  r: "\r",
  0: "\0",
  "\\": "\\",
  "'": "'",
  '"': '"',
};
export function lex(source, file = "main.cpp", mapping = null) {
  let i = 0,
    line = 1,
    column = 1;
  const tokens = [];
  const loc = () => ({
    file: mapping?.[line - 1]?.file ?? file,
    line: mapping?.[line - 1]?.line ?? line,
    column,
  });
  const advance = () => {
    const c = source[i++];
    if (c === "\n") {
      line++;
      column = 1;
    } else column++;
    return c;
  };
  while (i < source.length) {
    if (/\s/.test(source[i])) {
      advance();
      continue;
    }
    if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") advance();
      continue;
    }
    if (source.startsWith("/*", i)) {
      const at = loc();
      advance();
      advance();
      while (i < source.length && !source.startsWith("*/", i)) advance();
      if (i === source.length)
        throw new Diagnostic("Unterminated block comment.", at);
      advance();
      advance();
      continue;
    }
    const at = loc();
    let value = "";
    if (/[A-Za-z_]/.test(source[i])) {
      while (i < source.length && /[\w]/.test(source[i])) value += advance();
      tokens.push({ kind: "id", value, loc: at });
      continue;
    }
    if (
      /[0-9]/.test(source[i]) ||
      (source[i] === "." && /[0-9]/.test(source[i + 1] ?? ""))
    ) {
      const match = source
        .slice(i)
        .match(
          /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?:[uUlLfF])?/,
        );
      value = match[0];
      for (let j = 0; j < value.length; j++) advance();
      tokens.push({ kind: "number", value, loc: at });
      continue;
    }
    if (source[i] === '"' || source[i] === "'") {
      const quote = advance();
      let closed = false;
      while (i < source.length) {
        let c = advance();
        if (c === quote) {
          closed = true;
          break;
        }
        if (c === "\n")
          throw new Diagnostic(
            "A literal cannot contain an unescaped newline.",
            at,
          );
        if (c === "\\") {
          const e = advance();
          if (!(e in escapes))
            throw new Diagnostic(`Unsupported escape \\${e}.`, at);
          c = escapes[e];
        }
        value += c;
      }
      if (!closed) throw new Diagnostic("Unterminated literal.", at);
      if (quote === "'" && value.length !== 1)
        throw new Diagnostic(
          "A char literal must contain exactly one character.",
          at,
        );
      tokens.push({ kind: quote === '"' ? "string" : "char", value, loc: at });
      continue;
    }
    const op = operators.find((op) => source.startsWith(op, i));
    if (op) {
      for (const c of op) advance();
      tokens.push({ kind: "symbol", value: op, loc: at });
      continue;
    }
    if ("{}()[];,:?~!+-*/%<>=&|^.".includes(source[i])) {
      tokens.push({ kind: "symbol", value: advance(), loc: at });
      continue;
    }
    throw new Diagnostic(
      `Unsupported character ${JSON.stringify(source[i])}.`,
      at,
    );
  }
  tokens.push({ kind: "eof", value: "<eof>", loc: loc() });
  return tokens;
}
