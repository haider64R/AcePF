import { fail } from "./diagnostic.js";
import { type, value, integer, label } from "./types.js";
export function pointerBinary(runtime, op, a, b, n) {
  if (
    a.type.base === "nullptr" &&
    b.type.base === "nullptr" &&
    ["==", "!="].includes(op)
  )
    return value(Number(op === "=="), type("bool"));
  if (a.type.base === "nullptr") a = value(null, { ...b.type });
  if (b.type.base === "nullptr") b = value(null, { ...a.type });
  if (a.type.pointer && b.type.pointer) {
    if (a.type.base !== b.type.base)
      fail(
        "Pointer comparison requires compatible pointed-to types.",
        n,
        "type",
      );
    if (["==", "!="].includes(op)) {
      const eq =
        a.value === null
          ? b.value === null
          : b.value !== null &&
            a.value.object === b.value.object &&
            a.value.offset === b.value.offset;
      return value(Number(op === "==" ? eq : !eq), type("bool"));
    }
    if (!a.value || !b.value || a.value.object !== b.value.object)
      fail(
        "Pointer subtraction and ordering require the same allocation.",
        n,
        "undefined",
      );
    runtime.memory.object(a.value, n, true);
    runtime.memory.object(b.value, n, true);
    if (op === "-") return value(a.value.offset - b.value.offset);
    const x = a.value.offset,
      y = b.value.offset;
    if (["<", "<=", ">", ">="].includes(op))
      return value(
        Number(
          op === "<"
            ? x < y
            : op === "<="
              ? x <= y
              : op === ">"
                ? x > y
                : x >= y,
        ),
        type("bool"),
      );
    fail(`Operator ${op} is not valid for two pointers.`, n, "type");
  }
  if (!a.type.pointer && op === "+") [a, b] = [b, a];
  if (!a.type.pointer || !integer(b.type) || !["+", "-"].includes(op))
    fail(`Invalid pointer operator ${op}.`, n, "type");
  if (!a.value)
    fail("Pointer arithmetic on nullptr is undefined.", n, "undefined");
  if (a.shape?.length > 1)
    fail("Arithmetic on pointers to matrix rows is outside this subset.", n);
  const ref = {
    ...a.value,
    offset: a.value.offset + (op === "+" ? b.value : -b.value),
  };
  const o = runtime.memory.object(ref, n, true);
  if (
    ref.offset < (a.value.start ?? 0) ||
    ref.offset > (a.value.end ?? o.cells.length)
  )
    fail("Pointer arithmetic leaves the array object.", n, "bounds");
  runtime.emit(
    "pointer",
    n,
    `Move ${b.value} element(s), from ${runtime.memory.address(a.value)} to ${runtime.memory.address(ref)}.`,
    { ref, from: a.value },
  );
  return value(ref, a.type);
}
export function allocateHeap(runtime, n) {
  if (n.type.base === "void" || n.type.const)
    fail("new requires a non-const primitive type in this subset.", n, "type");
  let count = 1;
  if (n.size) {
    const size = runtime.eval(n.size);
    if (!integer(size.type)) fail("new[] size must be an integer.", n, "type");
    count = size.value;
  }
  const ref = runtime.memory.allocate(
      "heap " + (runtime.memory.objects.length + 1),
      n.type,
      count,
      "heap",
      n.size ? [count] : [],
      n,
    ),
    o = runtime.memory.object(ref, n);
  o.array = !!n.size;
  if (n.init) {
    for (let i = 0; i < count; i++)
      runtime.memory.write(
        { ...ref, offset: i },
        runtime.eval(n.init),
        n,
        true,
      );
  }
  runtime.emit(
    "allocate",
    n,
    `Allocate ${count} ${label(n.type)} element(s) on the heap.`,
    { ref, count, array: !!n.size },
  );
  return value(ref, { ...n.type, pointer: true });
}
export function deleteHeap(runtime, n) {
  const v = runtime.full(n.expr);
  if (v.type.base === "nullptr") return;
  if (!v.type.pointer) fail("delete requires a pointer.", n, "type");
  if (v.value === null) {
    runtime.emit("free", n, "Deleting nullptr does nothing.");
    return;
  }
  const o = runtime.memory.object(v.value, n);
  if (o.region !== "heap" || v.value.offset !== 0)
    fail(
      "delete requires the original pointer returned by new.",
      n,
      "undefined",
    );
  if (o.array !== n.array)
    fail(
      o.array
        ? "Use delete[] for memory allocated by new[]."
        : "Use delete for memory allocated by new.",
      n,
      "undefined",
    );
  o.alive = false;
  runtime.emit(
    "free",
    n,
    `Release ${o.name}. Existing pointers to it are now dangling.`,
    { ref: v.value },
  );
}
