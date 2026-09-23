import { fail } from "./diagnostic.js";
import { type, label, integer, common, promote } from "./types.js";
import { MODES } from "./io.js";
const numeric = (t) =>
  !t.pointer &&
  ["int", "short", "long", "char", "bool", "float", "double"].includes(t.base);
const stream = (t) =>
  ["stream", "ifstream", "ofstream", "fstream"].includes(t.base);
const same = (a, b) =>
  a.base === b.base && a.pointer === b.pointer && a.unsigned === b.unsigned;
const sig = (f) =>
  JSON.stringify([
    label(f.type),
    ...f.params.map(
      (p) =>
        label(p.type) +
        JSON.stringify(p.shape.map((x, i) => (i === 0 ? "array" : x?.value))),
    ),
  ]);
// This checks every AST path before execution. It is not a full C++ compiler.
export function validate(ast) {
  const globals = new Map(),
    functions = new Map();
  let scopes = [globals],
    current = null,
    loops = 0,
    switches = 0;
  const lookup = (name, n) => {
    for (let i = scopes.length - 1; i >= 0; i--)
      if (scopes[i].has(name)) return scopes[i].get(name);
    fail(`'${name}' is not declared in this scope.`, n, "name");
  };
  const condition = (t, n) => {
    if (!numeric(t) && !t.pointer && !stream(t) && t.base !== "nullptr")
      fail(
        "A condition needs a number, bool, pointer or input stream.",
        n,
        "type",
      );
  };
  const compatible = (from, to, n) => {
    if (to.pointer) {
      if (from.base === "nullptr") return;
      if (
        !from.pointer ||
        !same({ ...from, pointer: false }, { ...to, pointer: false }) ||
        (from.const && !to.const)
      )
        fail(`Cannot convert ${label(from)} to ${label(to)}.`, n, "type");
    } else if (!numeric(from) || !numeric(to)) {
      if (!(to.base === "bool" && from.pointer))
        fail(`Cannot convert ${label(from)} to ${label(to)}.`, n, "type");
    }
  };
  function scalarDecay(n) {
    if (
      n.arrayShape?.length > 1 ||
      (n.arrayShape?.length && n.arrayElementType?.pointer)
    )
      fail(
        "This conversion requires a pointer-to-row or pointer-to-pointer type, outside this subset.",
        n,
        "type",
      );
  }
  function writable(n) {
    const t = expr(n);
    if (!n.isLvalue || n.arrayShape?.length)
      fail(
        n.arrayShape?.length
          ? "An entire array cannot be assigned; assign an element instead."
          : "This expression is not writable storage.",
        n,
        "type",
      );
    if (t.pointer ? t.pointerConst : t.const)
      fail("Cannot modify const storage.", n, "const");
    return t;
  }
  function expr(n) {
    let t;
    switch (n.kind) {
      case "literal":
        t = n.type;
        break;
      case "name":
        if (["cin", "cout"].includes(n.name)) t = type("stream");
        else if (n.name === "endl") t = type("string");
        else if (Object.hasOwn(MODES, n.name)) t = type();
        else {
          const b = lookup(n.name, n);
          t = b.type;
          n.isLvalue = true;
          n.arrayShape = b.shape ?? [];
          n.arrayElementType = b.type;
          if (n.arrayShape.length) t = { ...t, pointer: true };
        }
        break;
      case "list":
        for (const x of n.items) expr(x);
        t = type("aggregate");
        break;
      case "streamInit":
        for (const x of n.args) expr(x);
        t = type("stream");
        break;
      case "index": {
        const base = expr(n.target),
          index = expr(n.index);
        if (!base.pointer || !integer(index))
          fail(
            "Array indexing requires a pointer/array and an integer index.",
            n,
            "type",
          );
        n.arrayShape = n.target.arrayShape?.slice(1) ?? [];
        n.arrayElementType = n.target.arrayElementType;
        if (n.target.arrayShape?.length) {
          const binding =
            n.target.kind === "name" ? lookup(n.target.name, n) : null;
          t = n.arrayShape.length
            ? base
            : (binding?.type ?? { ...base, pointer: false });
        } else t = { ...base, pointer: false, pointerConst: false };
        n.isLvalue = !n.arrayShape.length;
        break;
      }
      case "assign": {
        const dest = writable(n.left),
          src = expr(n.right);
        scalarDecay(n.right);
        if (n.op === "=") compatible(src, dest, n);
        else compatible(operation(n.op.slice(0, -1), dest, src, n), dest, n);
        t = dest;
        n.isLvalue = true;
        break;
      }
      case "binary": {
        const a = expr(n.left),
          b = expr(n.right);
        if (stream(a)) {
          if (!["<<", ">>"].includes(n.op))
            fail("Only insertion/extraction are supported on streams.", n);
          if (n.op === ">>") {
            if (
              n.right.arrayShape?.length === 1 &&
              n.right.arrayElementType?.base === "char" &&
              !n.right.arrayElementType.pointer
            ) {
              if (n.right.arrayElementType.const)
                fail("Cannot read input into a const char array.", n, "const");
            } else writable(n.right);
          }
          t = type("stream");
        } else {
          scalarDecay(n.left);
          scalarDecay(n.right);
          t = operation(n.op, a, b, n);
        }
        break;
      }
      case "unary": {
        const a = expr(n.expr);
        if (["++", "--"].includes(n.op)) {
          writable(n.expr);
          if (a.base === "bool" || (!numeric(a) && !a.pointer))
            fail(
              "Increment/decrement requires a numeric value or pointer; bool is excluded.",
              n,
              "type",
            );
          t = a;
        } else if (n.op === "&") {
          if (!n.expr.isLvalue || n.expr.arrayShape?.length)
            fail(
              "Address-of requires scalar storage in this subset.",
              n,
              "type",
            );
          if (a.pointer)
            fail("Pointer-to-pointer types are outside this subset.", n);
          t = { ...a, pointer: true };
        } else if (n.op === "*") {
          if (!a.pointer) fail("Dereference requires a pointer.", n, "type");
          t = { ...a, pointer: false, pointerConst: false };
          n.isLvalue = true;
        } else if (n.op === "!") {
          condition(a, n);
          t = type("bool");
        } else {
          if (!numeric(a) || (n.op === "~" && !integer(a)))
            fail(
              "Unary operator requires compatible numeric operands.",
              n,
              "type",
            );
          t = promote(a);
        }
        break;
      }
      case "ternary": {
        condition(expr(n.test), n.test);
        const a = expr(n.yes),
          b = expr(n.no);
        if (numeric(a) && numeric(b))
          t = same(a, b)
            ? { ...a, const: false, reference: false }
            : common(a, b);
        else if (a.pointer && (b.pointer || b.base === "nullptr")) {
          t = { ...a, const: a.const || b.const };
          compatible(b, t, n);
        } else if (b.pointer && a.base === "nullptr") t = b;
        else if (a.base === "void" && b.base === "void") t = a;
        else
          fail(
            "Ternary alternatives need compatible numeric or pointer types.",
            n,
            "type",
          );
        break;
      }
      case "new":
        if (n.size && !integer(expr(n.size)))
          fail("new[] requires an integer size.", n, "type");
        if (
          n.size &&
          n.init &&
          !(n.init.kind === "literal" && n.init.value === 0)
        )
          fail(
            "Dynamic array value initialization supports empty parentheses only.",
            n,
          );
        if (n.init) compatible(expr(n.init), n.type, n);
        t = { ...n.type, pointer: true };
        break;
      case "call": {
        if (n.callee.kind === "member") {
          const target = expr(n.callee.target);
          if (!stream(target))
            fail("File methods require a stream.", n, "type");
          for (const a of n.args) expr(a);
          if (
            !["open", "close", "is_open", "eof", "good", "fail"].includes(
              n.callee.name,
            )
          )
            fail("Unsupported file stream method.", n);
          t = ["open", "close"].includes(n.callee.name)
            ? type("void")
            : type("bool");
          break;
        }
        if (n.callee.kind !== "name")
          fail("Only named function calls are supported.", n);
        const f = functions.get(n.callee.name);
        if (!f)
          fail(
            `Function '${n.callee.name}' needs a declaration before this call.`,
            n,
            "name",
          );
        if (f.name === "main")
          fail("Calling main is not valid C++.", n, "type");
        if (n.args.length !== f.params.length)
          fail(`${f.name} expects ${f.params.length} arguments.`, n, "type");
        n.args.forEach((a, i) => {
          const source = expr(a),
            p = f.params[i],
            dest = p.type;
          if (p.shape.length) {
            compatible(source, { ...dest, pointer: true }, a);
            if (p.shape.length !== (a.arrayShape?.length ?? 1))
              fail("Array argument dimensions must match.", a, "type");
          } else if (dest.reference) {
            if (
              !a.isLvalue ||
              !same(source, dest) ||
              (!dest.const && source.const)
            )
              fail(
                "Reference parameter requires matching writable storage (or a const reference).",
                a,
                "type",
              );
          } else {
            scalarDecay(a);
            compatible(source, dest, a);
          }
        });
        t = f.type;
        break;
      }
      default:
        fail(`Unsupported expression '${n.kind}'.`, n);
    }
    n.inferredType = t;
    return t;
  }
  function operation(op, a, b, n) {
    if (["&&", "||"].includes(op)) {
      condition(a, n);
      condition(b, n);
      return type("bool");
    }
    if (
      a.pointer ||
      b.pointer ||
      a.base === "nullptr" ||
      b.base === "nullptr"
    ) {
      if (
        ["==", "!="].includes(op) &&
        (a.pointer || a.base === "nullptr") &&
        (b.pointer || b.base === "nullptr")
      )
        return type("bool");
      if (a.pointer && b.pointer) {
        if (["<", ">", "<=", ">="].includes(op)) return type("bool");
        if (op === "-") return type();
      }
      if (a.pointer && integer(b) && ["+", "-"].includes(op)) return a;
      if (b.pointer && integer(a) && op === "+") return b;
      fail(`Invalid pointer operator ${op}.`, n, "type");
    }
    if (!numeric(a) || !numeric(b))
      fail(`Operator ${op} requires numeric operands.`, n, "type");
    if (
      ["%", "&", "|", "^", "<<", ">>"].includes(op) &&
      (!integer(a) || !integer(b))
    )
      fail(`${op} requires integer operands.`, n, "type");
    if (["==", "!=", "<", ">", "<=", ">="].includes(op)) return type("bool");
    if (["<<", ">>"].includes(op)) return promote(a);
    return common(a, b);
  }
  function declare(n) {
    const scope = scopes.at(-1);
    if (scope.has(n.name))
      fail(`'${n.name}' is already declared in this scope.`, n, "name");
    if (n.type.base === "void")
      fail("Variables cannot have type void.", n, "type");
    if (n.type.reference && n.type.pointer)
      fail("References to pointer variables are outside this subset.", n);
    if (n.type.reference && n.shape.length)
      fail("References to arrays are outside this subset.", n);
    for (const x of n.shape ?? []) if (x) expr(x);
    scope.set(n.name, n);
    if (n.init) {
      const src = expr(n.init);
      if (n.shape.length) {
        if (
          n.init.kind !== "list" &&
          !(src.base === "string" && n.type.base === "char")
        )
          fail(
            "Array initialization requires braces or a character string.",
            n,
            "type",
          );
        const check = (x) => {
          if (x.kind === "list") x.items.forEach(check);
          else if (x.type?.base !== "string") {
            if (
              integer(n.type) &&
              ["float", "double"].includes(x.inferredType.base) &&
              !x.inferredType.pointer
            )
              fail(
                "Floating-to-integer narrowing is invalid in an array initializer list.",
                x,
                "type",
              );
            compatible(x.inferredType, n.type, x);
          }
        };
        check(n.init);
      } else if (n.type.reference) {
        if (
          !n.init.isLvalue ||
          !same(src, n.type) ||
          (!n.type.const && src.const)
        )
          fail(
            "A reference must bind compatible storage without removing const.",
            n,
            "type",
          );
      } else if (!stream(n.type)) {
        scalarDecay(n.init);
        compatible(src, n.type, n);
      }
    } else if (
      n.type.reference ||
      (!n.type.pointer && n.type.const) ||
      n.type.pointerConst
    )
      fail("Const storage and references need an initializer.", n, "const");
  }
  function scoped(n) {
    scopes.push(new Map());
    statement(n);
    scopes.pop();
  }
  function statement(n) {
    switch (n.kind) {
      case "block":
        scopes.push(new Map());
        for (const s of n.statements) statement(s);
        scopes.pop();
        break;
      case "declarations":
        n.items.forEach(declare);
        break;
      case "expression":
        expr(n.expr);
        break;
      case "if":
        condition(expr(n.test), n);
        scoped(n.yes);
        if (n.no) scoped(n.no);
        break;
      case "for":
      case "while":
      case "do":
        scopes.push(new Map());
        loops++;
        if (n.init) statement(n.init);
        if (n.test) condition(expr(n.test), n);
        if (n.update) expr(n.update);
        scoped(n.body);
        loops--;
        scopes.pop();
        break;
      case "switch":
        if (!integer(expr(n.test)))
          fail("switch requires an integer or char expression.", n, "type");
        switches++;
        scopes.push(new Map());
        for (const c of n.cases) {
          if (c.test) expr(c.test);
          for (const s of c.statements) {
            if (s.kind === "declarations")
              fail(
                "Put case-local declarations inside braces to avoid jumping over initialization.",
                s,
                "type",
              );
            statement(s);
          }
        }
        scopes.pop();
        switches--;
        break;
      case "return":
        if (!current) fail("return requires a function.", n, "type");
        if (n.expr) {
          const t = expr(n.expr);
          if (current.type.base === "void" && t.base !== "void")
            fail("A void function cannot return a value.", n, "type");
          if (current.type.base !== "void") compatible(t, current.type, n);
        } else if (current.type.base !== "void")
          fail("A non-void function must return a value.", n, "type");
        break;
      case "delete": {
        const t = expr(n.expr);
        if (!t.pointer && t.base !== "nullptr")
          fail("delete requires a pointer.", n, "type");
        break;
      }
      case "break":
        if (!loops && !switches)
          fail("break needs a loop or switch.", n, "control");
        break;
      case "continue":
        if (!loops) fail("continue needs a loop.", n, "control");
        break;
      case "empty":
        break;
      default:
        fail(`Unsupported statement '${n.kind}'.`, n);
    }
  }
  for (const n of ast.items) {
    if (n.kind !== "function") {
      declare(n);
      continue;
    }
    if (n.type.reference)
      fail("Reference return types are outside this subset.", n);
    if (functions.has(n.name) && sig(functions.get(n.name)) !== sig(n))
      fail(`Conflicting declaration of '${n.name}'.`, n, "type");
    if (n.body && functions.get(n.name)?.defined)
      fail(`Duplicate function '${n.name}'.`, n, "name");
    functions.set(n.name, {
      ...n,
      defined: !!n.body || functions.get(n.name)?.defined,
    });
    if (n.body) {
      current = n;
      scopes = [globals, new Map()];
      for (const p of n.params) {
        if (p.type.reference && p.type.pointer)
          fail("References to pointer variables are outside this subset.", p);
        if (!p.name)
          fail("A function definition needs named parameters.", n, "type");
        if (scopes[1].has(p.name)) fail("Duplicate parameter name.", p, "name");
        scopes[1].set(p.name, p);
      }
      for (const s of n.body.statements) statement(s);
      scopes = [globals];
      current = null;
    }
  }
  return ast;
}
