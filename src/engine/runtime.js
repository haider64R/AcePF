import { assertIndependent } from "./effects.js";
import { VirtualIO, MODES } from "./io.js";
import { pointerBinary, allocateHeap, deleteHeap } from "./pointers.js";
import { declareArray, arrayView, constantInteger } from "./arrays.js";
import { fail, Diagnostic } from "./diagnostic.js";
import {
  type,
  value,
  binary,
  convert,
  truth,
  format,
  label,
  integer,
  promote,
} from "./types.js";
import { Memory } from "./memory.js";
const assignmentOps = new Set([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<=",
  ">>=",
]);
export class Runtime {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.memory = new Memory();
    this.scopes = [
      { id: 0, name: "Global", bindings: Object.create(null), owned: [] },
    ];
    this.frames = [];
    this.events = [];
    this.output = "";
    this.files = { ...options.files };
    this.input = (options.input ?? "").match(/\S+/g) ?? [];
    this.inputIndex = 0;
    this.maxEvents = options.maxEvents ?? 3000;
    this.functions = new Map();
    this.statementId = 0;
    this.scopeId = 0;
    this.frameId = 0;
    this.result = null;
    this.steps = 0;
    this.snapshotCells = 0;
    this.snapshotText = 0;
    this.loopDepth = 0;
    this.switchDepth = 0;
    this.io = new VirtualIO(this);
    this.io.input = options.input ?? "";
  }
  snapshot() {
    return structuredClone({
      scopes: this.scopes,
      memory: this.memory.objects,
      frames: this.frames,
      output: this.output,
      files: this.files,
      inputIndex: this.inputIndex,
      streams: this.io.handles,
    });
  }
  emit(kind, node, message, detail = {}) {
    this.snapshotText +=
      this.output.length + Object.values(this.files).join("").length;
    if (this.snapshotText > 8000000)
      fail(
        "Text snapshot budget exceeded. Use smaller output or files.",
        node,
        "limit",
      );
    this.snapshotCells += this.memory.objects.reduce(
      (n, o) => n + o.cells.length,
      0,
    );
    if (this.events.length >= this.maxEvents || this.snapshotCells > 300000)
      fail(
        "Execution trace limit reached. Reduce loop counts or recursion depth.",
        node,
        "limit",
      );
    this.events.push({
      id: this.events.length,
      kind,
      loc: node?.loc ?? null,
      statement: this.statementId,
      message,
      detail,
      state: this.snapshot(),
    });
  }
  lookup(name, node) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const b = this.scopes[i].bindings[name];
      if (Object.hasOwn(this.scopes[i].bindings, name)) return b;
      if (this.scopes[i].functionBoundary) break;
    }
    const b = this.scopes[0].bindings[name];
    if (Object.hasOwn(this.scopes[0].bindings, name)) return b;
    fail(`'${name}' is not declared in this scope.`, node, "name");
  }
  enter(name, node, functionBoundary = false) {
    this.scopes.push({
      id: ++this.scopeId,
      name,
      bindings: Object.create(null),
      owned: [],
      functionBoundary,
    });
    this.emit("scope-enter", node, `Enter ${name}.`);
  }
  leave(node) {
    const scope = this.scopes.pop();
    for (const id of scope.owned) {
      const o = this.memory.objects[id - 1];
      if (o.type.base === "stream") {
        const h = this.io.handles[o.cells[0]?.value.id];
        if (h) h.open = false;
      }
      o.alive = false;
    }
    this.emit(
      "scope-exit",
      node,
      `Leave ${scope.name}; its local storage ends.`,
      { scope: scope.name },
    );
  }
  declare(n) {
    const scope = this.scopes.at(-1);
    if (Object.hasOwn(scope.bindings, n.name))
      fail(`'${n.name}' is already declared in this scope.`, n, "name");
    if (n.type.base === "void")
      fail("Variables cannot have type void.", n, "type");
    if (n.shape.length) return declareArray(this, n, scope);
    if (["ifstream", "ofstream", "fstream"].includes(n.type.base)) {
      const ref = this.memory.allocate(
          n.name,
          type("stream"),
          1,
          this.scopes.length === 1 ? "global" : "stack",
          [],
          n,
        ),
        v = this.io.create(n.type.base, n);
      scope.owned.push(ref.object);
      scope.bindings[n.name] = { name: n.name, type: n.type, ref, shape: [] };
      this.memory.objects[ref.object - 1].cells[0] = v;
      this.emit("declare", n, `Create virtual ${n.type.base} ${n.name}.`, {
        ref,
      });
      if (n.init) {
        if (n.init.kind !== "streamInit")
          fail("Initialize file streams with constructor parentheses.", n);
        this.io.open(
          this.io.handle(v, n),
          n.init.args.map((x) => this.eval(x)),
          n,
        );
      }
      return;
    }
    if (n.type.reference) {
      if (!n.init) fail("A reference needs an initializer.", n, "type");
      const ref = this.lvalue(n.init),
        o = this.memory.object(ref, n);
      if (
        o.type.base !== n.type.base ||
        o.type.pointer !== n.type.pointer ||
        o.type.unsigned !== n.type.unsigned ||
        (!n.type.const && (o.type.const || ref.readonly))
      )
        fail(
          "A reference must bind compatible storage without removing const.",
          n,
          "type",
        );
      scope.bindings[n.name] = {
        name: n.name,
        type: n.type,
        ref: { ...ref, readonly: ref.readonly || n.type.const },
        shape: [],
      };
      this.emit(
        "declare",
        n,
        `${n.name} is a reference to ${o.name}, not a copy.`,
        { ref },
      );
      return;
    }
    const ref = this.memory.allocate(
      n.name,
      n.type,
      1,
      this.scopes.length === 1 ? "global" : "stack",
      [],
      n,
    );
    scope.owned.push(ref.object);
    scope.bindings[n.name] = { name: n.name, type: n.type, ref, shape: [] };
    if (n.init) this.memory.write(ref, this.full(n.init), n, true);
    else if ((!n.type.pointer && n.type.const) || n.type.pointerConst)
      fail("A const variable needs an initializer.", n, "const");
    else if (this.scopes.length === 1)
      this.memory.write(
        ref,
        n.type.pointer ? value(null, type("nullptr")) : value(0),
        n,
        true,
      );
    this.emit(
      "declare",
      n,
      `Create ${label(n.type)} ${n.name}${n.init ? " with its initial value" : "; no value has been assigned yet"}.`,
      { name: n.name, ref },
    );
  }
  lvalue(n) {
    if (n.kind === "unary" && n.op === "*") {
      const v = this.eval(n.expr);
      if (!v.type.pointer) fail("Dereference requires a pointer.", n, "type");
      const ref = { ...v.value, readonly: v.type.const || v.value?.readonly };
      this.memory.object(ref, n);
      this.emit(
        "pointer",
        n,
        `Follow ${this.memory.address(v.value)} to its target storage.`,
        { ref },
      );
      return ref;
    }
    if (n.kind === "name") {
      const b = this.lookup(n.name, n);
      if (b.shape.length)
        fail(
          "An entire array cannot be assigned; assign an element instead.",
          n,
          "type",
        );
      return { ...b.ref };
    }
    if (n.kind === "index") {
      const view = arrayView(this, n);
      if (view.shape.length) fail("A whole row is not assignable.", n, "type");
      return view.ref;
    }
    fail("This expression is not writable storage.", n, "type");
  }
  full(n) {
    this.checkEffects(n);
    return this.eval(n);
  }
  checkEffects(n) {
    if (!n) return;
    for (const [k, v] of Object.entries(n)) {
      if (["loc", "type", "inferredType", "arrayShape"].includes(k)) continue;
      if (Array.isArray(v)) v.forEach((x) => this.checkEffects(x));
      else if (v && typeof v === "object") this.checkEffects(v);
    }
    const accesses = new Map();
    let hasCall = false;
    const walk = (x, writing = false) => {
      if (!x || typeof x !== "object") return;
      if (x.kind === "call") hasCall = true;
      if (x.kind === "name") {
        const a = accesses.get(x.name) ?? { r: 0, w: 0 };
        a[writing ? "w" : "r"]++;
        accesses.set(x.name, a);
        return;
      }
      if (x.kind === "unary" && ["++", "--"].includes(x.op)) {
        walk(x.expr, true);
        return;
      }
      if (x.kind === "assign") {
        walk(x.left, true);
        walk(x.right);
        return;
      }
      for (const [k, v] of Object.entries(x)) {
        if (["loc", "type", "inferredType", "arrayShape"].includes(k)) continue;
        if (Array.isArray(v)) v.forEach((y) => walk(y));
        else if (v && typeof v === "object") walk(v);
      }
    };
    // C++ sequencing is complex. Reject ambiguous multiple side effects, including alias-prone calls.
    walk(n);
    const writes = [...accesses.values()].reduce((s, a) => s + a.w, 0);
    if (
      (n.kind === "binary" &&
        !["&&", "||", "<<", ">>"].includes(n.op) &&
        [...accesses.values()].some((a) => a.w && (a.r || a.w > 1))) ||
      (hasCall && writes > 0)
    )
      fail(
        "Potentially unsequenced side effects. Split this expression into separate statements.",
        n,
        "sequencing",
      );
  }
  eval(n) {
    if (++this.steps > 25000)
      fail("Execution operation limit reached.", n, "limit");
    switch (n.kind) {
      case "literal":
        return n.type.base === "string" || n.type.base === "nullptr"
          ? value(n.value, n.type)
          : convert(value(n.value, n.type), n.type, n);
      case "name": {
        if (["cout", "cin"].includes(n.name))
          return value(n.name, type("stream"));
        if (Object.hasOwn(MODES, n.name)) return value(MODES[n.name]);
        if (n.name === "endl") return value("\n", type("string"));
        const b = this.lookup(n.name, n);
        if (b.shape.length)
          return {
            ...value({ ...b.ref }, { ...b.type, pointer: true }),
            shape: b.shape,
          };
        const v = this.memory.read(b.ref, n);
        if (v.type.base === "stream") v.value.good = this.io.handle(v, n).good;
        this.emit("read", n, `Read ${n.name}: ${format(v)}.`, {
          name: n.name,
          value: v,
          ref: b.ref,
        });
        return v;
      }
      case "index": {
        const view = arrayView(this, n);
        if (view.shape.length)
          return { ...value(view.ref, view.type), shape: view.shape };
        const v = this.memory.read(view.ref, n);
        this.emit("read", n, `Read array element: ${format(v)}.`, {
          ref: view.ref,
          value: v,
        });
        return v;
      }
      case "assign": {
        const right = this.eval(n.right),
          ref = this.lvalue(n.left);
        let v = right;
        if (n.op !== "=")
          v = this.calculate(
            n.op.slice(0, -1),
            this.memory.read(ref, n),
            right,
            n,
          );
        const result = this.memory.write(ref, v, n);
        this.emit(
          "write",
          n,
          `Store ${format(result)} in ${this.memory.object(ref, n).name}.`,
          {
            ref,
            value: result,
            fromType: label(v.type),
            toType: label(result.type),
          },
        );
        return result;
      }
      case "binary": {
        const beforeLeft = this.events.length;
        const a = this.eval(n.left);
        const afterLeft = this.events.length;
        if (a.type.base === "stream") return this.stream(n, a);
        if ((n.op === "&&" && !truth(a)) || (n.op === "||" && truth(a))) {
          const v = value(n.op === "||" ? 1 : 0, type("bool"));
          this.emit(
            "short-circuit",
            n,
            `The left operand is ${truth(a) ? "true" : "false"}, so ${n.op} skips the right operand.`,
            { left: a, result: v },
          );
          return v;
        }
        const b = this.eval(n.right);
        if (!["&&", "||", "<<", ">>"].includes(n.op))
          this.checkRecordedEffects(
            beforeLeft,
            afterLeft,
            this.events.length,
            n,
          );
        const v = ["&&", "||"].includes(n.op)
          ? value(
              Number(
                n.op === "&&" ? truth(a) && truth(b) : truth(a) || truth(b),
              ),
              type("bool"),
            )
          : this.calculate(n.op, a, b, n);
        this.emit(
          "expression",
          n,
          `${format(a)} ${n.op} ${format(b)} → ${format(v)}.`,
          {
            op: n.op,
            left: a,
            right: b,
            result: v,
            conversion: `${label(a.type)}, ${label(b.type)} → ${label(v.type)}`,
          },
        );
        return v;
      }
      case "new":
        return allocateHeap(this, n);
      case "unary": {
        if (n.op === "&") {
          const ref = this.lvalue(n.expr),
            o = this.memory.object(ref, n);
          if (o.type.pointer)
            fail("Pointer-to-pointer types are outside this subset.", n);
          const v = value(
            { ...ref },
            { ...o.type, pointer: true, const: o.type.const || !!ref.readonly },
          );
          this.emit(
            "pointer",
            n,
            `Take the address of ${o.name}: ${this.memory.address(ref)}.`,
            { ref, value: v },
          );
          return v;
        }
        if (n.op === "*") {
          const ref = this.lvalue(n),
            v = this.memory.read(ref, n);
          this.emit("read", n, `Read through the pointer: ${format(v)}.`, {
            ref,
            value: v,
          });
          return v;
        }
        if (["++", "--"].includes(n.op)) {
          const ref = this.lvalue(n.expr),
            old = this.memory.read(ref, n);
          if (old.type.base === "bool")
            fail(
              "Increment and decrement of bool are not supported.",
              n,
              "type",
            );
          const next = this.memory.write(
            ref,
            this.calculate(n.op === "++" ? "+" : "-", old, value(1), n),
            n,
          );
          this.emit(
            "write",
            n,
            n.postfix
              ? `Postfix ${n.op}: the expression uses ${format(old)}; storage now holds ${format(next)}.`
              : `Prefix ${n.op}: update storage first, then use ${format(next)}.`,
            { ref, before: old, value: next, result: n.postfix ? old : next },
          );
          return n.postfix ? old : next;
        }
        const a = this.eval(n.expr);
        let v;
        if (n.op === "!") v = value(Number(!truth(a)), type("bool"));
        else if (n.op === "+") v = convert(a, promote(a.type), n);
        else if (n.op === "-") v = this.calculate("-", value(0), a, n);
        else if (n.op === "~") {
          if (!integer(a.type)) fail("Bitwise not requires an integer.", n);
          const t = promote(a.type);
          v = convert(value(~a.value), t, n);
        } else fail(`Unsupported unary operator ${n.op}.`, n);
        this.emit("expression", n, `${n.op}${format(a)} → ${format(v)}.`, {
          op: n.op,
          left: a,
          result: v,
        });
        return v;
      }
      case "ternary": {
        const test = this.eval(n.test);
        this.emit(
          "branch",
          n,
          `The condition is ${truth(test) ? "true" : "false"}; evaluate only the ${truth(test) ? "first" : "second"} alternative.`,
        );
        const selected = this.eval(truth(test) ? n.yes : n.no);
        return n.inferredType && n.inferredType.base !== "void"
          ? convert(selected, n.inferredType, n)
          : selected;
      }
      case "call":
        return this.call(n);
      default:
        fail(`Expression '${n.kind}' is not enabled.`, n);
    }
  }
  checkRecordedEffects(start, middle, end, n) {
    assertIndependent(
      this.events.slice(start, middle),
      this.events.slice(middle, end),
      n,
    );
  }
  calculate(op, a, b, n) {
    if (
      a.type.pointer ||
      b.type.pointer ||
      a.type.base === "nullptr" ||
      b.type.base === "nullptr"
    )
      return pointerBinary(this, op, a, b, n);
    return binary(op, a, b, n);
  }
  stream(n, a) {
    return this.io.operate(n, a);
  }
  call(n) {
    if (n.callee.kind === "member") return this.io.method(n);
    if (n.callee.kind !== "name")
      fail("Only named function calls are supported.", n);
    const f = this.functions.get(n.callee.name);
    if (!f?.body)
      fail(`No definition for function '${n.callee.name}'.`, n, "name");
    if (n.args.length !== f.params.length)
      fail(`${f.name} expects ${f.params.length} arguments.`, n, "type");
    if (this.frames.length >= 64)
      fail("Call depth limit (64) reached.", n, "limit");
    const argRanges = [];
    let argStart = this.events.length;
    const args = n.args.map((arg, i) => {
      if (i) {
        argRanges.push([argStart, this.events.length]);
        argStart = this.events.length;
      }
      const p = f.params[i];
      if (p.shape.length) {
        const v = this.eval(arg);
        if (
          !v.type.pointer ||
          v.type.base !== p.type.base ||
          (v.type.const && !p.type.const)
        )
          fail(
            "Array parameter requires a compatible array or pointer.",
            arg,
            "type",
          );
        const trailing = p.shape.slice(1).map((x) => constantInteger(this, x));
        if (
          trailing.length &&
          JSON.stringify(v.shape?.slice(1)) !== JSON.stringify(trailing)
        )
          fail("Matrix parameter dimensions must match.", arg, "type");
        return {
          ref: { ...v.value, readonly: p.type.const },
          shape: v.shape ?? [
            this.memory.object(v.value, n).cells.length - v.value.offset,
          ],
        };
      }
      if (p.type.reference) {
        const ref = this.lvalue(arg),
          o = this.memory.object(ref, n);
        if (
          o.type.base !== p.type.base ||
          o.type.pointer !== p.type.pointer ||
          o.type.unsigned !== p.type.unsigned ||
          (!p.type.const && (o.type.const || ref.readonly))
        )
          fail(
            "Reference parameter requires matching writable storage (or a const reference).",
            arg,
            "type",
          );
        return { ref: { ...ref, readonly: ref.readonly || p.type.const } };
      }
      return { value: this.eval(arg) };
    });
    argRanges.push([argStart, this.events.length]);
    for (let i = 0; i < argRanges.length; i++)
      for (let j = i + 1; j < argRanges.length; j++) {
        const [a, b] = argRanges[i],
          [c, d] = argRanges[j];
        assertIndependent(this.events.slice(a, b), this.events.slice(c, d), n);
      }
    const caller = this.frames.at(-1)?.name ?? null;
    this.frames.push({ id: ++this.frameId, name: f.name, caller });
    this.enter(f.name, n, true);
    for (let i = 0; i < f.params.length; i++) {
      const p = f.params[i];
      if (!p.name)
        fail("A function definition needs named parameters.", f, "type");
      if (args[i].ref) {
        this.scopes.at(-1).bindings[p.name] = {
          name: p.name,
          type: p.type,
          ref: args[i].ref,
          shape: args[i].shape ?? [],
        };
      } else
        this.declare({
          ...p,
          kind: "declare",
          init: {
            kind: "literal",
            loc: n.loc,
            type: args[i].value.type,
            value: args[i].value.value,
          },
        });
    }
    this.emit(
      "call",
      n,
      `Call ${f.name} from ${caller ?? "global initialization"}. Value parameters are copies; references share storage.`,
      { caller, callee: f.name, arguments: args },
    );
    const oldLoop = this.loopDepth,
      oldSwitch = this.switchDepth;
    this.loopDepth = 0;
    this.switchDepth = 0;
    let signal;
    for (const statement of f.body.statements) {
      signal = this.execute(statement);
      if (signal) break;
    }
    let result = signal?.value ?? value(null, type("void"));
    if (f.type.base === "void") {
      if (result.type.base !== "void")
        fail("A void function cannot return a value.", f, "type");
    } else {
      if (result.type.base === "void")
        fail(`Function ${f.name} must return a value.`, f, "undefined");
      result = convert(result, f.type, n);
    }
    this.emit("return", n, `${f.name} returns ${format(result)}.`, {
      value: result,
      callee: f.name,
    });
    this.leave(n);
    this.frames.pop();
    this.loopDepth = oldLoop;
    this.switchDepth = oldSwitch;
    return result;
  }
  scoped(n) {
    if (n.kind === "block") return this.execute(n);
    this.enter("Branch", n);
    const signal = this.execute(n);
    this.leave(n);
    return signal;
  }
  execute(n) {
    this.statementId++;
    this.emit("statement", n, `Execute ${n.kind}.`);
    switch (n.kind) {
      case "delete":
        deleteHeap(this, n);
        return null;
      case "empty":
        return null;
      case "declarations":
        for (const d of n.items) this.declare(d);
        return null;
      case "expression":
        this.full(n.expr);
        return null;
      case "block": {
        this.enter("Block", n);
        let signal;
        for (const s of n.statements) {
          signal = this.execute(s);
          if (signal) break;
        }
        this.leave(n);
        return signal;
      }
      case "if": {
        const t = this.full(n.test);
        this.emit(
          "branch",
          n,
          `Condition is ${truth(t) ? "true" : "false"}; ${truth(t) ? "enter the if branch" : n.no ? "enter the else branch" : "skip the body"}.`,
          { value: t },
        );
        return truth(t) ? this.scoped(n.yes) : n.no ? this.scoped(n.no) : null;
      }
      case "switch": {
        const t = this.full(n.test);
        if (!integer(t.type))
          fail("switch requires an integer or char expression.", n, "type");
        const seen = new Set();
        let start = -1,
          fallback = -1;
        for (let i = 0; i < n.cases.length; i++) {
          const c = n.cases[i];
          if (!c.test) {
            if (fallback !== -1) fail("Duplicate default label.", n, "type");
            fallback = i;
            continue;
          }
          if (c.test.kind !== "literal" || !integer(c.test.type))
            fail(
              "Case labels currently require integer or character literals.",
              c.test,
            );
          const k = c.test.value;
          if (seen.has(k)) fail("Duplicate case label.", c.test, "type");
          seen.add(k);
          if (k === t.value) start = i;
        }
        if (start < 0) start = fallback;
        this.enter("Switch", n);
        this.switchDepth++;
        let signal = null;
        if (start >= 0)
          for (let i = start; i < n.cases.length; i++) {
            this.emit(
              "branch",
              n,
              `Enter switch label ${i + 1}${i > start ? " by fall-through" : ""}.`,
              { case: i, fallthrough: i > start },
            );
            for (const s of n.cases[i].statements) {
              signal = this.execute(s);
              if (signal) break;
            }
            if (signal) break;
          }
        this.switchDepth--;
        this.leave(n);
        return signal?.kind === "break" ? null : signal;
      }
      case "while":
      case "do":
      case "for": {
        this.enter("Loop", n);
        this.loopDepth++;
        let iteration = 0,
          signal = null;
        if (n.init) {
          this.emit("loop", n, "For initialization runs once.", {
            phase: "initialization",
            iteration,
          });
          this.execute(n.init);
        }
        while (true) {
          if (n.kind !== "do" || iteration > 0) {
            const test = n.test ? this.full(n.test) : value(1, type("bool"));
            this.emit(
              "loop",
              n,
              `Loop condition is ${truth(test) ? "true" : "false"}.`,
              { phase: "condition", iteration, value: test },
            );
            if (!truth(test)) break;
          }
          iteration++;
          this.emit("loop", n, `Begin iteration ${iteration}.`, {
            phase: "body",
            iteration,
          });
          signal = this.scoped(n.body);
          if (signal?.kind === "break" || signal?.kind === "return") break;
          if (n.update) {
            this.emit(
              "loop",
              n,
              "Run the for-loop update before testing again.",
              { phase: "update", iteration },
            );
            this.full(n.update);
          }
        }
        this.loopDepth--;
        this.leave(n);
        return signal?.kind === "return" ? signal : null;
      }
      case "return":
        return {
          kind: "return",
          value: n.expr ? this.full(n.expr) : value(null, type("void")),
        };
      case "break":
        if (!this.loopDepth && !this.switchDepth)
          fail("break needs a loop or switch.", n, "control");
        return { kind: "break" };
      case "continue":
        if (!this.loopDepth) fail("continue needs a loop.", n, "control");
        return { kind: "continue" };
      default:
        fail(`Statement '${n.kind}' is not enabled.`, n);
    }
  }
  signature(f) {
    return JSON.stringify([
      label(f.type),
      ...f.params.map(
        (p) =>
          label(p.type) +
          JSON.stringify(p.shape.map((x, i) => (i === 0 ? "array" : x?.value))),
      ),
    ]);
  }
  run() {
    try {
      for (const n of this.ast.items) {
        if (n.kind === "function") {
          if (
            this.functions.has(n.name) &&
            this.signature(n) !== this.signature(this.functions.get(n.name))
          )
            fail(`Conflicting declaration of '${n.name}'.`, n, "type");
          if (
            this.functions.has(n.name) &&
            n.body &&
            this.functions.get(n.name).body
          )
            fail(`Duplicate function '${n.name}'.`, n, "name");
          if (n.body || !this.functions.has(n.name))
            this.functions.set(n.name, n);
        }
      }
      for (const n of this.ast.items)
        if (n.kind !== "function") this.declare(n);
      const main = this.functions.get("main");
      if (!main?.body)
        fail("Define int main() to start execution.", null, "name");
      if (main.type.base !== "int" || main.params.length)
        fail(
          "Entry point must be int main() with no parameters.",
          main,
          "type",
        );
      this.frames.push({ id: ++this.frameId, name: "main", caller: null });
      this.enter("main", main, true);
      this.emit("call", main, "Call main: the program begins.");
      for (const n of main.body.statements) {
        const signal = this.execute(n);
        if (signal) {
          this.result = convert(signal.value, type("int"), n);
          break;
        }
      }
      this.emit(
        "return",
        main,
        `main returns ${this.result ? format(this.result) : "0"}.`,
        { value: this.result ?? value(0) },
      );
      this.leave(main);
      this.frames.pop();
      for (const o of this.memory.objects.filter(
        (o) => o.region === "heap" && o.alive,
      ))
        this.emit(
          "leak",
          main,
          `Memory leak: ${o.name} was allocated but never released.`,
          { ref: { object: o.id, offset: 0 } },
        );
      this.emit("end", main, "Program finished.");
    } catch (e) {
      if (!(e instanceof Diagnostic)) throw e;
      this.events.push({
        id: this.events.length,
        kind: "diagnostic",
        loc: e.loc,
        statement: this.statementId,
        message: e.message,
        detail: { code: e.code },
        state: this.snapshot(),
      });
    }
    return {
      events: this.events,
      state: this.snapshot(),
      result: this.result,
      ok: !this.events.some((e) => e.kind === "diagnostic"),
    };
  }
}
