import { fail } from "./diagnostic.js";
import { bytes, convert, label } from "./types.js";
export class Memory {
  constructor() {
    this.objects = [];
    this.nextAddress = 4096;
  }
  allocate(name, t, count = 1, region = "stack", shape = [], node = null) {
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 1024 ||
      this.objects.reduce((n, o) => n + o.cells.length, 0) + count > 4096
    )
      fail(
        "Memory limit: allocations must have 1–1024 elements, with at most 4096 total cells.",
        node,
        "limit",
      );
    const o = {
      id: this.objects.length + 1,
      name,
      type: { ...t, reference: false },
      address: this.nextAddress,
      region,
      shape,
      cells: Array(count).fill(null),
      alive: true,
      array: shape.length > 0,
    };
    this.nextAddress += count * bytes(t) + 16;
    this.objects.push(o);
    return { object: o.id, offset: 0 };
  }
  object(ref, node, allowEnd = false) {
    const o = this.objects.find((o) => o.id === ref?.object);
    if (!o)
      fail("Cannot dereference a null or invalid pointer.", node, "undefined");
    if (!o.alive)
      fail(
        `'${o.name}' no longer exists: dangling pointer or expired scope.`,
        node,
        "undefined",
      );
    if (
      !Number.isInteger(ref.offset) ||
      ref.offset < (ref.start ?? 0) ||
      ref.offset >= (ref.end ?? o.cells.length) + (allowEnd ? 1 : 0)
    )
      fail(
        `Index ${ref.offset} is outside '${o.name}' (${o.cells.length} elements).`,
        node,
        "bounds",
      );
    return o;
  }
  read(ref, node) {
    const o = this.object(ref, node),
      v = o.cells[ref.offset];
    if (v === null)
      fail(
        `'${o.name}' is uninitialized. Reading it has no defined value.`,
        node,
        "undefined",
      );
    return structuredClone(v);
  }
  write(ref, v, node, initialize = false) {
    const o = this.object(ref, node);
    if (
      !initialize &&
      (ref.readonly ||
        (!o.type.pointer && o.type.const) ||
        (o.type.pointer && o.type.pointerConst))
    )
      fail(`Cannot modify const storage '${o.name}'.`, node, "const");
    const next = convert(v, o.type, node);
    o.cells[ref.offset] = next;
    return structuredClone(next);
  }
  address(ref) {
    if (!ref) return "nullptr";
    const o = this.objects.find((o) => o.id === ref.object);
    return o
      ? "0x" + (o.address + ref.offset * bytes(o.type)).toString(16)
      : "invalid";
  }
  release(ref, node) {
    this.object(ref, node).alive = false;
  }
}
