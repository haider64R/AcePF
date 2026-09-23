import { format, bytes, label } from "../engine/types.js";
export const emptyState = () => ({
  scopes: [],
  memory: [],
  frames: [],
  output: "",
  files: {},
  streams: [],
  inputIndex: 0,
});
export const cellKey = (ref) => `${ref.object}:${ref.offset}`;
export function cellName(object, offset = 0) {
  if (!object) return "?";
  if (!object.array) return object.name;
  return object.shape.length === 2
    ? `${object.name}[${Math.floor(offset / object.shape[1])}][${offset % object.shape[1]}]`
    : `${object.name}[${offset}]`;
}
export function showValue(v, state) {
  if (v == null) return "uninitialized";
  if (v.type.pointer) {
    if (v.value === null) return "nullptr";
    const target = state.memory.find((o) => o.id === v.value.object);
    return `${target ? cellName(target, v.value.offset) : "unknown"} @ ${address(v.value, state)}${target && !target.alive ? " (released)" : ""}`;
  }
  if (v.type.base === "void") return "void";
  if (v.type.base === "stream") return "file stream";
  return format(v);
}
export function address(ref, state) {
  if (!ref) return "nullptr";
  const o = state.memory.find((o) => o.id === ref.object);
  return o
    ? "0x" + (o.address + ref.offset * bytes(o.type)).toString(16)
    : "invalid";
}
export function bindingsFor(ref, state) {
  const bindings = [];
  for (const s of state.scopes)
    for (const b of Object.values(s.bindings))
      if (b.ref.object === ref.object && b.ref.offset === ref.offset)
        bindings.push({
          name: b.name,
          scope: s.name,
          scopeId: s.id,
          reference: !!b.type.reference,
        });
  return bindings;
}
export function pointerAliases(ref, state) {
  return state.memory
    .filter((o) => o.alive)
    .flatMap((o) => o.cells.map((v, i) => ({ o, v, i })))
    .filter(
      (x) =>
        x.v?.type.pointer &&
        x.v.value?.object === ref.object &&
        x.v.value?.offset === ref.offset,
    )
    .map((x) => cellName(x.o, x.i));
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function stateDelta(before, after) {
  const changes = [];
  const old = new Map(before.memory.map((o) => [o.id, o]));
  for (const o of after.memory) {
    const previous = old.get(o.id);
    for (let i = 0; i < o.cells.length; i++) {
      const a = previous?.cells[i] ?? null,
        b = o.cells[i],
        ref = { object: o.id, offset: i };
      if (!previous || !equal(a, b))
        changes.push({
          kind: previous ? "write" : "create",
          ref,
          name: cellName(o, i),
          type: label(o.type),
          before: a,
          after: b,
          beforeText: previous ? showValue(a, before) : "not declared",
          afterText: showValue(b, after),
          region: o.region,
          bindings: bindingsFor(ref, after),
          aliases: pointerAliases(ref, after),
        });
    }
    if (previous?.alive && !o.alive)
      changes.push({
        kind: "release",
        ref: { object: o.id, offset: 0 },
        name: o.name,
        region: o.region,
        beforeText: "alive",
        afterText: "lifetime ended",
        aliases: pointerAliases({ object: o.id, offset: 0 }, after),
      });
  }
  const files = [];
  for (const name of new Set([
    ...Object.keys(before.files),
    ...Object.keys(after.files),
  ]))
    if (before.files[name] !== after.files[name])
      files.push({
        name,
        before: before.files[name],
        after: after.files[name],
      });
  return {
    cells: changes,
    output: after.output.startsWith(before.output)
      ? after.output.slice(before.output.length)
      : after.output,
    files,
  };
}
export function relevantValues(raw, before, after, delta) {
  const entries = new Map();
  for (const e of raw) {
    if (e.kind !== "read" || !e.detail.ref) continue;
    const ref = e.detail.ref,
      key = cellKey(ref);
    if (entries.has(key)) continue;
    const o = e.state.memory.find((o) => o.id === ref.object);
    entries.set(key, {
      ref,
      name: e.detail.name ?? cellName(o, ref.offset),
      value: showValue(e.detail.value, e.state),
      role: "operand",
    });
  }
  for (const c of delta.cells) {
    if (c.kind === "release") continue;
    entries.delete(cellKey(c.ref));
  }
  return [...entries.values()];
}
