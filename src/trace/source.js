import { loadProject } from "../engine/project.js";
import { lex } from "../engine/lexer.js";
import { parse } from "../engine/parser.js";
import { label } from "../engine/types.js";
export const locationKey = (loc) =>
  loc ? `${loc.file}:${loc.line}:${loc.column}` : "";
export function expressionText(n) {
  if (!n) return "";
  switch (n.kind) {
    case "literal":
      return n.type.base === "string"
        ? JSON.stringify(n.value)
        : n.type.base === "char"
          ? `'${n.value === 0 ? "\\0" : String.fromCharCode(n.value)}'`
          : n.type.base === "bool"
            ? n.value
              ? "true"
              : "false"
            : n.type.base === "nullptr"
              ? "nullptr"
              : String(n.value);
    case "name":
      return n.name;
    case "binary":
      return `(${expressionText(n.left)} ${n.op} ${expressionText(n.right)})`;
    case "assign":
      return `${expressionText(n.left)} ${n.op} ${expressionText(n.right)}`;
    case "unary":
      return n.postfix
        ? `${expressionText(n.expr)}${n.op}`
        : `${n.op}${expressionText(n.expr)}`;
    case "index":
      return `${expressionText(n.target)}[${expressionText(n.index)}]`;
    case "member":
      return `${expressionText(n.target)}.${n.name}`;
    case "call":
      return `${expressionText(n.callee)}(${n.args.map(expressionText).join(", ")})`;
    case "ternary":
      return `(${expressionText(n.test)} ? ${expressionText(n.yes)} : ${expressionText(n.no)})`;
    case "new":
      return `new ${label(n.type)}${n.size ? "[" + expressionText(n.size) + "]" : ""}${n.init ? "(" + expressionText(n.init) + ")" : ""}`;
    case "list":
      return `{${n.items.map(expressionText).join(", ")}}`;
    case "streamInit":
      return `(${n.args.map(expressionText).join(", ")})`;
    default:
      return "";
  }
}
export const cleanExpression = (n) => {
  const text = expressionText(n);
  return n?.kind === "binary" ? text.slice(1, -1) : text;
};
export function statementText(n) {
  if (!n) return "";
  if (n.kind === "declare")
    return `${label(n.type)} ${n.name}${n.shape.map((s) => "[" + expressionText(s) + "]").join("")}${n.init ? " = " + expressionText(n.init) : ""}`;
  if (n.kind === "declarations") return n.items.map(statementText).join("; ");
  if (n.kind === "expression") {
    const streamText = (x) =>
      x?.kind === "binary" && ["<<", ">>"].includes(x.op)
        ? `${streamText(x.left)} ${x.op} ${expressionText(x.right)}`
        : cleanExpression(x);
    return streamText(n.expr);
  }
  if (n.kind === "if" || n.kind === "switch")
    return `${n.kind} (${cleanExpression(n.test)})`;
  if (["for", "while", "do"].includes(n.kind))
    return `${n.kind} (${cleanExpression(n.test) || "true"})`;
  if (n.kind === "return")
    return `return${n.expr ? " " + cleanExpression(n.expr) : ""}`;
  if (n.kind === "delete")
    return `delete${n.array ? "[]" : ""} ${cleanExpression(n.expr)}`;
  if (n.kind === "function")
    return `${n.name}(${n.params.map((p) => label(p.type) + " " + p.name).join(", ")})`;
  return n.kind;
}
// Reuses syntax only. No expression is executed here; values come exclusively from events.
export function sourceCatalog(files) {
  const nodes = new Map(),
    contexts = new Map(),
    functions = new Map();
  let ast = null;
  const add = (map, key, value) =>
    map.set(key, [...(map.get(key) ?? []), value]);
  const indexExpression = (n, context) => {
    if (!n) return;
    add(nodes, locationKey(n.loc), n);
    add(contexts, locationKey(n.loc), context);
    for (const [key, v] of Object.entries(n)) {
      if (["loc", "type"].includes(key)) continue;
      if (Array.isArray(v))
        v.forEach((x) => {
          if (x?.kind) indexExpression(x, context);
        });
      else if (v?.kind) indexExpression(v, context);
    }
  };
  function visit(n, parent = null, role = "statement") {
    if (!n) return;
    const context = { node: n, owner: parent ?? n, role };
    add(nodes, locationKey(n.loc), n);
    add(contexts, locationKey(n.loc), context);
    if (n.kind === "function") {
      functions.set(n.name, n);
      n.body?.statements.forEach((x) => visit(x));
    } else if (n.kind === "block") n.statements.forEach((x) => visit(x));
    else if (n.kind === "declarations")
      n.items.forEach((d) => {
        add(nodes, locationKey(d.loc), d);
        add(contexts, locationKey(d.loc), context);
        indexExpression(d.init, context);
      });
    else if (n.kind === "declare") indexExpression(n.init, context);
    else if (["for", "while", "do"].includes(n.kind)) {
      if (n.init) visit(n.init, n, "initialization");
      indexExpression(n.test, { node: n, owner: n, role: "condition" });
      indexExpression(n.update, { node: n, owner: n, role: "update" });
      visit(n.body);
    } else if (n.kind === "if") {
      indexExpression(n.test, context);
      visit(n.yes);
      visit(n.no);
    } else if (n.kind === "switch") {
      indexExpression(n.test, context);
      n.cases.forEach((c) => c.statements.forEach((x) => visit(x)));
    } else indexExpression(n.expr, context);
  }
  try {
    const p = loadProject(files);
    ast = parse(lex(p.source, "main.cpp", p.mapping));
    ast.items.forEach((x) => visit(x));
  } catch {
    /* Invalid syntax is represented by the original diagnostic, never guessed. */
  }
  return {
    ast,
    functions,
    nodesAt: (loc) => nodes.get(locationKey(loc)) ?? [],
    nodeFor(event, kinds) {
      const list = nodes.get(locationKey(event.loc)) ?? [];
      return list.find((n) => kinds.includes(n.kind));
    },
    context(event) {
      const list = contexts.get(locationKey(event.loc)) ?? [];
      return (
        list.find(
          (c) =>
            c.role === "condition" ||
            c.role === "update" ||
            c.role === "initialization",
        ) ??
        list.find((c) => !["block", "function"].includes(c.node.kind)) ??
        list[0]
      );
    },
    fallback: (loc) =>
      files[loc?.file]?.split("\n")[loc.line - 1]?.trim() ?? "Execution",
  };
}
