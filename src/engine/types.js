import { fail } from "./diagnostic.js";
export const type = (base = "int", extra = {}) => ({
  base,
  unsigned: false,
  const: false,
  pointer: false,
  pointerConst: false,
  reference: false,
  ...extra,
});
export const value = (n, t = type()) => ({ value: n, type: t });
export const label = (t) =>
  `${t.const ? "const " : ""}${t.unsigned ? "unsigned " : ""}${t.base}${t.pointer ? "*" : ""}${t.pointerConst ? " const" : ""}${t.reference ? "&" : ""}`;
export const integer = (t) =>
  !t.pointer && ["int", "short", "long", "char", "bool"].includes(t.base);
export const width = (t) =>
  ({ bool: 1, char: 8, short: 16, int: 32, long: 32, float: 32, double: 64 })[
    t.base
  ] ?? 32;
export const bytes = (t) => (t.pointer ? 8 : Math.max(1, width(t) / 8));
export const truth = (v) =>
  v.type.pointer
    ? v.value !== null
    : v.type.base === "stream"
      ? typeof v.value === "string" || v.value.good
      : Boolean(v.value);
export function convert(v, t, node) {
  if (t.pointer) {
    if (v.type.base === "nullptr") return value(null, t);
    if (
      !v.type.pointer ||
      v.type.base !== t.base ||
      v.type.unsigned !== t.unsigned ||
      (v.type.const && !t.const)
    )
      fail(`Cannot convert ${label(v.type)} to ${label(t)}.`, node, "type");
    return value(v.value === null ? null : { ...v.value }, t);
  }
  if (
    v.type.pointer ||
    ["string", "nullptr", "void", "stream"].includes(v.type.base)
  ) {
    if (t.base === "bool" && v.type.pointer) return value(truth(v) ? 1 : 0, t);
    fail(`Cannot convert ${label(v.type)} to ${label(t)}.`, node, "type");
  }
  let n = v.value;
  if (t.base === "bool") n = n ? 1 : 0;
  else if (integer(t)) {
    n = Math.trunc(n);
    const bits = width(t),
      limit = 2 ** bits;
    if (t.unsigned) {
      if (!integer(v.type) && (n < 0 || n >= limit))
        fail(
          "Floating-to-unsigned conversion is outside the representable range.",
          node,
          "undefined",
        );
      n = ((n % limit) + limit) % limit;
    } else if (n < -(limit / 2) || n > limit / 2 - 1)
      fail(
        `Value ${n} is outside ${label(t)} range; signed overflow or narrowing is not modeled.`,
        node,
        "overflow",
      );
  } else if (t.base === "float") n = Math.fround(n);
  if (!Number.isFinite(n))
    fail(
      "Non-finite arithmetic result is outside this educational subset.",
      node,
      "arithmetic",
    );
  return value(n, t);
}
export function promote(t) {
  return integer(t) && width(t) < 32
    ? type()
    : { ...t, const: false, reference: false };
}
export function common(a, b) {
  a = promote(a);
  b = promote(b);
  if (a.base === "double" || b.base === "double") return type("double");
  if (a.base === "float" || b.base === "float") return type("float");
  return type(a.base === "long" || b.base === "long" ? "long" : "int", {
    unsigned: a.unsigned || b.unsigned,
  });
}
export function binary(op, a, b, node) {
  if (a.type.pointer || b.type.pointer) {
    fail(`Pointer operator ${op} needs the memory model.`, node, "type");
  }
  if (
    !["int", "short", "long", "char", "bool", "float", "double"].includes(
      a.type.base,
    ) ||
    !["int", "short", "long", "char", "bool", "float", "double"].includes(
      b.type.base,
    )
  )
    fail(`Operator ${op} requires numeric operands.`, node, "type");
  const t = common(a.type, b.type),
    x = convert(a, t, node).value,
    y = convert(b, t, node).value;
  if (["==", "!=", "<", ">", "<=", ">="].includes(op))
    return value(
      Number(
        {
          "==": () => x === y,
          "!=": () => x !== y,
          "<": () => x < y,
          ">": () => x > y,
          "<=": () => x <= y,
          ">=": () => x >= y,
        }[op](),
      ),
      type("bool"),
    );
  if (
    ["%", "&", "|", "^", "<<", ">>"].includes(op) &&
    (!integer(a.type) || !integer(b.type))
  )
    fail(`${op} requires integer operands.`, node, "type");
  if ((op === "/" || op === "%") && y === 0)
    fail("Division by zero has no valid result.", node, "undefined");
  if (["<<", ">>"].includes(op)) {
    const lt = promote(a.type),
      z = convert(a, lt, node).value;
    if (y < 0 || y >= width(lt))
      fail(
        "Shift count must be non-negative and smaller than the promoted left operand width.",
        node,
        "undefined",
      );
    if (z < 0)
      fail(
        "Shifting negative signed values is outside this subset.",
        node,
        "unsupported",
      );
    return convert(
      value(op === "<<" ? z * 2 ** y : Math.floor(z / 2 ** y), lt),
      lt,
      node,
    );
  }
  let n;
  if (integer(t) && ["+", "-", "*", "/", "%"].includes(op)) {
    const bx = BigInt(x),
      by = BigInt(y);
    let exact;
    if (op === "+") exact = bx + by;
    else if (op === "-") exact = bx - by;
    else if (op === "*") exact = bx * by;
    else if (op === "/") exact = bx / by;
    else exact = bx % by;
    if (
      (op === "/" || op === "%") &&
      !t.unsigned &&
      x === -(2 ** (width(t) - 1)) &&
      y === -1
    )
      fail("Signed division overflow has no defined result.", node, "overflow");
    if (t.unsigned) exact = BigInt.asUintN(width(t), exact);
    return convert(value(Number(exact), t), t, node);
  }
  switch (op) {
    case "+":
      n = x + y;
      break;
    case "-":
      n = x - y;
      break;
    case "*":
      n = x * y;
      break;
    case "/":
      n = integer(t) ? Math.trunc(x / y) : x / y;
      break;
    case "%":
      n = x % y;
      break;
    case "&":
      n = x & y;
      break;
    case "|":
      n = x | y;
      break;
    case "^":
      n = x ^ y;
      break;
    default:
      fail(`Unknown operator ${op}.`, node);
  }
  return convert(value(n, t), t, node);
}
export function format(v) {
  if (v == null) return "uninitialized";
  if (v.type.pointer)
    return v.value === null
      ? "nullptr"
      : `@${v.value.object}+${v.value.offset}`;
  if (v.type.base === "char")
    return v.value === 0 ? "\\0" : String.fromCharCode(v.value);
  if (v.type.base === "bool") return v.value ? "true" : "false";
  return String(v.value);
}
