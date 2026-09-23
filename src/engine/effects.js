import { fail } from "./diagnostic.js";
// Compare actual allocation identities, so aliases cannot hide conflicting access.
export function assertIndependent(leftEvents, rightEvents, node) {
  function effects(events) {
    const read = new Set(),
      write = new Set();
    let external = false;
    for (const e of events) {
      if (["output", "input", "file", "allocate", "free"].includes(e.kind))
        external = true;
      const ref = e.detail.ref;
      if (!ref) continue;
      const key = ref.object + ":" + ref.offset;
      if (e.kind === "read") read.add(key);
      if (e.kind === "write") {
        read.add(key);
        write.add(key);
      }
    }
    return { read, write, external };
  }
  const a = effects(leftEvents),
    b = effects(rightEvents);
  if (
    (a.external && b.external) ||
    [...a.write].some((k) => b.read.has(k) || b.write.has(k)) ||
    [...b.write].some((k) => a.read.has(k))
  )
    fail(
      "Potentially unsequenced or order-dependent side effects on shared storage or I/O. Split this expression into separate statements.",
      node,
      "sequencing",
    );
}
