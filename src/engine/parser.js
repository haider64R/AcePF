import { fail } from "./diagnostic.js";
import { type } from "./types.js";
const starts = new Set([
  "int",
  "short",
  "long",
  "float",
  "double",
  "char",
  "bool",
  "void",
  "signed",
  "unsigned",
  "const",
  "ifstream",
  "ofstream",
  "fstream",
]);
const prec = {
  "=": 1,
  "+=": 1,
  "-=": 1,
  "*=": 1,
  "/=": 1,
  "%=": 1,
  "&=": 1,
  "|=": 1,
  "^=": 1,
  "<<=": 1,
  ">>=": 1,
  "||": 3,
  "&&": 4,
  "|": 5,
  "^": 6,
  "&": 7,
  "==": 8,
  "!=": 8,
  "<": 9,
  ">": 9,
  "<=": 9,
  ">=": 9,
  "<<": 10,
  ">>": 10,
  "+": 11,
  "-": 11,
  "*": 12,
  "/": 12,
  "%": 12,
};
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.i = 0;
  }
  get token() {
    return this.tokens[this.i];
  }
  at(v) {
    return this.token.value === v;
  }
  take() {
    return this.tokens[this.i++];
  }
  eat(v) {
    if (this.at(v)) {
      this.take();
      return true;
    }
    return false;
  }
  expect(v) {
    if (!this.eat(v))
      fail(
        `Expected '${v}', found '${this.token.value}'.`,
        this.token,
        "syntax",
      );
  }
  id() {
    const t = this.take();
    if (t.kind !== "id" || starts.has(t.value))
      fail("Expected an identifier.", t, "syntax");
    return t;
  }
  node(kind, loc, fields = {}) {
    return { kind, loc, ...fields };
  }
  parse() {
    const items = [];
    while (!this.at("<eof>")) {
      if (this.eat("using")) {
        this.expect("namespace");
        this.expect("std");
        this.expect(";");
        continue;
      }
      items.push(...this.declaration(true));
    }
    return { kind: "program", items };
  }
  baseType() {
    if (this.eat("std")) this.expect("::");
    let t = type(),
      specified = false;
    if (this.eat("const")) t.const = true;
    if (this.eat("unsigned")) {
      t.unsigned = true;
      specified = true;
    } else if (this.eat("signed")) specified = true;
    if (
      [
        "int",
        "short",
        "long",
        "float",
        "double",
        "char",
        "bool",
        "void",
        "ifstream",
        "ofstream",
        "fstream",
      ].includes(this.token.value)
    ) {
      t.base = this.take().value;
      specified = true;
      if (["short", "long"].includes(t.base)) this.eat("int");
    }
    if (!specified)
      fail("Expected a supported primitive type.", this.token, "syntax");
    if (t.unsigned && !["int", "short", "long", "char"].includes(t.base))
      fail("unsigned requires an integer type.", this.token, "type");
    if (this.eat("const")) t.const = true;
    return t;
  }
  declarator(base, allowUnnamed = false) {
    const t = { ...base };
    if (this.eat("*")) {
      t.pointer = true;
      t.pointerConst = this.eat("const");
    }
    if (this.eat("&")) t.reference = true;
    const name =
      allowUnnamed && [")", ",", "["].includes(this.token.value)
        ? { value: "", loc: this.token.loc }
        : this.id();
    const shape = [];
    while (this.eat("[")) {
      shape.push(this.at("]") ? null : this.expression());
      this.expect("]");
    }
    if (shape.length > 2) fail("Only 1D and 2D arrays are supported.", name);
    return { name: name.value, type: t, shape, loc: name.loc };
  }
  declaration(top = false, semicolon = true) {
    const base = this.baseType(),
      result = [];
    do {
      const d = this.declarator(base);
      if (top && this.eat("(")) {
        const params = [];
        if (this.at("void") && this.tokens[this.i + 1].value === ")")
          this.take();
        else if (!this.at(")"))
          do {
            params.push(this.declarator(this.baseType(), true));
          } while (this.eat(","));
        this.expect(")");
        let body = null;
        if (!this.eat(";")) body = this.block();
        return [this.node("function", d.loc, { ...d, params, body })];
      }
      let init = null;
      if (this.eat("=")) init = this.initializer();
      else if (this.at("{")) init = this.initializer();
      else if (
        ["ifstream", "ofstream", "fstream"].includes(d.type.base) &&
        this.eat("(")
      ) {
        const args = [];
        if (!this.at(")"))
          do {
            args.push(this.expression());
          } while (this.eat(","));
        this.expect(")");
        init = this.node("streamInit", d.loc, { args });
      }
      result.push(this.node("declare", d.loc, { ...d, init }));
    } while (this.eat(","));
    if (semicolon) this.expect(";");
    return result;
  }
  initializer() {
    if (this.eat("{")) {
      const loc = this.tokens[this.i - 1].loc,
        items = [];
      if (!this.at("}"))
        do {
          if (this.at("}")) break;
          items.push(this.initializer());
        } while (this.eat(","));
      this.expect("}");
      return this.node("list", loc, { items });
    }
    return this.expression();
  }
  block() {
    const loc = this.token.loc;
    this.expect("{");
    const statements = [];
    while (!this.at("}")) {
      if (this.at("<eof>")) fail("Unclosed block.", this.token, "syntax");
      statements.push(this.statement());
    }
    this.expect("}");
    return this.node("block", loc, { statements });
  }
  statement() {
    const loc = this.token.loc;
    if (this.at("{")) return this.block();
    if (this.eat(";")) return this.node("empty", loc);
    if (
      starts.has(this.token.value) ||
      (this.at("std") &&
        this.tokens[this.i + 1]?.value === "::" &&
        starts.has(this.tokens[this.i + 2]?.value))
    )
      return this.node("declarations", loc, { items: this.declaration() });
    if (this.eat("if")) {
      this.expect("(");
      const test = this.expression();
      this.expect(")");
      const yes = this.statement(),
        no = this.eat("else") ? this.statement() : null;
      return this.node("if", loc, { test, yes, no });
    }
    if (this.eat("switch")) {
      this.expect("(");
      const test = this.expression();
      this.expect(")");
      this.expect("{");
      const cases = [];
      while (!this.eat("}")) {
        let test = null;
        if (this.eat("case")) test = this.expression();
        else this.expect("default");
        this.expect(":");
        const statements = [];
        while (!["case", "default", "}"].includes(this.token.value))
          statements.push(this.statement());
        cases.push({ test, statements });
      }
      return this.node("switch", loc, { test, cases });
    }
    if (this.eat("while")) {
      this.expect("(");
      const test = this.expression();
      this.expect(")");
      return this.node("while", loc, { test, body: this.statement() });
    }
    if (this.eat("do")) {
      const body = this.statement();
      this.expect("while");
      this.expect("(");
      const test = this.expression();
      this.expect(")");
      this.expect(";");
      return this.node("do", loc, { body, test });
    }
    if (this.eat("for")) {
      this.expect("(");
      let init = null;
      if (
        starts.has(this.token.value) ||
        (this.at("std") &&
          this.tokens[this.i + 1]?.value === "::" &&
          starts.has(this.tokens[this.i + 2]?.value))
      )
        init = this.node("declarations", this.token.loc, {
          items: this.declaration(),
        });
      else {
        if (!this.at(";"))
          init = this.node("expression", this.token.loc, {
            expr: this.expression(),
          });
        this.expect(";");
      }
      const test = this.at(";") ? null : this.expression();
      this.expect(";");
      const update = this.at(")") ? null : this.expression();
      this.expect(")");
      return this.node("for", loc, {
        init,
        test,
        update,
        body: this.statement(),
      });
    }
    for (const kind of ["return", "break", "continue"])
      if (this.eat(kind)) {
        const expr =
          kind === "return" && !this.at(";") ? this.expression() : null;
        this.expect(";");
        return this.node(kind, loc, { expr });
      }
    if (this.eat("delete")) {
      const array = this.eat("[");
      if (array) this.expect("]");
      const expr = this.expression(13);
      this.expect(";");
      return this.node("delete", loc, { expr, array });
    }
    const expr = this.expression();
    this.expect(";");
    return this.node("expression", loc, { expr });
  }
  expression(min = 1) {
    let left = this.prefix();
    while (true) {
      const op = this.token.value;
      if (op === "?" && min <= 2) {
        this.take();
        const yes = this.expression();
        this.expect(":");
        const no = this.expression(1);
        left = this.node("ternary", left.loc, { test: left, yes, no });
        continue;
      }
      const p = prec[op];
      if (p === undefined || p < min) break;
      this.take();
      const right = this.expression(p + (p === 1 ? 0 : 1));
      left = this.node(p === 1 ? "assign" : "binary", left.loc, {
        op,
        left,
        right,
      });
    }
    return left;
  }
  prefix() {
    const t = this.take();
    let node;
    if (["+", "-", "!", "~", "++", "--", "*", "&"].includes(t.value))
      return this.node("unary", t.loc, {
        op: t.value,
        expr: this.expression(13),
        postfix: false,
      });
    if (t.value === "new") {
      const type = this.baseType();
      let size = null,
        init = null;
      if (this.eat("[")) {
        size = this.expression();
        this.expect("]");
      }
      if (this.eat("(")) {
        init = this.at(")")
          ? this.node("literal", t.loc, { value: 0, type: type })
          : this.expression();
        this.expect(")");
      }
      return this.node("new", t.loc, { type, size, init });
    }
    if (t.value === "(") {
      node = this.expression();
      this.expect(")");
    } else if (t.kind === "number") {
      let s = t.value,
        base = "int",
        unsigned = false;
      if (/[uU]$/.test(s)) {
        unsigned = true;
        s = s.slice(0, -1);
      } else if (/[lL]$/.test(s)) {
        base = "long";
        s = s.slice(0, -1);
      } else if (!/^0[xX]/.test(s) && /[fF]$/.test(s)) {
        base = "float";
        s = s.slice(0, -1);
      }
      if (!/^0[xXbB]/.test(s) && /[.eE]/.test(s) && base !== "float")
        base = "double";
      if (/^0[0-9]+$/.test(s) && s !== "0")
        fail(
          "Octal literals are not supported; use decimal or hexadecimal.",
          t,
        );
      if (/^0[xXbB]/.test(s) && Number(s) > 2147483647) unsigned = true;
      node = this.node("literal", t.loc, {
        value: Number(s),
        type: type(base, { unsigned }),
      });
    } else if (t.kind === "char")
      node = this.node("literal", t.loc, {
        value: t.value.charCodeAt(0),
        type: type("char"),
      });
    else if (t.kind === "string")
      node = this.node("literal", t.loc, {
        value: t.value,
        type: type("string", { const: true }),
      });
    else if (["true", "false"].includes(t.value))
      node = this.node("literal", t.loc, {
        value: t.value === "true" ? 1 : 0,
        type: type("bool"),
      });
    else if (t.value === "nullptr")
      node = this.node("literal", t.loc, {
        value: null,
        type: type("nullptr"),
      });
    else if (t.kind === "id") {
      let name = t.value;
      if (name === "std" && this.eat("::")) name = this.id().value;
      if (name === "ios" && this.eat("::")) name += "::" + this.id().value;
      node = this.node("name", t.loc, { name });
    } else fail(`Expected an expression, found '${t.value}'.`, t, "syntax");
    while (true) {
      if (this.eat("(")) {
        const args = [];
        if (!this.at(")"))
          do {
            args.push(this.expression());
          } while (this.eat(","));
        this.expect(")");
        node = this.node("call", node.loc, { callee: node, args });
      } else if (this.eat("[")) {
        const index = this.expression();
        this.expect("]");
        node = this.node("index", node.loc, { target: node, index });
      } else if (this.eat("."))
        node = this.node("member", node.loc, {
          target: node,
          name: this.id().value,
        });
      else if (this.at("++") || this.at("--"))
        node = this.node("unary", node.loc, {
          op: this.take().value,
          expr: node,
          postfix: true,
        });
      else break;
    }
    return node;
  }
}
export const parse = (tokens) => new Parser(tokens).parse();
