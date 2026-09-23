import { fail } from "./diagnostic.js";
import { type, value, integer } from "./types.js";
export function constantInteger(runtime, n) {
  const check = (x) => {
    if (x.kind === "literal") return integer(x.type);
    if (x.kind === "name") {
      const b = runtime.lookup(x.name, x);
      return b.type.const && !b.type.pointer;
    }
    if (x.kind === "unary" && ["+", "-", "~", "!"].includes(x.op))
      return check(x.expr);
    if (x.kind === "binary") return check(x.left) && check(x.right);
    return false;
  };
  if (!check(n))
    fail(
      "Array extents must be constant integer expressions; variable-length arrays are not C++.",
      n,
      "type",
    );
  const v = runtime.eval(n);
  if (!integer(v.type) || !Number.isInteger(v.value) || v.value < 1)
    fail("Array extents must be positive integers.", n, "bounds");
  return v.value;
}
export function declareArray(runtime, n, scope) {
  if (n.type.reference)
    fail("Array reference declarators are outside this subset.", n);
  const string = n.init?.kind === "literal" && n.init.type.base === "string";
  let shape = n.shape.map((x) => (x ? constantInteger(runtime, x) : null));
  if (shape.some((v, i) => v === null && i > 0))
    fail("Only the first array dimension can be inferred.", n, "type");
  if (shape[0] === null) {
    if (string) shape[0] = n.init.value.length + 1;
    else if (n.init?.kind === "list") shape[0] = n.init.items.length;
    else fail("An array with inferred size needs an initializer.", n, "type");
  }
  const count = shape.reduce((a, b) => a * b, 1),
    ref = runtime.memory.allocate(
      n.name,
      n.type,
      count,
      runtime.scopes.length === 1 ? "global" : "stack",
      shape,
      n,
    );
  scope.owned.push(ref.object);
  scope.bindings[n.name] = { name: n.name, type: n.type, ref, shape };
  const zero = () => (n.type.pointer ? value(null, type("nullptr")) : value(0));
  // Static storage is zero-initialized before dynamic initialization. Local
  // elements become initialized in order; later elements must remain unreadable.
  if (runtime.scopes.length === 1)
    for (let i = 0; i < count; i++)
      runtime.memory.write({ ...ref, offset: i }, zero(), n, true);
  if (string) {
    if (n.type.base !== "char" || n.type.pointer || shape.length !== 1)
      fail("String initializers require a 1D char array.", n, "type");
    if (n.init.value.length + 1 > count)
      fail("The char array needs room for the null terminator.", n, "bounds");
    for (let i = 0; i < count; i++)
      runtime.memory.write(
        { ...ref, offset: i },
        value(
          i < n.init.value.length ? n.init.value.charCodeAt(i) : 0,
          type("char"),
        ),
        n,
        true,
      );
  } else if (n.init) {
    if (n.init.kind !== "list")
      fail("Array initialization requires braces.", n, "type");
    if (n.init.items.length > shape[0])
      fail(
        shape.length === 1
          ? "Too many array initializers."
          : "Too many matrix rows.",
        n,
        "bounds",
      );
    for (let row = 0; row < (shape.length === 1 ? 1 : shape[0]); row++) {
      const list =
        shape.length === 1
          ? n.init
          : (n.init.items[row] ?? { kind: "list", items: [] });
      if (list.kind !== "list")
        fail("2D initialization requires one braced list per row.", n);
      const columns = shape.length === 1 ? count : shape[1];
      if (list.items.length > columns)
        fail("Too many elements in matrix row.", n, "bounds");
      for (let col = 0; col < columns; col++) {
        const item = list.items[col];
        if (item?.kind === "list")
          fail("Use scalar values for array elements.", item);
        runtime.memory.write(
          { ...ref, offset: row * columns + col },
          item ? runtime.full(item) : zero(),
          n,
          true,
        );
      }
    }
  } else if ((!n.type.pointer && n.type.const) || n.type.pointerConst)
    fail("Const arrays need initializers.", n, "const");
  runtime.emit(
    "declare",
    n,
    `Create ${n.name}: ${shape.join(" × ")} contiguous elements in row-major order.`,
    { name: n.name, ref, shape },
  );
}
export function arrayView(runtime, n) {
  const base = runtime.eval(n.target);
  if (!base.type.pointer)
    fail("Indexing needs an array or pointer.", n, "type");
  const index = runtime.eval(n.index);
  if (!integer(index.type)) fail("Array indices must be integers.", n, "type");
  const shape = base.shape ?? [],
    stride = shape.slice(1).reduce((a, b) => a * b, 1);
  if (index.value < 0 || (shape.length && index.value >= shape[0]))
    fail(
      `Index ${index.value} is outside this dimension (${shape[0]}).`,
      n,
      "bounds",
    );
  if (!base.value) fail("Cannot index nullptr.", n, "undefined");
  const ref = {
    ...base.value,
    offset: base.value.offset + index.value * stride,
    readonly: base.value.readonly || base.type.const,
  };
  runtime.memory.object(ref, n);
  if (shape.length === 2) {
    ref.start = ref.offset;
    ref.end = ref.offset + shape[1];
  }
  if (ref.offset < (ref.start ?? 0) || ref.offset >= (ref.end ?? Infinity))
    fail("Array access leaves its row or allocation.", n, "bounds");
  runtime.emit(
    "array-access",
    n,
    `Access index ${index.value}${shape.length > 1 ? "; row-major offset " + ref.offset : ""}.`,
    { ref, index: index.value, shape },
  );
  return { ref, shape: shape.slice(1), type: base.type };
}
