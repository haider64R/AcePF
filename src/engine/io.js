import { fail } from "./diagnostic.js";
import { type, value, format, integer } from "./types.js";
export const MODES = {
  "ios::in": 1,
  "ios::out": 2,
  "ios::app": 4,
  "ios::trunc": 8,
};
export class VirtualIO {
  constructor(runtime) {
    this.runtime = runtime;
    this.handles = [];
    this.stdinOffset = 0;
    this.input = "";
  }
  create(kind, n) {
    const h = {
      id: this.handles.length,
      kind,
      name: null,
      position: 0,
      mode: 0,
      open: false,
      good: true,
      eof: false,
    };
    this.handles.push(h);
    return value({ id: h.id, good: true }, type("stream"));
  }
  handle(v, n) {
    const h = this.handles[v.value?.id];
    if (!h) fail("Invalid file stream.", n, "type");
    return h;
  }
  open(h, args, n) {
    if (args.length < 1 || args.length > 2 || args[0].type.base !== "string")
      fail("open requires a string filename and optional mode.", n, "type");
    const name = args[0].value;
    if (
      !/^[\w.-]{1,80}$/.test(name) ||
      ["__proto__", "constructor", "prototype", ".", ".."].includes(name)
    )
      fail("Use a simple virtual filename without folders.", n, "file");
    if (h.open) fail("Close the stream before reopening it.", n, "file");
    let mode =
      args[1]?.value ??
      (h.kind === "ifstream" ? 1 : h.kind === "ofstream" ? 2 : 3);
    if (!Number.isInteger(mode) || mode & ~15)
      fail("Unsupported file opening mode.", n, "file");
    if (h.kind === "ifstream") mode |= 1;
    if (h.kind === "ofstream") mode |= 2;
    if (mode & 4) mode |= 2;
    if (mode & 8 && (!(mode & 2) || mode & 4))
      fail("Invalid truncation/app mode combination.", n, "file");
    const exists = Object.hasOwn(this.runtime.files, name);
    if (!exists && Object.keys(this.runtime.files).length >= 64)
      fail("Virtual file limit (64 files) reached.", n, "limit");
    h.name = name;
    h.mode = mode;
    h.position = 0;
    h.eof = false;
    h.good = true;
    if (!exists && (!(mode & 2) || (mode & 1 && !(mode & 12)))) {
      h.open = false;
      h.good = false;
    } else {
      if (!exists || mode & 8 || (mode & 2 && !(mode & 1) && !(mode & 4)))
        this.runtime.files[name] = "";
      h.open = true;
      if (mode & 4) h.position = this.runtime.files[name].length;
    }
    this.runtime.emit(
      "file",
      n,
      h.open
        ? `Open virtual ${name}${mode & 4 ? " in append mode; existing contents are preserved" : ""}.`
        : `Could not open ${name}: the virtual file does not exist.`,
      { name, mode, open: h.open },
    );
    return value(null, type("void"));
  }
  method(n) {
    const target = this.runtime.eval(n.callee.target);
    if (target.type.base !== "stream")
      fail("File methods require a stream.", n, "type");
    const h = this.handle(target, n),
      name = n.callee.name,
      args = n.args.map((x) => this.runtime.eval(x));
    if (name === "open") return this.open(h, args, n);
    if (args.length) fail(`${name} takes no arguments.`, n, "type");
    if (name === "close") {
      h.open = false;
      this.runtime.emit("file", n, `Close virtual ${h.name}.`, {
        name: h.name,
      });
      return value(null, type("void"));
    }
    if (name === "is_open") return value(Number(h.open), type("bool"));
    if (name === "eof") return value(Number(h.eof), type("bool"));
    if (name === "good") return value(Number(h.good && !h.eof), type("bool"));
    if (name === "fail") return value(Number(!h.good), type("bool"));
    fail(`Unsupported file method '${name}'.`, n);
  }
  text(v, n) {
    const rt = this.runtime;
    if (v.type.pointer && v.type.base === "char") {
      let text = "",
        offset = v.value?.offset;
      while (true) {
        const c = rt.memory.read({ ...v.value, offset }, n).value;
        if (c === 0) return text;
        text += String.fromCharCode(c);
        offset++;
      }
    }
    if (v.type.pointer) return rt.memory.address(v.value);
    if (v.type.base === "bool") return String(v.value);
    if (["float", "double"].includes(v.type.base)) {
      if (v.value === 0) return "0";
      const [mantissa, expText] = v.value.toExponential(5).split("e");
      const exponent = Number(expText);
      const trim = (s) =>
        s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
      if (exponent < -4 || exponent >= 6)
        return (
          trim(mantissa) +
          "e" +
          (exponent >= 0 ? "+" : "-") +
          Math.abs(exponent).toString().padStart(2, "0")
        );
      return trim(
        Number(v.value.toPrecision(6)).toFixed(Math.max(0, 5 - exponent)),
      );
    }
    return format(v);
  }
  extract(text, offset, t, n) {
    const start = offset;
    while (/\s/.test(text[offset] ?? "") && offset < text.length) offset++;
    if (offset >= text.length) return { ok: false, eof: true, offset };
    let match;
    if (t.base === "char") match = text[offset];
    else if (integer(t)) match = text.slice(offset).match(/^[+-]?\d+/)?.[0];
    else
      match = text
        .slice(offset)
        .match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)?.[0];
    if (!match) return { ok: false, eof: false, offset };
    const number = t.base === "char" ? match.charCodeAt(0) : Number(match);
    if (t.base === "bool" && number !== 0 && number !== 1)
      return { ok: false, eof: false, offset: offset + match.length };
    return {
      ok: true,
      eof: offset + match.length >= text.length,
      offset: offset + match.length,
      value: value(number, t.base === "char" ? type("char") : type("double")),
    };
  }
  operate(n, stream) {
    const rt = this.runtime,
      isConsole = typeof stream.value === "string",
      h = isConsole ? null : this.handle(stream, n);
    if (n.op === "<<") {
      if (isConsole && stream.value !== "cout")
        fail("Use >> with cin.", n, "type");
      if (h && (!h.open || !(h.mode & 2))) {
        h.good = false;
        return value({ id: h.id, good: false }, type("stream"));
      }
      const v = rt.eval(n.right),
        text = this.text(v, n);
      if (
        rt.output.length +
          Object.values(rt.files).join("").length +
          text.length >
        65536
      )
        fail(
          "Console and virtual file text limit (64 KiB) reached.",
          n,
          "limit",
        );
      if (isConsole) rt.output += text;
      else {
        if (h.mode & 4) h.position = rt.files[h.name].length;
        const old = rt.files[h.name];
        rt.files[h.name] =
          old.slice(0, h.position) + text + old.slice(h.position + text.length);
        h.position += text.length;
      }
      rt.emit(
        isConsole ? "output" : "file",
        n,
        `Write ${JSON.stringify(text)} to ${isConsole ? "the console" : h.name}.`,
        { value: v, name: h?.name },
      );
      return stream;
    }
    if (n.op === ">>") {
      if (isConsole && stream.value !== "cin")
        fail("Use << with cout.", n, "type");
      const array =
        n.right.kind === "name" && n.right.arrayShape?.length
          ? rt.lookup(n.right.name, n)
          : null;
      const ref = array ? { ...array.ref } : rt.lvalue(n.right),
        t = rt.memory.object(ref, n).type;
      if (t.pointer) fail("Reading pointers from streams is not supported.", n);
      if (h && (!h.open || !(h.mode & 1) || !h.good)) {
        if (h) h.good = false;
        return value({ id: h.id, good: false }, type("stream"));
      }
      let result = this.extract(
        isConsole ? this.input : rt.files[h.name],
        isConsole ? this.stdinOffset : h.position,
        t,
        n,
      );
      if (array) {
        const text = isConsole ? this.input : rt.files[h.name],
          offset = isConsole ? this.stdinOffset : h.position,
          match = text.slice(offset).match(/^\s*(\S+)/);
        if (match) {
          if (match[1].length >= array.shape[0])
            fail(
              "Input text needs room for a null terminator in this char array.",
              n,
              "bounds",
            );
          result = {
            ok: true,
            eof: offset + match[0].length >= text.length,
            offset: offset + match[0].length,
            word: match[1],
          };
        } else result = { ok: false, eof: true, offset: text.length };
      }
      if (isConsole) {
        this.stdinOffset = result.offset;
        rt.inputIndex = this.stdinOffset;
        if (!result.ok)
          fail(
            result.eof
              ? "Input needed. Add values to Standard input, then run again."
              : "Input does not match the target type.",
            n,
            "input",
          );
      } else {
        h.position = result.offset;
        h.eof = result.eof;
        h.good = result.ok;
      }
      if (result.ok) {
        if (result.word !== undefined) {
          for (let i = 0; i <= result.word.length; i++)
            rt.memory.write(
              { ...ref, offset: ref.offset + i },
              value(
                i === result.word.length ? 0 : result.word.charCodeAt(i),
                type("char"),
              ),
              n,
            );
          result.value = value(result.word, type("string"));
        } else rt.memory.write(ref, result.value, n);
      }
      rt.emit(
        isConsole ? "input" : "file",
        n,
        result.ok
          ? `Read ${format(result.value)} from ${isConsole ? "standard input" : h.name}.`
          : `Reading ${h.name} failed${result.eof ? " at end of file" : ""}; stop the input loop.`,
        { ref, name: h?.name, success: result.ok },
      );
      return isConsole
        ? stream
        : value({ id: h.id, good: result.ok }, type("stream"));
    }
    fail(`Unsupported stream operator ${n.op}.`, n, "type");
  }
}
